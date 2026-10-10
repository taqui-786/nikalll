"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Outcome, Task } from "@/lib/domain/manual-workspace";

const CYCLE: Outcome[] = ["pending", "done", "unavailable", "deferred"];

function outcomeLabel(outcome: Outcome) {
  if (outcome === "done") return "Done";
  if (outcome === "unavailable") return "Out";
  if (outcome === "deferred") return "Later";
  return "Open";
}

function nextOutcome(outcome: Outcome): Outcome {
  const index = CYCLE.indexOf(outcome);
  return CYCLE[(index + 1) % CYCLE.length];
}

type Stop = {
  destination: { id: string; name: string; detail: string };
  tasks: Task[];
};

export function PocketCardView({
  stops,
  cancelled,
  deferred,
  completedCount,
  includedCount,
  onOutcome,
  onEdit,
  onNew,
}: {
  stops: Stop[];
  cancelled: Task[];
  deferred: Task[];
  completedCount: number;
  includedCount: number;
  onOutcome: (id: string, outcome: Outcome) => void;
  onEdit: () => void;
  onNew: () => void;
}) {
  const reduce = useReducedMotion();
  const left = Math.max(includedCount - completedCount, 0);

  return (
    <div>
      <div className="mb-4 flex items-end justify-between gap-3">
        <h2 className="font-heading text-3xl font-extrabold tracking-[-0.05em] text-balance text-foreground sm:text-4xl">
          Pocket card
        </h2>
        <p className="font-mono text-xs text-muted-foreground tabular-nums">
          {completedCount}/{includedCount}
        </p>
      </div>

      <article className="bg-card px-5 pt-5 pb-4 shadow-[0_0_0_1px_oklch(0_0_0/0.06),0_18px_36px_-28px_oklch(0.2_0.02_90/0.7)] print:shadow-none sm:px-7">
        <header className="flex items-end justify-between gap-4">
          <div>
            <p className="font-mono text-[10px] tracking-[0.22em] text-muted-foreground uppercase">Walk</p>
            <p className="font-heading text-[2rem] leading-none font-extrabold tracking-[-0.05em] text-foreground tabular-nums">
              {left} left
            </p>
          </div>
          <p className="pb-1 font-mono text-[11px] text-muted-foreground tabular-nums">
            {String(stops.length).padStart(2, "0")} stops
          </p>
        </header>

        <div className="mt-4 border-t border-dashed border-foreground/25" />

        {stops.length === 0 ? (
          <p className="py-10 text-center text-sm text-muted-foreground">No included stops.</p>
        ) : (
          <ol>
            {stops.map((stop, stopIndex) => (
              <li key={stop.destination.id} className={stopIndex === 0 ? "pt-4" : "pt-5"}>
                <div className="flex items-baseline justify-between gap-3">
                  <h3 className="font-heading text-sm font-bold tracking-[0.16em] text-foreground uppercase">
                    {stop.destination.name}
                  </h3>
                  <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                    {String(stopIndex + 1).padStart(2, "0")}
                  </span>
                </div>
                <p className="mt-0.5 text-[11px] text-pretty text-muted-foreground">{stop.destination.detail}</p>
                <ul className="mt-1">
                  {stop.tasks.map((task) => {
                    const done = task.outcome === "done";
                    const upcoming = nextOutcome(task.outcome);
                    return (
                      <li key={task.id} className="flex items-center border-b border-foreground/8">
                        <button
                          type="button"
                          aria-pressed={done}
                          aria-label={done ? `Mark ${task.label} open` : `Mark ${task.label} done`}
                          onClick={() => onOutcome(task.id, done ? "pending" : "done")}
                          className="flex min-h-11 min-w-0 flex-1 items-center gap-3 py-2 text-left transition-transform duration-150 ease-out active:scale-[0.96]"
                          style={{ transitionProperty: "scale" }}
                        >
                          <span
                            className={`grid size-[18px] shrink-0 place-items-center border ${
                              done ? "border-primary bg-primary text-primary-foreground" : "border-foreground/35 text-transparent"
                            }`}
                          >
                            <motion.span
                              key={done ? "done" : "open"}
                              initial={reduce ? false : { opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                              animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                              transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                              className="text-[11px] leading-none font-bold"
                            >
                              ✓
                            </motion.span>
                          </span>
                          <span
                            className={`min-w-0 text-sm font-medium text-pretty ${
                              done ? "text-muted-foreground line-through" : "text-foreground"
                            }`}
                          >
                            {task.label}
                          </span>
                        </button>
                        <button
                          type="button"
                          aria-label={`Set ${task.label} to ${outcomeLabel(upcoming)}`}
                          onClick={() => onOutcome(task.id, upcoming)}
                          className={`min-h-11 shrink-0 px-1 text-[11px] font-semibold tracking-[0.12em] uppercase transition-colors duration-150 ${
                            done ? "text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                          style={{ transitionProperty: "color" }}
                        >
                          {outcomeLabel(task.outcome)}
                        </button>
                      </li>
                    );
                  })}
                </ul>
              </li>
            ))}
          </ol>
        )}

        {(cancelled.length > 0 || deferred.length > 0) && (
          <div className="mt-5 grid gap-4 border-t border-dashed border-foreground/25 pt-4 sm:grid-cols-2">
            {cancelled.length > 0 && (
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Skip</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {cancelled.map((task) => (
                    <li key={task.id} className="line-through">{task.label}</li>
                  ))}
                </ul>
              </div>
            )}
            {deferred.length > 0 && (
              <div>
                <p className="font-mono text-[10px] tracking-[0.18em] text-muted-foreground uppercase">Later</p>
                <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
                  {deferred.map((task) => (
                    <li key={task.id}>{task.label}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}
      </article>

      <div className="no-print mt-5 flex flex-wrap items-center justify-between gap-3">
        <Button type="button" variant="outline" onClick={onEdit}>
          Edit
        </Button>
        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" onClick={() => window.print()}>
            Print
          </Button>
          <Button type="button" onClick={onNew}>
            New
          </Button>
        </div>
      </div>
    </div>
  );
}
