import { spawn } from "child_process";
import { Task } from "./types.js";
import { createWorktree } from "./workspace.js";

function formatLineage(lineage: string[], current: string): string {
  const parts = lineage.map((desc, i) => `${"  ".repeat(i)}${i}. ${desc}`);
  parts.push(`${"  ".repeat(lineage.length)}${lineage.length}. ${current}  <-- (this task)`);
  return parts.join("\n");
}

function invokeClaudeCLI(message: string, cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;

    const args = ["--dangerously-skip-permissions", "-p", message];
    const child = spawn("claude", args, {
      cwd,
      stdio: ["ignore", "pipe", "pipe"],
      env,
    });

    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `claude exited with code ${code}`));
    });
  });
}

/** Execute a single atomic task using Claude CLI in a git worktree. */
export async function executeTask(task: Task, workspacePath: string): Promise<string> {
  const worktreePath = await createWorktree(workspacePath, task.id);

  const prompt = `You are executing a task as part of a larger project plan.

Task hierarchy (your position in the plan):
${formatLineage(task.lineage, task.description)}

Your job: Complete task "${task.description}"

Work in this directory. Write real, production-quality code. Commit your changes when done.`;

  const result = await invokeClaudeCLI(prompt, worktreePath);
  return result;
}
