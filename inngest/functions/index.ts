import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { indexCodebase } from "@/module/ai/lib/rag";
import { getRepoFileContents } from "@/module/github/lib/github";

export const indexRepo = inngest.createFunction(
  { id: "index-repo" },
  { event: "repository.connect" },

  async ({ event, step }) => {
    const { owner, repo, userId } = event.data;

    //files
    const files = await step.run("fetch-files", async () => {
      const account = await prisma.account.findFirst({
        where: {
          userId: userId,
          providerId: "github",
        },
      });

      if (!account?.accessToken) {
        throw new Error("No GitHub access token found");
      }

      return await getRepoFileContents(account.accessToken, owner, repo);
    });

    await step.run("index-codebase", async () => {
      await indexCodebase(`${owner}/${repo}`, files);
    });

    return { success: true, indexedFiles: files.length };
  }
);

export const reindexRepo = inngest.createFunction(
  { id: "reindex-repo" },
  { event: "repository.reindex" },

  async ({ event, step }) => {
    const { owner, repo, userId, branch } = event.data;
    const repoId = `${owner}/${repo}`;

    // Step 1: Delete old vectors
    await step.run("delete-old-vectors", async () => {
      const { deleteRepositoryVectors } = await import("@/module/ai/lib/rag");
      await deleteRepositoryVectors(repoId);
    });

    // Step 2: Fetch latest files from the branch
    const files = await step.run("fetch-files", async () => {
      const account = await prisma.account.findFirst({
        where: {
          userId: userId,
          providerId: "github",
        },
      });

      if (!account?.accessToken) {
        throw new Error("No GitHub access token found");
      }

      return await getRepoFileContents(account.accessToken, owner, repo);
    });

    // Step 3: Re-index with new files
    await step.run("reindex-codebase", async () => {
      await indexCodebase(repoId, files);
    });

    return { success: true, reindexedFiles: files.length, branch };
  }
);
//to tun inngest ngrok adn bun run dev
