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
  { id: "included", label: "Included" },
  { id: "cancelled", label: "Cancelled" },
  { id: "deferred", label: "Later" },
];

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
        className="mt-6 space-y-3"
        initial="hidden"
        animate="show"
        variants={{ show: { transition: { staggerChildren: reduce ? 0 : 0.08 } } }}
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
                className="rounded-[1.4rem] bg-foreground/[0.04] p-1.5 ring-1 ring-foreground/10"
              >
                <div className="rounded-[1.05rem] bg-card px-3 py-3 shadow-[inset_0_1px_0_oklch(1_0_0/0.4)] sm:px-4">
                  <div className="flex items-start gap-2">
                    <span className="pt-2 font-mono text-[11px] text-muted-foreground tabular-nums">
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <input
                      aria-label={`Edit errand ${index + 1}`}
                      value={task.label}
                      maxLength={160}
                      onChange={(event) => onUpdate(task.id, { label: event.target.value })}
                      className={`min-w-0 flex-1 bg-transparent py-1.5 text-base font-semibold outline-none ${
                        task.disposition === "cancelled" ? "text-muted-foreground line-through" : "text-foreground"
                      }`}
                    />
                    <button
                      type="button"
                      onClick={() => onRemove(task.id)}
                      aria-label={`Remove errand ${index + 1}`}
                      className="grid size-11 shrink-0 place-items-center text-lg text-muted-foreground transition-transform duration-150 ease-out hover:text-foreground active:scale-[0.96]"
                      style={{ transitionProperty: "scale, color" }}
                    >
                      ×
                    </button>
                  </div>

                  <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                    {DISPOSITIONS.map((item) => {
                      const selected = task.disposition === item.id;
                      return (
                        <button
                          key={item.id}
                          type="button"
                          aria-pressed={selected}
                          onClick={() => onUpdate(task.id, { disposition: item.id })}
                          className={`h-10 rounded-full px-3 text-[11px] font-semibold tracking-wider uppercase transition-colors duration-150 ${
                            selected ? "bg-secondary text-secondary-foreground" : "text-muted-foreground hover:text-foreground"
                          }`}
                          style={{ transitionProperty: "background-color, color" }}
                        >
                          {item.label}
                        </button>
                      );
                    })}
                  </div>

                  {task.disposition === "included" ? (
                    <div className="mt-2 flex flex-wrap gap-1.5 pl-7">
                      {destinations.map((destination) => {
                        const selected = task.destinationId === destination.id;
                        return (
                          <button
                            key={destination.id}
                            type="button"
                            aria-pressed={selected}
                            onClick={() => onUpdate(task.id, { destinationId: destination.id })}
                            className={`h-10 rounded-full px-3 text-xs font-semibold transition-colors duration-150 ${
                              selected
                                ? "bg-primary text-primary-foreground"
                                : needsStop
                                  ? "text-foreground ring-1 ring-primary/70"
                                  : "text-muted-foreground ring-1 ring-border hover:text-foreground"
                            }`}
                            style={{ transitionProperty: "background-color, color" }}
                          >
                            {destination.name}
                          </button>
                        );
                      })}
                    </div>
                  ) : (
                    <p className="mt-2 pl-7 text-xs text-muted-foreground">No stop</p>
                  )}
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
