"use client";

import { motion, useReducedMotion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { DESTINATION_IDS, type Disposition, type Task } from "@/lib/domain/manual-workspace";

const EASE = [0.32, 0.72, 0, 1] as const;

type Destination = {
  id: (typeof DESTINATION_IDS)[number];
  name: string;
};

const DISPOSITIONS: { id: Disposition; label: string }[] = [
  { id: "included", label: "Keep" },
  { id: "cancelled", label: "Skip" },
  { id: "deferred", label: "Later" },
];

function shortStop(name: string) {
  return name.replace(/^Local\s+/i, "").replace(/\s+(Office|Corner)$/i, "");
}

export function ReviewBoard({
  tasks,
  lastSource,
  destinations,
  sourceReviewed,
  missingDestinationCount,
  canPrepare,
  onBack,
  onAdd,
  onUpdate,
  onRemove,
  onReviewed,
  onPrepare,
}: {
  tasks: Task[];
  lastSource: string;
  destinations: Destination[];
  sourceReviewed: boolean;
  missingDestinationCount: number;
  canPrepare: boolean;
  onBack: () => void;
  onAdd: () => void;
  onUpdate: (id: string, updates: Partial<Task>) => void;
  onRemove: (id: string) => void;
  onReviewed: (checked: boolean) => void;
  onPrepare: () => void;
}) {
  const reduce = useReducedMotion();

  return (
    <div>
      <div className="flex items-end justify-between gap-3">
        <h2 className="font-heading text-3xl font-extrabold tracking-[-0.05em] text-balance text-foreground sm:text-4xl">
          Review
        </h2>
        <Button type="button" size="xs" variant="outline" onClick={onAdd}>
          Add
        </Button>
      </div>
      {lastSource && (
        <p className="mt-3 line-clamp-2 text-xs text-pretty text-muted-foreground">{lastSource}</p>
      )}

      <motion.div
        className="mt-4 space-y-2"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.06 } } }}
      >
        {tasks.length === 0 ? (
          <p className="py-16 text-center text-sm text-muted-foreground">
            Nothing yet.{" "}
            <button type="button" onClick={onBack} className="underline underline-offset-4">
              Add a request
            </button>
          </p>
        ) : (
          tasks.map((task, index) => {
            const needsStop = task.disposition === "included" && !task.destinationId;
            return (
              <motion.article
                key={task.id}
                variants={{
                  hidden: reduce ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(6px)" },
                  show: { opacity: 1, y: 0, filter: "blur(0px)" },
                }}
                transition={{ duration: 0.45, ease: EASE }}
                className="overflow-hidden rounded-2xl bg-card shadow-[0_12px_28px_-22px_oklch(0.2_0.02_90/0.55)] ring-1 ring-foreground/10"
              >
                <div className="flex">
                  <div className={`w-1 shrink-0 ${needsStop ? "bg-primary" : "bg-foreground/10"}`} aria-hidden="true" />
                  <div className="min-w-0 flex-1 px-3 py-2.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-[10px] text-muted-foreground tabular-nums">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      <input
                        aria-label={`Edit errand ${index + 1}`}
                        value={task.label}
                        maxLength={160}
                        onChange={(event) => onUpdate(task.id, { label: event.target.value })}
                        className={`min-w-0 flex-1 bg-transparent py-1 text-sm font-semibold outline-none ${
                          task.disposition === "cancelled" ? "text-muted-foreground line-through" : "text-foreground"
                        }`}
                      />
                      <button
                        type="button"
                        onClick={() => onRemove(task.id)}
                        aria-label={`Remove errand ${index + 1}`}
                        className="relative grid size-8 shrink-0 place-items-center text-muted-foreground transition-transform duration-150 ease-out before:absolute before:-inset-1.5 hover:text-foreground active:scale-[0.96]"
                        style={{ transitionProperty: "scale, color" }}
                      >
                        ×
                      </button>
                    </div>

                    <div className="mt-2.5 flex flex-wrap items-center gap-2 pl-6">
                      <div className="inline-flex h-8 items-stretch rounded-full bg-muted/80 p-0.5 ring-1 ring-border/50">
                        {DISPOSITIONS.map((item) => {
                          const selected = task.disposition === item.id;
                          return (
                            <button
                              key={item.id}
                              type="button"
                              aria-pressed={selected}
                              onClick={() => onUpdate(task.id, { disposition: item.id })}
                              className={`flex items-center justify-center rounded-full px-3 text-[11px] font-semibold tracking-wider uppercase transition-all duration-150 select-none cursor-pointer ${
                                selected
                                  ? "bg-foreground text-background shadow-xs font-bold"
                                  : "text-muted-foreground hover:text-foreground hover:bg-background/40 active:scale-95"
                              }`}
                            >
                              {item.label}
                            </button>
                          );
                        })}
                      </div>

                      {task.disposition === "included" ? (
                        <div
                          className={`inline-flex h-8 items-stretch rounded-full p-0.5 transition-all duration-150 ring-1 ${
                            needsStop ? "bg-primary/15 ring-primary" : "bg-muted/80 ring-border/50"
                          }`}
                        >
                          {destinations.map((destination) => {
                            const selected = task.destinationId === destination.id;
                            return (
                              <button
                                key={destination.id}
                                type="button"
                                aria-pressed={selected}
                                aria-label={destination.name}
                                onClick={() =>
                                  onUpdate(task.id, {
                                    destinationId: selected ? null : destination.id,
                                  })
                                }
                                className={`flex items-center justify-center rounded-full px-3 text-[11px] font-semibold tracking-wide transition-all duration-150 select-none cursor-pointer ${
                                  selected
                                    ? "bg-primary text-primary-foreground shadow-xs font-bold"
                                    : "text-muted-foreground hover:text-foreground hover:bg-background/40 active:scale-95"
                                }`}
                              >
                                {shortStop(destination.name)}
                              </button>
                            );
                          })}
                        </div>
                      ) : (
                        <span className="inline-flex h-8 items-center px-2 text-[11px] font-medium text-muted-foreground/60 italic">
                          No stop needed
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              </motion.article>
            );
          })
        )}
      </motion.div>

      <label className="mt-5 flex min-h-11 cursor-pointer items-center gap-3 rounded-[1.15rem] bg-card px-3 py-2 ring-1 ring-foreground/10">
        <input
          id="source-reviewed"
          type="checkbox"
          checked={sourceReviewed}
          onChange={(event) => onReviewed(event.target.checked)}
          className="size-4 accent-[var(--primary)]"
        />
        <span className="text-sm text-pretty text-foreground">I checked the original request.</span>
      </label>

      <div className="mt-5 flex flex-col items-stretch justify-between gap-3 sm:flex-row sm:items-center">
        <Button type="button" variant="ghost" onClick={onBack}>
          Back
        </Button>
        <div className="flex flex-col items-stretch gap-2 sm:flex-row sm:items-center">
          {missingDestinationCount > 0 && (
            <span className="text-center text-xs font-semibold text-primary-foreground tabular-nums">
              {missingDestinationCount} need a stop
            </span>
          )}
          <Button type="button" size="lg" onClick={onPrepare} disabled={!canPrepare}>
            Pocket card
          </Button>
        </div>
      </div>
    </div>
  );
}
