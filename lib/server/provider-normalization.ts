import { ExtractionDraftSchema, type ExtractionDraft } from "../domain/schemas";
import { matchEvidenceQuote } from "../domain/evidence";
import {
  NormalizedExtractionDraftSchema,
  type NormalizedExtractionDraft,
} from "./contracts";

export type BackboardTextPart = { type: "text"; text: string };

/**
 * Backboard currently returns content as text. Some API responses expose the
 * same content as an array of typed text parts; accept only those known forms.
 */
export function normalizeBackboardContent(value: unknown): string {
  if (typeof value === "string") return value;
  if (!Array.isArray(value) || value.length === 0) {
    throw new Error("Unknown Backboard content shape");
  }

  const parts: string[] = [];
  for (const part of value) {
    if (
      typeof part !== "object" ||
      part === null ||
      (part as { type?: unknown }).type !== "text" ||
      typeof (part as { text?: unknown }).text !== "string"
    ) {
      throw new Error("Unknown Backboard content part shape");
    }
    parts.push((part as BackboardTextPart).text);
  }
  return parts.join("");
}

const KIND_VALUES = new Set(["buy", "collect", "drop_off", "other"]);
const DISPOSITION_VALUES = new Set(["include", "cancel", "clarify"]);
const TONE_VALUES = new Set(["formal", "casual", "casual_mixed", "unknown"]);

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) return null;
  return value as Record<string, unknown>;
}

function textList(value: unknown, max: number): string[] {
  if (!Array.isArray(value)) return [];
  return value
    .map((item) => {
      if (typeof item === "string") return item.trim();
      const record = asRecord(item);
      return typeof record?.quote === "string" ? record.quote.trim() : "";
    })
    .filter((item) => item.length > 0)
    .slice(0, max);
}

function normalizeKind(kind: unknown, label: string): "buy" | "collect" | "drop_off" | "other" {
  const value = String(kind ?? "").toLowerCase().replace(/[\s-]+/g, "_");
  if (value === "buy" || value === "purchase" || value === "shop" || value === "shopping") return "buy";
  if (value === "collect" || value === "collection" || value === "pickup" || value === "pick_up") return "collect";
  if (value === "drop_off" || value === "dropoff" || value === "drop" || value === "deliver" || value === "delivery") return "drop_off";
  if (KIND_VALUES.has(value)) return value as "other";
  if (/drop|deliver|parcel/i.test(label)) return "drop_off";
  return "other";
}

function normalizeDisposition(value: unknown): "include" | "cancel" | "clarify" {
  const text = String(value ?? "").toLowerCase().replace(/[\s_]+/g, "-");
  if (["cancel", "cancelled", "canceled", "skip", "exclude", "excluded"].includes(text)) return "cancel";
  if (["clarify", "later", "defer", "deferred", "unsure", "conditional", "maybe"].includes(text)) return "clarify";
  if (DISPOSITION_VALUES.has(text)) return text as "include";
  return "include";
}

function normalizeQuantity(value: unknown): { value: number; unit: string } | null {
  if (value == null || value === "") return null;
  if (typeof value === "number") return value > 0 ? { value, unit: "count" } : null;
  const record = asRecord(value);
  if (record) {
    const amount = Number(record.value);
    const unit = typeof record.unit === "string" ? record.unit.trim() : "";
    return Number.isFinite(amount) && amount > 0 && unit ? { value: amount, unit: unit.slice(0, 32) } : null;
  }
  if (typeof value !== "string") return null;
  const match = /^(\d+(?:\.\d+)?)\s*(.*)$/.exec(value.trim());
  if (!match) return null;
  const amount = Number(match[1]);
  if (!Number.isFinite(amount) || amount <= 0) return null;
  return { value: amount, unit: (match[2].trim() || "count").slice(0, 32) };
}

function cleanQuotes(quotes: string[], sourceText?: string): string[] {
  if (!sourceText) return quotes;
  return quotes.flatMap((quote) => {
    if (sourceText.includes(quote)) return [quote];
    if (quote.includes("...") || quote.includes("…")) {
      const parts = quote.split(/\.{3,}|…/).map((p) => p.trim()).filter((p) => p && sourceText.includes(p));
      if (parts.length > 0) return parts;
    }
    return [quote];
  });
}

/** Gemma often answers with near-synonyms. Fold those into the strict draft before validation. */
export function coerceExtractionDraft(value: unknown, sourceText?: string): unknown {
  const draft = asRecord(value);
  if (!draft || !Array.isArray(draft.items)) return value;
  const tone = typeof draft.displayTone === "string" ? draft.displayTone : "unknown";
  return {
    schemaVersion: 1,
    sourceLanguage: typeof draft.sourceLanguage === "string" && draft.sourceLanguage.trim() ? draft.sourceLanguage.trim().slice(0, 32) : null,
    displayTone: TONE_VALUES.has(tone) ? tone : tone === "informal" ? "casual" : tone === "mixed" ? "casual_mixed" : "unknown",
    clarifications: textList(draft.clarifications, 10),
    warnings: textList(draft.warnings, 10),
    items: draft.items.slice(0, 20).map((item) => {
      const record = asRecord(item) ?? {};
      const rawLabel = typeof record.displayLabel === "string" ? record.displayLabel.trim() : "";
      const hint = typeof record.destinationHint === "string" ? record.destinationHint.trim() : "";
      const quotes = cleanQuotes(textList(record.evidenceQuotes, 4), sourceText);
      const label = rawLabel || (quotes.length > 0 ? quotes[0].slice(0, 160) : "");
      return {
        kind: normalizeKind(record.kind, label),
        displayLabel: label,
        quantity: normalizeQuantity(record.quantity),
        disposition: normalizeDisposition(record.disposition),
        destinationHint: hint ? hint.slice(0, 160) : null,
        evidenceQuotes: quotes,
        questions: textList(record.questions, 10),
        warnings: textList(record.warnings, 10),
      };
    }),
  };
}

export function parseBackboardDraft(content: unknown, sourceText: string): NormalizedExtractionDraft {
  const text = normalizeBackboardContent(content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backboard content was not JSON");
  }

  const draft: ExtractionDraft = ExtractionDraftSchema.parse(coerceExtractionDraft(parsed, sourceText));
  const normalized = {
    ...draft,
    items: draft.items.map((item) => ({
      kind: item.kind,
      displayLabel: item.displayLabel,
      quantity: item.quantity,
      disposition: item.disposition,
      destinationHint: item.destinationHint,
      evidence: item.evidenceQuotes.map((quote) => {
        const result = matchEvidenceQuote(sourceText, quote);
        if (!result.ok) throw new Error("Backboard evidence did not match source");
        return {
          quote: result.value.quote,
          start: result.value.start,
          end: result.value.end,
          ambiguous: result.value.ambiguous,
        };
      }),
      questions: item.questions,
      warnings: item.warnings,
    })),
  } satisfies NormalizedExtractionDraft;

  return NormalizedExtractionDraftSchema.parse(normalized);
}

export function normalizeTranscriptionResponse(value: unknown): { text: string; language: string | null } {
  if (typeof value !== "object" || value === null) {
    throw new Error("Unknown transcription response shape");
  }
  const response = value as { text?: unknown; language?: unknown };
  if (typeof response.text !== "string") throw new Error("Missing transcription text");
  if (response.language !== undefined && typeof response.language !== "string") {
    throw new Error("Invalid transcription language");
  }
  return {
    text: response.text,
    language: response.language ?? null,
  };
}
