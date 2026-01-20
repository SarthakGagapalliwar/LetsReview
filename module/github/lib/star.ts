"use server";

import { Octokit } from "octokit";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { getGithbToken } from "./github";

// The repository that needs to be starred for Pro access
const REQUIRED_STAR_REPO = {
  owner: "SarthakGagapalliwar",
  repo: "LetsReview",
} as const;

export interface StarStatus {
  hasStarred: boolean;
  checkedAt: Date;
  repoUrl: string;
}

/**
 * Check if the authenticated user has starred the LetsReview repository
 */
export async function checkUserStarStatus(): Promise<StarStatus> {
  const token = await getGithbToken();
  const octokit = new Octokit({ auth: token });

  try {
    // Check if user has starred the repo
    // This returns 204 if starred, 404 if not
    await octokit.rest.activity.checkRepoIsStarredByAuthenticatedUser({
      owner: REQUIRED_STAR_REPO.owner,
      repo: REQUIRED_STAR_REPO.repo,
    });

    return {
      hasStarred: true,
      checkedAt: new Date(),
      repoUrl: `https://github.com/${REQUIRED_STAR_REPO.owner}/${REQUIRED_STAR_REPO.repo}`,
    };
  } catch (error: unknown) {
    // 404 means user hasn't starred the repo
    if (
      error &&
      typeof error === "object" &&
      "status" in error &&
      error.status === 404
    ) {
      return {
        hasStarred: false,
        checkedAt: new Date(),
        repoUrl: `https://github.com/${REQUIRED_STAR_REPO.owner}/${REQUIRED_STAR_REPO.repo}`,
      };
    }
    // For other errors, assume not starred (safe default)
    console.error("Error checking star status:", error);
    return {
      hasStarred: false,
      checkedAt: new Date(),
      repoUrl: `https://github.com/${REQUIRED_STAR_REPO.owner}/${REQUIRED_STAR_REPO.repo}`,
    };
  }
}

/**
 * Sync user's star status and update their subscription tier accordingly
 * This should be called:
 * 1. On login/session start
 * 2. On subscription page load
 * 3. Before any gated feature is accessed
 * 4. Periodically via background job (optional)
 */
export async function syncStarSubscription(): Promise<{
  success: boolean;
  hasStarred: boolean;
  tier: "FREE" | "PRO";
  message: string;
}> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return {
      success: false,
      hasStarred: false,
      tier: "FREE",
      message: "Not authenticated",
    };
  }

  try {
    const starStatus = await checkUserStarStatus();

    // Update user's subscription based on star status
    const newTier = starStatus.hasStarred ? "PRO" : "FREE";
    const newStatus = starStatus.hasStarred ? "ACTIVE" : null;

    await prisma.user.update({
      where: { id: session.user.id },
      data: {
        subscriptionTier: newTier,
        subscriptionStatus: newStatus,
        starredRepo: starStatus.hasStarred,
        starCheckedAt: starStatus.checkedAt,
      },
    });

    return {
      success: true,
      hasStarred: starStatus.hasStarred,
      tier: newTier,
      message: starStatus.hasStarred
        ? "Thank you for starring! You now have Pro access."
        : "Star our repository to unlock Pro features.",
    };
  } catch (error) {
    console.error("Error syncing star subscription:", error);
    return {
      success: false,
      hasStarred: false,
      tier: "FREE",
      message: "Failed to check star status. Please try again.",
    };
  }
}

/**
 * Get the required repository URL for starring
 */
export async function getRequiredRepoUrl(): Promise<string> {
  return `https://github.com/${REQUIRED_STAR_REPO.owner}/${REQUIRED_STAR_REPO.repo}`;
}

/**
 * Check if user has Pro access (cached check from database)
 * For real-time checks, use syncStarSubscription
 */
export async function hasProAccess(userId: string): Promise<boolean> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: {
      subscriptionTier: true,
      starredRepo: true,
      starCheckedAt: true,
    },
  });

  if (!user) return false;

  // If star was checked within last hour, trust the cached value
  const oneHourAgo = new Date(Date.now() - 60 * 60 * 1000);
  if (user.starCheckedAt && user.starCheckedAt > oneHourAgo) {
    return user.subscriptionTier === "PRO" && user.starredRepo === true;
  }

  // Otherwise, the cached value might be stale but we'll trust it
  // The sync will happen on next page load or feature access
  return user.subscriptionTier === "PRO";
}
