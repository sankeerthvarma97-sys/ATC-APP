# Airport Operations Control Center

AOCC is a full-stack educational airport-operations simulation built with Next.js, Auth.js, Prisma, Socket.IO, Leaflet, Recharts, and the Vercel AI SDK.

It is not certified aviation, dispatch, or air-traffic-control software. All traffic, radio, AI, and emergency behavior is simulated for learning and interview demonstration.

## What Is Implemented

- Auth.js credentials login with role-aware sessions and RBAC checks.
- PostgreSQL Prisma schema for users, Auth.js sessions, flights, resources, events, messages, AI analyses, and audit logs.
- Server-side simulation services for aircraft movement, risk, resources, commands, radio messages, metrics, and events.
- REST route handlers with Zod validation and authorization.
- Custom Next.js server with Socket.IO for server-side real-time updates.
- Interactive operations console with live map, traffic board, command panel, radio console, event feed, metrics, charts, and AI briefing.
- Vercel AI SDK integration using AI Gateway or direct Gemini, with a clearly labeled deterministic fallback when no API key is configured.
- Production build, lint, typecheck, and Vitest coverage for core simulation logic.

## Demo Accounts

All demo users use password `AoccDemo!2026`.

- `atc@aocc.test`
- `admin@aocc.test`
- `ground@aocc.test`
- `viewer@aocc.test`

## Local Development

```bash
npm install
npm run dev
```

Open `http://localhost:3000`.

By default, `.env.example` sets `AOCC_USE_DATABASE=false`, so the app runs with deterministic in-memory simulation data. This keeps the demo usable without a local Postgres server.

## PostgreSQL Mode

1. Start Postgres or use Docker Compose.
2. Set `AOCC_USE_DATABASE=true`.
3. Set `DATABASE_URL`.
4. Run:

```bash
npm run db:push
npm run db:seed
npm run dev
```

Prisma 7 uses `prisma.config.ts` for datasource URLs and `@prisma/adapter-pg` for runtime connections.

## AI Configuration

Use one of these:

```bash
AI_GATEWAY_API_KEY="..."
AOCC_AI_MODEL="google/gemini-3.8-flash"
```

or:

```bash
GOOGLE_GENERATIVE_AI_API_KEY="..."
AOCC_GOOGLE_MODEL="gemini-3.8-flash"
```

If neither key is present, `/api/ai/briefing` returns a deterministic simulated briefing and labels it as fallback output.

## External Integrations

Optional provider-backed APIs are isolated behind server routes and never expose server secrets to the browser.

- `GET /api/integrations/health` reports safe configuration status for database, AI, Mapbox, storage, and email.
- `POST /api/integrations/storage/presign` creates S3-compatible upload or download URLs for simulation artifacts.
- `POST /api/integrations/storage/upload` uploads small text/JSON simulation artifacts through the server.
- `GET /api/integrations/storage/objects` lists configured object-storage keys.
- `DELETE /api/integrations/storage/objects` deletes a configured object-storage key.
- `POST /api/integrations/email/send` sends a Resend-backed operational notification email.

Configure:

```bash
NEXT_PUBLIC_MAPBOX_TOKEN="..."
AWS_ENDPOINT_URL_S3="..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-2"
S3_BUCKET="..."
RESEND_API_KEY="..."
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

## Verification

```bash
npm run typecheck
npm run lint
npm test
npm run build
```

## Deployment Notes

The app uses a custom Node server (`server.mjs`) because Socket.IO needs direct access to the HTTP upgrade lifecycle. Deploy it to a Node runtime that supports long-lived WebSocket connections.

For container deployment:

```bash
docker compose up --build
```

Set strong production values for `NEXTAUTH_SECRET`, `DATABASE_URL`, and AI credentials before exposing the app outside a local demo environment.
