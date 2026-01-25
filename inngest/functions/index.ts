import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { indexCodebase } from "@/module/ai/lib/rag";
import { getRepoFileContents } from "@/module/github/lib/github";

export const indexRepo = inngest.createFunction(
  {
    id: "index-repo",
    retries: 3,
  },
  { event: "repository.connect" },

  async ({ event, step }) => {
    const { owner, repo, userId } = event.data;

    // Update index status to "indexing"
    await step.run("update-index-status-start", async () => {
      await prisma.repository.updateMany({
        where: { owner, name: repo, userId },
        data: { indexStatus: "indexing" },
      });
    });

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

      const fetchedFiles = await getRepoFileContents(
        account.accessToken,
        owner,
        repo,
      );

      // Ensure the result is serializable (no circular refs, functions, etc.)
      return fetchedFiles.map((f) => ({ path: f.path, content: f.content }));
    });

    await step.run("index-codebase", async () => {
      await indexCodebase(`${owner}/${repo}`, files);
    });

    // Update index status to "indexed"
    await step.run("update-index-status-complete", async () => {
      await prisma.repository.updateMany({
        where: { owner, name: repo, userId },
        data: {
          indexStatus: "indexed",
          indexedAt: new Date(),
        },
      });
    });

    return { success: true, indexedFiles: files.length };
  },
);

export const reindexRepo = inngest.createFunction(
  {
    id: "reindex-repo",
    retries: 3,
  },
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

      const fetchedFiles = await getRepoFileContents(
        account.accessToken,
        owner,
        repo,
      );

      // Ensure the result is serializable
      return fetchedFiles.map((f) => ({ path: f.path, content: f.content }));
    });

    // Step 3: Re-index with new files
    await step.run("reindex-codebase", async () => {
      await indexCodebase(repoId, files);
    });

    // Update index status to "indexed"
    await step.run("update-index-status-complete", async () => {
      await prisma.repository.updateMany({
        where: { owner, name: repo, userId },
        data: {
          indexStatus: "indexed",
          indexedAt: new Date(),
        },
      });
    });

    return { success: true, reindexedFiles: files.length, branch };
  },
);
//to tun inngest ngrok adn bun run dev

// Export all functions from full-repo-review
export { generateFullRepoReview, updateIndexStatus } from "./full-repo-review";
