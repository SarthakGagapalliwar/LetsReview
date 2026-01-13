import { pineconeIndex } from "@/lib/pinecone";
import { embed } from "ai";
// import { createOpenAICompatible } from '@ai-sdk/openai-compatible';
import { google } from "@ai-sdk/google";

// const nim = createOpenAICompatible({
//   name: 'nim',
//   baseURL: 'https://integrate.api.nvidia.com/v1',
//   headers: {
//     Authorization: `Bearer ${process.env.NIM_API_KEY}`,
//   },
// });

// Constants for vector operations
const LIST_PAGE_SIZE = 100;
const DELETE_BATCH_SIZE = 1000;
const MAX_PAGINATION_ITERATIONS = 1000;
const PROGRESS_LOG_INTERVAL = 5000;

export async function generateEmbedding(text: string) {
  const { embedding } = await embed({
    model: google.embeddingModel("text-embedding-004"),
    value: text,
  });
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
          content: truncatedContent,
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

export async function retrieveContext(
  query: string,
  repoId: string,
  topK: number = 5
) {
  const embedding = await generateEmbedding(query);

  const results = await pineconeIndex.query({
    vector: embedding,
    filter: { repoId },
    topK,
    includeMetadata: true,
  });

  return results.matches
    .map((match) => match.metadata?.content as string)
    .filter(Boolean);
}

/**
 * Delete all vectors for a repository before re-indexing
 */
export async function deleteRepositoryVectors(repoId: string) {
  try {
    // Since vector IDs are formatted as "repoId-filepath" (e.g., "owner/repo-src_file.ts")
    // We can use the listPaginated API to find and delete all matching vectors

    const prefix = `${repoId}-`;
    const idsToDelete: string[] = [];

    // List all vectors with IDs starting with the repo prefix
    let paginationToken: string | undefined = undefined;
    let iterationCount = 0;

    // Safety limit to prevent infinite loops from malformed pagination tokens
    for (
      iterationCount = 0;
      iterationCount < MAX_PAGINATION_ITERATIONS;
      iterationCount++
    ) {
      const listResult = await pineconeIndex.listPaginated({
        prefix: prefix,
        limit: LIST_PAGE_SIZE,
        ...(paginationToken && { paginationToken }),
      });

      // Type-safe extraction of vector IDs
      if (listResult.vectors && Array.isArray(listResult.vectors)) {
        const validIds = listResult.vectors
          .filter(
            (v): v is { id: string } =>
              v != null && typeof v === "object" && typeof v.id === "string"
          )
          .map((v) => v.id);
        idsToDelete.push(...validIds);
      }

      // Progress logging for large repositories
      if (
        idsToDelete.length > 0 &&
        idsToDelete.length % PROGRESS_LOG_INTERVAL === 0
      ) {
        console.log(
          `Found ${idsToDelete.length} vectors so far for repository: ${repoId}`
        );
      }

      paginationToken = listResult.pagination?.next;

      // Exit loop if no more pages
      if (!paginationToken) {
        break;
      }
    }

    // Warn if we hit the iteration limit
    if (iterationCount >= MAX_PAGINATION_ITERATIONS) {
      console.warn(
        `Hit maximum pagination iterations (${MAX_PAGINATION_ITERATIONS}) for repository: ${repoId}. Some vectors may not have been listed.`
      );
    }

    // Delete all found vectors in batches with error tracking
    if (idsToDelete.length > 0) {
      let deletedCount = 0;
      const failedBatches: number[] = [];

      for (let i = 0; i < idsToDelete.length; i += DELETE_BATCH_SIZE) {
        const batch = idsToDelete.slice(i, i + DELETE_BATCH_SIZE);
        const batchIndex = Math.floor(i / DELETE_BATCH_SIZE);

        try {
          await pineconeIndex.deleteMany(batch);
          deletedCount += batch.length;
        } catch (batchError) {
          console.error(
            `Failed to delete batch ${batchIndex} for ${repoId}:`,
            batchError
          );
          failedBatches.push(batchIndex);
        }
      }

      if (failedBatches.length > 0) {
        console.warn(
          `Partial deletion completed for ${repoId}. ` +
            `Deleted ${deletedCount}/${idsToDelete.length} vectors. ` +
            `Failed batches: ${failedBatches.join(", ")}`
        );
      } else {
        console.log(
          `Deleted ${deletedCount} vectors for repository: ${repoId}`
        );
      }
    } else {
      console.log(`No vectors found for repository: ${repoId}`);
    }
  } catch (error) {
    console.error(`Failed to delete vectors for ${repoId}:`, error);
    throw error;
  }
}
