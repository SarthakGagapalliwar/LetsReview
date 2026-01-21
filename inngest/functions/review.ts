import { inngest } from "../client";
import {
  getPullRequestDiff,
  postReviewComment,
  updateComment,
  findExistingReviewComment,
  getFilesAtRef,
} from "@/module/github/lib/github";
import { retrieveContext, extractFilePathsFromDiff } from "@/module/ai/lib/rag";
import { generateText } from "ai";
import prisma from "@/lib/db";
import { incrementReviewCountAtomic } from "@/module/payment/lib/subscription";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";

export const generateReview = inngest.createFunction(
  {
    id: "generate-review",
    concurrency: 5,
    retries: 3, // Add retry with backoff
  },
  { event: "pr.review.requested" },

  async ({ event, step }) => {
    const { owner, repo, prNumber, headSha, userId, repositoryId } = event.data;

    // Step 1: Check idempotency - skip if review already exists for this revision
    const existingReview = await step.run("check-idempotency", async () => {
      if (!headSha) return null;

      return await prisma.review.findFirst({
        where: {
          repositoryId,
          prNumber,
          headSha,
        },
        select: { id: true, status: true },
      });
    });

    if (existingReview?.status === "completed") {
      console.log(
        `Review already exists for ${owner}/${repo} #${prNumber} @ ${headSha}`,
      );
      return { success: true, skipped: true, reason: "Review already exists" };
    }

    // Step 2: Fetch PR data (token stored separately, not returned from step)
    const prData = await step.run("fetch-pr-data", async () => {
      const account = await prisma.account.findFirst({
        where: {
          userId: userId,
          providerId: "github",
        },
      });

      if (!account?.accessToken) {
        throw new Error("No GitHub access token found");
      }

      const data = await getPullRequestDiff(
        account.accessToken,
        owner,
        repo,
        prNumber,
      );

      // Store account ID instead of token to avoid logging sensitive data
      return { ...data, accountId: account.id };
    });

    const { diff, title, description, accountId } = prData;

    // Helper to get token when needed (not stored in step results)
    const getToken = async () => {
      const account = await prisma.account.findUnique({
        where: { id: accountId },
        select: { accessToken: true },
      });
      if (!account?.accessToken) {
        throw new Error("GitHub access token not found");
      }
      return account.accessToken;
    };

    // Step 3: Find existing comment or create new one
    const commentId = await step.run("post-initial-comment", async () => {
      const token = await getToken();

      // Try to find existing LetsReview comment to update
      const existingCommentId = await findExistingReviewComment(
        token,
        owner,
        repo,
        prNumber,
      );

      if (existingCommentId) {
        // Update existing comment
        await updateComment(
          token,
          owner,
          repo,
          existingCommentId,
          `## 🤖 AI Code Review

<p align="center">
  <img src="https://raw.githubusercontent.com/SarthakGagapalliwar/LetsReview/main/public/thinking.gif" height="200" width="200" alt="Loading..." />
</p>

> [!NOTE]
> **Currently processing new changes in this PR. This may take a few minutes, please wait...**

<details>
<summary>📦 Commits</summary>

*Analyzing commits...*

</details>

<details>
<summary>📂 Files selected for processing</summary>

*Fetching changed files...*

</details>

---
*Powered by LetsReview*`,
        );
        return existingCommentId;
      }

      // Create new comment
      return await postReviewComment(
        token,
        owner,
        repo,
        prNumber,
        `## 🤖 AI Code Review

<p align="center">
  <img src="https://raw.githubusercontent.com/SarthakGagapalliwar/LetsReview/main/public/thinking.gif" height="200" width="200" alt="Loading..." />
</p>

> [!NOTE]
> **Currently processing new changes in this PR. This may take a few minutes, please wait...**

<details>
<summary>📦 Commits</summary>

*Analyzing commits...*

</details>

<details>
<summary>📂 Files selected for processing</summary>

*Fetching changed files...*

</details>

---
*Powered by LetsReview*`,
        true, // return comment ID
      );
    });

    // Step 4: Retrieve context with diff-scoped targeting
    const context = await step.run("retrieve-context", async () => {
      // Extract file paths from diff for targeted retrieval
      const changedFilePaths = extractFilePathsFromDiff(diff);

      // Build query from title, description, and changed file paths
      const query = `${title}\n${description || ""}\nFiles: ${changedFilePaths.join(", ")}`;

      return await retrieveContext(
        query,
        `${owner}/${repo}`,
        8,
        changedFilePaths,
      );
    });

    // Step 4b: Fetch changed files at PR head SHA for accurate context
    const prHeadFiles = await step.run("fetch-pr-head-files", async () => {
      if (!headSha) return [];
      const token = await getToken();
      const changedFilePaths = extractFilePathsFromDiff(diff);
      return await getFilesAtRef(
        token,
        owner,
        repo,
        changedFilePaths,
        headSha,
        30,
      );
    });

    // Step 5: Generate AI review
    const review = await step.run("generate-ai-review", async () => {
      const systemInstruction = `You are a Senior Technical Lead and Polyglot Developer acting as an AI Code Review Bot (similar to CodeRabbit).

Your role is to ensure the code is production-ready. You must analyze the code for both **Correctness** (Bugs, Typos) and **Quality** (Architecture, Security).

**CRITICAL**: The diff shows the CURRENT changes being proposed. The Project Context below is from the main/default branch BEFORE these changes. 
- If the diff FIXES an issue that exists in the context, do NOT flag it as a problem - the PR is solving it.
- Focus your review on the NEW code in the diff, not on issues already present in the context.
- The context is for understanding patterns and architecture, not for finding issues that the PR might already address.

First, detect the language/framework from the code.
Then, mentally **simulate the execution** of the changes to catch runtime errors.
Finally, prioritize your findings by severity:
1. **CRITICAL (🔴)**: Logic errors, security leaks, crashes, data loss, or critical performance issues.
2. **MAJOR (🟠)**: Architectural misalignment, potential bugs, performance issues.
3. **MINOR (🟡)**: Style nitpicks, unused imports, minor optimizations.

**OUTPUT REQUIREMENTS:**
- For EACH issue found, you MUST provide: Proposed fix (diff format), Committable suggestion (complete code block), and Prompt for AI Agents (imperative instruction).
- Use collapsible \`<details>\` blocks for issues to keep the review organized.
- If issues are found, include a consolidated "Fix all issues with AI agent" section at the end.
- If NO issues are found, explicitly state that and skip the issue-related sections.

Tone: Direct, helpful, and authoritative.`;

      const prompt = `${systemInstruction}

---
### 📝 PR Metadata
**Title:** ${title}
**Description:** ${description || "No description provided"}

---
### 🧩 PR Head File Context (from PR branch)
*These are the CURRENT versions of changed files at the PR head. Prefer these over main branch context when evaluating fixes.*

${
  prHeadFiles.length > 0
    ? prHeadFiles
        .map((file) => `File: ${file.path}\n\n${file.content}`)
        .join("\n\n---\n\n")
    : "No PR head file context available."
}

---
### 📚 Project Context (from main branch - BEFORE this PR)
*Use this context to verify architectural consistency and existing patterns. Remember: issues here may be FIXED by this PR.*

${context.length > 0 ? context.join("\n\n") : "No relevant context found."}

---
### 🔄 Code Changes (Diff) - THE ACTUAL CHANGES TO REVIEW
\`\`\`diff
${diff}
\`\`\`

---
### Response Instructions
Analyze the code and provide the following in Markdown format. Use GitHub's colored blockquote alerts where appropriate:
- \`> [!NOTE]\` for informational notes (blue)
- \`> [!TIP]\` for helpful tips (green)  
- \`> [!IMPORTANT]\` for important information (purple)
- \`> [!WARNING]\` for warnings (yellow)
- \`> [!CAUTION]\` for critical warnings (red)

---

**📝 Summary & Verdict** (Always show this at the top, NOT in a collapsible):
* One paragraph summary of what this PR accomplishes.
* **Verdict**: [✅ Approve / ⚠️ Request Changes / 💬 Discuss] - Choose based on severity of issues found.
* **Estimated review effort**: 🎯 [1-5 scale] | ⏱️ ~X minutes

---

<details>
<summary>📝 Walkthrough</summary>

## Walkthrough
[2-3 sentence high-level description of the changes]

## Changes
| File(s) | Summary |
|---------|----------|
| \`path/to/file.ext\` | [Brief description of changes] |
| ... | ... |

</details>

---

<details>
<summary>📊 Visualization</summary>

A Mermaid JS sequence or flow diagram for the **changed logic only** (skip if changes are trivial).

\`\`\`mermaid
[Your diagram here - use simple alphanumeric labels only]
\`\`\`

**CRITICAL**: Use simple alphanumeric labels. Do NOT use braces {}, quotes "", or parentheses () inside node text.

</details>

---

**Actionable comments posted: X** (Show count of issues found)

> [!CAUTION]
> [If there are critical issues that MUST be addressed before merging, list them here with this red blockquote]

> [!WARNING]  
> [If there are important issues that SHOULD be addressed, list them here with this yellow blockquote]

---

<details>
<summary>🧹 Nitpick comments (X)</summary>

[For minor issues like style, unused imports, small optimizations - group them here]

<details>
<summary>path/to/file.ext (N issues)</summary>

**Line X-Y**: [Issue description]

[Suggested fix or explanation]

</details>

</details>

---

**🛑 Actionable Issues** (Only if issues are found):
For EACH significant issue, create a section with this structure:

<details>
<summary>⚠️ [Severity] | [Issue Title] - \`path/to/file.ext\`</summary>

**📍 Location:** \`path/to/file.ext\` (lines X-Y)

**🔍 Description:**
[Clear explanation of the issue and why it matters]

<details>
<summary>▶ 🔧 Proposed fix</summary>

\`\`\`diff
- [old code line]
+ [new code line]
\`\`\`

</details>

<details>
<summary>▶ 📋 Committable suggestion</summary>

> [!IMPORTANT]
> Carefully review the code before committing. Ensure that it accurately replaces the highlighted code, contains no missing lines, and has no issues with indentation.

\`\`\`suggestion
[The complete fixed code block that can be directly committed]
\`\`\`

</details>

<details>
<summary>▶ 🤖 Prompt for AI Agents</summary>

\`\`\`
In \`path/to/file.ext\` at line X, [describe the exact fix needed in imperative form]
\`\`\`

</details>

</details>

* **Severity Levels:**
  - 🔴 **Critical**: Logic errors, security vulnerabilities, crashes, data loss
  - 🟠 **Major**: Performance issues, architectural problems, potential bugs
  - 🟡 **Minor**: Code style, unused imports, minor optimizations

* If NO issues are found, display:
  > [!TIP]
  > **No actionable issues found.** The code looks good! ✅

---

<details>
<summary>💡 Suggestions & Improvements</summary>

* **Performance**: [Any performance suggestions]
* **Maintainability**: [Any maintainability suggestions]
* **Best Practices**: [Any best practice suggestions]

</details>

---

<details>
<summary>🤖 Fix all issues with AI agent</summary>

\`\`\`
Fix the following issues in this pull request:

[List each issue with file path, line number, and the specific fix needed in imperative form. Group by file if multiple issues exist in the same file.]

Ensure all fixes maintain the existing code style and don't introduce new issues.
\`\`\`

</details>`;

      const openrouter = createOpenRouter({
        apiKey: process.env.OPENROUTER_API_KEY,
      });

      // const nim = createOpenAICompatible({
      //   name: "nim",
      //   baseURL: "https://integrate.api.nvidia.com/v1",
      //   headers: {
      //     Authorization: `Bearer ${process.env.NIM_API_KEY}`,
      //   },
      // });

      const { text } = await generateText({
        model: openrouter.chat("xiaomi/mimo-v2-flash:free"),
        prompt,
        temperature: 0.2,
      });

      return text;
    });

    // Step 6: Update the comment with the actual review
    await step.run("update-review-comment", async () => {
      if (!commentId) {
        throw new Error("Failed to get comment ID from initial comment");
      }
      const token = await getToken();
      await updateComment(
        token,
        owner,
        repo,
        commentId,
        `## 🤖 AI Code Review\n\n${review}\n\n---\n*Powered by LetsReview*`,
      );
    });

    // Step 7: Save review and increment count atomically (only on success)
    await step.run("save-review", async () => {
      if (headSha) {
        await prisma.review.upsert({
          where: {
            repositoryId_prNumber_headSha: {
              repositoryId,
              prNumber,
              headSha,
            },
          },
          update: {
            prTitle: title,
            prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
            commentId: commentId ? BigInt(commentId) : null,
            review,
            status: "completed",
          },
          create: {
            repositoryId,
            prNumber,
            prTitle: title,
            prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
            headSha,
            commentId: commentId ? BigInt(commentId) : null,
            review,
            status: "completed",
          },
        });
      } else {
        await prisma.review.create({
          data: {
            repositoryId,
            prNumber,
            prTitle: title,
            prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
            commentId: commentId ? BigInt(commentId) : null,
            review,
            status: "completed",
          },
        });
      }

      // Increment review count only after successful completion
      await incrementReviewCountAtomic(userId, repositoryId);
    });

    return { success: true };
  },
);
