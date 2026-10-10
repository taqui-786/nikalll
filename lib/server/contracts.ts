import { z } from "zod";

const nonEmptyText = (max: number) =>
  z.string().min(1).max(max).refine((value) => value.trim().length > 0);

export const ExtractRequestSchema = z.strictObject({
  schemaVersion: z.literal(1),
  requestId: z.uuid(),
  source: z.strictObject({
    id: z.uuid(),
    revision: z.number().int().nonnegative(),
    text: nonEmptyText(4_000),
  }),
  workspaceRevision: z.number().int().nonnegative(),
  hostedProcessingConsent: z.literal(true),
});

export type ExtractRequest = z.infer<typeof ExtractRequestSchema>;

export const EvidenceOutputSchema = z.strictObject({
  quote: nonEmptyText(512),
  start: z.number().int().nonnegative(),
  end: z.number().int().positive(),
  ambiguous: z.boolean(),
});

export const NormalizedExtractionItemSchema = z.strictObject({
  kind: z.enum(["buy", "collect", "drop_off", "other"]),
  displayLabel: nonEmptyText(160),
  quantity: z
    .strictObject({ value: z.number().finite().positive(), unit: nonEmptyText(32) })
    .nullable(),
  disposition: z.enum(["include", "cancel", "clarify"]),
  destinationHint: nonEmptyText(160).nullable(),
  evidence: z.array(EvidenceOutputSchema).min(1).max(4),
  questions: z.array(nonEmptyText(240)).max(10),
  warnings: z.array(nonEmptyText(240)).max(10),
});

export const NormalizedExtractionDraftSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceLanguage: z.string().min(1).max(32).nullable(),
  displayTone: z.enum(["formal", "casual", "casual_mixed", "unknown"]),
  items: z.array(NormalizedExtractionItemSchema).max(20),
  clarifications: z.array(nonEmptyText(240)).max(10),
  warnings: z.array(nonEmptyText(240)).max(10),
});

export type NormalizedExtractionDraft = z.infer<typeof NormalizedExtractionDraftSchema>;

export const TranscriptionOutputSchema = z.strictObject({
  text: nonEmptyText(20_000),
  language: z.string().min(1).max(32).nullable(),
});
