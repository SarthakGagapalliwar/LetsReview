import { Octokit } from "octokit";
import { auth } from "@/lib/auth";
import prisma from "@/lib/db";
import { headers } from "next/headers";

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


export const getRespositories = async (page:number=1,perPage:number=10)=>{
  const token = await getGithbToken();
  const octokit = new Octokit({auth:token});

  const {data} = await octokit.rest.repos.listForAuthenticatedUser({
    sort: "updated",
    direction:"desc",
    visibility:"all",
    per_page:perPage,
    page:page
  })

  return data;
}

export const createWebhook = async (owner:string, repo:string)=>{
  const token = await getGithbToken();
    const octokit = new Octokit({auth:token});

    const webhookUrl = `${process.env.NEXT_PUBLIC_APP_BASE_URL}/api/webhooks/github`

    const {data:hooks} = await octokit.rest.repos.listWebhooks({
      owner,
      repo
    })

    const existingHook = hooks.find(hook=>hook.config.url === webhookUrl);
    if(existingHook){
      return existingHook;
    }

    const {data} = await octokit.rest.repos.createWebhook({
      owner,
      repo,
      config:{
        url:webhookUrl,
        content_type:"json"
      },
      events:["pull_request"]
    })
    return data;
}