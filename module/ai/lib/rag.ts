import { pineconeIndex } from "@/lib/pinecone";
import {embed} from "ai";
// import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { google } from '@ai-sdk/google';

// const nim = createOpenAICompatible({
//   name: 'nim',
//   baseURL: 'https://integrate.api.nvidia.com/v1',
//   headers: {
//     Authorization: `Bearer ${process.env.NIM_API_KEY}`,
//   },
// });

export async function generateEmbedding(text:string){
    const {embedding} = await embed({
        model:google.embeddingModel("text-embedding-004"),
        value:text
    })
    console.log(embedding);
    return embedding;
}

export async function indexCodebase(
  repoId: string,
  files: { path: string; content: string }[]
) {
  const vectors = [];

  for (const file of files) {
    const content = `File: ${file.path}\n\n${file.content}`;
    const truncatedContent = content.slice(0, 8000);

    try {
      const embedding = await generateEmbedding(truncatedContent);

      vectors.push({
        id: `${repoId}-${file.path.replace(/\//g, "_")}`,
        values: embedding,
        metadata: {
          repoId,
          path: file.path,
          content,
        },
      });
    } catch (error) {
      console.error(`Failed to embed ${file.path}`, error);
    }
  }

  if (vectors.length > 0) {
  const batchSize = 100;

  for (let i = 0; i < vectors.length; i += batchSize) {
    const batch = vectors.slice(i, i + batchSize);

    await pineconeIndex.upsert(batch);
  }
}

console.log("indexing complete");

}

export async function retrieveContext(query: string, repoId: string, topK: number = 5) {
  const embedding = await generateEmbedding(query);

  const results = await pineconeIndex.query({
    vector: embedding,
    filter: { repoId },
    topK,
    includeMetadata: true
  });

  return results.matches.map(match => match.metadata?.content as string).filter(Boolean);
}