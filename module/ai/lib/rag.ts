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

// ============================================================================
// Configuration for vector operations
// All values configurable via environment variables with sensible defaults
// ============================================================================

/**
 * Pinecone configuration with validation
 * @property listPageSize - Max vectors per list request (1-100, Pinecone limit)
 * @property deleteBatchSize - Max vectors per delete request (1-1000, Pinecone limit)
 * @property maxPaginationIterations - Safety limit for pagination loops (1-10000)
 * @property maxOperationDurationMs - Timeout for long operations (1000-600000ms)
 * @property rateLimitDelayMs - Delay between API calls (0-1000ms)
 * @property maxRetryAttempts - Retry count for failed operations (1-10)
 * @property progressLogInterval - Log progress every N vectors (100-100000)
 */
const pineconeConfig = {
  listPageSize: Math.min(
    100,
    Math.max(1, parseInt(process.env.PINECONE_LIST_PAGE_SIZE || "100")),
  ),
  deleteBatchSize: Math.min(
    1000,
    Math.max(1, parseInt(process.env.PINECONE_DELETE_BATCH_SIZE || "1000")),
  ),
  maxPaginationIterations: Math.min(
    10000,
    Math.max(1, parseInt(process.env.PINECONE_MAX_ITERATIONS || "1000")),
  ),
  maxOperationDurationMs: Math.min(
    600000,
    Math.max(1000, parseInt(process.env.PINECONE_MAX_DURATION_MS || "300000")),
  ),
  rateLimitDelayMs: Math.min(
    1000,
    Math.max(0, parseInt(process.env.PINECONE_RATE_LIMIT_DELAY_MS || "50")),
  ),
  maxRetryAttempts: Math.min(
    10,
    Math.max(1, parseInt(process.env.PINECONE_MAX_RETRY_ATTEMPTS || "3")),
  ),
  progressLogInterval: Math.min(
    100000,
    Math.max(
      100,
      parseInt(process.env.PINECONE_PROGRESS_LOG_INTERVAL || "5000"),
    ),
  ),
} as const;

// Destructure for convenience (maintaining backward compatibility)
const {
  listPageSize: LIST_PAGE_SIZE,
  deleteBatchSize: DELETE_BATCH_SIZE,
  maxPaginationIterations: MAX_PAGINATION_ITERATIONS,
  maxOperationDurationMs: MAX_OPERATION_DURATION_MS,
  rateLimitDelayMs: RATE_LIMIT_DELAY_MS,
  maxRetryAttempts: MAX_RETRY_ATTEMPTS,
  progressLogInterval: PROGRESS_LOG_INTERVAL,
} = pineconeConfig;

// ============================================================================
// Utility Functions
// ============================================================================

/**
 * Sleep utility for rate limiting and retry backoff
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Validates that a repository ID is properly formatted
 * @throws Error if repoId is invalid
 */
function validateRepoId(repoId: string): void {
  if (!repoId || typeof repoId !== "string") {
    throw new Error("repoId must be a non-empty string");
  }

  const trimmed = repoId.trim();
  if (trimmed.length === 0) {
    throw new Error("repoId cannot be empty or whitespace only");
  }

  // Basic validation for GitHub-style repo IDs (owner/repo)
  if (trimmed.includes(" ")) {
    throw new Error("repoId cannot contain spaces");
  }
}

/**
 * Type guard to extract valid string IDs from Pinecone list response
 */
function extractValidIds(vectors: unknown[] | undefined): string[] {
  if (!vectors || !Array.isArray(vectors)) {
    return [];
  }

  return vectors
    .filter(
      (v): v is { id: string } =>
        v != null &&
        typeof v === "object" &&
        "id" in v &&
        typeof v.id === "string",
    )
    .map((v) => v.id);
}

/**
 * Executes an async operation with exponential backoff retry
 */
async function withRetry<T>(
  operation: () => Promise<T>,
  operationName: string,
  maxAttempts: number = MAX_RETRY_ATTEMPTS,
): Promise<T> {
  let lastError: Error | undefined;

  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      lastError = error instanceof Error ? error : new Error(String(error));

      if (attempt < maxAttempts) {
        const backoffMs = RATE_LIMIT_DELAY_MS * Math.pow(2, attempt);
        console.warn(
          `${operationName} failed (attempt ${attempt}/${maxAttempts}). ` +
            `Retrying in ${backoffMs}ms...`,
        );
        await sleep(backoffMs);
      }
    }
  }

  throw lastError;
}

/**
 * Creates a timeout checker for long-running operations
 */
function createTimeoutChecker(
  operationName: string,
  maxDurationMs: number = MAX_OPERATION_DURATION_MS,
) {
  const startTime = Date.now();

  return function checkTimeout(): void {
    const elapsed = Date.now() - startTime;
    if (elapsed > maxDurationMs) {
      throw new Error(
        `${operationName} exceeded maximum duration of ${maxDurationMs}ms (elapsed: ${elapsed}ms)`,
      );
    }
  };
}

// ============================================================================
// Async Generator for Memory-Efficient Vector Listing
// ============================================================================

/**
 * Streams vector IDs in batches using async generator pattern.
 * This prevents memory bloat for large repositories by yielding batches
 * instead of accumulating all IDs in memory.
 *
 * @param prefix - The ID prefix to filter vectors
 * @param checkTimeout - Optional timeout checker function
 * @yields Arrays of vector IDs in batches
 */
async function* listVectorIdBatches(
  prefix: string,
  checkTimeout?: () => void,
): AsyncGenerator<string[], void, undefined> {
  let paginationToken: string | undefined;
  let iterationCount = 0;
  let totalYielded = 0;

  do {
    // Check timeout if provided
    checkTimeout?.();

    // Enforce iteration limit
    if (iterationCount >= MAX_PAGINATION_ITERATIONS) {
      console.warn(
        `Hit maximum pagination iterations (${MAX_PAGINATION_ITERATIONS}) for prefix: ${prefix}. ` +
          `Total vectors found: ${totalYielded}`,
      );
      break;
    }

    const listResult = await withRetry(
      () =>
        pineconeIndex.listPaginated({
          prefix,
          limit: LIST_PAGE_SIZE,
          ...(paginationToken && { paginationToken }),
        }),
      `List vectors (iteration ${iterationCount + 1})`,
    );

    const batchIds = extractValidIds(listResult.vectors);

    if (batchIds.length > 0) {
      totalYielded += batchIds.length;

      // Progress logging
      if (totalYielded % PROGRESS_LOG_INTERVAL < batchIds.length) {
        console.log(
          `Found ${totalYielded} vectors so far for prefix: ${prefix}`,
        );
      }

      yield batchIds;
    }

    paginationToken = listResult.pagination?.next;
    iterationCount++;

    // Rate limiting delay between pagination requests
    if (paginationToken) {
      await sleep(RATE_LIMIT_DELAY_MS);
    }
  } while (paginationToken);

  console.log(`Finished listing vectors. Total found: ${totalYielded}`);
}

// ============================================================================
// Deletion Statistics Tracking
// ============================================================================

/**
 * Statistics returned from vector deletion operations
 */
export interface DeletionStats {
  /** Total number of vectors found matching the criteria */
  totalFound: number;
  /** Number of vectors successfully deleted */
  totalDeleted: number;
  /** Number of batch operations that failed after all retries */
  failedBatches: number;
  /** Number of operations that required retry attempts */
  retriedOperations: number;
  /** Total operation duration in milliseconds */
  durationMs: number;
}

/**
 * Error thrown when deletion completes with partial failures
 */
export class PartialDeletionError extends Error {
  constructor(
    public readonly stats: DeletionStats,
    public readonly repoId: string,
  ) {
    super(
      `Partial deletion for ${repoId}: ${stats.totalDeleted}/${stats.totalFound} vectors deleted. ` +
        `${stats.failedBatches} batches failed after retries.`,
    );
    this.name = "PartialDeletionError";
  }
}

// ============================================================================
// Core Functions
// ============================================================================

export async function generateEmbedding(text: string) {
  const { embedding } = await embed({
    model: google.embeddingModel("text-embedding-004"),
    value: text,
  });
  return embedding;
}

// ============================================================================
// Chunking Configuration
// ============================================================================

const CHUNK_CONFIG = {
  maxChunkSize: 1500, // ~375 tokens, safe for embedding models
  overlapSize: 200, // Overlap for context continuity
  concurrencyLimit: 5, // Bounded parallel embedding
} as const;

/**
 * Split content into overlapping chunks with semantic breaks
 * Prefers breaking at function/class boundaries, then newlines, then arbitrary
 */
function chunkContent(content: string, filePath: string): string[] {
  const { maxChunkSize, overlapSize } = CHUNK_CONFIG;

  if (content.length <= maxChunkSize) {
    return [`File: ${filePath}\n\n${content}`];
  }

  const chunks: string[] = [];
  let startIndex = 0;

  // Patterns for semantic breaks (prioritized)
  const breakPatterns = [
    /\n(?=(?:export\s+)?(?:function|class|interface|type|const|let|var|def|async\s+function)\s)/g, // Function/class definitions
    /\n\n+/g, // Double newlines (paragraph breaks)
    /\n/g, // Single newlines
  ];

  while (startIndex < content.length) {
    let endIndex = Math.min(startIndex + maxChunkSize, content.length);

    // If not at the end, try to find a semantic break point
    if (endIndex < content.length) {
      let bestBreak = -1;

      for (const pattern of breakPatterns) {
        pattern.lastIndex = startIndex + maxChunkSize - overlapSize;
        const searchRegion = content.slice(startIndex, endIndex);

        // Find the last match within our chunk
        let match;
        const localPattern = new RegExp(pattern.source, "g");
        while ((match = localPattern.exec(searchRegion)) !== null) {
          if (match.index + startIndex < endIndex) {
            bestBreak = match.index + startIndex + match[0].length;
          }
        }

        if (bestBreak > startIndex + maxChunkSize / 2) {
          break; // Found a good break point
        }
      }

      if (bestBreak > startIndex) {
        endIndex = bestBreak;
      }
    }

    const chunkContent = content.slice(startIndex, endIndex).trim();
    if (chunkContent.length > 0) {
      chunks.push(
        `File: ${filePath} [chunk ${chunks.length + 1}]\n\n${chunkContent}`,
      );
    }

    // Move start with overlap
    startIndex = endIndex - overlapSize;
    if (startIndex >= content.length) break;
  }

  return chunks;
}

/**
 * Process items with bounded concurrency
 */
async function processWithConcurrency<T, R>(
  items: T[],
  processor: (item: T) => Promise<R>,
  concurrencyLimit: number,
): Promise<R[]> {
  const results: R[] = [];
  const executing: Promise<void>[] = [];

  for (const item of items) {
    const promise = processor(item).then((result) => {
      results.push(result);
    });

    executing.push(promise);

    if (executing.length >= concurrencyLimit) {
      await Promise.race(executing);
      // Remove completed promises
      for (let i = executing.length - 1; i >= 0; i--) {
        const p = executing[i];
        // Check if promise is settled by racing with resolved promise
        const settled = await Promise.race([
          p.then(() => true).catch(() => true),
          Promise.resolve(false),
        ]);
        if (settled) {
          executing.splice(i, 1);
        }
      }
    }
  }

  await Promise.all(executing);
  return results;
}

export async function indexCodebase(
  repoId: string,
  files: { path: string; content: string }[],
) {
  console.log(`Starting indexing for ${repoId} with ${files.length} files`);

  // Prepare all chunks
  const allChunks: { path: string; content: string; chunkIndex: number }[] = [];

  for (const file of files) {
    const chunks = chunkContent(file.content, file.path);
    chunks.forEach((chunk, index) => {
      allChunks.push({ path: file.path, content: chunk, chunkIndex: index });
    });
  }

  console.log(`Created ${allChunks.length} chunks from ${files.length} files`);

  // Generate embeddings with bounded concurrency
  const vectors: Array<{
    id: string;
    values: number[];
    metadata: {
      repoId: string;
      path: string;
      content: string;
      chunkIndex: number;
    };
  }> = [];

  const embedChunk = async (chunk: {
    path: string;
    content: string;
    chunkIndex: number;
  }) => {
    const truncatedContent = chunk.content.slice(0, 8000);

    try {
      const embedding = await generateEmbedding(truncatedContent);

      return {
        id: `${repoId}-${chunk.path.replace(/\//g, "_")}-chunk${chunk.chunkIndex}`,
        values: embedding,
        metadata: {
          repoId,
          path: chunk.path,
          content: truncatedContent,
          chunkIndex: chunk.chunkIndex,
        },
      };
    } catch (error) {
      console.error(
        `Failed to embed ${chunk.path} chunk ${chunk.chunkIndex}:`,
        error,
      );
      return null;
    }
  };

  const results = await processWithConcurrency(
    allChunks,
    embedChunk,
    CHUNK_CONFIG.concurrencyLimit,
  );

  for (const result of results) {
    if (result) {
      vectors.push(result);
    }
  }

  if (vectors.length > 0) {
    const batchSize = 100;

    for (let i = 0; i < vectors.length; i += batchSize) {
      const batch = vectors.slice(i, i + batchSize);
      await pineconeIndex.upsert(batch);
    }
  }

  console.log(
    `Indexing complete: ${vectors.length} vectors created for ${repoId}`,
  );
}

/**
 * Extract file paths from a unified diff
 */
export function extractFilePathsFromDiff(diff: string): string[] {
  const paths: Set<string> = new Set();

  // Match +++ b/path/to/file or --- a/path/to/file
  const diffPathPattern = /^(?:\+\+\+|---)\s+[ab]\/(.+)$/gm;
  let match;

  while ((match = diffPathPattern.exec(diff)) !== null) {
    const path = match[1];
    if (path && path !== "/dev/null") {
      paths.add(path);
    }
  }

  return Array.from(paths);
}

/**
 * Retrieve context with diff-scoped targeting
 * Prioritizes files that were changed in the diff
 */
export async function retrieveContext(
  query: string,
  repoId: string,
  topK: number = 5,
  changedFilePaths?: string[],
) {
  const embedding = await generateEmbedding(query);

  // If we have changed file paths, retrieve context specifically from those files first
  if (changedFilePaths && changedFilePaths.length > 0) {
    const scopedResults = await pineconeIndex.query({
      vector: embedding,
      filter: {
        repoId,
        path: { $in: changedFilePaths },
      },
      topK: Math.ceil(topK * 0.7), // 70% from changed files
      includeMetadata: true,
    });

    const generalResults = await pineconeIndex.query({
      vector: embedding,
      filter: {
        repoId,
        path: { $nin: changedFilePaths },
      },
      topK: Math.ceil(topK * 0.3), // 30% from other files for broader context
      includeMetadata: true,
    });

    const allMatches = [...scopedResults.matches, ...generalResults.matches];

    // Sort by score and dedupe
    const seen = new Set<string>();
    return allMatches
      .sort((a, b) => (b.score ?? 0) - (a.score ?? 0))
      .filter((match) => {
        const content = match.metadata?.content as string;
        if (!content || seen.has(content)) return false;
        seen.add(content);
        return true;
      })
      .slice(0, topK)
      .map((match) => match.metadata?.content as string);
  }

  // Fallback to standard retrieval
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
 * Delete all vectors for a repository before re-indexing.
 *
 * Uses a streaming approach with async generators to prevent memory bloat
 * for large repositories. Includes retry logic, rate limiting, and timeout
 * protection for serverless environments.
 *
 * @param repoId - The repository identifier (e.g., "owner/repo")
 * @returns Statistics about the deletion operation
 * @throws Error if repoId is invalid or operation times out
 */
export async function deleteRepositoryVectors(
  repoId: string,
): Promise<DeletionStats> {
  const startTime = Date.now();

  // Input validation
  validateRepoId(repoId);

  const prefix = `${repoId}-`;
  const checkTimeout = createTimeoutChecker(
    `Delete vectors for ${repoId}`,
    MAX_OPERATION_DURATION_MS,
  );

  const stats: DeletionStats = {
    totalFound: 0,
    totalDeleted: 0,
    failedBatches: 0,
    retriedOperations: 0,
    durationMs: 0,
  };

  try {
    // Accumulator for batching deletions efficiently
    let pendingIds: string[] = [];

    // Stream through vector IDs and delete in batches
    for await (const batchIds of listVectorIdBatches(prefix, checkTimeout)) {
      stats.totalFound += batchIds.length;
      pendingIds.push(...batchIds);

      // Delete when we've accumulated enough IDs
      while (pendingIds.length >= DELETE_BATCH_SIZE) {
        checkTimeout();

        const deleteBatch = pendingIds.slice(0, DELETE_BATCH_SIZE);
        pendingIds = pendingIds.slice(DELETE_BATCH_SIZE);

        try {
          await withRetry(
            () => pineconeIndex.deleteMany(deleteBatch),
            `Delete batch of ${deleteBatch.length} vectors`,
          );
          stats.totalDeleted += deleteBatch.length;
        } catch (error) {
          stats.failedBatches++;
          console.error(
            `Failed to delete batch after ${MAX_RETRY_ATTEMPTS} attempts:`,
            error,
          );
          // Continue with remaining batches instead of failing completely
        }

        // Rate limiting between delete operations
        await sleep(RATE_LIMIT_DELAY_MS);
      }
    }

    // Delete any remaining IDs
    if (pendingIds.length > 0) {
      checkTimeout();

      try {
        await withRetry(
          () => pineconeIndex.deleteMany(pendingIds),
          `Delete final batch of ${pendingIds.length} vectors`,
        );
        stats.totalDeleted += pendingIds.length;
      } catch (error) {
        stats.failedBatches++;
        console.error(
          `Failed to delete final batch after ${MAX_RETRY_ATTEMPTS} attempts:`,
          error,
        );
      }
    }

    stats.durationMs = Date.now() - startTime;

    // Log final results and handle partial failures
    if (stats.totalFound === 0) {
      console.log(`No vectors found for repository: ${repoId}`);
      return stats;
    }

    if (stats.failedBatches > 0) {
      console.warn(
        `Partial deletion completed for ${repoId}. ` +
          `Deleted ${stats.totalDeleted}/${stats.totalFound} vectors. ` +
          `Failed batches: ${stats.failedBatches}. ` +
          `Duration: ${stats.durationMs}ms`,
      );
      // Throw error for partial failures so callers can handle appropriately
      throw new PartialDeletionError(stats, repoId);
    }

    console.log(
      `Successfully deleted ${stats.totalDeleted} vectors for repository: ${repoId}. ` +
        `Duration: ${stats.durationMs}ms`,
    );

    return stats;
  } catch (error) {
    stats.durationMs = Date.now() - startTime;

    // Re-throw PartialDeletionError as-is
    if (error instanceof PartialDeletionError) {
      throw error;
    }

    console.error(
      `Failed to delete vectors for ${repoId} after ${stats.durationMs}ms:`,
      error,
    );
    throw error;
  }
}

/**
 * Alternative deletion method using metadata filter.
 * This is more efficient for Pinecone serverless indexes as it doesn't
 * require listing vectors first.
 *
 * Note: This approach deletes vectors based on the repoId metadata field,
 * which must be indexed as a filterable field in Pinecone.
 *
 * @param repoId - The repository identifier
 * @returns Promise that resolves when deletion is complete
 */
export async function deleteRepositoryVectorsByMetadata(
  repoId: string,
): Promise<void> {
  validateRepoId(repoId);

  try {
    await withRetry(
      () =>
        pineconeIndex.deleteMany({
          filter: { repoId: { $eq: repoId } },
        }),
      `Delete vectors by metadata for ${repoId}`,
    );

    console.log(`Deleted all vectors with repoId metadata: ${repoId}`);
  } catch (error) {
    console.error(`Failed to delete vectors by metadata for ${repoId}:`, error);
    throw error;
  }
}
