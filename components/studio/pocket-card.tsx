"use client";

import { useRef } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import type { Outcome, Task } from "@/lib/domain/manual-workspace";

const OUTCOMES: Outcome[] = ["done", "unavailable", "deferred", "pending"];

function outcomeLabel(outcome: Outcome) {
  if (outcome === "pending") return "Pending";
  if (outcome === "done") return "Done";
  if (outcome === "unavailable") return "Unavailable";
  return "Later";
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
  const cardRef = useRef<HTMLDivElement>(null);
  const progress = includedCount === 0 ? 0 : completedCount / includedCount;

  function tilt(event: React.PointerEvent<HTMLDivElement>) {
    if (reduce || event.pointerType === "touch") return;
    const node = cardRef.current;
    if (!node) return;
    const rect = node.getBoundingClientRect();
    const x = (event.clientX - rect.left) / rect.width - 0.5;
    const y = (event.clientY - rect.top) / rect.height - 0.5;
    node.style.transition = "none";
    node.style.transform = `perspective(900px) rotateX(${(-y * 5).toFixed(2)}deg) rotateY(${(x * 7).toFixed(2)}deg)`;
  }

  function releaseTilt() {
    const node = cardRef.current;
    if (!node) return;
    node.style.transition = "transform 480ms cubic-bezier(0.32, 0.72, 0, 1)";
    node.style.transform = "perspective(900px) rotateX(0deg) rotateY(0deg)";
  }

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

      <div className="rounded-[1.85rem] bg-foreground/[0.05] p-2 ring-1 ring-foreground/10 print:bg-transparent print:p-0 print:ring-0">
        <div
          ref={cardRef}
          onPointerMove={tilt}
          onPointerLeave={releaseTilt}
          className="rounded-[1.45rem] bg-card px-4 py-5 shadow-[inset_0_1px_0_oklch(1_0_0/0.5),0_24px_50px_-36px_oklch(0.2_0.02_90/0.55)] will-change-transform print:transform-none print:shadow-none sm:px-6"
        >
          <div className="h-1 overflow-hidden rounded-full bg-muted">
            <div
              className="h-full origin-left rounded-full bg-primary"
              style={{
                transform: `scaleX(${progress})`,
                transitionProperty: "transform",
                transitionDuration: "320ms",
                transitionTimingFunction: "cubic-bezier(0.32, 0.72, 0, 1)",
              }}
            />
          </div>

          {stops.length === 0 ? (
            <p className="py-10 text-center text-sm text-muted-foreground">No included stops.</p>
          ) : (
            <ol className="mt-5 space-y-6">
              {stops.map((stop, stopIndex) => (
                <li key={stop.destination.id}>
                  <div className="flex items-baseline gap-3">
                    <span className="font-mono text-xs text-muted-foreground tabular-nums">
                      {String(stopIndex + 1).padStart(2, "0")}
                    </span>
                    <div>
                      <h3 className="font-heading text-lg font-bold tracking-[-0.03em] text-foreground">
                        {stop.destination.name}
                      </h3>
                      <p className="text-xs text-pretty text-muted-foreground">{stop.destination.detail}</p>
                    </div>
                  </div>
                  <ul className="mt-3 space-y-2">
                    {stop.tasks.map((task) => {
                      const done = task.outcome === "done";
                      return (
                        <li
                          key={task.id}
                          className="rounded-[1rem] bg-background/70 px-2 py-2 ring-1 ring-border/80"
                        >
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              aria-pressed={done}
                              aria-label={done ? `Mark ${task.label} pending` : `Mark ${task.label} done`}
                              onClick={() => onOutcome(task.id, done ? "pending" : "done")}
                              className={`grid size-11 shrink-0 place-items-center rounded-full transition-transform duration-150 ease-out active:scale-[0.96] ${
                                done ? "bg-primary text-primary-foreground" : "text-transparent ring-1 ring-border"
                              }`}
                              style={{ transitionProperty: "scale, background-color, color" }}
                            >
                              <motion.span
                                key={done ? "done" : "open"}
                                initial={reduce ? false : { opacity: 0, scale: 0.25, filter: "blur(4px)" }}
                                animate={{ opacity: 1, scale: 1, filter: "blur(0px)" }}
                                transition={{ type: "spring", duration: 0.3, bounce: 0 }}
                                className={done ? "text-sm font-bold" : "text-sm font-bold text-transparent"}
                              >
                                ✓
                              </motion.span>
                            </button>
                            <span
                              className={`min-w-0 flex-1 text-sm font-semibold text-pretty ${
                                done ? "text-muted-foreground line-through" : "text-foreground"
                              }`}
                            >
                              {task.label}
                            </span>
                          </div>
                          <div className="no-print mt-1 flex flex-wrap gap-1 pl-[3.25rem]">
                            {OUTCOMES.map((outcome) => {
                              const selected = task.outcome === outcome;
                              return (
                                <button
                                  key={outcome}
                                  type="button"
                                  aria-pressed={selected}
                                  onClick={() => onOutcome(task.id, outcome)}
                                  className={`h-9 rounded-full px-2.5 text-[10px] font-semibold tracking-wider uppercase transition-colors duration-150 ${
                                    selected
                                      ? "bg-secondary text-secondary-foreground"
                                      : "text-muted-foreground hover:text-foreground"
                                  }`}
                                  style={{ transitionProperty: "background-color, color" }}
                                >
                                  {outcomeLabel(outcome)}
                                </button>
                              );
                            })}
                          </div>
                        </li>
                      );
                    })}
                  </ul>
                </li>
              ))}
            </ol>
          )}

          {(cancelled.length > 0 || deferred.length > 0) && (
            <div className="mt-6 grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
              {cancelled.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Skip</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {cancelled.map((task) => (
                      <li key={task.id} className="line-through">{task.label}</li>
                    ))}
                  </ul>
                </div>
              )}
              {deferred.length > 0 && (
                <div>
                  <p className="text-[10px] font-semibold tracking-[0.18em] text-muted-foreground uppercase">Later</p>
                  <ul className="mt-1 space-y-1 text-xs text-muted-foreground">
                    {deferred.map((task) => (
                      <li key={task.id}>{task.label}</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

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
