"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { TaskTree } from "@/components/task-tree";
import {
  type Task,
  decompose,
  initWorkspace,
  startExecution,
  getTree,
} from "@/lib/api";

type Phase = "input" | "decomposing" | "review" | "workspace" | "executing" | "done";

function countNodes(t: Task): number {
  return 1 + t.children.reduce((s, c) => s + countNodes(c), 0);
}
function countLeaves(t: Task): number {
  if (t.children.length === 0) return 1;
  return t.children.reduce((s, c) => s + countLeaves(c), 0);
}

export default function Home() {
  const [phase, setPhase] = useState<Phase>("input");
  const [taskInput, setTaskInput] = useState("");
  const [maxDepth, setMaxDepth] = useState(3);
  const [tree, setTree] = useState<Task | null>(null);
  const [workspace, setWorkspace] = useState("");
  const [batches, setBatches] = useState<string[][]>([]);
  const pollingRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const stopPolling = useCallback(() => {
    if (pollingRef.current) {
      clearInterval(pollingRef.current);
      pollingRef.current = null;
    }
  }, []);

  useEffect(() => {
    if (phase !== "executing") return;
    pollingRef.current = setInterval(async () => {
      const updated = await getTree();
      if (updated) {
        setTree(updated);
        if (updated.status === "done" || updated.status === "failed") {
          setPhase("done");
          stopPolling();
        }
      }
    }, 2000);
    return stopPolling;
  }, [phase, stopPolling]);

  async function handleDecompose() {
    if (!taskInput.trim()) return;
    setPhase("decomposing");
    try {
      const session = await decompose(taskInput, maxDepth);
      setTree(session.tree);
      setPhase("review");
    } catch {
      setPhase("input");
    }
  }

  async function handleSetupWorkspace() {
    if (!workspace.trim()) return;
    await initWorkspace(workspace);
    setPhase("executing");
    const result = await startExecution("depth-first");
    setBatches(result.batches);
  }

  return (
    <main className="min-h-screen bg-background p-8 max-w-5xl mx-auto">
      <div className="mb-8">
        <h1 className="text-2xl font-bold tracking-tight">Fractal</h1>
        <p className="text-muted-foreground text-sm mt-1">
          Recursive task decomposition orchestrator
        </p>
      </div>

      {phase === "input" && (
        <Card>
          <CardHeader>
            <CardTitle>New Task</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Input
              placeholder="e.g. Build a DocuSign clone"
              value={taskInput}
              onChange={(e) => setTaskInput(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && handleDecompose()}
            />
            <div className="flex items-center gap-4">
              <label className="text-sm text-muted-foreground">Max depth</label>
              <Input
                type="number"
                min={1}
                max={6}
                value={maxDepth}
                onChange={(e) => setMaxDepth(parseInt(e.target.value) || 3)}
                className="w-20"
              />
              <Button onClick={handleDecompose}>Decompose</Button>
            </div>
          </CardContent>
        </Card>
      )}

      {phase === "decomposing" && (
        <Card>
          <CardContent className="py-12 text-center">
            <div className="text-lg">Decomposing task tree...</div>
            <p className="text-sm text-muted-foreground mt-2">
              Recursively classifying and breaking down &quot;{taskInput}&quot;
            </p>
          </CardContent>
        </Card>
      )}

      {phase === "review" && tree && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>Task Plan</CardTitle>
                <div className="flex gap-2">
                  <Badge variant="secondary">{countNodes(tree)} nodes</Badge>
                  <Badge variant="secondary">{countLeaves(tree)} leaf tasks</Badge>
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[55vh] overflow-auto border border-border rounded p-2">
                <TaskTree tree={tree} />
              </div>
            </CardContent>
          </Card>

          <Separator />

          <Card>
            <CardHeader>
              <CardTitle>Workspace Setup</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <p className="text-sm text-muted-foreground">
                Each leaf task runs in its own git worktree. Provide an absolute
                path for the workspace directory (will be git-initialized).
              </p>
              <div className="flex gap-2">
                <Input
                  placeholder="/path/to/workspace"
                  value={workspace}
                  onChange={(e) => setWorkspace(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && handleSetupWorkspace()}
                />
                <Button onClick={handleSetupWorkspace}>
                  Confirm &amp; Execute
                </Button>
              </div>
            </CardContent>
          </Card>

          <Button variant="outline" onClick={() => { setPhase("input"); setTree(null); }}>
            Start over
          </Button>
        </div>
      )}

      {(phase === "executing" || phase === "done") && tree && (
        <div className="space-y-4">
          <Card>
            <CardHeader>
              <div className="flex items-center justify-between">
                <CardTitle>
                  {phase === "done" ? "Execution Complete" : "Executing..."}
                </CardTitle>
                <div className="flex gap-2">
                  <Badge variant={phase === "done" ? "default" : "secondary"}>
                    {phase}
                  </Badge>
                  {batches.length > 0 && (
                    <Badge variant="outline">{batches.length} batches</Badge>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="h-[65vh] overflow-auto border border-border rounded p-2">
                <TaskTree tree={tree} />
              </div>
            </CardContent>
          </Card>

          {phase === "done" && (
            <Button variant="outline" onClick={() => { setPhase("input"); setTree(null); }}>
              New task
            </Button>
          )}
        </div>
      )}
    </main>
  );
}
