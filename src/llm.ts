import OpenAI from "openai";
import { zodTextFormat } from "openai/helpers/zod.mjs";
import { z } from "zod";
import { formatLineage } from "./lineage.js";

const client = new OpenAI();
const MODEL = "gpt-4o";

const ClassifySchema = z.object({
  kind: z.enum(["atomic", "composite"]),
});

const DecomposeSchema = z.object({
  subtasks: z.array(z.string()),
});

export async function classify(task: string, lineage: string[]): Promise<"atomic" | "composite"> {
  const context = formatLineage(lineage, task);
  const res = await client.responses.parse({
    model: MODEL,
    instructions: `You decide whether a software task is "atomic" or "composite".

- "atomic" = a developer can sit down and implement this directly without needing to plan further. It may involve multiple steps, but they're all part of one coherent unit of work.
- "composite" = this clearly contains 2+ independent concerns that should be worked on separately (e.g., backend + frontend, or auth + database + UI).

Decision heuristics:
- If the task names a single feature, endpoint, component, or module: atomic.
- If the task bundles unrelated concerns (e.g., "build auth and set up CI"): composite.
- If you're at depth 4 or deeper in the hierarchy, it is almost certainly atomic — only mark composite if you can name 2+ truly independent deliverables.
- When in doubt, choose atomic. Over-decomposition creates more overhead than under-decomposition.

You will receive the full task hierarchy. Use it to see what ancestors already scoped — do not re-decompose what's already been narrowed.`,
    input: [
      { role: "user", content: `Task hierarchy:\n${context}` },
    ],
    text: {
      format: zodTextFormat(ClassifySchema, "classification"),
    },
  });
  return res.output_parsed!.kind;
}

export async function decompose(task: string, lineage: string[]): Promise<string[]> {
  const context = formatLineage(lineage, task);
  const res = await client.responses.parse({
    model: MODEL,
    instructions: `You are a pragmatic task decomposition engine for software projects.

Given a composite task, break it into the MINIMUM number of subtasks needed. Use your judgment:
- A simple task might only need 2 subtasks.
- A complex task might need up to 7, but only if each is truly distinct and necessary.
- Do NOT pad with extra subtasks to reach a number. Do NOT create "test and polish" or "define requirements" subtasks unless genuinely needed.
- Do NOT create subtasks that overlap or restate each other differently.
- Each subtask should represent real, distinct work — something a developer would naturally treat as a separate concern.

Think about how an experienced developer would actually split this work. If the task is "build a login page", you don't need 5 subtasks — maybe just "implement auth API endpoint" and "build login form UI" is enough.

You will receive the full task hierarchy. Use it to understand what ancestors already cover — never repeat their scope.`,
    input: [
      { role: "user", content: `Task hierarchy:\n${context}` },
    ],
    text: {
      format: zodTextFormat(DecomposeSchema, "decomposition"),
    },
  });
  return res.output_parsed!.subtasks;
}
