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
          prNumber
        );

        return { ...data, token: accounts.accessToken };
      }
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
  <img src="https://raw.githubusercontent.com/Codelessly/FlutterLoadingGIFs/master/packages/cupertino_activity_indicator.gif" width="40" alt="Loading..." />
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
      const prompt = `You are an expert code reviewer. Analyze the following pull request and provide a detailed, constructive code review.

PR Title: ${title}
PR Description: ${description || "No description provided"}

Context from Codebase:
${context.join("\n\n")}

Code Changes:
\`\`\`diff
${diff}
\`\`\`

Please provide:
1. **Walkthrough**: A file-by-file explanation of the changes.
2. **Sequence Diagram**: A Mermaid JS sequence diagram visualizing the flow of the changes (if applicable). Use \`\`\`mermaid ... \`\`\` block. **IMPORTANT**: Ensure the Mermaid syntax is valid. Do not use special characters (like quotes, braces, parentheses) inside Note text or labels as it breaks rendering. Keep the diagram simple.
3. **Summary**: Brief overview.
4. **Strengths**: What's done well.
5. **Issues**: Bugs, security concerns, code smells.
6. **Suggestions**: Specific code improvements.
7. **Poem**: A short, creative poem summarizing the changes at the very end.

Format your response in markdown.
Make sure to always close the formatting syntax whenever used. Make sure to not add --- at the end of the poem.
`;

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
  }
);
