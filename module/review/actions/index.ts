"use server";

import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { Prisma } from "@/lib/generated/prisma";
import { headers } from "next/headers";
import { inngest } from "@/inngest/client";
import { Octokit } from "octokit";
import {
  checkUserStarStatus,
  getRequiredRepoUrl,
} from "@/module/github/lib/star";

export async function getReviews() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    throw new Error("Unauthorized");
  }

  const reviews = await prisma.review.findMany({
    where: {
      repository: {
        userId: session.user.id,
      },
    },
    include: {
      repository: true,
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });
  return reviews;
}

// ============================================================================
// Full Repository Review Actions
// ============================================================================

/**
 * Get all full repository reviews for the current user
 */
export async function getRepositoryReviews() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const reviews = await prisma.repositoryReview.findMany({
    where: {
      repository: {
        userId: session.user.id,
      },
    },
    include: {
      repository: {
        select: {
          id: true,
          name: true,
          owner: true,
          fullName: true,
          url: true,
          indexStatus: true,
        },
      },
    },
    orderBy: {
      createdAt: "desc",
    },
    take: 50,
  });

  return reviews;
}

/**
 * Get a single full repository review by ID
 */
export async function getRepositoryReviewById(reviewId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const review = await prisma.repositoryReview.findFirst({
    where: {
      id: reviewId,
      repository: {
        userId: session.user.id,
      },
    },
    include: {
      repository: {
        select: {
          id: true,
          name: true,
          owner: true,
          fullName: true,
          url: true,
        },
      },
    },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  return review;
}

/**
 * Request a new full repository review
 */
export async function requestFullRepoReview(repositoryId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Check if user has starred the LetsReview repo (required for full reviews)
  const starStatus = await checkUserStarStatus();
  if (!starStatus.hasStarred) {
    const repoUrl = await getRequiredRepoUrl();
    throw new Error(
      `STAR_REQUIRED:${repoUrl}:Star our repository to unlock Full Repository Reviews! This helps us grow and provide better features.`,
    );
  }

  // Verify repository ownership
  const repository = await prisma.repository.findFirst({
    where: {
      id: repositoryId,
      userId: session.user.id,
    },
    select: {
      id: true,
      name: true,
      owner: true,
      indexStatus: true,
    },
  });

  if (!repository) {
    throw new Error("Repository not found or access denied");
  }

  // Check if there's already an active review (pending/analyzing/reviewing)
  const existingActiveReview = await prisma.repositoryReview.findFirst({
    where: {
      repositoryId,
      status: {
        in: ["pending", "analyzing", "reviewing"],
      },
    },
  });

  if (existingActiveReview) {
    throw new Error("A review is already in progress for this repository");
  }

  // Check for failed/cancelled reviews that can be retried - update them instead of creating new
  const existingFailedReview = await prisma.repositoryReview.findFirst({
    where: {
      repositoryId,
      status: {
        in: ["failed", "cancelled"],
      },
    },
    orderBy: {
      createdAt: "desc",
    },
  });

  let reviewId: string;

  if (existingFailedReview) {
    // Update the existing failed/cancelled review to retry
    await prisma.repositoryReview.update({
      where: { id: existingFailedReview.id },
      data: {
        status: "pending",
        errorMessage: null,
        review: "",
        agentResults: Prisma.JsonNull,
        updatedAt: new Date(),
      },
    });
    reviewId = existingFailedReview.id;
  } else {
    // Create a new pending review record
    const review = await prisma.repositoryReview.create({
      data: {
        repositoryId,
        status: "pending",
        review: "",
        triggerType: "manual",
      },
    });
    reviewId = review.id;
  }

  // Send event to Inngest to start the review process
  await inngest.send({
    name: "repository.review.requested",
    data: {
      repositoryId,
      userId: session.user.id,
      reviewId: reviewId,
    },
  });

  return {
    success: true,
    reviewId: reviewId,
    message:
      repository.indexStatus === "indexed"
        ? "Review started. This may take a few minutes."
        : "Repository needs to be indexed first. Review will start after indexing completes.",
  };
}

/**
 * Get all GitHub repositories for the user (both connected and unconnected)
 */
export async function getRepositoriesForReview() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Get GitHub access token
  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "github",
    },
  });

  if (!account?.accessToken) {
    throw new Error("No GitHub access token found");
  }

  // Fetch all GitHub repos
  const octokit = new Octokit({ auth: account.accessToken });
  const { data: githubRepos } =
    await octokit.rest.repos.listForAuthenticatedUser({
      sort: "updated",
      direction: "desc",
      visibility: "all",
      per_page: 100,
    });

  // Get connected repositories from DB
  const connectedRepos = await prisma.repository.findMany({
    where: {
      userId: session.user.id,
    },
    select: {
      id: true,
      githubId: true,
      name: true,
      owner: true,
      fullName: true,
      url: true,
      indexStatus: true,
      indexedAt: true,
      _count: {
        select: {
          repositoryReviews: true,
        },
      },
    },
  });

  // Create a map of connected repos by githubId
  const connectedRepoMap = new Map(
    connectedRepos.map((repo) => [repo.githubId.toString(), repo]),
  );

  // Merge GitHub repos with connected repo info
  const repositories = githubRepos.map((ghRepo) => {
    const connected = connectedRepoMap.get(ghRepo.id.toString());

    if (connected) {
      return {
        id: connected.id,
        githubId: ghRepo.id,
        name: ghRepo.name,
        owner: ghRepo.owner.login,
        fullName: ghRepo.full_name,
        url: ghRepo.html_url,
        indexStatus: connected.indexStatus,
        indexedAt: connected.indexedAt,
        isConnected: true,
        reviewCount: connected._count.repositoryReviews,
      };
    }

    return {
      id: null, // Not connected yet
      githubId: ghRepo.id,
      name: ghRepo.name,
      owner: ghRepo.owner.login,
      fullName: ghRepo.full_name,
      url: ghRepo.html_url,
      indexStatus: "not_connected",
      indexedAt: null,
      isConnected: false,
      reviewCount: 0,
    };
  });

  return repositories;
}

/**
 * Delete a full repository review
 */
export async function deleteRepositoryReview(reviewId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const review = await prisma.repositoryReview.findFirst({
    where: {
      id: reviewId,
      repository: {
        userId: session.user.id,
      },
    },
  });

  if (!review) {
    throw new Error("Review not found");
  }

  await prisma.repositoryReview.delete({
    where: { id: reviewId },
  });

  return { success: true };
}

/**
 * Connect a repository and optionally start indexing
 */
export async function connectRepositoryForReview(
  githubId: number,
  name: string,
  owner: string,
  fullName: string,
  url: string,
) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  // Check if already connected
  const existing = await prisma.repository.findFirst({
    where: {
      githubId: BigInt(githubId),
      userId: session.user.id,
    },
  });

  if (existing) {
    return { success: true, repositoryId: existing.id, alreadyConnected: true };
  }

  // Create the repository
  const repository = await prisma.repository.create({
    data: {
      githubId: BigInt(githubId),
      name,
      owner,
      fullName,
      url,
      userId: session.user.id,
      indexStatus: "pending",
    },
  });

  // Start indexing
  await inngest.send({
    name: "repository.connect",
    data: {
      owner,
      repo: name,
      userId: session.user.id,
    },
  });

  return {
    success: true,
    repositoryId: repository.id,
    alreadyConnected: false,
  };
}

/**
 * Cancel an in-progress review (mark as cancelled)
 */
export async function cancelRepositoryReview(reviewId: string) {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session) {
    throw new Error("Unauthorized");
  }

  const review = await prisma.repositoryReview.findFirst({
    where: {
      id: reviewId,
      repository: {
        userId: session.user.id,
      },
      status: {
        in: ["pending", "analyzing", "reviewing"],
      },
    },
  });

  if (!review) {
    throw new Error("Review not found or not in progress");
  }

  await prisma.repositoryReview.update({
    where: { id: reviewId },
    data: {
      status: "cancelled",
      errorMessage: "Review was manually cancelled",
    },
  });

  return { success: true };
}
