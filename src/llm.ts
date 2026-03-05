import OpenAI from "openai";

const client = new OpenAI();
const MODEL = "gpt-5-mini";

function formatLineage(lineage: string[], current: string): string {
  const parts = lineage.map((desc, i) => `${"  ".repeat(i)}${i}. ${desc}`);
  parts.push(`${"  ".repeat(lineage.length)}${lineage.length}. ${current}  <-- (this task)`);
  return parts.join("\n");
}

export async function classify(task: string, lineage: string[]): Promise<"atomic" | "composite"> {
  const context = formatLineage(lineage, task);
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You decide whether a task is "atomic" or "composite".

- "atomic" = a single, concrete unit of work a developer can finish in one sitting. It does NOT need further breakdown.
- "composite" = clearly contains multiple distinct pieces of work that should be separated.

IMPORTANT: Lean towards "atomic". If a task is specific enough to act on directly, it is atomic — even if it involves several steps. Only mark as "composite" if the subtasks are truly independent concerns.

You will receive the full task hierarchy so far. Use it to avoid re-decomposing what ancestor tasks already scoped. The deeper you are, the more likely the task is atomic.`,
      },
      { role: "user", content: `Task hierarchy:\n${context}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "classification",
        strict: true,
        schema: {
          type: "object",
          properties: {
            kind: { type: "string", enum: ["atomic", "composite"] },
          },
          required: ["kind"],
          additionalProperties: false,
        },
      },
    },
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? "{}");
  return parsed.kind === "atomic" ? "atomic" : "composite";
}

export async function decompose(task: string, lineage: string[]): Promise<string[]> {
  const context = formatLineage(lineage, task);
  const res = await client.chat.completions.create({
    model: MODEL,
    messages: [
      {
        role: "system",
        content: `You are a task decomposition engine. Break a composite task into 2-5 concrete subtasks.

Rules:
- Each subtask must be specific and actionable — not vague or meta.
- Subtasks should be non-overlapping and collectively cover the parent task.
- Do NOT repeat work already covered by ancestor tasks in the hierarchy.
- Keep subtask descriptions concise (one sentence).

You will receive the full task hierarchy. Use it to understand what has already been scoped above.`,
      },
      { role: "user", content: `Task hierarchy:\n${context}` },
    ],
    response_format: {
      type: "json_schema",
      json_schema: {
        name: "decomposition",
        strict: true,
        schema: {
          type: "object",
          properties: {
            subtasks: {
              type: "array",
              items: { type: "string" },
            },
          },
          required: ["subtasks"],
          additionalProperties: false,
        },
      },
    },
  });
  const parsed = JSON.parse(res.choices[0].message.content ?? '{"subtasks":[]}');
  return parsed.subtasks;
}
