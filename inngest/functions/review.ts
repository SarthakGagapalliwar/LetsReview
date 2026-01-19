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
        true, // return comment ID
      );
    });

    const context = await step.run("retrieve-context", async () => {
      const query = `${title}\n${description}`;

      return await retrieveContext(query, `${owner}/${repo}`);
    });

    const review = await step.run("generate-ai-review", async () => {
      // 1. System Instruction: Polyglot Persona
      // We instruct the AI to identify the stack itself based on the code provided.
      const systemInstruction = `You are a Principal Software Architect and Polyglot Developer. 
      
Your task is to review a Pull Request for a software project.
First, analyze the provided code and context to determine the programming language(s) and framework(s) being used.
Then, conduct a review based on the **idiomatic best practices** for that specific technology stack.

Your goals:
1. **Correctness**: Ensure logic is sound and handles edge cases.
2. **Security**: Look for common vulnerabilities (OWASP Top 10, Injection, Secrets).
3. **Performance**: Identify algorithmic inefficiencies (e.g., O(n^2) loops) or resource leaks.
4. **Maintainability**: Ensure code is clean, readable, and follows the existing patterns found in the Context.

Tone: Constructive, professional, and clear.`;

      // 2. The User Prompt: Stack-Agnostic Inputs
      const prompt = `${systemInstruction}

    ---
    ### 📝 PR Metadata
    **Title:** ${title}
    **Description:** ${description || "No description provided"}

    ---
    ### 📚 Project Context (RAG)
    *Use this context to understand the existing project structure, utility functions, and coding conventions.*

    ${context.join("\n\n")}

    ---
    ### 🔄 Code Changes (Diff)
    \`\`\`diff
    ${diff}
    \`\`\`

    ---
    ### Response Instructions
    Analyze the code and provide the following in Markdown format:

    1.  **📝 Summary**: High-level summary of the changes.
    2.  **📊 Visualization**: A Mermaid JS sequence diagram for the critical logic flow. 
        * Wrap in \`\`\`mermaid ... \`\`\`.
        * **CRITICAL**: Use simple alphanumeric labels. Do NOT use braces {}, quotes "", or parentheses () inside node text.
    3.  **🧭 Walkthrough**: A file-by-file explanation of the changes. Use emojis to indicate file roles and change types (e.g., 📄 file, ➕ added, ✏️ modified, ➖ removed, 🔧 config, 🧩 component).
    4.  **🛡️ Security & Performance**: Specific issues regarding efficiency or safety. If none, state "No significant issues found."
    5.  **💡 Code Suggestions**: Actionable refactoring or fixes. 
        * Use code blocks.
        * Explain *why* the change is recommended based on the detected language's best practices.`;

      const nim = createOpenAICompatible({
        name: "nim",
        baseURL: "https://integrate.api.nvidia.com/v1",
        headers: {
          Authorization: `Bearer ${process.env.NIM_API_KEY}`,
        },
      });

      const { text } = await generateText({
        // Mistral Large is great, but DeepSeek R1 (if available on NIM) is clearer for logic.
        // Sticking to Mistral Large for now as it follows complex formatting instructions well.
        model: nim.chatModel("moonshotai/kimi-k2-thinking"),
        prompt,
        temperature: 0.2, // Lower temperature to reduce hallucinations in code analysis
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
        `## 🤖 AI Code Review\n\n${review}\n\n---\n*Powered by LetsReview*`,
      );
    });

    await step.run("save-review", async () => {
      const repository = await prisma.repository.findFirst({
        where: {
          owner,
          name: repo,
        },
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
  },
);
