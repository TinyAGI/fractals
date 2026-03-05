import { Task } from "./types.js";
import { classify, decompose } from "./llm.js";

function createTask(id: string, description: string, depth: number, lineage: string[]): Task {
  return { id, depth, description, status: "pending", lineage, children: [] };
}

/**
 * Recursively decompose a task tree (planning phase only — no execution).
 * Classifies each node, then decomposes composites into children.
 * Atomic nodes are marked "ready" for later execution.
 */
export async function plan(task: Task, maxDepth = 5): Promise<Task> {
  const kind = task.depth >= maxDepth
    ? "atomic"
    : await classify(task.description, task.lineage);

  task.kind = kind;

  if (kind === "atomic") {
    task.status = "ready";
    return task;
  }

  task.status = "decomposing";
  const subtaskDescriptions = await decompose(task.description, task.lineage);

  const childLineage = [...task.lineage, task.description];
  task.children = subtaskDescriptions.map((desc, i) =>
    createTask(`${task.id}.${i + 1}`, desc, task.depth + 1, childLineage)
  );

  await Promise.all(task.children.map((child) => plan(child, maxDepth)));

  task.status = "ready";
  return task;
}

export function buildTree(description: string): Task {
  return createTask("1", description, 0, []);
}

/** Collect all leaf (atomic) tasks in tree order. */
export function leaves(task: Task): Task[] {
  if (task.children.length === 0) return [task];
  return task.children.flatMap(leaves);
}

/** Find a task by ID in the tree. */
export function findTask(root: Task, id: string): Task | undefined {
  if (root.id === id) return root;
  for (const child of root.children) {
    const found = findTask(child, id);
    if (found) return found;
  }
  return undefined;
}

/** Check if all leaves under a node are done. */
export function isSubtreeDone(task: Task): boolean {
  if (task.children.length === 0) return task.status === "done";
  return task.children.every(isSubtreeDone);
}

/** Propagate done status up the tree. */
export function propagateStatus(task: Task): void {
  if (task.children.length === 0) return;
  task.children.forEach(propagateStatus);
  if (task.children.every((c) => c.status === "done")) {
    task.status = "done";
  } else if (task.children.some((c) => c.status === "failed")) {
    task.status = "failed";
  } else if (task.children.some((c) => c.status === "running" || c.status === "done")) {
    task.status = "running";
  }
}
