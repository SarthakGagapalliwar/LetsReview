import { ToolLoopAgent, tool, stepCountIs } from "ai";
import { createOpenRouter } from "@openrouter/ai-sdk-provider";
import { z } from "zod";
import { retrieveContext } from "./rag";
import { createOpenAICompatible } from "@ai-sdk/openai-compatible";

// ============================================================================
// Types and Schemas
// ============================================================================

/**
 * Schema for the classifier output - defines agent roles and scopes
 */
const ClassifierOutputSchema = z.object({
  projectSummary: z
    .string()
    .describe("Brief summary of what this project does"),
  techStack: z
    .array(z.string())
    .describe("Detected technologies and frameworks"),
  agents: z
    .array(
      z.object({
        role: z
          .string()
          .describe(
            "Agent role name (e.g., 'Frontend Specialist', 'Backend Specialist')",
          ),
        scope: z.string().describe("What this agent should focus on"),
        filePatterns: z
          .array(z.string())
          .describe("File path patterns this agent should review"),
        riskAreas: z.array(z.string()).describe("Specific risk areas to check"),
      }),
    )
    .min(2)
    .max(6)
    .describe("List of specialized agents to deploy"),
});

export type ClassifierOutput = z.infer<typeof ClassifierOutputSchema>;

/**
 * Schema for individual agent review output
 */
const AgentReviewSchema = z.object({
  role: z.string(),
  scope: z.string(),
  findings: z.array(
    z.object({
      severity: z.enum(["critical", "major", "minor", "info"]),
      category: z.string(),
      title: z.string(),
      description: z.string(),
      file: z.string().optional(),
      suggestion: z.string().optional(),
    }),
  ),
  summary: z.string(),
  score: z.number().min(0).max(100),
});

export type AgentReview = z.infer<typeof AgentReviewSchema>;

/**
 * Schema for aggregated final review
 */
const AggregatedReviewSchema = z.object({
  overallScore: z.number().min(0).max(100),
  verdict: z.enum([
    "excellent",
    "good",
    "needs_improvement",
    "critical_issues",
  ]),
  executiveSummary: z.string(),
  keyFindings: z.array(
    z.object({
      severity: z.enum(["critical", "major", "minor", "info"]),
      title: z.string(),
      description: z.string(),
      affectedArea: z.string(),
    }),
  ),
  categoryScores: z.record(z.string(), z.number()),
  recommendations: z.array(z.string()),
  agentSummaries: z.array(
    z.object({
      role: z.string(),
      score: z.number(),
      summary: z.string(),
    }),
  ),
});

export type AggregatedReview = z.infer<typeof AggregatedReviewSchema>;

// ============================================================================
// Orchestrator Configuration
// ============================================================================

const openrouter = createOpenRouter({
  apiKey: process.env.OPENROUTER_API_KEY,
});

// const nim = createOpenAICompatible({
//   name: "nim",
//   baseURL: "https://integrate.api.nvidia.com/v1",
//   headers: {
//     Authorization: `Bearer ${process.env.NIM_API_KEY}`,
//   },
// });

// Using capable models for structured output generation
// Gemini 2.0 Flash is good at JSON/structured output and tool calling
const orchestratorModel = openrouter.chat("google/gemini-3-flash-preview");
const workerModel = openrouter.chat("google/gemini-3-flash-preview");

// const orchestratorModel = nim.chatModel("moonshotai/kimi-k2-thinking");
// const workerModel = nim.chatModel("moonshotai/kimi-k2-thinking");

// ============================================================================
// Classifier Agent (Manager) - Full ToolLoopAgent
// ============================================================================

/**
 * Creates the classifier agent that analyzes codebase and assigns review agents
 */
function createClassifierAgent(codebaseContext: string[]) {
  return new ToolLoopAgent({
    model: orchestratorModel,
    instructions: `You are a Senior Technical Architect analyzing a codebase to determine the best review strategy.

Your task is to:
1. Understand what this project does and its tech stack
2. Identify the key areas that need specialized review
3. Assign specialized agents based on the actual technologies and code patterns found

IMPORTANT RULES:
- Assign 2-6 agents based on project complexity
- Each agent should have a clear, non-overlapping scope
- Consider both technology-based roles (Frontend, Backend, API) and risk-based roles (Security, Performance)
- Be specific about file patterns (e.g., "*.tsx", "src/api/**", "prisma/**")
- Identify high-risk areas that need extra attention

Common agent roles (adapt based on what you find):
- Frontend Specialist: UI components, state management, styling
- Backend Specialist: Server logic, business rules, data processing  
- API/Integration Specialist: API routes, external integrations, webhooks
- Database Specialist: Schema design, queries, migrations, data models
- Security Specialist: Auth, input validation, secrets, vulnerabilities
- DevOps/Infrastructure: Config files, deployment, environment setup
- Performance Specialist: Optimization, caching, memory usage

CRITICAL: You MUST call the submitClassification tool with your complete analysis. Do not just generate text - you must use the tool.`,
    tools: {
      listFiles: tool({
        description: "List all files available in the codebase context",
        inputSchema: z.object({}),
        execute: async () => {
          const files = codebaseContext
            .map((content) => {
              const match = content.match(/^File:\s*(.+?)(?:\n|$)/);
              return match ? match[1].trim() : null;
            })
            .filter(Boolean);
          return { totalFiles: files.length, files: files.slice(0, 50) };
        },
      }),
      searchPatterns: tool({
        description:
          "Search for specific patterns or keywords in the codebase to detect technologies",
        inputSchema: z.object({
          patterns: z
            .array(z.string())
            .describe(
              "Patterns to search for (e.g., 'react', 'prisma', 'express')",
            ),
        }),
        execute: async ({ patterns }) => {
          const results: Record<string, number> = {};
          for (const pattern of patterns) {
            const matches = codebaseContext.filter((content) =>
              content.toLowerCase().includes(pattern.toLowerCase()),
            );
            results[pattern] = matches.length;
          }
          return results;
        },
      }),
      analyzeFile: tool({
        description:
          "Read content of a specific file to understand its purpose",
        inputSchema: z.object({
          fileName: z.string().describe("Name or path of the file to analyze"),
        }),
        execute: async ({ fileName }) => {
          const match = codebaseContext.find((content) =>
            content.toLowerCase().includes(fileName.toLowerCase()),
          );
          return match
            ? { content: match.slice(0, 1500) }
            : { error: "File not found" };
        },
      }),
      submitClassification: tool({
        description:
          "Submit the final classification with project summary, tech stack, and agent assignments. You MUST call this tool when you have completed your analysis.",
        inputSchema: ClassifierOutputSchema,
        // No execute function - stops the agent and we extract the result
      }),
    },
    toolChoice: "auto", // Force the model to use tools
    stopWhen: stepCountIs(10), // Max 10 steps for classification
    // Force submitClassification on later steps if agent hasn't submitted yet
    // prepareStep: async ({ stepNumber, steps }) => {
    //   // Check if submitClassification was already called
    //   const hasSubmitted = steps.some((step) =>
    //     step.toolCalls?.some((tc) => tc.toolName === "submitClassification"),
    //   );

    //   // If we're on step 7+ and haven't submitted, force the submit tool
    //   if (stepNumber >= 7 && !hasSubmitted) {
    //     return {
    //       toolChoice: {
    //         type: "tool" as const,
    //         toolName: "submitClassification",
    //       },
    //     };
    //   }
    //   return {};
    // },
  });
}

/**
 * Analyzes the codebase structure and determines which specialized agents to deploy
 */
export async function classifyCodebase(
  repoId: string,
  codebaseContext: string[],
): Promise<ClassifierOutput> {
  const prompt = `Analyze this codebase and determine the optimal agent configuration for a comprehensive code review.

Repository: ${repoId}

You have access to ${codebaseContext.length} files from this repository. Use the tools to:
1. List available files to understand the project structure
2. Search for technology patterns (react, next, prisma, express, etc.)
3. Analyze key files like package.json, config files, etc.

When ready, call submitClassification with your complete analysis including project summary, tech stack, and 2-6 specialized review agents.`;

  const classifierAgent = createClassifierAgent(codebaseContext);
  const result = await classifierAgent.generate({ prompt });

  // Extract classification from the submitClassification tool call
  const submitToolCall = result.staticToolCalls?.find(
    (tc) => tc.toolName === "submitClassification",
  );

  if (submitToolCall) {
    return submitToolCall.input as ClassifierOutput;
  }

  // If agent didn't submit, throw an error (we want pure agent behavior)
  throw new Error(
    "Classifier agent failed to submit classification. Please retry.",
  );
}

// ============================================================================
// Worker Agent - Uses ToolLoopAgent pattern with tools
// ============================================================================

/**
 * Creates a specialized worker agent for reviewing a specific scope
 */
function createWorkerAgent(
  agent: ClassifierOutput["agents"][0],
  repoId: string,
  codebaseContext: string[],
) {
  // Filter context to relevant files based on patterns
  const relevantContext = filterContextByPatterns(
    codebaseContext,
    agent.filePatterns,
  );

  const contextToUse =
    relevantContext.length > 0 ? relevantContext : codebaseContext.slice(0, 5);

  return new ToolLoopAgent({
    model: workerModel,
    instructions: `You are a ${agent.role} conducting a thorough code review.

Your specific focus areas:
- Scope: ${agent.scope}
- File patterns: ${agent.filePatterns.join(", ")}
- Risk areas to check: ${agent.riskAreas.join(", ")}

Review Guidelines:
1. Be thorough but focus on your assigned scope
2. Identify issues by severity:
   - critical: Security vulnerabilities, data loss risks, crashes
   - major: Bugs, performance issues, architectural problems
   - minor: Code style, best practices, minor optimizations
   - info: Suggestions, observations, nice-to-haves
3. Provide actionable suggestions for each finding
4. Score the code quality in your area (0-100)
5. Keep findings specific and file-referenced when possible

CRITICAL: You MUST call the submitReview tool with your complete findings. Do not just generate text - you must use the tool.`,
    tools: {
      searchCode: tool({
        description:
          "Search for specific code patterns or files in the codebase context",
        inputSchema: z.object({
          query: z.string().describe("Search pattern or keyword to find"),
        }),
        execute: async ({ query }) => {
          const matches = contextToUse.filter((content) =>
            content.toLowerCase().includes(query.toLowerCase()),
          );
          return {
            found: matches.length,
            matches: matches.slice(0, 3).map((m) => m.slice(0, 500)),
          };
        },
      }),
      analyzeFile: tool({
        description: "Get the content of a specific file from the context",
        inputSchema: z.object({
          filePattern: z.string().describe("File path pattern to analyze"),
        }),
        execute: async ({ filePattern }) => {
          const match = contextToUse.find((content) =>
            content.toLowerCase().includes(filePattern.toLowerCase()),
          );
          return match
            ? { content: match.slice(0, 2000) }
            : { error: "File not found in context" };
        },
      }),
      submitReview: tool({
        description:
          "Submit the final code review findings. You MUST call this tool when you have completed your analysis.",
        inputSchema: AgentReviewSchema,
        // No execute function - this stops the agent and we extract the result
      }),
    },
    toolChoice: "auto", // Force the model to use tools
    stopWhen: stepCountIs(12), // Max 12 steps per worker
    // Force submitReview on later steps if agent hasn't submitted yet
    // prepareStep: async ({ stepNumber, steps }) => {
    //   const hasSubmitted = steps.some((step) =>
    //     step.toolCalls?.some((tc) => tc.toolName === "submitReview"),
    //   );

    //   if (stepNumber >= 8 && !hasSubmitted) {
    //     return {
    //       toolChoice: { type: "tool" as const, toolName: "submitReview" },
    //     };
    //   }
    //   return {};
    // },
  });
}

/**
 * Runs a specialized agent review on a specific scope of the codebase
 */
export async function runAgentReview(
  agent: ClassifierOutput["agents"][0],
  repoId: string,
  codebaseContext: string[],
): Promise<AgentReview> {
  const relevantContext = filterContextByPatterns(
    codebaseContext,
    agent.filePatterns,
  );

  const contextToUse =
    relevantContext.length > 0 ? relevantContext : codebaseContext.slice(0, 5);

  const prompt = `Conduct a code review for your assigned scope.

Repository: ${repoId}
Your Role: ${agent.role}
Scope: ${agent.scope}

Relevant Code Context:
${contextToUse.join("\n\n---\n\n")}

Analyze the code and when ready, call submitReview with your complete findings including role, scope, findings array, summary, and score.`;

  const workerAgent = createWorkerAgent(agent, repoId, codebaseContext);

  const result = await workerAgent.generate({ prompt });

  // Extract the review from the submitReview tool call (staticToolCalls for tools without execute)
  const submitToolCall = result.staticToolCalls?.find(
    (tc) => tc.toolName === "submitReview",
  );

  if (submitToolCall) {
    return submitToolCall.input as AgentReview;
  }

  // If agent didn't use the submit tool but generated text, create a basic review from it
  // This is pure agent behavior - no fallback to generateText
  return {
    role: agent.role,
    scope: agent.scope,
    findings: [],
    summary:
      result.text || "Agent completed analysis without structured findings",
    score: 70, // Default neutral score
  };
}

/**
 * Filter codebase context to files matching given patterns
 */
function filterContextByPatterns(
  context: string[],
  patterns: string[],
): string[] {
  if (!patterns.length) return context;

  return context.filter((content) => {
    // Extract file path from content (assumes format "File: path\n\n...")
    const match = content.match(/^File:\s*(.+?)(?:\n|$)/);
    if (!match) return false;

    const filePath = match[1].trim();

    return patterns.some((pattern) => {
      // Convert glob-like patterns to regex
      const regexPattern = pattern
        .replace(/\*\*/g, ".*")
        .replace(/\*/g, "[^/]*")
        .replace(/\./g, "\\.");

      return new RegExp(regexPattern, "i").test(filePath);
    });
  });
}

// ============================================================================
// Aggregator Agent - Uses ToolLoopAgent for intelligent aggregation
// ============================================================================

/**
 * Creates the aggregator agent that synthesizes all reviews
 */
function createAggregatorAgent() {
  return new ToolLoopAgent({
    model: orchestratorModel,
    instructions: `You are a Principal Engineer creating a final code review report by synthesizing multiple specialist reviews.

Your task:
1. Combine findings from all specialist agents
2. Eliminate duplicates and prioritize by severity
3. Calculate an overall score based on agent scores and finding severity
4. Provide an executive summary suitable for stakeholders
5. Create actionable recommendations

Scoring Guidelines:
- 90-100: Excellent - Production ready, minimal issues
- 70-89: Good - Some improvements needed, no blockers
- 50-69: Needs Improvement - Significant issues to address
- 0-49: Critical Issues - Major problems requiring immediate attention

Verdict mapping:
- excellent: 90-100
- good: 70-89
- needs_improvement: 50-69
- critical_issues: 0-49

CRITICAL: You MUST call the submitAggregatedReview tool with your complete synthesis. Do not just generate text - you must use the tool.`,
    tools: {
      calculateScore: tool({
        description: "Calculate a weighted average score from agent scores",
        inputSchema: z.object({
          scores: z.array(z.number()).describe("Array of agent scores"),
          criticalFindings: z.number().describe("Number of critical findings"),
          majorFindings: z.number().describe("Number of major findings"),
        }),
        execute: async ({ scores, criticalFindings, majorFindings }) => {
          const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
          const penalty = criticalFindings * 10 + majorFindings * 3;
          const finalScore = Math.max(0, Math.min(100, avgScore - penalty));
          return { avgScore, penalty, finalScore: Math.round(finalScore) };
        },
      }),
      submitAggregatedReview: tool({
        description:
          "Submit the final aggregated review. You MUST call this tool when you have synthesized all agent reviews.",
        inputSchema: AggregatedReviewSchema,
        // No execute function - this stops the agent and we extract the result
      }),
    },
    toolChoice: "auto", // Force the model to use tools
    stopWhen: stepCountIs(8), // Max 8 steps for aggregation
    // Force submitAggregatedReview on later steps if agent hasn't submitted yet
    // prepareStep: async ({ stepNumber, steps }) => {
    //   const hasSubmitted = steps.some((step) =>
    //     step.toolCalls?.some((tc) => tc.toolName === "submitAggregatedReview"),
    //   );

    //   if (stepNumber >= 5 && !hasSubmitted) {
    //     return {
    //       toolChoice: {
    //         type: "tool" as const,
    //         toolName: "submitAggregatedReview",
    //       },
    //     };
    //   }
    //   return {};
    // },
  });
}

/**
 * Aggregates all agent reviews into a final comprehensive report
 */
export async function aggregateReviews(
  repoId: string,
  projectSummary: string,
  techStack: string[],
  agentReviews: AgentReview[],
): Promise<AggregatedReview> {
  const agentSummaryText = agentReviews
    .map(
      (review) => `
### ${review.role} (Score: ${review.score}/100)
Scope: ${review.scope}
Summary: ${review.summary}

Findings (${review.findings.length} total):
${review.findings.map((f) => `- [${f.severity.toUpperCase()}] ${f.title}: ${f.description}`).join("\n")}
`,
    )
    .join("\n\n");

  const prompt = `Create a comprehensive final review report by aggregating these specialist reviews.

Repository: ${repoId}
Project: ${projectSummary}
Tech Stack: ${techStack.join(", ")}

Agent Reviews:
${agentSummaryText}

First, use the calculateScore tool to compute the overall score based on the agent scores and findings.
Then call submitAggregatedReview with your complete synthesis including overall score, verdict, executive summary, key findings, category scores, recommendations, and agent summaries.`;

  const aggregatorAgent = createAggregatorAgent();

  const result = await aggregatorAgent.generate({ prompt });

  // Extract the aggregated review from the submitAggregatedReview tool call (staticToolCalls for tools without execute)
  const submitToolCall = result.staticToolCalls?.find(
    (tc) => tc.toolName === "submitAggregatedReview",
  );

  if (submitToolCall) {
    return submitToolCall.input as AggregatedReview;
  }

  // Pure agent behavior - create a minimal review from agent scores if submit tool wasn't called
  const scores = agentReviews.map((r) => r.score);
  const avgScore = Math.round(
    scores.reduce((a, b) => a + b, 0) / scores.length,
  );
  const allFindings = agentReviews.flatMap((r) => r.findings);
  const criticalCount = allFindings.filter(
    (f) => f.severity === "critical",
  ).length;
  const majorCount = allFindings.filter((f) => f.severity === "major").length;
  const adjustedScore = Math.max(
    0,
    avgScore - criticalCount * 10 - majorCount * 3,
  );

  return {
    overallScore: adjustedScore,
    verdict:
      adjustedScore >= 90
        ? "excellent"
        : adjustedScore >= 70
          ? "good"
          : adjustedScore >= 50
            ? "needs_improvement"
            : "critical_issues",
    executiveSummary:
      result.text ||
      `Aggregated review of ${agentReviews.length} specialist agents.`,
    keyFindings: allFindings.slice(0, 10).map((f) => ({
      severity: f.severity,
      title: f.title,
      description: f.description,
      affectedArea: f.category,
    })),
    categoryScores: Object.fromEntries(
      agentReviews.map((r) => [r.role, r.score]),
    ),
    recommendations: [
      "Review the detailed agent reports for specific improvements.",
    ],
    agentSummaries: agentReviews.map((r) => ({
      role: r.role,
      score: r.score,
      summary: r.summary,
    })),
  };
}

// ============================================================================
// Main Orchestrator
// ============================================================================

export interface OrchestratorResult {
  classifier: ClassifierOutput;
  agentReviews: AgentReview[];
  aggregatedReview: AggregatedReview;
  formattedReview: string;
}

/**
 * Main orchestrator that coordinates the full-repo review process
 *
 * Flow:
 * 1. Classifier analyzes codebase and assigns agents
 * 2. Worker agents run in parallel on their scopes
 * 3. Aggregator merges all reviews into final report
 */
export async function orchestrateFullRepoReview(
  repoId: string,
  onProgress?: (stage: string, detail: string) => void,
): Promise<OrchestratorResult> {
  const progress = onProgress || (() => {});

  // Step 1: Load codebase context from Pinecone
  progress("loading", "Fetching codebase context from vector store...");
  const codebaseContext = await retrieveContext(
    "full codebase architecture components features",
    repoId,
    5000, // Get more context for full review
  );

  if (codebaseContext.length === 0) {
    throw new Error(
      `No indexed content found for repository: ${repoId}. Please ensure the repository is indexed first.`,
    );
  }

  // Step 2: Classify and determine agents
  progress(
    "classifying",
    "Analyzing codebase structure and assigning review agents...",
  );
  const classifier = await classifyCodebase(repoId, codebaseContext);

  progress(
    "classifying",
    `Assigned ${classifier.agents.length} agents: ${classifier.agents.map((a) => a.role).join(", ")}`,
  );

  // Step 3: Run agent reviews in parallel
  progress(
    "reviewing",
    `Running ${classifier.agents.length} specialized agent reviews...`,
  );

  const agentReviewPromises = classifier.agents.map((agent, index) =>
    runAgentReview(agent, repoId, codebaseContext).then((review) => {
      progress(
        "reviewing",
        `Agent ${index + 1}/${classifier.agents.length} completed: ${agent.role}`,
      );
      return review;
    }),
  );

  const agentReviews = await Promise.all(agentReviewPromises);

  // Step 4: Aggregate all reviews
  progress("aggregating", "Merging agent reviews into final report...");
  const aggregatedReview = await aggregateReviews(
    repoId,
    classifier.projectSummary,
    classifier.techStack,
    agentReviews,
  );

  // Step 5: Format final review as markdown
  progress("formatting", "Generating final review document...");
  const formattedReview = formatReviewAsMarkdown(
    repoId,
    classifier,
    agentReviews,
    aggregatedReview,
  );

  progress("completed", "Full repository review completed!");

  return {
    classifier,
    agentReviews,
    aggregatedReview,
    formattedReview,
  };
}

// ============================================================================
// Markdown Formatter
// ============================================================================

/**
 * Formats the aggregated review as a comprehensive markdown document
 */
function formatReviewAsMarkdown(
  repoId: string,
  classifier: ClassifierOutput,
  agentReviews: AgentReview[],
  aggregated: AggregatedReview,
): string {
  const severityEmoji = {
    critical: "🔴",
    major: "🟠",
    minor: "🟡",
    info: "ℹ️",
  };

  const verdictEmoji = {
    excellent: "✅",
    good: "👍",
    needs_improvement: "⚠️",
    critical_issues: "🚨",
  };

  const scoreBar = (score: number) => {
    const filled = Math.round(score / 10);
    return "█".repeat(filled) + "░".repeat(10 - filled);
  };

  let md = `# 🔍 Full Repository Review

## ${repoId}

---

## 📊 Executive Summary

**Overall Score: ${aggregated.overallScore}/100** ${scoreBar(aggregated.overallScore)}

**Verdict: ${verdictEmoji[aggregated.verdict]} ${aggregated.verdict.replace(/_/g, " ").toUpperCase()}**

${aggregated.executiveSummary}

---

## 🏗️ Project Overview

**Summary:** ${classifier.projectSummary}

**Tech Stack:** ${classifier.techStack.map((t) => `\`${t}\``).join(" • ")}

---

## 📈 Category Scores

| Category | Score |
|----------|-------|
${Object.entries(aggregated.categoryScores)
  .map(([cat, score]) => `| ${cat} | ${score}/100 ${scoreBar(score)} |`)
  .join("\n")}

---

## 🎯 Key Findings

`;

  // Group findings by severity
  const criticalFindings = aggregated.keyFindings.filter(
    (f) => f.severity === "critical",
  );
  const majorFindings = aggregated.keyFindings.filter(
    (f) => f.severity === "major",
  );
  const minorFindings = aggregated.keyFindings.filter(
    (f) => f.severity === "minor",
  );
  const infoFindings = aggregated.keyFindings.filter(
    (f) => f.severity === "info",
  );

  if (criticalFindings.length > 0) {
    md += `### 🔴 Critical Issues (${criticalFindings.length})

> [!CAUTION]
> These issues require immediate attention before deployment.

${criticalFindings
  .map(
    (f) => `
<details>
<summary>${severityEmoji[f.severity]} ${f.title}</summary>

**Area:** ${f.affectedArea}

${f.description}

</details>
`,
  )
  .join("\n")}

`;
  }

  if (majorFindings.length > 0) {
    md += `### 🟠 Major Issues (${majorFindings.length})

> [!WARNING]
> These issues should be addressed in the near term.

${majorFindings
  .map(
    (f) => `
<details>
<summary>${severityEmoji[f.severity]} ${f.title}</summary>

**Area:** ${f.affectedArea}

${f.description}

</details>
`,
  )
  .join("\n")}

`;
  }

  if (minorFindings.length > 0) {
    md += `### 🟡 Minor Issues (${minorFindings.length})

<details>
<summary>View minor issues</summary>

${minorFindings.map((f) => `- **${f.title}** (${f.affectedArea}): ${f.description}`).join("\n")}

</details>

`;
  }

  if (infoFindings.length > 0) {
    md += `### ℹ️ Observations (${infoFindings.length})

<details>
<summary>View observations</summary>

${infoFindings.map((f) => `- **${f.title}** (${f.affectedArea}): ${f.description}`).join("\n")}

</details>

`;
  }

  md += `---

## 💡 Recommendations

${aggregated.recommendations.map((r, i) => `${i + 1}. ${r}`).join("\n")}

---

## 🤖 Agent Reports

`;

  // Add individual agent reports
  agentReviews.forEach((review) => {
    md += `
<details>
<summary><strong>${review.role}</strong> - Score: ${review.score}/100</summary>

**Scope:** ${review.scope}

**Summary:** ${review.summary}

**Findings (${review.findings.length}):**

${
  review.findings.length > 0
    ? review.findings
        .map(
          (f) => `
| Severity | Category | Issue |
|----------|----------|-------|
| ${severityEmoji[f.severity]} ${f.severity} | ${f.category} | ${f.title} |

${f.description}
${f.file ? `\n**File:** \`${f.file}\`` : ""}
${f.suggestion ? `\n**Suggestion:** ${f.suggestion}` : ""}

---
`,
        )
        .join("\n")
    : "> ✅ No issues found in this area.\n"
}

</details>

`;
  });

  md += `---

*Generated by LetsReview Multi-Agent Code Review System*
*Review completed at: ${new Date().toISOString()}*
`;

  return md;
}
