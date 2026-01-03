"use server";
import prisma from "@/lib/db";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { createWebhook, getRespositories } from "@/module/github/lib/github";

export const fetchRepositories = async (
  page: number = 1,
  perPage: number = 10
) => {
  const session = await auth.api.getSession({
    headers: await headers(),
  });
        
  if (!session) {
    throw new Error("Unauthorized");
  }

  const githubRepos = await getRespositories(page, perPage);

  const dbRepos = await prisma.respository.findMany({
    where: {
      userId: session.user.id,
    },
  });

  const connectedRepoIds = new Set(dbRepos.map((repo) => repo.githubId));

  return githubRepos.map((repo: any) => ({
    ...repo,
    isConnected: connectedRepoIds.has(BigInt(repo.id)),
  }));
};

export const connectRepository = async(owner:string, repo:string, githubId:number)=>{
  const session = await auth.api.getSession({
    headers: await headers(),
  });
        
  if (!session) {
    throw new Error("Unauthorized");
  }
  //TODO:check if user can connect more repo

  const webhook = await createWebhook(owner, repo)
  if(webhook){
    await prisma.respository.create({
      data:{
        githubId:BigInt(githubId),
        name:repo,
        owner,
        fullName:`{owner}/${repo}`,
        url:"https://github.com/${owner}/${repo}",
        userId:session.user.id
      }
    })
  }
  //TODO:INCREMNT REPOSITYRY COUNT FOR USEAGE TRACKING

  //TODO :TRIGGER REPOSOTU INDINNG FOR RAG(FIRE AND FORGET)

  return webhook;

}