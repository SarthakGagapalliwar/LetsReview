# Problems to fix later

## Critical (confirmed)

1. GitHub webhook secret is not configured when creating webhooks, so signatures won’t be sent by GitHub.
   - Evidence: [module/github/lib/github.ts](module/github/lib/github.ts)

2. Webhook signature verification is effectively bypassed when `GITHUB_WEBHOOK_SECRET` is missing (handler accepts requests).
   - Evidence: [app/api/webhooks/github/route.ts](app/api/webhooks/github/route.ts)

3. Trusted origins include development URLs in the main auth config (risk in production).
   - Evidence: [lib/auth.ts](lib/auth.ts)

4. OAuth tokens are stored in plaintext in the database (access/refresh tokens in `Account`).
   - Evidence: [prisma/schema.prisma](prisma/schema.prisma)
