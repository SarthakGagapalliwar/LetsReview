import { inngest } from "../client";
import {
  getPullRequestDiff,
  postReviewComment,
  updateComment,
  findExistingReviewComment,
} from "@/module/github/lib/github";
import { retrieveContext, extractFilePathsFromDiff } from "@/module/ai/lib/rag";
import { generateText } from "ai";
import prisma from "@/lib/db";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { incrementReviewCountAtomic } from "@/module/payment/lib/subscription";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

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
        select: { id: true },
      });
    });

    if (existingReview) {
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
> **Review in progress...**
>
> LetsReview is analyzing your pull request. This may take a few moments.

### What we're doing:
| Step | Status |
|------|--------|
| 📥 Fetching pull request changes | ✅ Complete |
| 🔍 Analyzing code context | ⏳ In progress... |
| 🧠 Generating AI-powered review | ⏳ Pending |
| 📝 Preparing detailed feedback | ⏳ Pending |

*Please wait while we review your code...*

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
> **Review in progress...**
>
> LetsReview is analyzing your pull request. This may take a few moments.

### What we're doing:
| Step | Status |
|------|--------|
| 📥 Fetching pull request changes | ✅ Complete |
| 🔍 Analyzing code context | ⏳ In progress... |
| 🧠 Generating AI-powered review | ⏳ Pending |
| 📝 Preparing detailed feedback | ⏳ Pending |

*Please wait while we review your code...*

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

    // Step 5: Generate AI review
    const review = await step.run("generate-ai-review", async () => {
      const systemInstruction = `You are a Senior Technical Lead and Polyglot Developer.

Your role is to ensure the code is production-ready. You must analyze the code for both **Correctness** (Bugs, Typos) and **Quality** (Architecture, Security).

**CRITICAL**: The diff shows the CURRENT changes being proposed. The Project Context below is from the main/default branch BEFORE these changes. 
- If the diff FIXES an issue that exists in the context, do NOT flag it as a problem - the PR is solving it.
- Focus your review on the NEW code in the diff, not on issues already present in the context.
- The context is for understanding patterns and architecture, not for finding issues that the PR might already address.

First, detect the language/framework from the code.
Then, mentally **simulate the execution** of the changes to catch runtime errors.
Finally, prioritize your findings by severity:
1. **BLOCKING**: Logic errors, security leaks, or critical performance issues IN THE NEW CODE.
2. **IMPORTANT**: Architectural misalignment with the provided Context.
3. **OPTIONAL**: Style nitpicks or minor optimizations (Only mention if valuable).

Tone: Direct, helpful, and authoritative.`;

      const prompt = `${systemInstruction}

---
### 📝 PR Metadata
**Title:** ${title}
**Description:** ${description || "No description provided"}

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
Analyze the code and provide the following in Markdown format:

1.  **📝 Summary & Verdict**:
    * One sentence summary of the change.
    * **Verdict**: [Approve / Request Changes / Discuss] - Choose one based on the severity of issues found.

2.  **🛑 Critical Issues** (If any):
    * **Logic & Stability**: Crash risks, race conditions, infinite recursion, typos affecting execution, or unhandled errors.
    * **Security**: OWASP vulnerabilities, auth bypasses, or sensitive data exposure.
    * *If none, explicitly state "No critical issues found."*

3.  **🧭 Walkthrough**:
    * Brief file-by-file breakdown using emojis (📄, ➕, ✏️). Focus on *what* changed.

4.  **📊 Visualization**:
    * A Mermaid JS sequence diagram for the **changed logic only** (skip if changes are trivial).
    * Wrap in \`\`\`mermaid ... \`\`\`.
    * **CRITICAL**: Use simple alphanumeric labels. Do NOT use braces {}, quotes "", or parentheses () inside node text.

5.  **💡 Suggestions & Improvements**:
    * **Performance**: Database query efficiency, algorithmic complexity, or resource management.
    * **Maintainability**: Code modularity, separation of concerns, or readability improvements.
    * *Show code snippets for fixes.*`;

      // const openrouter = createOpenRouter({
      //   apiKey: process.env.OPENROUTER_API_KEY,
      // });

      const nim = createOpenAICompatible({
        name: "nim",
        baseURL: "https://integrate.api.nvidia.com/v1",
        headers: {
          Authorization: `Bearer ${process.env.NIM_API_KEY}`,
        },
      });

      const { text } = await generateText({
        model: nim.chatModel("moonshotai/kimi-k2-thinking"),
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
      await prisma.review.create({
        data: {
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

      // Increment review count only after successful completion
      await incrementReviewCountAtomic(userId, repositoryId);
    });

    return { success: true };
  },
);
