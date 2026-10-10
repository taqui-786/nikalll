"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.32, 0.72, 0, 1] as const;
const STOPS = ["Local Grocery", "Post Office", "Stationery Corner"];

function linesFrom(source: string) {
  const parts = source
    .split(/\n+|(?:[.!?]+)\s+/)
    .map((part) => part.replace(/[.!?]+$/, "").trim())
    .filter(Boolean)
    .slice(0, 4);
  if (parts.length > 0) return parts;
  const trimmed = source.trim();
  return [trimmed ? trimmed.slice(0, 90) : "Reading the request"];
}

export function BuildList({ source }: { source: string }) {
  const reduce = useReducedMotion();
  const lines = linesFrom(source);

  return (
    <div className="mx-auto mt-8 w-full max-w-md text-left">
      <p className="mb-4 text-center font-heading text-[10px] font-semibold uppercase tracking-[0.22em] text-muted-foreground">
        Building
      </p>
      <ol className="relative space-y-3">
        <motion.span
          aria-hidden="true"
          className="absolute top-4 bottom-4 left-[1.35rem] w-px origin-top bg-foreground/15"
          initial={reduce ? false : { scaleY: 0 }}
          animate={{ scaleY: 1 }}
          transition={{ duration: 0.7, ease: EASE }}
        />
        {lines.map((line, index) => (
          <motion.li
            key={`${index}-${line.slice(0, 24)}`}
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 28, rotate: index % 2 === 0 ? -1.4 : 1.4, filter: "blur(8px)" }}
            animate={reduce ? { opacity: 1 } : { opacity: 1, y: 0, rotate: 0, filter: "blur(0px)" }}
            transition={{ delay: 0.12 + index * 0.14, duration: 0.62, ease: EASE }}
          >
            <div className="rounded-[1.35rem] bg-foreground/[0.04] p-1.5 shadow-[0_16px_40px_-28px_oklch(0.15_0.02_90/0.45)] ring-1 ring-foreground/10">
              <div className="rounded-[1.05rem] bg-card px-4 py-3.5 shadow-[inset_0_1px_0_oklch(1_0_0/0.45)]">
                <div className="flex items-start gap-3">
                  <span className="pt-0.5 font-mono text-[11px] text-muted-foreground tabular-nums">
                    {String(index + 1).padStart(2, "0")}
                  </span>
                  <div className="min-w-0 flex-1">
                    <p className="text-sm font-semibold text-pretty text-foreground">{line}</p>
                    <div className="mt-3 flex items-center gap-3">
                      <div className="h-1 flex-1 overflow-hidden rounded-full bg-muted">
                        <motion.div
                          className="h-full origin-left rounded-full bg-primary"
                          initial={{ scaleX: 0 }}
                          animate={{ scaleX: reduce ? 0.72 : [0.08, 0.92, 0.64] }}
                          transition={
                            reduce
                              ? { duration: 0.2 }
                              : { delay: 0.28 + index * 0.14, duration: 1.5, ease: EASE, repeat: Infinity, repeatType: "mirror" }
                          }
                          style={{ transformOrigin: "left center" }}
                        />
                      </div>
                      <motion.span
                        className="shrink-0 text-[10px] font-semibold uppercase tracking-[0.16em] text-primary-foreground"
                        initial={{ opacity: 0, y: 6, filter: "blur(4px)" }}
                        animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                        transition={{ delay: 0.45 + index * 0.16, duration: 0.4, ease: EASE }}
                      >
                        {STOPS[index % STOPS.length]}
                      </motion.span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.li>
        ))}
      </ol>
    </div>
  );
}
