import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { orchestrateFullRepoReview } from "@/module/ai/lib/orchestrator";

/**
 * Full Repository Review - Multi-Agent Orchestrated Review
 *
 * This Inngest function handles the complete flow:
 * 1. Check if repository is indexed (wait if not)
 * 2. Run the multi-agent orchestrator
 * 3. Store the result in the database
 */
export const generateFullRepoReview = inngest.createFunction(
  {
    id: "generate-full-repo-review",
    concurrency: 3, // Limit concurrent full reviews
    retries: 2,
  },
  { event: "repository.review.requested" },

  async ({ event, step }) => {
    const { repositoryId, userId, reviewId } = event.data;

    // Step 1: Get repository info and verify ownership
    const repository = await step.run("get-repository", async () => {
      const repo = await prisma.repository.findFirst({
        where: {
          id: repositoryId,
          userId: userId,
        },
        select: {
          id: true,
          owner: true,
          name: true,
          fullName: true,
          indexStatus: true,
        },
      });

      if (!repo) {
        throw new Error("Repository not found or access denied");
      }

      return repo;
    });

    const repoId = `${repository.owner}/${repository.name}`;

    // Step 2: Update review status to analyzing
    await step.run("update-review-analyzing", async () => {
      await prisma.repositoryReview.update({
        where: { id: reviewId },
        data: { status: "analyzing" },
      });
    });

    // Step 3: Check index status - if not indexed, trigger indexing and wait
    const isIndexed = await step.run("check-index-status", async () => {
      if (repository.indexStatus === "indexed") {
        return true;
      }

      // If pending or failed, trigger indexing
      if (
        repository.indexStatus === "pending" ||
        repository.indexStatus === "failed"
      ) {
        // Update status to indicate we're waiting for indexing
        await prisma.repository.update({
          where: { id: repositoryId },
          data: { indexStatus: "indexing" },
        });

        // Emit event to trigger indexing
        await inngest.send({
          name: "repository.connect",
          data: {
            owner: repository.owner,
            repo: repository.name,
            userId: userId,
          },
        });

        return false;
      }

      // If currently indexing, we'll wait
      return repository.indexStatus === "indexing" ? false : true;
    });

    // If not indexed, wait for indexing to complete (poll with backoff)
    if (!isIndexed) {
      await step.run("wait-for-indexing", async () => {
        const maxWaitTime = 5 * 60 * 1000; // 5 minutes max wait
        const pollInterval = 10 * 1000; // 10 seconds
        const startTime = Date.now();

        while (Date.now() - startTime < maxWaitTime) {
          const repo = await prisma.repository.findUnique({
            where: { id: repositoryId },
            select: { indexStatus: true },
          });

          if (repo?.indexStatus === "indexed") {
            return true;
          }

          if (repo?.indexStatus === "failed") {
            // Mark review as failed
            await prisma.repositoryReview.update({
              where: { id: reviewId },
              data: {
                status: "failed",
                errorMessage: "Repository indexing failed. Please try again.",
              },
            });
            throw new Error("Repository indexing failed. Please try again.");
          }

          // Wait before polling again
          await new Promise((resolve) => setTimeout(resolve, pollInterval));
        }

        // Timeout - mark as failed
        await prisma.repositoryReview.update({
          where: { id: reviewId },
          data: {
            status: "failed",
            errorMessage: "Timeout waiting for repository indexing to complete",
          },
        });
        throw new Error("Timeout waiting for repository indexing to complete");
      });
    }

    // Step 4: Run the multi-agent orchestrator
    const orchestratorResult = await step.run("run-orchestrator", async () => {
      // Update status to "reviewing"
      await prisma.repositoryReview.update({
        where: { id: reviewId },
        data: { status: "reviewing" },
      });

      try {
        const result = await orchestrateFullRepoReview(repoId);

        return {
          formattedReview: result.formattedReview,
          agentResults: {
            classifier: result.classifier,
            agents: result.agentReviews.map((ar) => ({
              role: ar.role,
              scope: ar.scope,
              score: ar.score,
              summary: ar.summary,
              findingsCount: ar.findings.length,
            })),
            aggregated: {
              overallScore: result.aggregatedReview.overallScore,
              verdict: result.aggregatedReview.verdict,
              keyFindingsCount: result.aggregatedReview.keyFindings.length,
            },
          },
        };
      } catch (error) {
        // Update status to "failed" on error
        await prisma.repositoryReview.update({
          where: { id: reviewId },
          data: {
            status: "failed",
            errorMessage:
              error instanceof Error ? error.message : "Unknown error occurred",
          },
        });
        throw error;
      }
    });

    // Step 5: Save the final review
    await step.run("save-review", async () => {
      await prisma.repositoryReview.update({
        where: { id: reviewId },
        data: {
          status: "completed",
          review: orchestratorResult.formattedReview,
          agentResults: orchestratorResult.agentResults,
        },
      });
    });

    return {
      success: true,
      reviewId,
      repository: repoId,
    };
  },
);

/**
 * Update repository index status after indexing completes
 */
export const updateIndexStatus = inngest.createFunction(
  {
    id: "update-index-status",
    retries: 2,
  },
  { event: "repository.indexed" },

  async ({ event, step }) => {
    const { owner, repo } = event.data;

    await step.run("update-status", async () => {
      await prisma.repository.updateMany({
        where: {
          owner,
          name: repo,
        },
        data: {
          indexStatus: "indexed",
          indexedAt: new Date(),
        },
      });
    });

    return { success: true };
  },
);
