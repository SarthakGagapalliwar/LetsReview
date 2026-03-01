# LetsReview

**Cut Code Review Time & Bugs in Half. Instantly.**

LetsReview is an AI-powered code review platform that automatically reviews your GitHub pull requests using RAG (Retrieval-Augmented Generation) with contextual understanding of your codebase.

![Next.js](https://img.shields.io/badge/Next.js-16-black)
![Prisma](https://img.shields.io/badge/Prisma-ORM-2D3748)
![Pinecone](https://img.shields.io/badge/Pinecone-Vector%20DB-00A98F)
![Inngest](https://img.shields.io/badge/Inngest-Background%20Jobs-6366F1)

## ✨ Features

- 🤖 **AI-Powered PR Reviews** - Automatic code reviews using multiple AI providers (Google Gemini, OpenRouter, AihubMix)
- 📚 **Contextual Understanding** - RAG with Pinecone indexes your entire codebase for relevant context
- 🔗 **GitHub Integration** - Seamless webhook integration for PR and push events via Octokit
- ⭐ **Star-Based Pro** - Free tier (5 repos, 5 reviews/repo), star our repo for unlimited Pro access
- 🔄 **Auto Re-indexing** - Codebase automatically re-indexed on push to default branch
- 🏢 **Full Repository Reviews** - Multi-agent orchestrated comprehensive repository analysis
- 🎯 **Smart Context Retrieval** - Extracts file paths from PR diffs and retrieves related code context

## 🛠️ Tech Stack

| Category            | Technology                                              |
| ------------------- | ------------------------------------------------------- |
| **Framework**       | Next.js 16 (App Router)                                 |
| **Database**        | PostgreSQL with Prisma ORM                              |
| **Authentication**  | better-auth with GitHub OAuth                           |
| **AI Providers**    | Google Gemini, OpenRouter, AihubMix (via Vercel AI SDK) |
| **Vector Database** | Pinecone                                                |
| **Background Jobs** | Inngest                                                 |
| **UI Components**   | shadcn/ui, Tailwind CSS, Radix UI                       |
| **GitHub API**      | Octokit                                                 |

## 🚀 Getting Started

### Prerequisites

- Node.js 20+ or Bun
- PostgreSQL database
- GitHub OAuth App
- Pinecone account
- AI API key (Google, OpenRouter, or AihubMix)




## 📁 Project Structure

```
letsreview/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── auth/           # better-auth endpoints
│   │   ├── webhooks/       # GitHub webhooks handler
│   │   └── inngest/        # Inngest endpoint
│   └── dashboard/          # Protected dashboard pages
│       ├── admin/          # Admin panel
│       ├── repository/     # Repository management
│       ├── reviews/        # PR review history
│       ├── full-review/    # Full repo reviews
│       ├── settings/       # User settings
│       └── subscriptions/  # Subscription management
├── module/                 # Feature modules (domain-driven)
│   ├── ai/
│   │   ├── lib/
│   │   │   ├── rag.ts          # RAG indexing & context retrieval
│   │   │   └── orchestrator.ts # Multi-agent review orchestrator
│   │   └── actions/        # Server actions
│   ├── auth/               # Authentication components
│   ├── github/
│   │   └── lib/github.ts   # Octokit wrapper (webhooks, PRs, content)
│   ├── payment/            # Subscription & usage management
│   ├── repository/         # Repository CRUD operations
│   └── review/             # Review actions
├── inngest/
│   ├── client.ts           # Inngest client config
│   └── functions/
│       ├── review.ts           # PR review generation
│       └── full-repo-review.ts # Full repository review
├── lib/                    # Core utilities
│   ├── auth.ts             # better-auth server config
│   ├── auth-client.ts      # Auth client hooks
│   ├── db.ts               # Prisma client
│   └── pinecone.ts         # Pinecone client
├── components/             # React components
│   ├── ui/                 # shadcn/ui components
│   └── provider/           # Context providers
└── prisma/
    ├── schema.prisma       # Database schema
    └── migrations/         # Migration history
```

## 🔄 How It Works

### PR Review Flow

```
┌─────────────────┐     ┌──────────────┐     ┌─────────────────┐
│  GitHub Event   │────▶│   Webhook    │────▶│    Inngest      │
│  (PR opened)    │     │   Handler    │     │  review.ts      │
└─────────────────┘     └──────────────┘     └────────┬────────┘
                                                      │
                    ┌─────────────────────────────────┼─────────────────────────────────┐
                    │                                 ▼                                 │
                    │  ┌──────────────┐     ┌─────────────────┐     ┌──────────────┐   │
                    │  │  PR Diff     │     │  RAG Context    │     │     AI       │   │
                    │  │  (GitHub)    │────▶│  (Pinecone)     │────▶│   Review     │   │
                    │  └──────────────┘     └─────────────────┘     └──────┬───────┘   │
                    │                                                      │           │
                    └──────────────────────────────────────────────────────┼───────────┘
                                                                           │
                    ┌──────────────────────────────────────────────────────┼───────────┐
                    │                                                      ▼           │
                    │                                              ┌──────────────┐    │
                    │                                              │ Post Comment │    │
                    │                                              │  (GitHub)    │    │
                    │                                              └──────────────┘    │
                    └──────────────────────────────────────────────────────────────────┘
```

### Detailed Steps

1. **Connect Repository** - User authenticates with GitHub OAuth and selects repositories
2. **Index Codebase** - Inngest job recursively reads all files and indexes them into Pinecone vectors using Google's embedding model
3. **Webhook Registration** - LetsReview automatically creates webhooks for `pull_request` and `push` events
4. **PR Event** - When a PR is opened/updated, GitHub sends a webhook to LetsReview
5. **Context Retrieval** - The system:
   - Fetches the PR diff from GitHub
   - Extracts file paths from the diff
   - Queries Pinecone for related code context using the PR title + description as the search query
6. **AI Review Generation** - PR diff + retrieved context are sent to the AI model
7. **Post Comment** - The AI-generated review is posted as a comment on the PR using Octokit

### Full Repository Review

For comprehensive repository analysis, LetsReview uses a multi-agent orchestrator:

1. **Classification** - AI classifies the repository type and identifies key areas
2. **Agent Assignment** - Multiple specialized agents analyze different aspects (architecture, security, performance, etc.)
3. **Synthesis** - Results are combined into a comprehensive review report

## 📊 Database Models

| Model              | Description                                                  |
| ------------------ | ------------------------------------------------------------ |
| `User`             | User account with subscription tier and star status          |
| `Repository`       | Connected GitHub repositories with index status              |
| `Review`           | Individual PR reviews with idempotency (one per PR revision) |
| `RepositoryReview` | Full repository reviews with agent results                   |
| `ReviewCount`      | Usage tracking per repository                                |
| `UserUsage`        | Aggregate usage stats per user                               |

## 🔐 Subscription Tiers

| Tier                    | Repositories | Reviews per Repo |
| ----------------------- | ------------ | ---------------- |
| **Free**                | 5            | 5                |
| **Pro** (Star our repo) | Unlimited    | Unlimited        |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.
