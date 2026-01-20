import { betterAuth } from "better-auth";
import { prismaAdapter } from "better-auth/adapters/prisma";
import prisma from "./db";

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
    "https://letsreview.sarthak.asia/",
  ],
  plugins: [],
});
