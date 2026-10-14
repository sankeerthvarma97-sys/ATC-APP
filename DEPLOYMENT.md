# AOCC Aviation Platform — Cloud Production Deployment Guide

This guide provides end-to-end instructions for deploying the **AOCC Airport Operations Control Center** to **Render**, **Vercel**, and managed **PostgreSQL** (Supabase, Neon, or Render PostgreSQL).

---

## Architecture Overview

AOCC is built with **Next.js App Router** and a persistent **Socket.IO Real-Time Telemetry Engine** (`server.mjs`).

| Deployment Target | Best Suited For | Real-Time WebSocket Support |
|---|---|---|
| **Render (Recommended)** | Full platform (Next.js + Persistent WebSockets + PostgreSQL) | **100% Native 24/7 WebSockets** without serverless disconnects |
| **Vercel** | Front-end edge deployment & serverless API routes | Long-polling fallback or proxy to Render WebSocket server |
| **Hybrid (Vercel + Render)** | Vercel for UI + Render for WebSockets + Neon/Supabase DB | Maximum performance and global edge speed |

---

## Option 1: 1-Click Deployment on Render (Recommended)

Render runs the pre-configured [`Dockerfile`](./Dockerfile) and provides persistent WebSocket connections for live radar tracking.

### Step 1: Push Repository to GitHub
Ensure all code is committed and pushed to your GitHub repository:
```bash
git push origin main
```

### Step 2: Create Blueprint on Render
1. Log in to [Render Dashboard](https://dashboard.render.com).
2. Click **New +** → **Blueprint**.
3. Connect your repository `https://github.com/sankeerthvarma97-sys/ATC-APP`.
4. Render will automatically detect [`render.yaml`](./render.yaml) and provision:
   - **`aocc-postgres`**: Managed PostgreSQL database.
   - **`aocc-aviation-platform`**: Docker Web Service running on port `3000`.
5. Under Environment Variables for `aocc-aviation-platform`, update:
   - `NEXTAUTH_URL`: Set to your assigned Render URL (e.g. `https://aocc-aviation-platform.onrender.com`).
6. Click **Apply**.

### Step 3: Run Database Migrations & Seeding
Once the service builds successfully, open the **Shell** tab in your Render Web Service dashboard and run:
```bash
# Push database schema to PostgreSQL
npx prisma db push

# Seed operational data (airports, flights, staff accounts)
npm run db:seed
```

Your platform is now live 24/7 with permanent Super Admin access!

---

## Option 2: Deploying on Vercel

If you prefer Vercel for the front-end:

### Step 1: Provision a Managed PostgreSQL Database
Vercel serverless functions require an external PostgreSQL database with connection pooling:
- [Neon](https://neon.tech) (Free tier available)
- [Supabase](https://supabase.com) (Free tier available)

Copy the connection string (with `?pgbouncer=true` if using Supabase connection pooler).

### Step 2: Import into Vercel
1. Log in to [Vercel](https://vercel.com).
2. Click **Add New...** → **Project**.
3. Import `ATC-APP`.
4. Configure Environment Variables:

| Variable | Value | Notes |
|---|---|---|
| `DATABASE_URL` | `postgresql://...` | Connection pooled PostgreSQL URI |
| `NEXTAUTH_URL` | `https://your-app.vercel.app` | Your Vercel domain |
| `NEXTAUTH_SECRET` | *(Generate via `openssl rand -base64 32`)* | Authentication encryption key |
| `ADMIN_BOOTSTRAP_EMAIL` | `admin@gmail.com` | Permanent Super Admin email |
| `ADMIN_BOOTSTRAP_PASSWORD` | `<YOUR_SECURE_PASSWORD>` | Permanent Super Admin password |
| `NEXT_PUBLIC_SOCKET_URL` | *(Optional)* | Render WebSocket server URL if using hybrid mode |

5. Deploy!

### Step 3: Push Database Schema
From your local terminal connected to the production database:
```bash
npx prisma db push
npm run db:seed
```

---

## Option 3: High-Performance Hybrid Mode (Vercel + Render)

For enterprise-grade high availability:
1. **Front-End on Vercel**: Delivers static assets and UI globally at the edge.
2. **WebSocket Server on Render**: Runs `server.mjs` on Render Starter plan ($7/mo) to stream 60fps radar telemetry without Vercel 10s serverless execution limits.
3. Configure `NEXT_PUBLIC_SOCKET_URL="https://your-render-app.onrender.com"` in Vercel.

---

## Production Security & RBAC Accounts

After running `npm run db:seed`:

| Role | Email | Password | Assigned Route |
|---|---|---|---|
| **Super Admin** | `admin@gmail.com` | Configured via `ADMIN_BOOTSTRAP_PASSWORD` | `/admin` (Command Authority) |
| **Operations Director** | `ops@aocc.test` | Initial seed credential | `/admin` |
| **Senior ATC Controller** | `atc@aocc.test` | Initial seed credential | `/staff/atc` (Radar HUD) |
| **Flight Dispatcher** | `pilot@aocc.test` | Initial seed credential | `/staff/pilot` (Cockpit PFD) |
| **Gate Agent Lead** | `gate@aocc.test` | Initial seed credential | `/staff/gate` (Turnstile) |
| **Ticketing Supervisor** | `ticket@aocc.test` | Initial seed credential | `/staff/ticketing` (Booking) |
| **Ramp Apron Supervisor** | `ground@aocc.test` | Initial seed credential | `/staff/ground` |
| **BHS Lead** | `baggage@aocc.test` | Initial seed credential | `/staff/baggage` |
| **Chief Security Officer** | `security@aocc.test` | Initial seed credential | `/staff/security` |
| **MRO Airfield Tech** | `maint@aocc.test` | Initial seed credential | `/staff/maintenance` |

---

## Pre-Flight Deployment Checklist

Run the verification test suite before promoting any build:
```bash
# 1. Type check
npm run typecheck

# 2. Vitest unit & RBAC tests (26 assertions)
npm test

# 3. Playwright E2E suite (22 cross-browser/mobile tests)
npm run test:e2e

# 4. Production Turbopack bundle verification
npm run build
```
