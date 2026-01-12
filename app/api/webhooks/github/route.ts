import { reviewPullRequest } from "@/module/ai/actions";
import { NextResponse, NextRequest } from "next/server";

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
    //TODO: Handle later

    return NextResponse.json({ message: "Event Processes" }, { status: 200 });
  } catch (error) {
    console.error("Error Processes webhook:", error);
    return NextResponse.json(
      { error: "Internal Server Error" },
      { status: 500 }
    );
  }
}
