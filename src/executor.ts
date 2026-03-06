import { execSync, spawn } from "child_process";
import { Task, ExecutorProvider } from "./types.js";
import { formatLineage } from "./lineage.js";
import { createWorktree } from "./workspace.js";

function resolveBin(name: string): string {
  try {
    return execSync(`which ${name}`, { encoding: "utf8" }).trim();
  } catch {
    return name;
  }
}

const CLAUDE_BIN = resolveBin("claude");
const CODEX_BIN = resolveBin("codex");
const OPENHANDS_BIN = resolveBin("openhands");

function runCommand(command: string, args: string[], cwd: string): Promise<string> {
  return new Promise((resolve, reject) => {
    const env = { ...process.env };
    delete env.CLAUDECODE;

    console.log(`  [executor] spawning: ${command} ${args[0]} ...`);
    console.log(`  [executor] cwd: ${cwd}`);

    const child = spawn(command, args, {
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
    child.on("error", (err) => {
      console.error(`  [executor] spawn error: ${err.message}`);
      reject(err);
    });
    child.on("close", (code) => {
      if (code === 0) {
        console.log(`  [executor] exited 0, output length: ${stdout.length}`);
        resolve(stdout);
      } else {
        const msg = stderr.trim() || `exited with code ${code}`;
        console.error(`  [executor] exited ${code}: ${msg}`);
        reject(new Error(msg));
      }
    });
  });
}

function invokeClaude(message: string, cwd: string): Promise<string> {
  return runCommand(CLAUDE_BIN, ["--dangerously-skip-permissions", "-p", message], cwd);
}

function invokeCodex(message: string, cwd: string): Promise<string> {
  return runCommand(
    CODEX_BIN,
    ["exec", "--dangerously-bypass-approvals-and-sandbox", "--json", message],
    cwd
  ).then((output) => {
    // Codex outputs JSONL — extract the final agent_message
    const lines = output.trim().split("\n");
    for (let i = lines.length - 1; i >= 0; i--) {
      try {
        const json = JSON.parse(lines[i]);
        if (json.type === "item.completed" && json.item?.type === "agent_message") {
          return json.item.text;
        }
      } catch {
        // skip non-JSON lines
      }
    }
    return output;
  });
}

function invokeOpenHands(message: string, cwd: string): Promise<string> {
  return runCommand(
    OPENHANDS_BIN,
    ["--headless", "--always-approve", "-t", message],
    cwd
  );
}

function buildPrompt(task: Task): string {
  const hierarchy = formatLineage(task.lineage, task.description);
  const siblingContext = task.lineage.length > 0
    ? `\nYou are one of several agents working in parallel on sibling tasks under the same parent. Do not duplicate work that sibling tasks would handle — focus only on your specific task.`
    : "";

  return `You are a coding agent executing one task in a larger project.

PROJECT CONTEXT:
${hierarchy}
${siblingContext}

YOUR TASK: ${task.description}

INSTRUCTIONS:
- Implement this task fully — write real, working code.
- Create any files and directories needed. Use sensible project structure.
- If this task depends on interfaces/types from sibling tasks, define reasonable stubs or interfaces that siblings can implement.
- Keep your changes focused. Do not implement functionality that belongs to other tasks in the hierarchy.
- Commit your work with a clear commit message describing what you built.`;
}

/** Execute a single atomic task using the specified provider in a git worktree. */
export async function executeTask(
  task: Task,
  workspacePath: string,
  provider: ExecutorProvider = "claude"
): Promise<string> {
  console.log(`[execute] [${task.id}] "${task.description}" (${provider})`);

  const worktreePath = await createWorktree(workspacePath, task.id);
  console.log(`[execute] [${task.id}] worktree: ${worktreePath}`);

  const prompt = buildPrompt(task);

  let invoke: (message: string, cwd: string) => Promise<string>;
  if (provider === "codex") {
    invoke = invokeCodex;
  } else if (provider === "openhands") {
    invoke = invokeOpenHands;
  } else {
    invoke = invokeClaude;
  }
  const result = await invoke(prompt, worktreePath);
  console.log(`[execute] [${task.id}] done`);
  return result;
}
