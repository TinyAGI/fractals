import "dotenv/config";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Session, Task } from "./types.js";
import { buildTree, plan, leaves, propagateStatus } from "./orchestrator.js";
import { executeTask } from "./executor.js";
import { initWorkspace } from "./workspace.js";
import { createBatches } from "./batch.js";

const app = new Hono();
app.use("/*", cors());

// In-memory session store (single session for now)
let session: Session = {
  id: "default",
  task: "",
  maxDepth: 4,
  tree: null,
  workspace: null,
  batchStrategy: "depth-first",
  phase: "idle",
};

// GET /api/session — current session state + tree
app.get("/api/session", (c) => {
  return c.json(session);
});

// POST /api/decompose — start recursive decomposition (planning phase)
app.post("/api/decompose", async (c) => {
  const { task, maxDepth } = await c.req.json<{ task: string; maxDepth?: number }>();

  session.task = task;
  session.maxDepth = maxDepth ?? 4;
  session.phase = "decomposing";
  session.tree = buildTree(task);

  // Run decomposition (mutates tree in place)
  await plan(session.tree, session.maxDepth);

  session.phase = "planning";
  return c.json(session);
});

// POST /api/workspace — initialize workspace directory
app.post("/api/workspace", async (c) => {
  const { path } = await c.req.json<{ path: string }>();

  await initWorkspace(path);
  session.workspace = path;

  return c.json({ ok: true, workspace: path });
});

// POST /api/execute — start batch execution of all leaf tasks
app.post("/api/execute", async (c) => {
  if (!session.tree || !session.workspace) {
    return c.json({ error: "No plan or workspace" }, 400);
  }

  const body = await c.req.json<{ strategy?: string }>().catch(() => ({} as { strategy?: string }));
  const { strategy } = body;
  if (strategy === "depth-first" || strategy === "breadth-first" || strategy === "layer-sequential") {
    session.batchStrategy = strategy;
  }

  session.phase = "executing";
  const batches = createBatches(session.tree, session.batchStrategy);

  // Execute batches sequentially, tasks within each batch concurrently
  (async () => {
    for (const batch of batches) {
      await Promise.all(
        batch.map(async (task) => {
          task.status = "running";
          try {
            task.result = await executeTask(task, session.workspace!);
            task.status = "done";
          } catch (err) {
            task.result = err instanceof Error ? err.message : String(err);
            task.status = "failed";
          }
          propagateStatus(session.tree!);
        })
      );
    }
    session.phase = "done";
  })();

  return c.json({ ok: true, batches: batches.map((b) => b.map((t) => t.id)) });
});

// GET /api/tree — get current tree state (for polling during execution)
app.get("/api/tree", (c) => {
  return c.json(session.tree);
});

// GET /api/leaves — get all leaf tasks with their status
app.get("/api/leaves", (c) => {
  if (!session.tree) return c.json([]);
  return c.json(
    leaves(session.tree).map((t) => ({
      id: t.id,
      description: t.description,
      status: t.status,
      lineage: t.lineage,
      result: t.result,
    }))
  );
});

const PORT = parseInt(process.env.PORT ?? "3001", 10);
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Fractal server running on http://localhost:${PORT}`);
});
