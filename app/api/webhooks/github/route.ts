import { reviewPullRequest } from "@/module/ai/actions";
import { NextResponse, NextRequest } from "next/server";
import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const event = req.headers.get("x-github-event");

    if (event === "ping") {
      return NextResponse.json({ message: "Pong" }, { status: 200 });
    }

    if (event === "pull_request") {
      const action = body.action;
      const repo = body.repository.full_name;
      const prNumber = body.number;
      const [owner, repoName] = repo.split("/");

      if (action == "opened" || action == "synchronize") {
        try {
          await reviewPullRequest(owner, repoName, prNumber);
          console.log(`Review completed for ${repo} #${prNumber}`);
          return NextResponse.json(
            { message: `Review completed for ${repo} #${prNumber}` },
            { status: 200 }
          );
        } catch (error) {
          console.error(`Review failed for ${repo} #${prNumber}:`, error);
          return NextResponse.json({ error: "Review failed" }, { status: 500 });
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
              `Re-indexing triggered for ${repo} on ${defaultBranch}`
            );
            return NextResponse.json(
              { message: `Re-indexing triggered for ${repo}` },
              { status: 200 }
            );
          }
        } catch (error) {
          console.error(`Re-indexing failed for ${repo}:`, error);
          // Don't return error, just log it
        }
      }
    }

    return NextResponse.json({ message: "Event Processes" }, { status: 200 });
  } catch (error) {
    console.error("Error Processes webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
