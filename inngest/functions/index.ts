import { inngest } from "@/inngest/client";
import prisma from "@/lib/db";
import { indexCodebase } from "@/module/ai/lib/rag";
import { getRepoFileContents } from "@/module/github/lib/github";

export const indexRepo = inngest.createFunction(
  {id:"index-repo"},
  {event:"repository.connect"},

  async ({event, step})=>{
    const {owner, repo, userId} = event.data

    //files
    const files = await step.run("fetch-files", async()=>{
      const account = await prisma.account.findFirst({
        where:{
          userId:userId,
          providerId:"github"
        }
      })

      if(!account?.accessToken){
        throw new Error("No GitHub access token found");
      }

      return await getRepoFileContents(account.accessToken, owner, repo)
    })

    await step.run("index-codebase", async()=>{
      await indexCodebase(`${owner}/${repo}`,files)
    })

    return {success:true, indexedFiles:files.length}
    
  }
)
  //to tun inngest ngrok adn bun run dev