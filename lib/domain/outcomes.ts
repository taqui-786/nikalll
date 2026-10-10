import { TaskOutcomeSchema } from "./schemas";
import type { DomainResult } from "./types";
import type { TaskOutcome } from "./types";

export function validateTaskOutcome(input: unknown): DomainResult<TaskOutcome> {
  const parsed = TaskOutcomeSchema.safeParse(input);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        error: {
          code: "TASK_OUTCOME_INVALID",
          message: "Task outcome failed validation.",
        },
      };
}

export function summarizeUnfinishedTasks(
  outcomes: readonly TaskOutcome[],
): TaskOutcome[] {
  return outcomes.filter(
    (outcome) => outcome.status !== "done",
  );
}
