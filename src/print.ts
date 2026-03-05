import { Task } from "./types.js";

export function printTree(task: Task, prefix = "", isLast = true): void {
  const connector = prefix === "" ? "" : isLast ? "└── " : "├── ";
  const statusIcon = task.status === "done" ? (task.children.length ? "◆" : "●") : "○";
  console.log(`${prefix}${connector}${statusIcon} [${task.id}] ${task.description}`);

  if (task.result) {
    const resultPrefix = prefix + (prefix === "" ? "" : isLast ? "    " : "│   ");
    const lines = task.result.split("\n").slice(0, 3);
    for (const line of lines) {
      console.log(`${resultPrefix}    ↳ ${line}`);
    }
    if (task.result.split("\n").length > 3) {
      console.log(`${resultPrefix}    ↳ ...`);
    }
  }

  const childPrefix = prefix + (prefix === "" ? "" : isLast ? "    " : "│   ");
  task.children.forEach((child, i) => {
    printTree(child, childPrefix, i === task.children.length - 1);
  });
}
