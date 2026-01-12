"use server";

import { auth } from "@/lib/auth";
import {
  getRemainingLimits,
  updateUserTier,
} from "@/module/payment/lib/subscription";
import { headers } from "next/headers";
import { polarClient } from "@/module/payment/config/polar";
import prisma from "@/lib/db";

export interface SubscriptionData {
  user: {
    id: string;
    name: string;
    email: string;
    subscriptionTier: string;
    subscriptionStatus: string | null;
    polarCustomerId: string | null;
    polarSubscriptionId: string | null;
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
}

export async function getSubscriptionData(): Promise<SubscriptionData> {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    return { user: null, limits: null };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { user: null, limits: null };
  }

  const limits = await getRemainingLimits(user.id);

  return {
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      subscriptionTier: user.subscriptionTier || "FREE",
      subscriptionStatus: user.subscriptionStatus || null,
      polarCustomerId: user.polarCustomerId || null,
      polarSubscriptionId: user.polarSubsriptionId || null,
    },
    limits,
  };
}

export async function syncSubscriptionStatus() {
  const session = await auth.api.getSession({
    headers: await headers(),
  });

  if (!session?.user) {
    throw new Error("Not authenticated");
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
  });

  if (!user) {
    return { success: false, message: "User not found" };
  }

  try {
    let subscriptions: { id: string; status: string }[] = [];

    // Try to fetch subscriptions using polarCustomerId if available
    if (user.polarCustomerId) {
      const result = await polarClient.subscriptions.list({
        customerId: user.polarCustomerId,
      });
      subscriptions = result.result?.items || [];
    }

    // If no subscriptions found, try using the customer external ID lookup
    // The Polar plugin sets externalId to the user's database ID
    if (subscriptions.length === 0) {
      try {
        // Try to get customer using external ID (user's database ID)
        const customer = await polarClient.customers.getExternal({
          externalId: user.id,
        });

        if (customer) {
          // Update polarCustomerId if we found the customer
          if (!user.polarCustomerId) {
            await prisma.user.update({
              where: { id: user.id },
              data: { polarCustomerId: customer.id },
            });
          }

          // Now fetch subscriptions for this customer
          const result = await polarClient.subscriptions.list({
            customerId: customer.id,
          });
          subscriptions = result.result?.items || [];
        }
      } catch (e) {
        console.error("Failed to lookup customer by externalId:", e);
      }
    }

    if (subscriptions.length === 0) {
      return {
        success: false,
        message: "No Polar customer or subscriptions found",
      };
    }

    // Find the most relevant subscription (active or most recent)
    const activeSub = subscriptions.find((sub) => sub.status === "active");
    const latestSub = subscriptions[0]; // Assuming API returns sorted or we should sort

    if (activeSub) {
      await updateUserTier(user.id, "PRO", "ACTIVE", activeSub.id);
      return { success: true, status: "ACTIVE" };
    } else if (latestSub) {
      // If latest is canceled/expired
      const status = latestSub.status === "canceled" ? "CANCELED" : "EXPIRED";

      // Only downgrade if we are sure it's not active
      if (latestSub.status !== "active") {
        await updateUserTier(user.id, "FREE", status, latestSub.id);
      }

      return { success: true, status };
    }

    return { success: true, status: "NO_SUBSCRIPTION" };
  } catch (error) {
    console.error("Failed to sync subscription:", error);
    return { success: false, error: "Failed to sync with Polar" };
  }
}
