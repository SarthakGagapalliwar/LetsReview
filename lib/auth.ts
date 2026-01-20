import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import {
  polar,
  checkout,
  portal,
  usage,
  webhooks,
} from "@polar-sh/better-auth";
import { polarClient } from "@/module/payment/config/polar";
import prisma from "./db";
import {
  updatePolarCustomerId,
  updateUserTier,
} from "@/module/payment/lib/subscription";
export const auth = betterAuth({
  database: prismaAdapter(prisma, {
    provider: "postgresql",
  }),
  socialProviders: {
    github: {
      clientId: process.env.GITHUB_CLIENT_ID!,
      clientSecret: process.env.GITHUB_CLIENT_SECRET!,
      scope: ["repo"],
    },
  },
  trustedOrigins: [
    "http://localhost:3000",
    "https://addisyn-strikebound-nonperceivably.ngrok-free.dev",
    "https://lets-review-zeta.vercel.app",
  ],
  plugins: [
    polar({
      client: polarClient,
      createCustomerOnSignUp: true,
      use: [
        checkout({
          products: [
            {
              productId:
                process.env.POLAR_PRODUCT_ID ||
                "d5f87b04-efd0-4143-831b-4e47152359e4",
              slug: "pro", // Custom slug for easy reference in Checkout URL, e.g. /checkout/letsReview
            },
          ],
          successUrl:
            process.env.POLAR_SUCCESS_URL ||
            process.env.NEXT_PUBLIC_APP_BASE_URL
              ? `${process.env.NEXT_PUBLIC_APP_BASE_URL}/dashboard/subscriptions?success=true`
              : "/dashboard/subscriptions?success=true",
          authenticatedUsersOnly: true,
        }),
        portal({
          returnUrl:
            process.env.NEXT_PUBLIC_APP_BASE_URL ||
            "http://localhost:3000/dashboard",
        }),
        usage(),
        webhooks({
          secret: process.env.POLAR_WEBHOOK_SECRET!,
          onSubscriptionCreated: async (payload) => {
            console.log(
              "[Polar Webhook] onSubscriptionCreated:",
              payload.data.id,
              "Status:",
              payload.data.status,
            );
            const customer = payload.data.customer;
            // externalId is the user's ID in our database (set by createCustomerOnSignUp)
            const userId = customer?.externalId;

            if (!userId) {
              console.log(
                "[Polar Webhook] No externalId found, trying polarCustomerId lookup",
              );
              const user = await prisma.user.findUnique({
                where: { polarCustomerId: payload.data.customerId },
              });
              if (user && payload.data.status === "active") {
                await updateUserTier(user.id, "PRO", "ACTIVE", payload.data.id);
                console.log(
                  "[Polar Webhook] Updated user tier to PRO for:",
                  user.id,
                );
              }
              return;
            }

            console.log(
              "[Polar Webhook] Found userId from externalId:",
              userId,
            );
            if (payload.data.status === "active") {
              await updateUserTier(userId, "PRO", "ACTIVE", payload.data.id);
              console.log(
                "[Polar Webhook] Updated user tier to PRO for:",
                userId,
              );
            }
          },
          onSubscriptionActive: async (payload) => {
            console.log(
              "[Polar Webhook] onSubscriptionActive:",
              payload.data.id,
            );
            const customer = payload.data.customer;
            const userId = customer?.externalId;

            if (!userId) {
              console.log(
                "[Polar Webhook] No externalId found, trying polarCustomerId lookup",
              );
              const user = await prisma.user.findUnique({
                where: { polarCustomerId: payload.data.customerId },
              });
              if (user) {
                await updateUserTier(user.id, "PRO", "ACTIVE", payload.data.id);
                console.log(
                  "[Polar Webhook] Updated user tier to PRO for:",
                  user.id,
                );
              }
              return;
            }

            console.log(
              "[Polar Webhook] Found userId from externalId:",
              userId,
            );
            await updateUserTier(userId, "PRO", "ACTIVE", payload.data.id);
            console.log(
              "[Polar Webhook] Updated user tier to PRO for:",
              userId,
            );
          },
          onSubscriptionCanceled: async (payload) => {
            console.log(
              "[Polar Webhook] onSubscriptionCanceled:",
              payload.data.id,
            );
            const customer = payload.data.customer;
            const userId = customer?.externalId;

            if (!userId) {
              const user = await prisma.user.findUnique({
                where: { polarCustomerId: payload.data.customerId },
              });
              if (user) {
                const currentTier = (
                  user.subscriptionTier === "PRO" ? "PRO" : "FREE"
                ) as "FREE" | "PRO";
                await updateUserTier(user.id, currentTier, "CANCELED");
              }
              return;
            }

            const user = await prisma.user.findUnique({
              where: { id: userId },
            });
            if (user) {
              const currentTier = (
                user.subscriptionTier === "PRO" ? "PRO" : "FREE"
              ) as "FREE" | "PRO";
              await updateUserTier(userId, currentTier, "CANCELED");
            }
          },
          onSubscriptionRevoked: async (payload) => {
            console.log(
              "[Polar Webhook] onSubscriptionRevoked:",
              payload.data.id,
            );
            const customer = payload.data.customer;
            const userId = customer?.externalId;

            if (!userId) {
              const user = await prisma.user.findUnique({
                where: { polarCustomerId: payload.data.customerId },
              });
              if (user) {
                await updateUserTier(user.id, "FREE", "EXPIRED");
              }
              return;
            }

            await updateUserTier(userId, "FREE", "EXPIRED");
          },
          onOrderPaid: async (payload) => {
            console.log("[Polar Webhook] onOrderPaid:", payload.data.id);
          },
          onCustomerCreated: async (payload) => {
            console.log(
              "[Polar Webhook] onCustomerCreated:",
              payload.data.id,
              "Email:",
              payload.data.email,
              "ExternalId:",
              payload.data.externalId,
            );
            // If externalId is set, it means createCustomerOnSignUp worked correctly
            // and we can update the polarCustomerId for that user
            const userId = payload.data.externalId;

            if (userId) {
              await updatePolarCustomerId(userId, payload.data.id);
              console.log(
                "[Polar Webhook] Updated polarCustomerId for user:",
                userId,
              );
              return;
            }

            // Fallback: try to find user by email
            const user = await prisma.user.findUnique({
              where: {
                email: payload.data.email,
              },
            });
            console.log(
              "[Polar Webhook] Found user by email for customer created:",
              user?.id,
            );
            if (user) {
              await updatePolarCustomerId(user.id, payload.data.id);
              console.log(
                "[Polar Webhook] Updated polarCustomerId for user:",
                user.id,
              );
            }
          },
        }),
      ],
    }),
  ],
});
