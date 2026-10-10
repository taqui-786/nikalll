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

export function parseBackboardDraft(content: unknown, sourceText: string): NormalizedExtractionDraft {
  const text = normalizeBackboardContent(content);
  let parsed: unknown;
  try {
    parsed = JSON.parse(text);
  } catch {
    throw new Error("Backboard content was not JSON");
  }

  const draft: ExtractionDraft = ExtractionDraftSchema.parse(parsed);
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
