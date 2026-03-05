"use client";

import { useState } from "react";
import { Task } from "@/lib/api";
import { Badge } from "@/components/ui/badge";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";

const statusStyle: Record<string, { label: string; variant: "default" | "secondary" | "destructive" | "outline" }> = {
  pending: { label: "pending", variant: "outline" },
  decomposing: { label: "decomposing", variant: "secondary" },
  ready: { label: "ready", variant: "secondary" },
  running: { label: "running", variant: "default" },
  done: { label: "done", variant: "default" },
  failed: { label: "failed", variant: "destructive" },
};

function TaskNode({ task, depth }: { task: Task; depth: number }) {
  const [open, setOpen] = useState(true);
  const hasChildren = task.children.length > 0;
  const isLeaf = !hasChildren;
  const config = statusStyle[task.status] ?? statusStyle.pending;

  const row = (
    <div className="flex items-center gap-2 py-1 px-2 -mx-2 rounded hover:bg-muted/50 min-w-0">
      {/* Expand/collapse or leaf indicator */}
      <span className="w-4 shrink-0 text-center text-muted-foreground text-xs select-none">
        {hasChildren ? (open ? "▼" : "▶") : "─"}
      </span>

      {/* Icon */}
      <span className="shrink-0 text-xs">
        {hasChildren ? "📂" : "📄"}
      </span>

      {/* ID */}
      <span className="text-muted-foreground text-xs shrink-0 font-mono">
        {task.id}
      </span>

      {/* Description */}
      <span className="text-sm truncate min-w-0 flex-1" title={task.description}>
        {task.description}
      </span>

      {/* Status badge */}
      <Badge variant={config.variant} className="shrink-0 text-[10px] px-1.5 py-0">
        {config.label}
      </Badge>
    </div>
  );

  if (hasChildren) {
    return (
      <Collapsible open={open} onOpenChange={setOpen}>
        <CollapsibleTrigger asChild>
          <button className="w-full text-left cursor-pointer">{row}</button>
        </CollapsibleTrigger>
        <CollapsibleContent>
          <div className="ml-4 border-l border-border pl-2">
            {task.children.map((child) => (
              <TaskNode key={child.id} task={child} depth={depth + 1} />
            ))}
          </div>
        </CollapsibleContent>
      </Collapsible>
    );
  }

  return (
    <div>
      {row}
      {task.result && (
        <div className="ml-10 text-xs text-muted-foreground border-l border-border pl-2 py-1 whitespace-pre-wrap max-h-20 overflow-hidden">
          {task.result.slice(0, 500)}
        </div>
      )}
    </div>
  );
}

export function TaskTree({ tree }: { tree: Task }) {
  return (
    <div className="font-mono text-sm overflow-hidden">
      <TaskNode task={tree} depth={0} />
    </div>
  );
}
