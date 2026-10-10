"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Button } from "@/components/ui/button";
import { CaptureStage } from "@/components/studio/capture-stage";
import { PocketCardView } from "@/components/studio/pocket-card";
import { ReviewBoard } from "@/components/studio/review-board";
import type { OrbState } from "@/components/ui/orbkit-core";
import {
  STORAGE_KEY,
  STORAGE_VERSION,
  DESTINATION_IDS,
  ManualTaskSchema,
  ManualWorkspaceSchema,
  canPrepareManualCard,
  readPersistedWorkspace,
  splitRequest,
  type Task,
  type Outcome,
  type PersistedWorkspace,
} from "@/lib/domain/manual-workspace";

type Destination = {
  id: (typeof DESTINATION_IDS)[number];
  name: string;
  detail: string;
  aliases: string[];
};

const DESTINATIONS: Destination[] = [
  {
    id: "local-grocery",
    name: "Local Grocery",
    detail: "Daily essentials · fictional sample",
    aliases: ["milk", "bread", "doodh", "dudh", "grocery", "ration", "sabzi", "kirana", "shop", "butter", "eggs", "curd", "dahi"],
  },
  {
    id: "post-office",
    name: "Post Office",
    detail: "Parcel counter · fictional sample",
    aliases: ["parcel", "dak ghar", "dakghar", "post", "courier", "speed post", "letter", "stamp", "package"],
  },
  {
    id: "stationery-corner",
    name: "Stationery Corner",
    detail: "Books and school supplies · fictional sample",
    aliases: ["notebook", "pen", "stationery", "pencil", "book", "copy", "kitab", "kitāb", "paper", "print"],
  },
];

const SAMPLE_SOURCE =
  "Doodh 1 litre le aana. Bread mat lana, already hai. Parcel post office pe chhod dena. Stationery se notebook lena.";

function createId() {
  return crypto.randomUUID();
}

function inferDestination(hint: string | null | undefined, label: string): (typeof DESTINATION_IDS)[number] | null {
  const query = `${hint ?? ""} ${label}`.toLowerCase();
  for (const dest of DESTINATIONS) {
    if (dest.aliases.some((alias) => query.includes(alias.toLowerCase()))) {
      return dest.id;
    }
  }
  return null;
}

export default function Home() {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [sourceText, setSourceText] = useState("");
  const [lastSource, setLastSource] = useState("");
  const [tasks, setTasks] = useState<Task[]>([]);
  const [sourceReviewed, setSourceReviewed] = useState(false);
  const [cardTasks, setCardTasks] = useState<Task[] | null>(null);
  const [message, setMessage] = useState("");
  const [hydrated, setHydrated] = useState(false);
  const [storageBlocked, setStorageBlocked] = useState(false);
  const [storageStatus, setStorageStatus] = useState("Loading…");

  // AI & Voice state
  const [isExtracting, setIsExtracting] = useState(false);
  const [isTranscribing, setIsTranscribing] = useState(false);
  const [isRecording, setIsRecording] = useState(false);
  const [recordSeconds, setRecordSeconds] = useState(0);

  const [micState, setMicState] = useState<"unknown" | "granted" | "denied" | "prompt">("unknown");
  const [askMic, setAskMic] = useState(false);
  const [holdHint, setHoldHint] = useState(false);
  const [inputLevel, setInputLevel] = useState(0);
  const [analyser, setAnalyser] = useState<AnalyserNode | null>(null);

  const mediaRecorderRef = useRef<MediaRecorder | null>(null);
  const audioChunksRef = useRef<Blob[]>([]);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const audioCtxRef = useRef<AudioContext | null>(null);
  const holdRef = useRef(false);
  const recordStartedRef = useRef(0);
  const commitRef = useRef(true);

  // Restore browser state after mount
  /* eslint-disable react-hooks/set-state-in-effect -- localStorage hydration requires a client-only second render */
  useEffect(() => {
    try {
      const raw = window.localStorage.getItem(STORAGE_KEY);
      const persisted = readPersistedWorkspace(raw);
      if (persisted) {
        setSourceText(persisted.sourceText);
        setLastSource(persisted.lastSource);
        setTasks(persisted.tasks);
        setSourceReviewed(persisted.sourceReviewed);
        setCardTasks(persisted.cardTasks);

        if (persisted.cardTasks && persisted.cardTasks.length > 0) {
          setStep(3);
        } else if (persisted.tasks.length > 0) {
          setStep(2);
        } else {
          setStep(1);
        }
      } else if (raw !== null) {
        setStorageBlocked(true);
        setStorageStatus("Saved data unreadable. Clear workspace to reset.");
      }
    } catch {
      setStorageBlocked(true);
      setStorageStatus("Browser storage unavailable.");
    }
    setHydrated(true);
  }, []);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Save changes locally
  useEffect(() => {
    if (!hydrated || storageBlocked) return;

    function save() {
      try {
        const persisted: PersistedWorkspace = {
          version: STORAGE_VERSION,
          sourceText,
          lastSource,
          tasks,
          sourceReviewed,
          cardTasks,
        };
        const valid = ManualWorkspaceSchema.parse(persisted);
        window.localStorage.setItem(STORAGE_KEY, JSON.stringify(valid));
        setStorageStatus("Saved locally in this browser.");
      } catch {
        setStorageStatus("Could not save to browser storage.");
      }
    }

    const timeout = window.setTimeout(save, 300);
    window.addEventListener("pagehide", save);
    return () => {
      window.clearTimeout(timeout);
      window.removeEventListener("pagehide", save);
    };
  }, [cardTasks, hydrated, lastSource, sourceReviewed, sourceText, storageBlocked, tasks]);

  useEffect(() => {
    const permissions = navigator.permissions;
    if (!permissions?.query) return;
    let status: PermissionStatus | null = null;
    let cancelled = false;
    permissions
      .query({ name: "microphone" as PermissionName })
      .then((next) => {
        if (cancelled) return;
        status = next;
        if (next.state === "granted" || next.state === "denied" || next.state === "prompt") {
          setMicState(next.state);
        }
        next.onchange = () => {
          if (next.state === "granted" || next.state === "denied" || next.state === "prompt") {
            setMicState(next.state);
          }
        };
      })
      .catch(() => undefined);
    return () => {
      cancelled = true;
      if (status) status.onchange = null;
    };
  }, []);

  // Clean up audio recorder on unmount
  useEffect(() => {
    return () => {
      if (timerRef.current) clearInterval(timerRef.current);
      if (mediaRecorderRef.current && mediaRecorderRef.current.state !== "inactive") {
        mediaRecorderRef.current.onstop = null;
        mediaRecorderRef.current.stop();
      }
      void audioCtxRef.current?.close();
    };
  }, []);

  const includedTasks = useMemo(() => tasks.filter((task) => task.disposition === "included"), [tasks]);
  const missingDestinationCount = includedTasks.filter((task) => !task.destinationId).length;
  const canPrepare = canPrepareManualCard(tasks, sourceReviewed);

  const cardStops = useMemo(() => {
    if (!cardTasks) return [];
    return DESTINATIONS.map((destination) => ({
      destination,
      tasks: cardTasks.filter(
        (task) => task.disposition === "included" && task.destinationId === destination.id,
      ),
    })).filter((stop) => stop.tasks.length > 0);
  }, [cardTasks]);

  function detachMeter() {
    setAnalyser(null);
    setInputLevel(0);
    const context = audioCtxRef.current;
    audioCtxRef.current = null;
    void context?.close();
  }

  function attachMeter(stream: MediaStream) {
    const context = new AudioContext();
    const source = context.createMediaStreamSource(stream);
    const node = context.createAnalyser();
    node.fftSize = 2048;
    node.smoothingTimeConstant = 0.72;
    source.connect(node);
    audioCtxRef.current = context;
    setAnalyser(node);
    void context.resume();
  }

  // Audio recording handlers
  async function startRecording() {
    try {
      setMessage("");
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Microphone is not supported in this browser. Type the request instead.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      if (!holdRef.current) {
        stream.getTracks().forEach((track) => track.stop());
        return;
      }
      setMicState("granted");
      const mimeType = ["audio/webm", "audio/ogg", "audio/mp4", "audio/wav"].find(
        (type) => typeof MediaRecorder !== "undefined" && MediaRecorder.isTypeSupported(type),
      ) || "";

      const recorder = new MediaRecorder(stream, mimeType ? { mimeType } : undefined);
      audioChunksRef.current = [];
      attachMeter(stream);

      recorder.ondataavailable = (event) => {
        if (event.data.size > 0) audioChunksRef.current.push(event.data);
      };

      recorder.onstop = () => {
        const commit = commitRef.current;
        stream.getTracks().forEach((track) => track.stop());
        detachMeter();
        const blob = new Blob(audioChunksRef.current, { type: recorder.mimeType || "audio/webm" });
        if (commit && blob.size > 0) {
          void transcribeAudio(blob, recorder.mimeType || "audio/webm");
        } else {
          setIsTranscribing(false);
        }
      };

      mediaRecorderRef.current = recorder;
      commitRef.current = true;
      recorder.start(250);
      recordStartedRef.current = Date.now();
      setIsRecording(true);
      setRecordSeconds(0);
      setHoldHint(false);

      timerRef.current = setInterval(() => {
        setRecordSeconds((sec) => {
          if (sec >= 59) {
            stopRecording();
            return 60;
          }
          return sec + 1;
        });
      }, 1000);
    } catch {
      holdRef.current = false;
      detachMeter();
      setMicState("denied");
      setAskMic(false);
      setIsRecording(false);
      setMessage("Microphone blocked. Type the request instead.");
    }
  }

  function stopRecording() {
    if (timerRef.current) clearInterval(timerRef.current);
    const recorder = mediaRecorderRef.current;
    const tooShort = Date.now() - recordStartedRef.current < 400;
    if (tooShort) {
      commitRef.current = false;
      setHoldHint(true);
    } else if (recorder && recorder.state !== "inactive") {
      setIsTranscribing(true);
    }
    if (recorder && recorder.state !== "inactive") {
      recorder.stop();
    }
    setIsRecording(false);
  }

  async function transcribeAudio(blob: Blob, mimeType: string) {
    setIsTranscribing(true);
    setMessage("");
    try {
      const baseType = mimeType.split(";")[0]?.trim() || "audio/webm";
      const ext = baseType.includes("ogg") ? "ogg" : baseType.includes("wav") ? "wav" : baseType.includes("mp4") ? "mp4" : "webm";
      const file = new File([blob], `voice-input.${ext}`, { type: baseType });
      const formData = new FormData();
      formData.append("audio", file);

      const res = await fetch("/api/transcribe", { method: "POST", body: formData });
      const data = await res.json();
      if (res.ok && data.status === "transcript" && typeof data.transcript === "string" && data.transcript.trim()) {
        const transcript = data.transcript.trim();
        setSourceText(transcript);
        setIsTranscribing(false);
        await extractWithAI(transcript);
        return;
      }
      setMessage(data?.error?.message ?? "Could not hear that. Type it instead.");
    } catch {
      setMessage("Could not reach transcription. Type the request instead.");
    } finally {
      setIsTranscribing(false);
    }
  }

  // Extraction handlers
  async function extractWithAI(customSource?: string) {
    const text = (customSource ?? sourceText).trim();
    if (!text) {
      setMessage("Enter or record a request first.");
      return;
    }
    setIsExtracting(true);
    setMessage("");
    const started = performance.now();
    try {
      const res = await fetch("/api/extract", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          schemaVersion: 1,
          requestId: createId(),
          source: { id: createId(), revision: 0, text },
          workspaceRevision: 0,
          hostedProcessingConsent: true,
        }),
      });
      const data = await res.json();
      if (res.ok && data.status === "draft" && Array.isArray(data.draft?.items)) {
        interface DraftItem {
          displayLabel: string;
          quantity: { value: number; unit: string } | null;
          disposition: "include" | "cancel" | "clarify";
          destinationHint: string | null;
        }
        const parsedTasks: Task[] = data.draft.items.map((item: DraftItem) => {
          const labelWithQty = item.quantity
            ? `${item.displayLabel} (${item.quantity.value} ${item.quantity.unit})`
            : item.displayLabel;
          return {
            id: createId(),
            label: labelWithQty.slice(0, 160),
            destinationId: inferDestination(item.destinationHint, labelWithQty),
            disposition: item.disposition === "cancel" ? ("cancelled" as const) : item.disposition === "clarify" ? ("deferred" as const) : ("included" as const),
            outcome: "pending" as const,
          };
        });
        setTasks(parsedTasks);
        setLastSource(text);
        setSourceText("");
        setSourceReviewed(false);
        setCardTasks(null);
        const wait = 1400 - (performance.now() - started);
        if (wait > 0) await new Promise((resolve) => window.setTimeout(resolve, wait));
        setStep(2);
        setMessage("");
      } else {
        setMessage(data?.error?.message ?? "Could not build the list. Split by sentence instead.");
        splitManual(text);
      }
    } catch {
      setMessage("Could not build the list. Split by sentence instead.");
      splitManual(text);
    } finally {
      setIsExtracting(false);
    }
  }

  function splitManual(customSource?: string) {
    const text = (customSource ?? sourceText).trim();
    if (!text) {
      setMessage("Enter a request first.");
      return;
    }
    const entries = splitRequest(text);
    if (entries.length === 0) {
      setMessage("No separate lines or sentences found.");
      return;
    }
    const newTasks: Task[] = entries.map((label) => ({
      id: createId(),
      label: label.slice(0, 160),
      destinationId: inferDestination(null, label),
      disposition: "included",
      outcome: "pending",
    }));
    setTasks(newTasks);
    setLastSource(text);
    setSourceText("");
    setSourceReviewed(false);
    setCardTasks(null);
    setStep(2);
    setMessage("");
  }

  function updateTask(id: string, updates: Partial<Task>) {
    setTasks((current) =>
      current.map((task) => {
        if (task.id !== id) return task;
        const parsed = ManualTaskSchema.safeParse({ ...task, ...updates });
        return parsed.success ? parsed.data : task;
      }),
    );
    setSourceReviewed(false);
    setCardTasks(null);
  }

  function removeTask(id: string) {
    setTasks((current) => current.filter((task) => task.id !== id));
    setSourceReviewed(false);
    setCardTasks(null);
  }

  function addTask() {
    setTasks((current) => [
      ...current,
      {
        id: createId(),
        label: "New errand",
        destinationId: null,
        disposition: "included",
        outcome: "pending",
      },
    ]);
    setSourceReviewed(false);
    setCardTasks(null);
  }

  function prepareCard() {
    if (!canPrepare) return;
    setCardTasks(tasks.map((task) => ({ ...task, outcome: "pending" })));
    setStep(3);
    setMessage("");
  }

  function updateOutcome(id: string, outcome: Outcome) {
    setCardTasks((current) =>
      current?.map((task) => (task.id === id ? { ...task, outcome } : task)) ?? null,
    );
  }

  function clearWorkspace() {
    if (!window.confirm("Clear all errands and saved data?")) return;
    try {
      window.localStorage.removeItem(STORAGE_KEY);
      setStorageBlocked(false);
    } catch {
      setStorageBlocked(true);
    }
    setSourceText("");
    setLastSource("");
    setTasks([]);
    setSourceReviewed(false);
    setCardTasks(null);
    setStep(1);
    setAskMic(false);
    setHoldHint(false);
    setMessage("");
  }

  const onLevel = useCallback((level: number) => {
    setInputLevel((current) => (Math.abs(current - level) > 0.035 ? level : current));
  }, []);

  const orbState: OrbState = isRecording ? "speaking" : isTranscribing || isExtracting ? "thinking" : "idle";

  function onOrbDown(event: React.PointerEvent<HTMLButtonElement>) {
    if (isTranscribing || isExtracting || isRecording) return;
    event.currentTarget.setPointerCapture(event.pointerId);
    if (micState !== "granted") {
      setAskMic(true);
      return;
    }
    holdRef.current = true;
    void startRecording();
  }

  function onOrbUp() {
    if (!holdRef.current) return;
    holdRef.current = false;
    stopRecording();
  }

  async function allowMic() {
    setMessage("");
    try {
      if (!navigator.mediaDevices?.getUserMedia) {
        setMessage("Microphone is not supported in this browser. Type the request instead.");
        return;
      }
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((track) => track.stop());
      setMicState("granted");
      setAskMic(false);
    } catch {
      setMicState("denied");
      setAskMic(false);
      setMessage("Microphone blocked. Type the request instead.");
    }
  }


  const onSourceText = useCallback((value: string) => {
    setSourceText(value.slice(0, 4000));
  }, []);

  const cardIncluded = cardTasks?.filter((task) => task.disposition === "included") ?? [];
  const cardCancelled = cardTasks?.filter((task) => task.disposition === "cancelled") ?? [];
  const cardDeferred = cardTasks?.filter((task) => task.disposition === "deferred") ?? [];
  const cardCompleted = cardIncluded.filter((task) => task.outcome === "done").length;

  return (
    <div className="flex h-dvh flex-col overflow-hidden bg-ambient-pattern text-foreground print:h-auto print:overflow-visible">
      <header className="no-print sticky top-0 z-20 px-3 pt-3 sm:px-6">
        <div className="mx-auto flex max-w-3xl items-center justify-between gap-3 rounded-full bg-background/80 px-3 py-2 ring-1 ring-foreground/10 backdrop-blur-md sm:px-4">
          <button
            type="button"
            onClick={() => setStep(1)}
            className="font-heading text-lg font-black tracking-[-0.06em] transition-opacity duration-150 hover:opacity-70"
            style={{ transitionProperty: "opacity" }}
          >
            NIKAL<span className="text-primary">.</span>
          </button>
          <nav aria-label="Workflow steps" className="flex items-center gap-1">
            {(
              [
                [1, "Input"],
                [2, "Review"],
                [3, "Card"],
              ] as const
            ).map(([index, label]) => {
              const disabled = index === 2 ? tasks.length === 0 : index === 3 ? !cardTasks : false;
              const active = step === index;
              return (
                <button
                  key={index}
                  type="button"
                  disabled={disabled}
                  onClick={() => setStep(index)}
                  className={`h-9 rounded-full px-2.5 text-[11px] font-semibold tracking-wider uppercase transition-colors duration-150 disabled:opacity-30 sm:px-3 ${
                    active ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                  }`}
                  style={{ transitionProperty: "background-color, color" }}
                >
                  {label}
                </button>
              );
            })}
          </nav>
          {step !== 1 ? (
            <Button type="button" variant="ghost" size="xs" onClick={clearWorkspace} disabled={!hydrated}>
              Clear
            </Button>
          ) : (
            <span className="w-12" aria-hidden="true" />
          )}
        </div>
      </header>

      <main className={`flex min-h-0 flex-1 flex-col px-4 sm:px-6 print:overflow-visible ${step === 1 ? "overflow-hidden" : "overflow-y-auto py-6 sm:py-10"}`}>
        <div className={`mx-auto w-full max-w-3xl ${step === 1 ? "flex h-full min-h-0 flex-col" : ""}`}>
          {message && (
            <p role="status" className="mb-4 text-center text-xs text-pretty text-muted-foreground">
              {message}
            </p>
          )}
          <AnimatePresence mode="wait">
            {step === 1 && (
              <motion.div
                key="input"
                className="flex h-full min-h-0 flex-col"
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              >
                <CaptureStage
                  sourceText={sourceText}
                  onSourceText={onSourceText}
                  orbState={orbState}
                  inputLevel={inputLevel}
                  analyser={analyser}
                  recording={isRecording}
                  seconds={recordSeconds}
                  building={isExtracting}
                  hearing={isTranscribing}
                  askMic={askMic && !isRecording}
                  denied={micState === "denied"}
                  holdHint={holdHint}
                  onAllowMic={() => void allowMic()}
                  onTypeInstead={() => setAskMic(false)}
                  onOrbDown={onOrbDown}
                  onOrbUp={onOrbUp}
                  onExtract={() => void extractWithAI()}
                  onSample={() => onSourceText(SAMPLE_SOURCE)}
                  onLevel={onLevel}
                  onClear={clearWorkspace}
                />
              </motion.div>
            )}
            {step === 2 && (
              <motion.div
                key="review"
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              >
              <ReviewBoard
                tasks={tasks}
                lastSource={lastSource}
                destinations={DESTINATIONS}
                sourceReviewed={sourceReviewed}
                missingDestinationCount={missingDestinationCount}
                canPrepare={canPrepare}
                onBack={() => setStep(1)}
                onAdd={addTask}
                onUpdate={updateTask}
                onRemove={removeTask}
                onReviewed={setSourceReviewed}
                onPrepare={prepareCard}
              />
              </motion.div>
            )}
            {step === 3 && cardTasks && (
              <motion.div
                key="card"
                initial={{ opacity: 0, y: 16, filter: "blur(6px)" }}
                animate={{ opacity: 1, y: 0, filter: "blur(0px)" }}
                exit={{ opacity: 0, y: -12, filter: "blur(4px)" }}
                transition={{ duration: 0.45, ease: [0.32, 0.72, 0, 1] }}
              >
              <PocketCardView
                stops={cardStops}
                cancelled={cardCancelled}
                deferred={cardDeferred}
                completedCount={cardCompleted}
                includedCount={cardIncluded.length}
                onOutcome={updateOutcome}
                onEdit={() => {
                  if (window.confirm("Return to edit? Outcome marks will be reset.")) {
                    setCardTasks(null);
                    setSourceReviewed(false);
                    setStep(2);
                  }
                }}
                onNew={() => setStep(1)}
              />
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </main>

      <footer className={`no-print px-4 py-4 text-center text-[11px] text-muted-foreground ${step === 1 ? "hidden" : ""}`}>
        <span className="font-mono text-[10px] tabular-nums">{storageStatus}</span>
      </footer>
    </div>
  );
}
