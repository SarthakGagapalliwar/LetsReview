"use server";

import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { canCreateReview } from "@/module/payment/lib/subscription";

/**
 * Manually trigger a PR review (e.g., from dashboard)
 * Note: Webhook-triggered reviews go directly to Inngest without this function
 */
export async function reviewPullRequest(
  owner: string,
  repo: string,
  prNumber: number,
  headSha?: string,
) {
  const repository = await prisma.repository.findFirst({
    where: {
      owner,
      name: repo,
    },
    include: {
      user: {
        include: {
          accounts: {
            where: {
              providerId: "github",
            },
          },
        },
      },
    },
  });

  if (!repository) {
    throw new Error(
      `Repository ${owner}/${repo} not found in database. Please reconnect the repository.`,
    );
  }

  const canReview = await canCreateReview(repository.user.id, repository.id);

  if (!canReview) {
    throw new Error(
      "Review limit reached for this repository. Please upgrade to Pro for unlimited reviews.",
    );
  }

  // Check for existing review with same headSha (idempotency)
  if (headSha) {
    const existingReview = await prisma.review.findFirst({
      where: {
        repositoryId: repository.id,
        prNumber,
        headSha,
      },
    });

    if (existingReview) {
      return {
        success: true,
        message: "Review already exists for this revision",
      };
    }
  }

  await inngest.send({
    name: "pr.review.requested",
    data: {
      owner,
      repo,
      prNumber,
      headSha,
      userId: repository.user.id,
      repositoryId: repository.id,
    },
  });

  return { success: true, message: "Review queued" };
}
