"use client";

import { motion, useReducedMotion } from "framer-motion";

const EASE = [0.32, 0.72, 0, 1] as const;
const ROWS = [0.78, 0.52, 0.9, 0.4];

export function BuildList() {
  const reduce = useReducedMotion();

  return (
    <ol aria-busy="true" aria-label="Building the list" className="mx-auto flex w-full max-w-sm flex-col gap-2.5">
      {ROWS.map((width, index) => (
        <motion.li
          key={index}
          initial={reduce ? { opacity: 0 } : { opacity: 0, y: 22, scale: 0.98 }}
          animate={{ opacity: 1, y: 0, scale: 1 }}
          transition={{ type: "spring", duration: reduce ? 0.01 : 0.55, bounce: 0, delay: index * 0.12 }}
          className="flex items-center gap-3 overflow-hidden rounded-[1.25rem] bg-card px-3 py-3 shadow-[0_16px_36px_-28px_oklch(0.2_0.02_90/0.55)] ring-1 ring-foreground/10"
        >
          <span
            aria-hidden="true"
            className="h-8 w-5 shrink-0 border-r border-dashed border-foreground/15"
            style={{
              backgroundImage: "radial-gradient(circle, var(--border) 1.3px, transparent 1.4px)",
              backgroundSize: "8px 10px",
              backgroundPosition: "center",
            }}
          />
          <span className="min-w-0 flex-1">
            <span className="block h-2 w-8 rounded-full bg-foreground/10" />
            <span className="relative mt-2.5 block h-2.5 overflow-hidden rounded-full bg-foreground/8">
              <motion.span
                className="absolute inset-y-0 left-0 origin-left rounded-full bg-foreground/15"
                style={{ width: `${width * 100}%` }}
                initial={{ scaleX: 0 }}
                animate={{ scaleX: 1 }}
                transition={{ duration: reduce ? 0.01 : 0.7, ease: EASE, delay: 0.15 + index * 0.12 }}
              />
              {!reduce && (
                <motion.span
                  aria-hidden="true"
                  className="absolute inset-y-0 w-1/3 bg-background/70"
                  initial={{ x: "-120%" }}
                  animate={{ x: "320%" }}
                  transition={{ duration: 1.35, ease: EASE, repeat: Infinity, delay: index * 0.18 }}
                />
              )}
            </span>
          </span>
          <span aria-hidden="true" className="size-11 shrink-0 rounded-full border border-primary/50" />
        </motion.li>
      ))}
    </ol>
  );
}
