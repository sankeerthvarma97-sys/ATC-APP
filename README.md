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

## Station Clearances & Accounts

Provision staff accounts using your seed script (`npm run db:seed`) and log in using your authorized organizational credentials.

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

For Vercel, the Next.js App Router pages and route handlers build normally with `npm run build`. If the deployment does not run the custom Socket.IO server, the console automatically falls back to authenticated polling against `/api/operations/snapshot`, and the UI labels that mode as `Polling fallback`.

Recommended Vercel environment variables:

```bash
DATABASE_URL="..."
AOCC_USE_DATABASE="true"
NEXTAUTH_URL="https://your-vercel-domain.vercel.app"
NEXTAUTH_SECRET="..."
GOOGLE_GENERATIVE_AI_API_KEY="..."
AOCC_GOOGLE_MODEL="gemini-3.8-flash"
NEXT_PUBLIC_MAPBOX_TOKEN="..."
AWS_ENDPOINT_URL_S3="..."
AWS_ACCESS_KEY_ID="..."
AWS_SECRET_ACCESS_KEY="..."
AWS_REGION="us-east-2"
S3_BUCKET="aocc-artifacts"
RESEND_API_KEY="..."
RESEND_FROM_EMAIL="onboarding@resend.dev"
```

For full Socket.IO behavior in production, use a Node host or container/runtime that keeps `node server.mjs` running and supports WebSocket upgrades.

For container deployment:

```bash
docker compose up --build
```

Set strong production values for `NEXTAUTH_SECRET`, `DATABASE_URL`, and AI credentials before exposing the app outside a local demo environment.


## Production Safety Checklist

- Set `NEXTAUTH_URL` to the exact canonical origin users open in the browser (for example, `https://atc-app-one.vercel.app`). Do not use a different Vercel project alias. After changing it in the hosting dashboard, redeploy the relevant environment and verify the CSRF callback URL, credentials sign-in, session persistence, and sign-out.
- Keep `NEXTAUTH_SECRET` configured as a strong, unique secret in the runtime environment. Never commit secret values or paste them into audit reports.
- Do not set a bootstrap password to a published/demo value. Review `src/lib/auth/bootstrap.ts` and use a unique secret provisioned through the hosting dashboard only if bootstrap behavior actually requires it. Prefer creating or rotating privileged accounts through a controlled administrative workflow.
- `server.mjs` reads `AOCC_SIMULATION_TICK_MS` for its simulation interval. Keep deployment configuration aligned with that exact name.
- The custom `server.mjs` process hosts Socket.IO and the in-memory simulation loop. A Vercel deployment that runs only Next.js route handlers does not keep this process alive; the UI may use the documented polling fallback. For persistent real-time operation, deploy the custom server to a long-lived Node/container service and configure allowed origins deliberately.
- Load/performance scripts are for localhost or explicitly approved staging hosts only. The scripts block known production hostnames. Do not bypass those checks or run load tests against production.
- Before release, run `npm run typecheck`, `npm run lint`, `npm test`, `npm run build`, and the relevant end-to-end tests against an isolated staging environment. Record actual output; do not infer passing tests from previous runs.
