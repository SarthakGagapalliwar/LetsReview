import { Octokit } from "octokit";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";

// Configuration for file fetching safeguards
const FILE_FETCH_CONFIG = {
  maxDepth: 10, // Maximum directory depth to traverse
  maxFiles: 500, // Maximum total files to fetch
  maxFileSize: 100 * 1024, // 100KB max per file
  maxDiffSize: 500 * 1024, // 500KB max diff size
} as const;

type ContributionCalendar = {
  totalContributions: number;
  weeks: {
    contributionDays: {
      contributionCount: number;
      date: string;
      color: string;
    }[];
  }[];
};

/**
 * Getting the github access token
 */

export const getGithbToken = async () => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
  if (!session) {
    throw new Error("Unauthorized");
  }

  const account = await prisma.account.findFirst({
    where: {
      userId: session.user.id,
      providerId: "github",
    },
  });

  if (!account?.accessToken) {
    throw new Error("No github access token found");
  }
  return account.accessToken;
};

export async function fetchUserContribution(token: string, username: string) {
  const octokit = new Octokit({ auth: token });

  const query = `
  query ($username: String!) {
    user(login: $username) {
      contributionsCollection {
        contributionCalendar {
          totalContributions
          weeks {
            contributionDays {
              contributionCount
              date
              color
            }
          }
        }
      }
    }
  }
`;

  try {
    const response = await octokit.graphql<{
      user: {
        contributionsCollection: { contributionCalendar: ContributionCalendar };
      };
    }>(query, {
      username,
    });
    return response.user.contributionsCollection.contributionCalendar;
  } catch (error) {
    console.error("Error fetching contribution data:", error);
    return null;
  }
}

export const getRespositories = async (
  page: number = 1,
  perPage: number = 10,
) => {
  const token = await getGithbToken();
  const octokit = new Octokit({ auth: token });

  const { data } = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    direction: "desc",
    visibility: "all",
    per_page: perPage,
    page: page,
  });

  return data;
};

export const createWebhook = async (owner: string, repo: string) => {
  const token = await getGithbToken();
  const octokit = new Octokit({ auth: token });

  const webhookUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/github`;

  const { data: hooks } = await octokit.rest.repos.listWebhooks({
    owner,
    repo,
  });

  const existingHook = hooks.find((hook) => hook.config.url === webhookUrl);
  if (existingHook) {
    return existingHook;
  }

  const { data } = await octokit.rest.repos.createWebhook({
    owner,
    repo,
    config: {
      url: webhookUrl,
      content_type: "json",
    },
    events: ["pull_request", "push"],
  });
  return data;
};

export const deleteWebhook = async (owner: string, repo: string) => {
  const token = await getGithbToken();
  const octokit = new Octokit({ auth: token });
  const webhooksUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/github`;

  try {
    const { data: hooks } = await octokit.rest.repos.listWebhooks({
      owner,
      repo,
    });

    const hookToDelete = hooks.find((hook) => hook.config.url === webhooksUrl);

    if (hookToDelete) {
      await octokit.rest.repos.deleteWebhook({
        owner,
        repo,
        hook_id: hookToDelete.id,
      });
      return true;
    }
    return false;
  } catch (error) {
    console.error("Error deleting webhook:", error);
    return false;
  }
};

export async function getRepoFileContents(
  token: string,
  owner: string,
  repo: string,
  path: string = "",
  depth: number = 0,
  fileCount: { current: number } = { current: 0 },
): Promise<{ path: string; content: string }[]> {
  // Safeguard: Check depth limit
  if (depth > FILE_FETCH_CONFIG.maxDepth) {
    console.warn(
      `Max depth ${FILE_FETCH_CONFIG.maxDepth} reached at ${path}, skipping deeper directories`,
    );
    return [];
  }

  // Safeguard: Check file count limit
  if (fileCount.current >= FILE_FETCH_CONFIG.maxFiles) {
    console.warn(
      `Max file count ${FILE_FETCH_CONFIG.maxFiles} reached, stopping file fetch`,
    );
    return [];
  }

  const octokit = new Octokit({ auth: token });
  const { data } = await octokit.rest.repos.getContent({
    owner,
    repo,
    path,
  });

  if (!Array.isArray(data)) {
    //it's a file
    if (data.type === "file" && data.content) {
      fileCount.current++;
      return [
        {
          path: data.path,
          content: Buffer.from(data.content, "base64").toString("utf-8"),
        },
      ];
    }
    return [];
  }

  let files: { path: string; content: string }[] = [];

  for (const item of data) {
    // Check file count limit before each fetch
    if (fileCount.current >= FILE_FETCH_CONFIG.maxFiles) {
      break;
    }

    if (item.type == "file") {
      // Skip binary and non-code files
      if (
        item.path.match(
          /\.(png|jpg|jpeg|gif|svg|ico|pdf|zip|tar|gz|woff|woff2|ttf|eot|mp3|mp4|mov|avi|lock)$/i,
        )
      ) {
        continue;
      }

      // Skip large files
      if (item.size && item.size > FILE_FETCH_CONFIG.maxFileSize) {
        console.warn(`Skipping large file ${item.path} (${item.size} bytes)`);
        continue;
      }

      try {
        const { data: fileData } = await octokit.rest.repos.getContent({
          owner,
          repo,
          path: item.path,
        });
        if (
          !Array.isArray(fileData) &&
          fileData.type === "file" &&
          fileData.content
        ) {
          files.push({
            path: item.path,
            content: Buffer.from(fileData.content, "base64").toString("utf-8"),
          });
          fileCount.current++;
        }
      } catch (error) {
        console.error(`Failed to fetch file ${item.path}:`, error);
      }
    } else if (item.type == "dir") {
      // Skip common non-essential directories
      if (
        item.path.match(
          /^(node_modules|\.git|dist|build|\.next|coverage|__pycache__|venv|\.venv)$/i,
        )
      ) {
        continue;
      }

      const subFiles = await getRepoFileContents(
        token,
        owner,
        repo,
        item.path,
        depth + 1,
        fileCount,
      );

      files = files.concat(subFiles);
    }
  }
  return files;
}

export async function getPullRequestDiff(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
) {
  const octokit = new Octokit({ auth: token });

  const { data: pr } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
  });

  const { data: diff } = await octokit.rest.pulls.get({
    owner,
    repo,
    pull_number: prNumber,
    mediaType: {
      format: "diff",
    },
  });

  let diffString = diff as unknown as string;

  // Safeguard: Truncate large diffs
  if (diffString.length > FILE_FETCH_CONFIG.maxDiffSize) {
    console.warn(
      `Diff for ${owner}/${repo}#${prNumber} is ${diffString.length} bytes, truncating to ${FILE_FETCH_CONFIG.maxDiffSize}`,
    );
    diffString =
      diffString.slice(0, FILE_FETCH_CONFIG.maxDiffSize) +
      "\n\n... [Diff truncated due to size. Please review the full diff on GitHub.]";
  }

  return {
    diff: diffString,
    title: pr.title,
    description: pr.body || "",
    headSha: pr.head.sha,
  };
}

export async function postReviewComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
  review: string,
  returnId: boolean = false,
): Promise<number | void> {
  const octokit = new Octokit({ auth: token });

  const response = await octokit.rest.issues.createComment({
    owner,
    repo,
    issue_number: prNumber,
    body: review,
  });

  if (returnId) {
    return response.data.id;
  }
}

export async function updateComment(
  token: string,
  owner: string,
  repo: string,
  commentId: number,
  body: string,
) {
  const octokit = new Octokit({ auth: token });

  await octokit.rest.issues.updateComment({
    owner,
    repo,
    comment_id: commentId,
    body,
  });
}

/**
 * Find an existing LetsReview comment on a PR to update instead of creating a new one
 */
export async function findExistingReviewComment(
  token: string,
  owner: string,
  repo: string,
  prNumber: number,
): Promise<number | null> {
  const octokit = new Octokit({ auth: token });

  try {
    const { data: comments } = await octokit.rest.issues.listComments({
      owner,
      repo,
      issue_number: prNumber,
      per_page: 100,
    });

    // Find a comment that starts with our signature
    const letsReviewComment = comments.find(
      (comment) =>
        comment.body?.startsWith("## 🤖 AI Code Review") ||
        comment.body?.includes("*Powered by LetsReview*"),
    );

    return letsReviewComment?.id ?? null;
  } catch (error) {
    console.error("Error finding existing review comment:", error);
    return null;
  }
}
