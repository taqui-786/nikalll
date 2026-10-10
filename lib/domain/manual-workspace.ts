import { z } from "zod";

export const DESTINATION_IDS = ["local-grocery", "post-office", "stationery-corner"] as const;
export const STORAGE_KEY = "nikal-workspace-v1";
export const STORAGE_VERSION = 1;

export const ManualTaskSchema = z.strictObject({
  id: z.string().min(1).max(128),
  // Blank labels are allowed while editing, but never on a prepared card.
  label: z.string().max(160),
  destinationId: z.string().max(80).nullable(),
  disposition: z.enum(["included", "cancelled", "deferred"]),
  outcome: z.enum(["pending", "done", "unavailable", "deferred"]),
});

const tasksSchema = z.array(ManualTaskSchema).max(20).refine(
  (tasks) => new Set(tasks.map((task) => task.id)).size === tasks.length,
  "Task IDs must be unique.",
);

export type Task = z.infer<typeof ManualTaskSchema>;
export type Disposition = Task["disposition"];
export type Outcome = Task["outcome"];

export function canPrepareManualCard(tasks: Task[], reviewed: boolean): boolean {
  return reviewed && tasks.length > 0 && tasks.length <= 20 &&
    tasks.every((task) => task.label.trim().length > 0) &&
    tasks.some((task) => task.disposition === "included");
}

export const ManualWorkspaceSchema = z.strictObject({
  version: z.literal(STORAGE_VERSION),
  sourceText: z.string().max(4000),
  lastSource: z.string().max(4000),
  tasks: tasksSchema,
  sourceReviewed: z.boolean(),
  cardTasks: tasksSchema.nullable(),
}).superRefine((workspace, context) => {
  if (!workspace.cardTasks) return;
  const validCard = canPrepareManualCard(workspace.cardTasks, workspace.sourceReviewed);
  const matchesReview = workspace.cardTasks.length === workspace.tasks.length &&
    workspace.cardTasks.every((cardTask, index) => {
      const task = workspace.tasks[index];
      return task.id === cardTask.id && task.label === cardTask.label &&
        task.destinationId === cardTask.destinationId && task.disposition === cardTask.disposition;
    });
  if (!validCard || !matchesReview) {
    context.addIssue({ code: "custom", message: "Card must match a valid, confirmed review." });
  }
});

export type PersistedWorkspace = z.infer<typeof ManualWorkspaceSchema>;

export function readPersistedWorkspace(raw: string | null): PersistedWorkspace | null {
  if (!raw || raw.length > 100_000) return null;
  try {
    const result = ManualWorkspaceSchema.safeParse(JSON.parse(raw));
    return result.success ? result.data : null;
  } catch {
    return null;
  }
}

// Manual convenience only: no language interpretation or automatic cancellations.
export function splitRequest(text: string): string[] {
  return text.split(/\n+|(?:[.!?]+|;)\s+/)
    .map((part) => part.replace(/[.!?]+$/, "").trim()).filter(Boolean);
}
