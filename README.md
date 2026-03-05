# Fractal

Recursive task decomposition orchestrator. Give it any high-level task and it grows a tree of executable subtasks, then runs each leaf using Claude Code CLI in isolated git worktrees.

## Architecture

```
┌─────────────────────────────────────────────────────────┐
│  web/  (Next.js frontend)                               │
│  - Task input                                           │
│  - Tree visualization                                   │
│  - Workspace setup                                      │
│  - Execution status polling                             │
└────────────────────┬────────────────────────────────────┘
                     │ HTTP
┌────────────────────▼────────────────────────────────────┐
│  src/  (Hono server)                                    │
│                                                         │
│  ┌─────────┐   ┌──────────┐   ┌──────────────────────┐  │
│  │  LLM    │   │Orchestr- │   │  Executor            │  │
│  │classify │──▶│  ator    │   │  Claude CLI          │  │
│  │decompose│   │ plan()   │   │  git worktrees       │  │
│  └─────────┘   └──────────┘   └──────────────────────┘  │
│                                                         │
│  OpenAI (gpt-5.2)              Claude Code CLI (spawn)  │
└─────────────────────────────────────────────────────────┘
```

## Two-Phase Flow

```
Phase 1: PLAN                          Phase 2: EXECUTE
─────────────────                      ──────────────────
User enters task                       User confirms plan
        │                              User provides workspace path
        ▼                                      │
  classify(task)                               ▼
  ┌──atomic──▶ mark "ready"            git init workspace
  │                                    create worktrees
  └──composite──▶ decompose(task)      batch leaf tasks
                      │                        │
                 [children]                    ▼
                      │                 claude --dangerously-skip-permissions
                 resolve(child) ◀──┐          -p "task + lineage context"
                      │            │          (per worktree)
                      └────────────┘
```

## UX Flow

1. **Input** — enter a task description and max depth
2. **Decompose** — server recursively breaks it into a tree
3. **Review** — inspect the full plan tree before committing
4. **Workspace** — provide a directory path (git-initialized automatically)
5. **Execute** — leaf tasks run via Claude CLI in batches, status updates poll in real-time

## Batch Strategies

Due to rate limits, leaf tasks execute in batches rather than all at once.

| Strategy | Description | Status |
|----------|-------------|--------|
| **depth-first** | Complete all leaves under branch 1.x, then 2.x, etc. Tasks within each branch run concurrently. | Implemented |
| **breadth-first** | One leaf from each branch per batch. Spreads progress evenly. | Roadmap |
| **layer-sequential** | All shallowest leaves first, then deeper. | Roadmap |

## Project Structure

```
src/
  server.ts        Hono API server
  types.ts         Shared types (Task, Session, BatchStrategy)
  llm.ts           OpenAI calls: classify + decompose (structured output)
  orchestrator.ts  Recursive plan() — builds the tree, no execution
  executor.ts      Claude CLI invocation per task in git worktree
  workspace.ts     git init + worktree management
  batch.ts         Batch execution strategies
  index.ts         CLI entry point (standalone, no server)
  print.ts         Tree pretty-printer (CLI)

web/
  src/app/page.tsx              Main UI (input → review → execute)
  src/components/task-tree.tsx  Recursive tree renderer
  src/lib/api.ts                API client for Hono server
```

## Quick Start

```bash
# 1. Install server deps
npm install

# 2. Install frontend deps
cd web && npm install && cd ..

# 3. Set your OpenAI key
echo "OPENAI_API_KEY=sk-..." > .env

# 4. Start the server (port 3001)
npm run server

# 5. Start the frontend (port 3000)
cd web && npm run dev
```

## API

| Endpoint | Method | Description |
|----------|--------|-------------|
| `/api/session` | GET | Current session state |
| `/api/decompose` | POST | Start recursive decomposition. Body: `{ task, maxDepth }` |
| `/api/workspace` | POST | Initialize git workspace. Body: `{ path }` |
| `/api/execute` | POST | Start batch execution. Body: `{ strategy? }` |
| `/api/tree` | GET | Current tree state (poll during execution) |
| `/api/leaves` | GET | All leaf tasks with status |

## Configuration

| Env Variable | Default | Where | Description |
|---|---|---|---|
| `OPENAI_API_KEY` | — | `.env` | Required. OpenAI API key. |
| `PORT` | `3001` | `.env` | Server port. |
| `MAX_DEPTH` | `4` | CLI only | Max recursion depth. |
| `NEXT_PUBLIC_API_URL` | `http://localhost:3001` | `web/.env.local` | Server URL for frontend. |

## Roadmap

- [ ] Breadth-first batch strategy
- [ ] Layer-sequential batch strategy
- [ ] Configurable concurrency limit per batch
- [ ] SSE/WebSocket for real-time tree updates (replace polling)
- [ ] Task editing — modify/delete subtasks before executing
- [ ] Merge worktree branches back to main after completion
- [ ] Persistent sessions (SQLite/file-based)
- [ ] Multi-session support
