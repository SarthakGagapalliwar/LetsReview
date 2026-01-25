import { serve } from "inngest/next";
import { inngest } from "../../../inngest/client";
import {
  indexRepo,
  reindexRepo,
  generateFullRepoReview,
  updateIndexStatus,
} from "../../../inngest/functions";
import { generateReview } from "@/inngest/functions/review";

export const maxDuration = 300;

// Create an API that serves zero functions
export const { GET, POST, PUT } = serve({
  client: inngest,
  functions: [
    indexRepo,
    reindexRepo,
    generateReview,
    generateFullRepoReview,
    updateIndexStatus,
  ],
});
