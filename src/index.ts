import "dotenv/config";
import { buildTree, plan, leaves } from "./orchestrator.js";
import { printTree } from "./print.js";

const task = process.argv.slice(2).join(" ") || "Build a DocuSign clone";
const maxDepth = parseInt(process.env.MAX_DEPTH ?? "4", 10);

console.log(`\nFractal\n`);
console.log(`Task:      "${task}"`);
console.log(`Max depth: ${maxDepth}\n`);
console.log("─".repeat(60));
console.log("Recursive Decomposition\n");

const root = buildTree(task);

plan(root, maxDepth).then(() => {
  console.log("\n" + "─".repeat(60));
  console.log("Task Tree\n");
  printTree(root);
  console.log("\n" + "─".repeat(60));

  const allLeaves = leaves(root);
  const count = (t: typeof root): number =>
    1 + t.children.reduce((s, c) => s + count(c), 0);

  console.log(`Total nodes:  ${count(root)}`);
  console.log(`Leaf (atomic) tasks: ${allLeaves.length}`);
});
