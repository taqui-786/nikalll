"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Shdr23 } from "@/components/ui/shdr-23";
import type { OrbState } from "@/components/ui/orbkit-core";
import { AudioWave } from "@/components/studio/audio-wave";
import { BuildList } from "@/components/studio/build-list";

const EASE = [0.32, 0.72, 0, 1] as const;

function TrashIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <path d="M5 7h14" strokeLinecap="round" />
      <path d="M9 7V5.5h6V7" strokeLinecap="round" strokeLinejoin="round" />
      <path d="M8 7l.8 12h6.4L16 7" strokeLinejoin="round" />
    </svg>
  );
}

function KeyboardIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true" className="size-5" fill="none" stroke="currentColor" strokeWidth="1.5">
      <rect x="3.5" y="6" width="17" height="12" rx="2.5" />
      <path d="M7.5 10h.01M12 10h.01M16.5 10h.01M8 14h8" strokeLinecap="round" />
    </svg>
  );
}

export function CaptureStage({
  sourceText,
  onSourceText,
  orbState,
  inputLevel,
  analyser,
  recording,
  seconds,
  building,
  hearing,
  askMic,
  denied,
  holdHint,
  onAllowMic,
  onTypeInstead,
  onOrbDown,
  onOrbUp,
  onExtract,
  onSample,
  onLevel,
  onClear,
}: {
  sourceText: string;
  onSourceText: (value: string) => void;
  orbState: OrbState;
  inputLevel: number;
  analyser: AnalyserNode | null;
  recording: boolean;
  seconds: number;
  building: boolean;
  hearing: boolean;
  askMic: boolean;
  denied: boolean;
  holdHint: boolean;
  onAllowMic: () => void;
  onTypeInstead: () => void;
  onOrbDown: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onOrbUp: (event: React.PointerEvent<HTMLButtonElement>) => void;
  onExtract: () => void;
  onSample: () => void;
  onLevel: (level: number) => void;
  onClear: () => void;
}) {
  const reduce = useReducedMotion();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(sourceText);
  const [manual, setManual] = useState(false);
  const [seenText, setSeenText] = useState(sourceText);
  const busy = building || hearing;

  if (sourceText !== seenText) {
    setSeenText(sourceText);
    if (sourceText.trim() && !recording && !building) setManual(true);
  }

  useEffect(() => {
    textRef.current = sourceText;
  }, [sourceText]);

  useEffect(() => {
    if (busy || recording || manual) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [contenteditable='true']")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.length !== 1) return;
      event.preventDefault();
      setManual(true);
      onSourceText(`${textRef.current}${event.key}`.slice(0, 4000));
      window.requestAnimationFrame(() => {
        const field = fieldRef.current;
        if (!field) return;
        field.focus();
        const end = field.value.length;
        field.setSelectionRange(end, end);
      });
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [busy, manual, onSourceText, recording]);

  const pill = recording
    ? "Tap and hold while you talk"
    : hearing
      ? "Hearing"
      : building
        ? "Building"
        : holdHint
          ? "Hold while you talk"
          : "Tap to speak";

  return (
    <div className="flex h-full min-h-0 flex-col justify-between px-1 py-4 pb-[max(1rem,env(safe-area-inset-bottom))] sm:py-6">
      <div className="my-auto flex flex-col items-center justify-center">
        <div className="relative flex min-h-36 w-full items-center justify-center">
          <AnimatePresence mode="wait">
            {building ? (
              <motion.div
                key="building"
                className="w-full"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 18, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(4px)" }}
                transition={{ duration: reduce ? 0.12 : 0.45, ease: EASE }}
              >
                <BuildList />
              </motion.div>
            ) : recording ? (
              <motion.div
                key="wave"
                className="flex w-full justify-center"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 8, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.28, ease: EASE }}
              >
                <AudioWave analyser={analyser} active onLevel={onLevel} />
              </motion.div>
            ) : (
              <motion.div
                key="title"
                className="px-4 text-center"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={reduce ? { opacity: 0 } : { opacity: 0, y: -8, filter: "blur(4px)" }}
                transition={{ duration: 0.4, ease: EASE }}
              >
                <h1 className="font-heading text-4xl font-extrabold tracking-[-0.055em] text-balance text-foreground sm:text-6xl">
                  What needs doing outside?
                </h1>
                <p className="mx-auto mt-4 max-w-sm text-base text-pretty text-muted-foreground sm:text-lg">
                  Say the errands out loud. Nikal turns them into a walk.
                </p>
              </motion.div>
            )}
          </AnimatePresence>
          {!recording && (
            <div className="sr-only">
              <AudioWave analyser={analyser} active={false} onLevel={onLevel} />
            </div>
          )}
        </div>

        <AnimatePresence>
          {askMic && !recording && (
            <motion.div
              key="permit"
              role="group"
              aria-label="Microphone permission"
              className="mt-8 w-full max-w-sm rounded-[1.5rem] bg-foreground/[0.04] p-1.5 ring-1 ring-foreground/10"
              initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
              animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
              exit={{ opacity: 0, y: 8 }}
              transition={{ duration: 0.35, ease: EASE }}
            >
              <div className="rounded-[1.15rem] bg-card px-4 py-4 text-center shadow-[inset_0_1px_0_oklch(1_0_0/0.45)]">
                <p className="text-sm font-semibold text-balance text-foreground">Allow the microphone</p>
                <p className="mt-1 text-xs text-pretty text-muted-foreground">
                  Speech is sent to ElevenLabs to transcribe, then discarded.
                </p>
                <div className="mt-4 flex items-center justify-center gap-2">
                  <button
                    type="button"
                    onClick={onAllowMic}
                    className="inline-flex h-11 items-center rounded-full bg-primary px-5 text-xs font-semibold tracking-widest text-primary-foreground uppercase transition-transform duration-150 ease-out active:scale-[0.96]"
                    style={{ transitionProperty: "scale" }}
                  >
                    Allow
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      onTypeInstead();
                      setManual(true);
                    }}
                    className="inline-flex h-11 items-center rounded-full px-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase"
                  >
                    Type
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
        {denied && !manual && (
          <p className="mt-6 text-center text-xs text-pretty text-muted-foreground">Microphone blocked. Use the keyboard.</p>
        )}
      </div>

      <div className="no-print px-4">
        <div className="mx-auto flex w-full max-w-md flex-col items-center">
          <AnimatePresence>
            {manual && !recording && !building && (
              <motion.div
                key="sheet"
                className="mb-3 w-full rounded-[1.6rem] bg-card p-3 shadow-[0_18px_40px_-28px_oklch(0.2_0.02_90/0.45)] ring-1 ring-foreground/10"
                initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(4px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: 10 }}
                transition={{ duration: 0.32, ease: EASE }}
              >
                <textarea
                  ref={fieldRef}
                  id="source-text"
                  value={sourceText}
                  rows={3}
                  maxLength={4000}
                  aria-label="Type a request"
                  placeholder="Milk, then the post office"
                  onChange={(event) => onSourceText(event.target.value)}
                  onKeyDown={(event) => {
                    if (event.key === "Enter" && !event.shiftKey) {
                      event.preventDefault();
                      onExtract();
                    }
                  }}
                  className="w-full resize-none bg-transparent px-2 py-1 text-base text-pretty text-foreground outline-none placeholder:text-muted-foreground/50"
                />
                <div className="mt-2 flex items-center justify-between gap-3 px-1">
                  <button
                    type="button"
                    onClick={onSample}
                    className="text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase"
                  >
                    Sample
                  </button>
                  <div className="flex items-center gap-3">
                    <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{sourceText.length}/4000</span>
                    <button
                      type="button"
                      onClick={onExtract}
                      disabled={busy || !sourceText.trim()}
                      className="inline-flex h-10 items-center rounded-full bg-primary px-5 text-xs font-semibold tracking-widest text-primary-foreground uppercase transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40"
                      style={{ transitionProperty: "scale, opacity" }}
                    >
                      Build
                    </button>
                  </div>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.p
            key={pill}
            aria-live="polite"
            initial={reduce ? false : { opacity: 0, y: 8, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            transition={{ duration: 0.28, ease: EASE }}
            className="mb-6 inline-flex items-center gap-2 rounded-full bg-card px-4 py-2 text-sm font-semibold text-foreground shadow-[0_10px_30px_-18px_oklch(0.2_0.02_90/0.6)] ring-1 ring-foreground/10"
          >
            <span className={`size-2 rounded-full ${recording ? "bg-primary" : "bg-foreground/25"}`} aria-hidden="true" />
            {pill}
            {recording && (
              <span className="font-mono text-xs text-muted-foreground tabular-nums">
                {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
              </span>
            )}
          </motion.p>

          <div className="flex w-full max-w-xs items-center justify-between">
            <button
              type="button"
              aria-label="Clear workspace"
              onClick={onClear}
              disabled={busy || recording}
              className="grid size-12 place-items-center rounded-full bg-card text-foreground ring-1 ring-foreground/10 transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40"
              style={{ transitionProperty: "scale, opacity" }}
            >
              <TrashIcon />
            </button>
            <button
              type="button"
              aria-label="Tap to speak. Hold while you talk."
              aria-pressed={recording}
              disabled={busy}
              onPointerDown={onOrbDown}
              onPointerUp={onOrbUp}
              onPointerCancel={onOrbUp}
              className="grid size-[5.75rem] place-items-center rounded-full transition-transform duration-150 ease-out select-none active:scale-[0.96] disabled:opacity-80"
              style={{ touchAction: "none", transitionProperty: "scale, opacity" }}
            >
              <Shdr23
                state={orbState}
                size={92}
                volumes={recording ? { input: inputLevel } : undefined}
                className="pointer-events-none"
              />
            </button>
            <button
              type="button"
              aria-label="Type a request"
              aria-pressed={manual}
              disabled={recording || building}
              onClick={() => setManual((open) => !open)}
              className={`grid size-12 place-items-center rounded-full ring-1 ring-foreground/10 transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40 ${
                manual ? "bg-foreground text-background" : "bg-card text-foreground"
              }`}
              style={{ transitionProperty: "scale, opacity, background-color, color" }}
            >
              <KeyboardIcon />
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
