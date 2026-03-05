import { spawn } from "child_process";
import fs from "fs";
import path from "path";

function run(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, { cwd, stdio: ["ignore", "pipe", "pipe"] });
    let stdout = "";
    let stderr = "";
    child.stdout.setEncoding("utf8");
    child.stderr.setEncoding("utf8");
    child.stdout.on("data", (chunk: string) => (stdout += chunk));
    child.stderr.on("data", (chunk: string) => (stderr += chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) resolve(stdout);
      else reject(new Error(stderr.trim() || `Exit code ${code}`));
    });
  });
}

/** Initialize workspace: create dir, git init, initial commit. */
export async function initWorkspace(workspacePath: string): Promise<void> {
  fs.mkdirSync(workspacePath, { recursive: true });

  if (!fs.existsSync(path.join(workspacePath, ".git"))) {
    await run("git", ["init"], workspacePath);
    fs.writeFileSync(path.join(workspacePath, ".gitkeep"), "");
    await run("git", ["add", "."], workspacePath);
    await run("git", ["commit", "-m", "initial commit"], workspacePath);
  }
}

/** Create a git worktree for a specific task. Returns the worktree path. */
export async function createWorktree(workspacePath: string, taskId: string): Promise<string> {
  const branchName = `task/${taskId}`;
  const worktreePath = path.join(workspacePath, ".worktrees", taskId);

  if (fs.existsSync(worktreePath)) return worktreePath;

  fs.mkdirSync(path.dirname(worktreePath), { recursive: true });
  await run("git", ["worktree", "add", "-b", branchName, worktreePath], workspacePath);
  return worktreePath;
}

/** Remove a git worktree after task completion. */
export async function removeWorktree(workspacePath: string, taskId: string): Promise<void> {
  const worktreePath = path.join(workspacePath, ".worktrees", taskId);
  if (!fs.existsSync(worktreePath)) return;
  await run("git", ["worktree", "remove", worktreePath, "--force"], workspacePath);
}
