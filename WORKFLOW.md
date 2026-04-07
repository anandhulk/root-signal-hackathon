# RootSignal — Workflow Documentation

RootSignal is an AI-powered SRE incident investigation tool. A user pastes an error or describes an incident; the system autonomously queries AWS and Bitbucket to produce a structured Root Cause Analysis.

---

## Architecture Overview

```
root-signal-fe (Next.js)          root-signal (Express API)
─────────────────────────         ──────────────────────────────────────
Homepage (/ )                     POST /api/investigate
  └─ textarea + submit    ──────►   └─ creates session → returns sessionId

Chat (/chat/:sessionId)           GET /api/chat/:sessionId
  └─ runs on page load    ──────►   └─ runs AI turn → returns response + toolCalls
  └─ follow-up box        ──────►  POST /api/chat/:sessionId/message
                                     └─ appends user message to session
                                         │
                                   AI Service (Claude Haiku)
                                         │
                                   MCP Client (in-process)
                                     ├─ AWS Server  (CloudWatch, ECS, CodePipeline)
                                     └─ Bitbucket Server (repos, branches, commits, PRs, files)
```

---

## Request Flow

### 1. Investigation Start

**Frontend** (`app/page.tsx`) sends:

```
POST /api/investigate
{
  mode: "auto",
  prompt: "Users seeing 502s on checkout since 2:45pm...",
  filters: { timeRange: "30m", environment: "staging", region: "eu-west-1" },
  sources: ["cloudwatch_logs", "cloudwatch_metrics", "ecs", "bitbucket"]
}
```

**Backend** (`src/handler/investigate.ts`):
1. Validates all fields
2. Creates an in-memory session (`src/session/index.ts`) — stores `id`, original request, and an initial message array `[{ role: "user", content: prompt }]`
3. Returns `{ sessionId: "uuid" }`

Frontend navigates to `/chat/{sessionId}`.

---

### 2. AI Investigation Turn

When the chat page loads, the frontend calls `GET /api/chat/:sessionId`.

**Backend** (`src/handler/chat-stream.ts`) calls `runInvestigation(session)` in the AI service.

#### Multi-turn loop (`src/service/ai.ts`)

```
loop:
  Call Claude Haiku with:
    - system prompt (src/prompts/sre-investigator.md)
    - all MCP tool definitions
    - current message history

  if stop_reason == "tool_use":
    → execute each requested MCP tool via callMcpTool()
    → truncate result if > 80,000 chars
    → append assistant message + tool results to history
    → trim history if total chars > 400,000 (keeps original user message)
    → continue loop

  if stop_reason == "end_turn":
    → strip <thinking> tags from response text
    → append to session.messages as assistant message
    → return { response, toolCalls[] }
```

**Response returned to frontend:**
```json
{
  "response": "Based on my investigation...",
  "toolCalls": [
    { "id": "...", "name": "find_pipeline_for_service", "input": { "service_name": "cookieyes-qa3" }, "status": "done" },
    { "id": "...", "name": "filter_log_events", "input": { "log_group_name": "/ecs/cookieyes-webapp", "filter_pattern": "ERROR" }, "status": "done" }
  ]
}
```

---

### 3. Follow-up Messages

User types a follow-up → frontend:

1. `POST /api/chat/:sessionId/message` with `{ content: "Yes, generate the full RCA" }`
   - Appends user message to session history
2. `GET /api/chat/:sessionId` — triggers next AI turn with full history context

---

## Service Discovery (How the AI Finds the Right Service)

The SRE prompt enforces a strict discovery workflow:

### Fast Path — service name is known
```
find_pipeline_for_service(service_name: "cookieyes-qa3")
  → returns repo_workspace, repo_slug, branch
  → proceed to investigation
```

### Slow Path — vague description
```
ecs_list_clusters()  +  list_pipelines()              [parallel]
    ↓
ecs_list_services(cluster)                            [parallel for each cluster]
    ↓
fuzzy-match user keywords against full service list
    ↓
find_pipeline_for_service(best candidate)
    ↓
if not found: list_repositories(query: keyword)       [once only]
              list_branches(repo_slug)                [once only]
              pick branch: release/<env> → main/master
```

### Disambiguation
| Candidates | Action |
|---|---|
| 1 match | Proceed directly |
| 2–5 matches | Ask user to pick |
| 0 matches | Show full ECS inventory |

---

## MCP Tools Reference

### AWS Tools

| Tool | Purpose |
|---|---|
| `find_pipeline_for_service` | Given an ECS service name, find its CodePipeline and extract Bitbucket repo + branch |
| `list_pipelines` | List all CodePipeline pipelines |
| `get_pipeline_state` | Get current stage execution status for a pipeline |
| `list_pipeline_executions` | Recent execution history |
| `ecs_list_clusters` | List all ECS cluster ARNs |
| `ecs_list_services` | List services in a cluster |
| `ecs_describe_services` | Desired/running/pending task counts, deployment status |
| `ecs_describe_tasks` | Full task metadata, container status |
| `describe_log_groups` | List CloudWatch log groups by prefix |
| `describe_log_streams` | List streams within a log group |
| `filter_log_events` | Search logs by keyword/pattern |
| `get_log_events` | Fetch raw log lines from a stream |
| `get_metric_statistics` | CloudWatch metric stats (Average, Sum, Min, Max) |
| `describe_alarms` | CloudWatch alarm states |

### Bitbucket Tools

| Tool | Purpose |
|---|---|
| `list_repositories` | Search repos by name pattern |
| `list_branches` | List branches (optionally filtered) |
| `get_branch` | Branch details + tip commit |
| `list_commits` | Commit history on a branch |
| `get_commit` | Commit metadata + changed files |
| `get_commit_diff` | Unified diff for a commit or range |
| `list_pull_requests` | PRs filtered by state (OPEN / MERGED / etc.) |
| `get_pull_request` | PR details, reviewers, source/destination branches |
| `get_pull_request_diff` | Full diff for a PR |
| `get_file_content` | Raw file content at a branch or commit |
| `list_directory` | List files/dirs at a path |
| `get_file_history` | Commit history for a specific file |

---

## AI Output: Two-Phase System

### Phase 1 — Cause Summary

Delivered after the first investigation turn:

- One-line header naming service + environment
- **Resolved source:** Bitbucket repo and branch used
- **What happened:** 3–5 bullets citing actual log lines or metric values
- **Root cause:** 1–3 bullets with direct evidence
- Closing question: *"Should I generate a full RCA report?"*

### Phase 2 — Full RCA Report

Triggered by user follow-up. Response contains structured sections parsed by the frontend:

```
TIMELINE      — chronological events with timestamps
ROOT CAUSE    — log confirmation, code path, why it failed, change linkage
ALTERNATIVES  — 2 competing hypotheses with evidence for/against
BLAST RADIUS  — scope of impact (users, services, duration)
FIXES         — 2–3 actionable steps with file/component names
PREVENTION    — 1–2 systematic improvements
```

---

## Frontend Rendering (`app/chat/[sessionId]/page.tsx`)

The frontend parses the AI response by detecting uppercase section headers, then applies section-specific renderers:

| Section | Renderer behaviour |
|---|---|
| **TIMELINE** | Vertical dot timeline; red dot for errors, yellow for warnings, blue otherwise |
| **ROOT CAUSE** | Paragraphs with inline code chips; log lines in monospace code blocks |
| **ALTERNATIVES** | Cards with confidence bar — High (red) / Medium (yellow) / Low (grey) |
| **BLAST RADIUS** | Paragraphs with bold labels and inline code |
| **FIXES** | Numbered list with green circles; supports inline code and multiline ` ``` ` blocks |
| **PREVENTION** | Bullets with green left border |

If no sections are detected (Phase 1 summary or unsectioned response), the response is rendered as generic markdown with heading, bullet, numbered list, and inline code support.

**Left sidebar** shows a live feed of MCP tool calls: name, input preview, and status (Running / Done / Failed).

---

## Session Management

Sessions are stored **in-memory only** (`src/session/index.ts`) — no database, no persistence across restarts.

```typescript
interface Session {
  id: string;                        // UUID
  context: InvestigationRequest;     // Original request payload
  messages: Anthropic.MessageParam[]; // Full conversation history
  createdAt: Date;
}
```

Memory guardrails:
- **Tool result cap:** Results > 80,000 chars are truncated before being added to history
- **History trim:** When total message chars exceed 400,000, oldest tool-call/result pairs are dropped (original user prompt is always kept)

---

## Environment Variables

| Variable | Purpose |
|---|---|
| `APP_NAME` | Application name |
| `NODE_ENV` | `dev` or `prod` |
| `SERVER_PORT` | HTTP server port |
| `FRONTEND_URL` | Allowed CORS origin |
| `AWS_ACCESS_KEY_ID` | AWS credentials |
| `AWS_SECRET_ACCESS_KEY` | AWS credentials |
| `AWS_REGION` | AWS region |
| `ANTHROPIC_API_KEY` | Claude API key |
| `BITBUCKET_WORKSPACE` | Default Bitbucket workspace slug |
| `BITBUCKET_USERNAME` | Bitbucket auth username |
| `BITBUCKET_APP_PASSWORD` | Bitbucket app password |

---

## Development Commands

**Backend**
```bash
npm run dev            # Start with pm2, auto-restart on src/ changes
npm run dev:compile    # Type-check + transpile to dist/ with source maps
npm run type-check     # ESLint + tsc --noEmit
npm run mcp:compile    # Build MCP servers
```

**Frontend**
```bash
npm run dev            # Next.js dev server
npm run build          # Production build
npm run lint           # ESLint
```
