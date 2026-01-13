# LetsReview

**Cut Code Review Time & Bugs in Half. Instantly.**

LetsReview is an AI-powered code review platform that automatically reviews your GitHub pull requests using RAG (Retrieval-Augmented Generation) with contextual understanding of your codebase.

## Features

- 🤖 **AI-Powered Reviews** - Automatic code reviews using NVIDIA NIM (DeepSeek)
- 📚 **Contextual Understanding** - RAG with Pinecone indexes your codebase for relevant context
- 🔗 **GitHub Integration** - Seamless webhook integration for PR events
- 💳 **Subscription Tiers** - Free tier (5 repos, 5 reviews/repo) and Pro unlimited via Polar.sh
- 🔄 **Auto Re-indexing** - Codebase automatically re-indexed on push to default branch

## Tech Stack

- **Framework**: Next.js 16 (App Router)
- **Database**: PostgreSQL with Prisma ORM
- **Auth**: better-auth with GitHub OAuth
- **AI**: NVIDIA NIM API (DeepSeek), Vercel AI SDK
- **Vector DB**: Pinecone
- **Background Jobs**: Inngest
- **Payments**: Polar.sh
- **UI**: shadcn/ui, Tailwind CSS, lucide-react

## Getting Started

### Prerequisites

- Node.js 20+ or Bun
- PostgreSQL database
- GitHub OAuth App
- Pinecone account
- NVIDIA NIM API key

### Environment Variables

Create a `.env` file with:

```env
DATABASE_URL=postgresql://...
BETTER_AUTH_URL=http://localhost:3000

# GitHub OAuth
GITHUB_CLIENT_ID=
GITHUB_CLIENT_SECRET=

# AI & Vector DB
PINECONE_DB_API_KEY=
NIM_API_KEY=

# Background Jobs
INNGEST_EVENT_KEY=

# Payments (Polar.sh)
POLAR_ACCESS_TOKEN=
POLAR_WEBHOOK_SECRET=
```

### Installation

```bash
# Install dependencies
bun install

# Generate Prisma client
npx prisma generate

# Run database migrations
npx prisma migrate dev

# Start development server
bun dev
```

### Running with Inngest (for background jobs)

```bash
# Terminal 1: Next.js dev server
bun dev

# Terminal 2: Inngest dev server
npx inngest-cli dev

# For webhook testing, use ngrok
ngrok http 3000
```

## Project Structure

```
letsreview/
├── app/                    # Next.js App Router
│   ├── api/
│   │   ├── webhooks/       # GitHub & Polar webhooks
│   │   └── inngest/        # Inngest endpoint
│   └── dashboard/          # Protected dashboard pages
├── module/                 # Feature modules
│   ├── ai/                 # RAG indexing & context retrieval
│   ├── auth/               # Authentication components
│   ├── github/             # GitHub API wrappers
│   ├── payment/            # Subscription management
│   ├── repository/         # Repository management
│   └── review/             # Review actions
├── inngest/                # Background job functions
├── lib/                    # Core utilities
│   ├── auth.ts             # better-auth server config
│   ├── auth-client.ts      # Auth client hooks
│   ├── db.ts               # Prisma client
│   └── pinecone.ts         # Pinecone client
├── components/             # React components
│   └── ui/                 # shadcn/ui components
└── prisma/
    └── schema.prisma       # Database schema
```

## How It Works

1. **Connect Repository** - User connects their GitHub repo via OAuth
2. **Index Codebase** - Inngest job indexes code into Pinecone vectors
3. **PR Webhook** - GitHub sends webhook when PR is opened/updated
4. **Generate Review** - AI generates review with RAG context from codebase
5. **Post Comment** - Review is posted as a comment on the PR

## Database Commands

```bash
# Create migration
npx prisma migrate dev --name <description>

# Generate client
npx prisma generate

# Open Prisma Studio
npx prisma studio
```

## Deployment

Deploy on Vercel:

[![Deploy with Vercel](https://vercel.com/button)](https://vercel.com/new/clone?repository-url=https://github.com/your-repo/letsreview)

Ensure all environment variables are configured in your Vercel project settings.

## License

MIT
