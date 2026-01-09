import { inngest } from "../client";
import { getPullRequestDiff, postReviewComment } from "@/module/github/lib/github";
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
  name: 'nim',
  baseURL: 'https://integrate.api.nvidia.com/v1',
  headers: {
    Authorization: `Bearer ${process.env.NIM_API_KEY}`,
  },
});

      const { text } = await generateText({
        model: nim.chatModel("deepseek-ai/deepseek-v3.2"),
        prompt,
      });

      return text;
    });

    await step.run("post-comment", async () => {
      await postReviewComment(token, owner, repo, prNumber, review);
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
