import { Task, BatchStrategy } from "./types.js";
import { leaves } from "./orchestrator.js";

/**
 * Batch strategies determine the order leaf tasks are executed in.
 * Due to rate limits, we can't run all tasks concurrently.
 *
 * Strategies:
 *
 * 1. "depth-first" (implemented)
 *    Complete all leaves under subtask 1.1.x before moving to 1.2.x.
 *    Groups by top-level subtask branch, executes branches sequentially,
 *    leaves within each branch run concurrently.
 *
 *    1.1.1 ─┐
 *    1.1.2 ─┤ batch 1 (concurrent)
 *    1.1.3 ─┘
 *    1.2.1 ─┐
 *    1.2.2 ─┤ batch 2 (concurrent)
 *    1.2.3 ─┘
 *
 * 2. "breadth-first" (roadmap)
 *    Take one leaf from each top-level branch per batch.
 *    Spreads progress evenly across all subtasks.
 *
 *    1.1.1, 1.2.1, 1.3.1 ─ batch 1
 *    1.1.2, 1.2.2, 1.3.2 ─ batch 2
 *
 * 3. "layer-sequential" (roadmap)
 *    Execute all leaves at the shallowest depth first, then deeper.
 *    Ensures high-level tasks complete before drilling down.
 */
export function createBatches(root: Task, strategy: BatchStrategy): Task[][] {
  const allLeaves = leaves(root);

  switch (strategy) {
    case "depth-first":
      return batchDepthFirst(root, allLeaves);
    case "breadth-first":
    case "layer-sequential":
      // Fallback to depth-first for now — see roadmap
      return batchDepthFirst(root, allLeaves);
  }
}

function batchDepthFirst(root: Task, allLeaves: Task[]): Task[][] {
  if (root.children.length === 0) return [allLeaves];

  // Group leaves by which top-level subtask they belong to
  const batches: Task[][] = [];
  for (const branch of root.children) {
    const branchLeaves = allLeaves.filter((leaf) => leaf.id.startsWith(branch.id));
    if (branchLeaves.length > 0) {
      batches.push(branchLeaves);
    }
  }
  return batches;
}
