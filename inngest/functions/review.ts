import { inngest } from "../client";
import {
  getPullRequestDiff,
  postReviewComment,
  updateComment,
} from "@/module/github/lib/github";
import { retrieveContext } from "@/module/ai/lib/rag";
import { generateText } from "ai";
import prisma from "@/lib/db";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

export const generateReview = inngest.createFunction(
  { id: "generate-review", concurrency: 5 },
  { event: "pr.review.requested" },

  async ({ event, step }) => {
    const { owner, repo, prNumber, userId } = event.data;

    const { diff, title, description, token } = await step.run(
      "fetch-pr-data",
      async () => {
        const accounts = await prisma.account.findFirst({
          where: {
            userId: userId,
            providerId: "github",
          },
        });

        if (!accounts?.accessToken) {
          throw new Error("No Github access token found");
        }

        const data = await getPullRequestDiff(
          accounts.accessToken,
          owner,
          repo,
          prNumber,
        );

        return { ...data, token: accounts.accessToken };
      },
    );

    // Post initial "generating review" comment
    const commentId = await step.run("post-initial-comment", async () => {
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
        true // return comment ID
      );
    });

    const context = await step.run("retrieve-context", async () => {
      const query = `${title}\n${description}`;
      return await retrieveContext(query, `${owner}/${repo}`);
    });

    const review = await step.run("generate-ai-review", async () => {
      // 1. System Instruction: Senior Tech Lead Persona
      // Balances low-level bug hunting with high-level architectural advice.
      const systemInstruction = `You are a Senior Technical Lead and Polyglot Developer.

Your role is to ensure the code is production-ready. You must analyze the code for both **Correctness** (Bugs, Typos) and **Quality** (Architecture, Security).

First, detect the language/framework from the code.
Then, mentally **simulate the execution** of the changes to catch runtime errors.
Finally, prioritize your findings by severity:
1. **BLOCKING**: Logic errors, security leaks, or critical performance issues.
2. **IMPORTANT**: Architectural misalignment with the provided Context.
3. **OPTIONAL**: Style nitpicks or minor optimizations (Only mention if valuable).

Tone: Direct, helpful, and authoritative.`;

      // 2. The User Prompt: Best of Both Worlds
      const prompt = `${systemInstruction}

---
### 📝 PR Metadata
**Title:** ${title}
**Description:** ${description || "No description provided"}

---
### 📚 Project Context (RAG)
*Use this context to verify architectural consistency and existing patterns.*

${context.join("\n\n")}

---
### 🔄 Code Changes (Diff)
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
        temperature: 0.2, // Keep low for precision
      });

      return text;
    });

    // Update the initial comment with the actual review
    await step.run("update-review-comment", async () => {
      if (!commentId) {
        throw new Error("Failed to get comment ID from initial comment");
      }
      await updateComment(
        token,
        owner,
        repo,
        commentId,
        `## 🤖 AI Code Review\n\n${review}\n\n---\n*Powered by LetsReview*`
      );
    });

    await step.run("save-review", async () => {
      const repository = await prisma.repository.findFirst({
        where: { owner, name: repo },
      });

      if (repository) {
        await prisma.review.create({
          data: {
            repositoryId: repository.id,
            prNumber,
            prTitle: title,
            prUrl: `https://github.com/${owner}/${repo}/pull/${prNumber}`,
            review,
            status: "completed",
          },
        });
      }
    });

    return { success: true };
  }
);
