# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Repositories

This project spans two repositories:
- **root-signal** (this repo) — Express.js REST API backend
- **root-signal-fe** (`../root-signal-fe`) — Next.js frontend

---

## Backend (root-signal)

### Commands

```bash
npm run dev            # Start dev server with pm2 (watches src/, auto-restarts)
npm run dev:compile    # Type-check + transpile to dist/ with source maps (dev)
npm run prod:compile   # Type-check + transpile to dist/ (production)
npm run type-check     # Run ESLint + tsc --noEmit (lint + type check combined)
npm start              # Run compiled output from dist/src/index.js
```

### Environment Variables

Documented in `env.explained`. Required at runtime:

| Variable | Purpose |
|----------|---------|
| `APP_NAME` | Application name |
| `NODE_ENV` | Environment (`dev`, `prod`) |
| `SERVER_PORT` | HTTP server port |
| `FRONTEND_URL` | Allowed CORS origin |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `AWS_REGION` | AWS region |

### Architecture

The backend is class-based TypeScript compiled via Babel to `dist/`. The layers are:

```
src/index.ts        → bootstraps App
src/app.ts          → App class: wires server, exit handlers, uncaught exception → Slack
src/server/         → Server class: Express setup, middleware registration
src/routes/         → RouteManager: registers routes under /api/v1/
src/handler/        → Request handlers (one class per route group)
src/service/        → Business logic
src/middleware/     → access-logger, set-headers, error-handler, cors
src/config/         → Constants and env-based config
src/logger/         → Winston-based Logger (logDebug, logInfo, logCritical)
src/slack/          → SlackNotify.sendToWebhook for error alerts
src/models/         → MySQL data models
src/error/          → Error utilities
```

**Adding a new route:** Create a handler in `src/handler/`, then register it in `RouteManager.registerRoutes()` in `src/routes/index.ts`.

### MCP Servers

Two standalone MCP servers live alongside the API:

- `mcp/aws/` — AWS tools: CloudWatch metrics/logs and ECS cluster inspection
- `mcp/bitbucket/` — Bitbucket tools: repositories, branches, commits, pull requests, file contents

Each has its own `index.ts` entry point and `server.ts` with tool registrations. Build with `npm run mcp:compile`.

---

## Frontend (root-signal-fe)

### Commands

```bash
npm run dev     # Start Next.js dev server
npm run build   # Production build
npm run lint    # ESLint
```

### Important: Next.js 16 Breaking Changes

This project uses **Next.js 16.2.2** which has breaking changes from earlier versions. Before writing any Next.js code, read the relevant guide in `node_modules/next/dist/docs/`. APIs, conventions, and file structure may differ from training data.
