import "dotenv/config";
import os from "os";
import { Hono } from "hono";
import { cors } from "hono/cors";
import { serve } from "@hono/node-server";
import { Session } from "./types.js";
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
  executor: "claude",
  phase: "idle",
};

// GET /api/session — current session state + tree
app.get("/api/session", (c) => {
  return c.json(session);
});

// POST /api/decompose — start recursive decomposition (planning phase)
app.post("/api/decompose", async (c) => {
  const { task, maxDepth } = await c.req.json<{ task: string; maxDepth?: number }>();

  console.log(`[server] decompose: "${task}" (maxDepth=${maxDepth ?? 4})`);
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
  const { path: rawPath } = await c.req.json<{ path: string }>();
  const resolved = rawPath.startsWith("~") ? rawPath.replace("~", os.homedir()) : rawPath;
  console.log(`[server] workspace: ${resolved}`);

  await initWorkspace(resolved);
  session.workspace = resolved;

  return c.json({ ok: true, workspace: resolved });
});

// POST /api/execute — start batch execution of all leaf tasks
app.post("/api/execute", async (c) => {
  if (!session.tree || !session.workspace) {
    return c.json({ error: "No plan or workspace" }, 400);
  }

  const body = await c.req.json<{ strategy?: string; executor?: string }>().catch(() => ({} as { strategy?: string; executor?: string }));
  const { strategy, executor } = body;
  if (strategy === "depth-first" || strategy === "breadth-first" || strategy === "layer-sequential") {
    session.batchStrategy = strategy;
  }
  if (executor === "claude" || executor === "codex" || executor === "openhands") {
    session.executor = executor;
  }

  session.phase = "executing";
  const batches = createBatches(session.tree, session.batchStrategy);

  // Execute batches sequentially, tasks within each batch concurrently
  console.log(`[server] starting execution: ${batches.length} batches, strategy="${session.batchStrategy}", executor="${session.executor}"`);
  (async () => {
    for (let i = 0; i < batches.length; i++) {
      const batch = batches[i];
      console.log(`[server] batch ${i + 1}/${batches.length}: [${batch.map((t) => t.id).join(", ")}]`);
      await Promise.all(
        batch.map(async (task) => {
          task.status = "running";
          console.log(`[server] [${task.id}] running: "${task.description}"`);
          try {
            task.result = await executeTask(task, session.workspace!, session.executor);
            task.status = "done";
            console.log(`[server] [${task.id}] done`);
          } catch (err) {
            task.result = err instanceof Error ? err.message : String(err);
            task.status = "failed";
            console.error(`[server] [${task.id}] failed: ${task.result}`);
          }
          propagateStatus(session.tree!);
        })
      );
      console.log(`[server] batch ${i + 1}/${batches.length} complete`);
    }
    session.phase = "done";
    console.log("[server] all batches complete");
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


const PORT = parseInt(process.env.PORT ?? "1618", 10);
serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`Fractals server running on http://localhost:${PORT}`);
});
