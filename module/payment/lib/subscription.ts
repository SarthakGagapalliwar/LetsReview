"use server";

import prisma from "@/lib/db";

export type SubscriptionTier = "FREE" | "PRO";
export type SubscriptionStatus = "ACTIVE" | "CANCELED" | "EXPIRED";

export interface UserLimits {
  tier: SubscriptionTier;
  repositories: {
    current: number;
    limit: number | null; //null  means unlimited
    canAdd: boolean;
  };
  reviews: {
    [repositoryId: string]: {
      current: number;
      limit: number | null;
      canAdd: boolean;
    };
  };
}

const TIER_LIMITS = {
  FREE: {
    repositories: 5,
    reviewPerRepo: 5,
  },
  PRO: {
    repositories: null, //unlimited
    reviewsPerRepo: null, //unlimited
  },
} as const;

export async function getUserTier(userId: string): Promise<SubscriptionTier> {
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { subscriptionTier: true },
  });

  return (user?.subscriptionTier as SubscriptionTier) || "FREE";
}

async function getUserUsage(userId: string) {
  let usage = await prisma.userUsage.findUnique({
    where: { userId },
  });
  if (!usage) {
    usage = await prisma.userUsage.create({
      data: {
        userId,
        repositoryCount: 0,
        reviewCounts: {},
      },
    });
  }
  return usage;
}

export async function canConnectRepository(userId: string): Promise<boolean> {
  const tier = await getUserTier(userId);

  if (tier === "PRO") {
    return true;
  }

  const usage = await getUserUsage(userId);
  const limit = TIER_LIMITS.FREE.repositories;

  return usage.repositoryCount < limit;
}

export async function canCreateReview(
  userId: string,
  repositoryId: string
): Promise<boolean> {
  const tier = await getUserTier(userId);

  if (tier === "PRO") {
    return true; // Unlimited for pro users
  }

  const usage = await getUserUsage(userId);
  const reviewCounts = usage.reviewCounts as Record<string, number>;
  const currentCount = reviewCounts[repositoryId] || 0;
  const limit = TIER_LIMITS.FREE.reviewPerRepo;

  return currentCount < limit;
}

/**
 * Increment repository count for user
 */
export async function incrementRepositoryCount(userId: string): Promise<void> {
  await prisma.userUsage.upsert({
    where: { userId },
    create: {
      userId,
      repositoryCount: 1,
      reviewCounts: {},
    },
    update: {
      repositoryCount: {
        increment: 1,
      },
    },
  });
}

export async function decrementRepositoryCount(userId: string): Promise<void> {
  const usage = await getUserUsage(userId);

  await prisma.userUsage.update({
    where: { userId },
    data: {
      repositoryCount: Math.max(0, usage.repositoryCount - 1),
    },
  });
}

export async function incrementReviewCount(
  userId: string,
  repositoryId: string
): Promise<void> {
  const usage = await getUserUsage(userId);
  const reviewCounts = usage.reviewCounts as Record<string, number>;

  reviewCounts[repositoryId] = (reviewCounts[repositoryId] || 0) + 1;

  await prisma.userUsage.update({
    where: { userId },
    data: {
      reviewCounts,
    },
  });
}

export async function getRemainingLimits(userId: string): Promise<UserLimits> {
  const tier = await getUserTier(userId);
  const usage = await getUserUsage(userId);
  const reviewCounts = usage.reviewCounts as Record<string, number>;

  const limits: UserLimits = {
    tier,
    repositories: {
      current: usage.repositoryCount,
      limit: tier === "PRO" ? null : TIER_LIMITS.FREE.repositories,
      canAdd:
        tier === "PRO" || usage.repositoryCount < TIER_LIMITS.FREE.repositories,
    },
    reviews: {},
  };

  // Get all user's repositories
  const repositories = await prisma.repository.findMany({
    where: { userId },
    select: { id: true },
  });

  // Calculate limits for each repository
  for (const repo of repositories) {
    const currentCount = reviewCounts[repo.id] || 0;

    limits.reviews[repo.id] = {
      current: currentCount,
      limit: tier === "PRO" ? null : TIER_LIMITS.FREE.reviewPerRepo,
      canAdd: tier === "PRO" || currentCount < TIER_LIMITS.FREE.reviewPerRepo,
    };
  }

  return limits;
}

export async function updateUserTier(
  userId: string,
  tier: SubscriptionTier,
  status: SubscriptionStatus,
  polarSubscriptionId?: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      subscriptionTier: tier,
      subscriptionStatus: status,
      ...(polarSubscriptionId && { polarSubsriptionId: polarSubscriptionId }),
    },
  });
}

export async function updatePolarCustomerId(
  userId: string,
  polarCustomerId: string
): Promise<void> {
  await prisma.user.update({
    where: { id: userId },
    data: {
      polarCustomerId,
    },
  });
}
