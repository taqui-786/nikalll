"use client";

import { useEffect, useRef } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { Shdr23 } from "@/components/ui/shdr-23";
import type { OrbState } from "@/components/ui/orbkit-core";
import { AudioWave } from "@/components/studio/audio-wave";
import { BuildList } from "@/components/studio/build-list";

const EASE = [0.32, 0.72, 0, 1] as const;

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
}) {
  const reduce = useReducedMotion();
  const fieldRef = useRef<HTMLTextAreaElement>(null);
  const textRef = useRef(sourceText);
  const busy = building || hearing;

  useEffect(() => {
    textRef.current = sourceText;
  }, [sourceText]);
  const showField = sourceText.length > 0 && !recording && !building && !hearing;

  useEffect(() => {
    if (busy || recording) return;
    function onKey(event: KeyboardEvent) {
      const target = event.target as HTMLElement | null;
      if (target?.closest("input, textarea, select, button, [contenteditable='true']")) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (event.key.length !== 1) return;
      event.preventDefault();
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
  }, [busy, onSourceText, recording]);

  const placeholder = recording
    ? "Listening"
    : hearing
      ? "Hearing"
      : building
        ? "Building"
        : "Tap to speak";

  return (
    <div className="flex flex-col items-center px-1 pt-4 pb-8 sm:pt-10">
      <motion.div
        className="flex flex-col items-center"
        animate={{ scale: building ? 0.84 : 1, y: building ? -6 : 0 }}
        transition={{ type: "spring", duration: reduce ? 0.01 : 0.45, bounce: 0 }}
      >
        <AudioWave analyser={analyser} active={recording} onLevel={onLevel} />
        <button
          type="button"
          aria-label="Tap to speak. Hold while you talk."
          aria-pressed={recording}
          disabled={busy}
          onPointerDown={onOrbDown}
          onPointerUp={onOrbUp}
          onPointerCancel={onOrbUp}
          className="relative mt-1 grid size-[15.5rem] place-items-center rounded-full transition-transform duration-150 ease-out select-none [-webkit-user-select:none] active:scale-[0.96] disabled:active:scale-100 sm:size-[17.5rem]"
          style={{ touchAction: "none", transitionProperty: "scale" }}
        >
          <Shdr23
            state={orbState}
            size={248}
            volumes={recording ? { input: inputLevel } : undefined}
            className="pointer-events-none"
          />
        </button>
        <p className="mt-3 min-h-6 text-center font-heading text-sm font-semibold tracking-[-0.03em] text-foreground" aria-live="polite">
          {placeholder}
          {recording && (
            <span className="ml-2 font-mono text-xs text-muted-foreground tabular-nums">
              {Math.floor(seconds / 60)}:{String(seconds % 60).padStart(2, "0")}
            </span>
          )}
        </p>
        {holdHint && !recording && !busy && (
          <p className="text-center text-xs text-pretty text-muted-foreground">Hold while you talk</p>
        )}
      </motion.div>

      <AnimatePresence mode="wait">
        {building ? (
          <motion.div
            key="building"
            className="w-full"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 16, filter: "blur(6px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={reduce ? { opacity: 0 } : { opacity: 0, y: -10, filter: "blur(4px)" }}
            transition={{ duration: reduce ? 0.12 : 0.4, ease: EASE }}
          >
            <BuildList source={sourceText} />
          </motion.div>
        ) : askMic ? (
          <motion.div
            key="permit"
            role="group"
            aria-label="Microphone permission"
            className="mt-6 w-full max-w-sm rounded-[1.5rem] bg-foreground/[0.04] p-1.5 ring-1 ring-foreground/10"
            initial={reduce ? { opacity: 0 } : { opacity: 0, y: 12, filter: "blur(4px)" }}
            animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
            exit={{ opacity: 0, y: 8 }}
            transition={{ duration: 0.35, ease: EASE }}
          >
            <div className="rounded-[1.15rem] bg-card px-4 py-4 text-center shadow-[inset_0_1px_0_oklch(1_0_0/0.4)]">
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
                  onClick={onTypeInstead}
                  className="inline-flex h-11 items-center rounded-full px-4 text-xs font-semibold tracking-widest text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground"
                  style={{ transitionProperty: "color" }}
                >
                  Type
                </button>
              </div>
            </div>
          </motion.div>
        ) : (
          <motion.div
            key="compose"
            className="mt-2 flex w-full max-w-md flex-col items-center"
            initial={false}
            animate={{ opacity: 1 }}
          >
            <textarea
              ref={fieldRef}
              id="source-text"
              value={sourceText}
              rows={showField ? 3 : 1}
              maxLength={4000}
              aria-label="Type a request"
              placeholder=""
              onChange={(event) => onSourceText(event.target.value)}
              onKeyDown={(event) => {
                if (event.key === "Enter" && !event.shiftKey) {
                  event.preventDefault();
                  onExtract();
                }
              }}
              className={`w-full resize-none bg-transparent text-center text-base text-pretty text-foreground outline-none placeholder:text-muted-foreground/40 ${
                showField ? "mt-4 min-h-16 px-2" : "sr-only"
              }`}
            />
            {showField && (
              <div className="mt-4 flex items-center gap-3">
                <button
                  type="button"
                  onClick={onExtract}
                  disabled={busy || !sourceText.trim()}
                  className="inline-flex h-11 items-center rounded-full bg-primary px-6 text-xs font-semibold tracking-widest text-primary-foreground uppercase transition-transform duration-150 ease-out active:scale-[0.96] disabled:opacity-40"
                  style={{ transitionProperty: "scale, opacity" }}
                >
                  Build
                </button>
                <span className="font-mono text-[10px] text-muted-foreground tabular-nums">{sourceText.length}/4000</span>
              </div>
            )}
            {!showField && !denied && (
              <button
                type="button"
                onClick={onSample}
                className="mt-6 text-[11px] font-semibold tracking-[0.16em] text-muted-foreground uppercase transition-colors duration-150 hover:text-foreground"
                style={{ transitionProperty: "color" }}
              >
                Sample
              </button>
            )}
            {denied && (
              <p className="mt-4 text-center text-xs text-pretty text-muted-foreground">
                Microphone blocked. Type the request.
              </p>
            )}
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
