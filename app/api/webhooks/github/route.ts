import { NextResponse, NextRequest } from "next/server";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import crypto from "crypto";

const WEBHOOK_SECRET = process.env.GITHUB_WEBHOOK_SECRET;

/**
 * Verify GitHub webhook signature using HMAC SHA-256
 */
async function verifyWebhookSignature(
  req: NextRequest,
  body: string,
): Promise<boolean> {
  if (!WEBHOOK_SECRET) {
    console.warn(
      "GITHUB_WEBHOOK_SECRET not set - skipping signature verification",
    );
    return true; // Allow in development, but warn
  }

  const signature = req.headers.get("x-hub-signature-256");
  if (!signature) {
    return false;
  }

  const hmac = crypto.createHmac("sha256", WEBHOOK_SECRET);
  const digest = "sha256=" + hmac.update(body).digest("hex");

  return crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(digest));
}

export async function POST(req: NextRequest) {
  try {
    const rawBody = await req.text();

    // Verify webhook signature
    const isValid = await verifyWebhookSignature(req, rawBody);
    if (!isValid) {
      console.error("Invalid webhook signature");
      return NextResponse.json({ error: "Invalid signature" }, { status: 401 });
    }

    const body = JSON.parse(rawBody);
    const event = req.headers.get("x-github-event");

    if (event === "ping") {
      return NextResponse.json({ message: "Pong" }, { status: 200 });
    }

    if (event === "pull_request") {
      const action = body.action;
      const repo = body.repository.full_name;
      const prNumber = body.number;
      const headSha = body.pull_request?.head?.sha;
      const [owner, repoName] = repo.split("/");

      // Validate prNumber
      if (!Number.isInteger(prNumber) || prNumber <= 0) {
        return NextResponse.json(
          { error: "Invalid PR number" },
          { status: 400 },
        );
      }

      if (action === "opened" || action === "synchronize") {
        try {
          // Find repository and validate ownership
          const repository = await prisma.repository.findFirst({
            where: { owner, name: repoName },
            include: {
              user: {
                include: {
                  accounts: {
                    where: { providerId: "github" },
                  },
                },
              },
            },
          });

          if (!repository) {
            console.log(`Repository ${repo} not connected`);
            return NextResponse.json(
              { message: "Repository not connected" },
              { status: 200 },
            );
          }

          // Reserve a pending review row to prevent duplicate runs (race-safe)
          if (headSha) {
            const existingReview = await prisma.review.findFirst({
              where: {
                repositoryId: repository.id,
                prNumber,
                headSha,
              },
            });

            if (existingReview) {
              console.log(
                `Review already exists for ${repo} #${prNumber} @ ${headSha}`,
              );
              return NextResponse.json(
                { message: "Review already exists for this revision" },
                { status: 200 },
              );
            }

            try {
              await prisma.review.create({
                data: {
                  repositoryId: repository.id,
                  prNumber,
                  prTitle: body.pull_request?.title ?? `PR #${prNumber}`,
                  prUrl: `https://github.com/${owner}/${repoName}/pull/${prNumber}`,
                  headSha,
                  review: "", // placeholder for pending review
                  status: "pending",
                },
              });
            } catch (error) {
              // If another request created it first, treat as duplicate
              console.warn(
                `Pending review already created for ${repo} #${prNumber} @ ${headSha}`,
              );
              return NextResponse.json(
                { message: "Review already exists for this revision" },
                { status: 200 },
              );
            }
          }

          // Enqueue review job - all heavy work happens in Inngest
          await inngest.send({
            name: "pr.review.requested",
            data: {
              owner,
              repo: repoName,
              prNumber,
              headSha,
              userId: repository.user.id,
              repositoryId: repository.id,
            },
          });

          console.log(`Review queued for ${repo} #${prNumber}`);
          return NextResponse.json(
            { message: `Review queued for ${repo} #${prNumber}` },
            { status: 200 },
          );
        } catch (error) {
          console.error(
            `Failed to queue review for ${repo} #${prNumber}:`,
            error,
          );
          return NextResponse.json(
            { error: "Failed to queue review" },
            { status: 500 },
          );
        }
      }
    }

    // Handle push events to re-index vector database when code is merged
    if (event === "push") {
      const ref = body.ref; // e.g., "refs/heads/main"
      const repo = body.repository.full_name;
      const [owner, repoName] = repo.split("/");
      const defaultBranch = body.repository.default_branch || "main";

      // Only re-index when pushing to the default branch (main/master)
      if (ref === `refs/heads/${defaultBranch}`) {
        try {
          // Find the repository in database to get userId
          const repository = await prisma.repository.findFirst({
            where: {
              owner,
              name: repoName,
            },
          });

          if (repository) {
            // Trigger re-indexing
            await inngest.send({
              name: "repository.reindex",
              data: {
                owner,
                repo: repoName,
                userId: repository.userId,
                branch: defaultBranch,
              },
            });

            console.log(
              `Re-indexing triggered for ${repo} on ${defaultBranch}`,
            );
            return NextResponse.json(
              { message: `Re-indexing triggered for ${repo}` },
              { status: 200 },
            );
          }
        } catch (error) {
          console.error(`Re-indexing failed for ${repo}:`, error);
          // Don't return error, just log it
        }
      }
    }

    return NextResponse.json({ message: "Event processed" }, { status: 200 });
  } catch (error) {
    console.error("Error processing webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 },
    );
  }
}
