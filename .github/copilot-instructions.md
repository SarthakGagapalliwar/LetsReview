# LetsReview - AI Coding Instructions

## Project Overview

LetsReview is an AI-powered code review platform built with Next.js 16 (App Router). It integrates with GitHub to automatically review pull requests using RAG (Retrieval-Augmented Generation) with Pinecone vector storage.

NOTE: USE BUN FOR EVERYTHING

## Architecture

### Core Data Flow

1. **GitHub Webhook** → `app/api/webhooks/github/route.ts` receives PR events
2. **Inngest Queue** → Background job processes review via `inngest/functions/review.ts`
3. **RAG Context** → `module/ai/lib/rag.ts` retrieves relevant code context from Pinecone
4. **AI Generation** → Uses NVIDIA NIM (DeepSeek) to generate reviews
5. **GitHub Comment** → Posts review back to the PR

### Module Structure (`module/`)

Each feature domain follows this pattern:

```
module/{feature}/
  ├── actions/      # Server Actions ("use server")
  ├── components/   # React components
  ├── hooks/        # Custom React hooks
  └── lib/          # Utility functions
```

Key modules:

- `ai/` - RAG indexing and context retrieval
- `auth/` - Authentication components (better-auth + GitHub OAuth)
- `github/` - Octokit wrappers for GitHub API
- `payment/` - Polar.sh subscription management
- `repository/` - Repository connection/management

### Authentication

- **Server**: `lib/auth.ts` - better-auth with Prisma adapter
- **Client**: `lib/auth-client.ts` - `useSession`, `signIn`, `signOut`
- GitHub OAuth provides `repo` scope for PR access
- Access tokens stored in `Account` table

### Background Jobs (Inngest)

Functions in `inngest/functions/`:

- `indexRepo` - Index repository code to Pinecone on connect
- `reindexRepo` - Re-index on push to default branch
- `generateReview` - Generate and post AI review

Events: `repository.connect`, `repository.reindex`, `pr.review.requested`

## Key Conventions

### Server Actions

All mutations use Server Actions in `module/{feature}/actions/index.ts`:

```typescript
"use server";
import { auth } from "@/lib/auth";
import { headers } from "next/headers";

export async function myAction() {
  const session = await auth.api.getSession({ headers: await headers() });
  if (!session) throw new Error("Unauthorized");
  // ...
}
```

### Database Access

- Prisma client: `import prisma from "@/lib/db"`
- Generated client path: `lib/generated/prisma`
- Run `prisma generate` before build (handled in `npm run build`)

### UI Components

- shadcn/ui (new-york style) in `components/ui/`
- Icons: lucide-react
- Theming: next-themes via `components/provider/them-provider.tsx`
- Toast notifications: sonner

### Path Aliases

```
@/components  → components/
@/lib         → lib/
@/module      → module/
@/hooks       → hooks/
@/inngest     → inngest/
```

## Development Workflow

### Running Locally

```bash
bun dev              # Next.js dev server
# Separate terminal:
npx inngest-cli dev  # Inngest dev server (or use ngrok for webhooks)
```

### Environment Variables Required

```
DATABASE_URL, GITHUB_CLIENT_ID, GITHUB_CLIENT_SECRET,
PINECONE_DB_API_KEY, NIM_API_KEY, INNGEST_EVENT_KEY,
POLAR_ACCESS_TOKEN, POLAR_WEBHOOK_SECRET
```

### Database Migrations

```bash
npx prisma migrate dev --name <description>
npx prisma generate
```

## Subscription Tiers

Defined in `module/payment/lib/subscription.ts`:

- **FREE**: 5 repositories, 5 reviews per repo
- **PRO**: Unlimited (via Polar.sh)

Usage tracking in `UserUsage` table with `reviewCounts` JSON field.

## Important Patterns

### Fetching GitHub Data

Always get token via session, not directly:

```typescript
const account = await prisma.account.findFirst({
  where: { userId: session.user.id, providerId: "github" },
});
const token = account?.accessToken;
```

### Pinecone Namespace Convention

Repository vectors use `{owner}/{repo}` as namespace identifier.

### React Query

Wrap data fetching hooks with QueryProvider from `components/provider/qurey-provider.tsx`.
