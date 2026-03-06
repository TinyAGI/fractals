const API = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:1618";

export interface Task {
  id: string;
  depth: number;
  description: string;
  kind?: "atomic" | "composite";
  status: "pending" | "decomposing" | "ready" | "running" | "done" | "failed";
  lineage: string[];
  children: Task[];
  result?: string;
}

export interface Session {
  id: string;
  task: string;
  maxDepth: number;
  tree: Task | null;
  workspace: string | null;
  batchStrategy: string;
  executor: "claude" | "codex" | "openhands";
  phase: "idle" | "decomposing" | "planning" | "executing" | "done";
}

export async function getSession(): Promise<Session> {
  const res = await fetch(`${API}/api/session`);
  return res.json();
}

export async function decompose(task: string, maxDepth: number): Promise<Session> {
  const res = await fetch(`${API}/api/decompose`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ task, maxDepth }),
  });
  return res.json();
}

export async function initWorkspace(path: string): Promise<{ ok: boolean }> {
  const res = await fetch(`${API}/api/workspace`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ path }),
  });
  return res.json();
}

export async function startExecution(strategy?: string, executor?: string): Promise<{ ok: boolean; batches: string[][] }> {
  const res = await fetch(`${API}/api/execute`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ strategy, executor }),
  });
  return res.json();
}

export async function getTree(): Promise<Task | null> {
  const res = await fetch(`${API}/api/tree`);
  return res.json();
}
