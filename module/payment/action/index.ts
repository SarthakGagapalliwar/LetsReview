"use server";

import { auth } from "@/lib/auth";
import { getRemainingLimits } from "@/module/payment/lib/subscription";
import { headers } from "next/headers";
import prisma from "@/lib/db";
import {
  syncStarSubscription,
  getRequiredRepoUrl,
} from "@/module/github/lib/star";

export interface SubscriptionData {
  user: {
    id: string;
    name: string;
    email: string;
    subscriptionTier: string;
    subscriptionStatus: string | null;
    starredRepo: boolean;
    starCheckedAt: Date | null;
  } | null;
  limits: {
    tier: "FREE" | "PRO";
    repositories: {
      current: number;
      limit: number | null;
      canAdd: boolean;
    };
    reviews: {
      [repositoryId: string]: {
        current: number;
        limit: number | null;
        canAdd: boolean;
      };
    };
  } | null;
  repoUrl: string;
}

export async function getSubscriptionData(): Promise<SubscriptionData> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { user: null, limits: null, repoUrl: await getRequiredRepoUrl() };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { user: null, limits: null, repoUrl: await getRequiredRepoUrl() };
  }

  const limits = await getRemainingLimits(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      subscriptionTier: user.subscriptionTier || "FREE",
      subscriptionStatus: user.subscriptionStatus || null,
      starredRepo: user.starredRepo || false,
      starCheckedAt: user.starCheckedAt || null,
    },
    limits,
    repoUrl: await getRequiredRepoUrl(),
  };
}

export async function syncSubscriptionStatus() {
  return syncStarSubscription();
}
