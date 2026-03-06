export type TaskKind = "atomic" | "composite";
export type TaskStatus = "pending" | "decomposing" | "ready" | "running" | "done" | "failed";
export type ExecutorProvider = "claude" | "codex" | "openhands";

export interface Task {
  id: string;           // hierarchical: "1", "1.2", "1.2.3"
  depth: number;
  description: string;
  kind?: TaskKind;
  status: TaskStatus;
  lineage: string[];    // ancestor descriptions from root -> parent
  children: Task[];
  result?: string;
}

export type BatchStrategy = "depth-first" | "breadth-first" | "layer-sequential";

export interface Session {
  id: string;
  task: string;
  maxDepth: number;
  tree: Task | null;
  workspace: string | null;
  batchStrategy: BatchStrategy;
  executor: ExecutorProvider;
  phase: "idle" | "decomposing" | "planning" | "executing" | "done";
}
