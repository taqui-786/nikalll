import { z } from "zod";

const boundedText = (max: number) => z.string().min(1).max(max).refine((value) => value.trim().length > 0);
const id = boundedText(128);
const timestamp = z.iso.datetime({ offset: true });

export const SourceInputSchema = z.strictObject({
  id,
  revision: z.number().int().nonnegative(),
  kind: z.enum(["text", "audio"]),
  // Keep this value byte-for-byte intact so evidence can be checked later.
  text: boundedText(4000),
  language: z.string().min(1).max(32).optional(),
  createdAt: timestamp,
});

export const QuantitySchema = z.strictObject({
  value: z.number().finite().positive(),
  unit: boundedText(32),
});

export const ExtractionItemSchema = z.strictObject({
  kind: z.enum(["buy", "collect", "drop_off", "other"]),
  displayLabel: boundedText(160),
  quantity: QuantitySchema.nullable(),
  disposition: z.enum(["include", "cancel", "clarify"]),
  destinationHint: boundedText(160).nullable(),
  evidenceQuotes: z.array(boundedText(512)).min(1).max(4),
  questions: z.array(boundedText(240)).max(10).default([]),
  warnings: z.array(boundedText(240)).max(10).default([]),
});

export const ExtractionDraftSchema = z.strictObject({
  schemaVersion: z.literal(1),
  sourceLanguage: z.string().min(1).max(32).nullable(),
  displayTone: z.enum(["formal", "casual", "casual_mixed", "unknown"]),
  items: z.array(ExtractionItemSchema).max(20),
  clarifications: z.array(boundedText(240)).max(10).default([]),
  warnings: z.array(boundedText(240)).max(10).default([]),
});

export const EvidenceSpanSchema = z.strictObject({
  quote: boundedText(512),
  start: z.number().int().nonnegative(),
  end: z.number().int().nonnegative(),
  ambiguous: z.boolean(),
});

export const ReviewedErrandSchema = z
  .strictObject({
    id,
    kind: z.enum(["buy", "collect", "drop_off", "other"]),
    displayLabel: boundedText(160),
    quantity: QuantitySchema.nullable(),
    disposition: z.enum(["included", "cancelled", "deferred", "unresolved"]),
    evidence: z.array(EvidenceSpanSchema),
    destinationHint: boundedText(160).nullable(),
    destinationId: id.nullable(),
    reviewed: z.boolean(),
    manualEdit: z.boolean(),
    clarification: boundedText(240).nullable().optional(),
    dispositionReason: boundedText(240).nullable().optional(),
    origin: z.enum(["model", "manual"]),
  })
  .superRefine((errand, context) => {
    if (errand.disposition === "deferred" && !errand.dispositionReason) {
      context.addIssue({
        code: "custom",
        path: ["dispositionReason"],
        message: "A deferred errand needs a reason.",
      });
    }
  });

export const DestinationPlaceSchema = z.strictObject({
  id,
  label: boundedText(160),
  category: boundedText(80).optional(),
  visitMinutesEstimate: z.number().int().nonnegative().optional(),
  checkedAt: timestamp.optional(),
  sourceNote: z.string().max(500).optional(),
  limitations: z.array(boundedText(240)).max(10).default([]),
});

export const DestinationAliasSchema = z.strictObject({
  destinationId: id,
  alias: boundedText(160),
});

export const DestinationConnectionSchema = z.strictObject({
  fromId: id,
  toId: id,
  minutesEstimate: z.number().int().positive(),
  checkedAt: timestamp.optional(),
  sourceNote: z.string().max(500).optional(),
  pathDescription: z.string().max(500).optional(),
  viaPointIds: z.array(id).max(5).default([]),
});

export const DestinationPackSchema = z
  .strictObject({
    schemaVersion: z.literal(1),
    id,
    version: boundedText(64),
    label: boundedText(160),
    checkedAt: timestamp,
    places: z.array(DestinationPlaceSchema).min(1).max(5),
    aliases: z.array(DestinationAliasSchema).max(100),
    connections: z.array(DestinationConnectionSchema).max(30).default([]),
  })
  .superRefine((pack, context) => {
    const placeIds = new Set(pack.places.map((place) => place.id));
    if (placeIds.size !== pack.places.length) {
      context.addIssue({
        code: "custom",
        path: ["places"],
        message: "Destination place IDs must be unique.",
      });
    }

    for (const [index, alias] of pack.aliases.entries()) {
      if (!placeIds.has(alias.destinationId)) {
        context.addIssue({
          code: "custom",
          path: ["aliases", index, "destinationId"],
          message: "Alias destination must exist in the pack.",
        });
      }
    }

    const edges = new Set<string>();
    for (const [index, connection] of pack.connections.entries()) {
      if (connection.fromId === connection.toId) {
        context.addIssue({
          code: "custom",
          path: ["connections", index],
          message: "A destination cannot connect to itself.",
        });
      }
      if (!placeIds.has(connection.fromId) || !placeIds.has(connection.toId)) {
        context.addIssue({
          code: "custom",
          path: ["connections", index],
          message: "Connection endpoints must exist in the pack.",
        });
      }
      const edge = `${connection.fromId}\u0000${connection.toId}`;
      if (edges.has(edge)) {
        context.addIssue({
          code: "custom",
          path: ["connections", index],
          message: "Directed connections must be unique.",
        });
      }
      edges.add(edge);
    }
  });

export const CardEstimateSchema = z
  .strictObject({
    walkingMinutes: z.number().int().nonnegative(),
    stopMinutes: z.number().int().nonnegative(),
    bufferMinutes: z.number().int().nonnegative(),
    totalMinutes: z.number().int().nonnegative(),
  })
  .superRefine((estimate, context) => {
    const expected =
      estimate.walkingMinutes + estimate.stopMinutes + estimate.bufferMinutes;
    if (estimate.totalMinutes !== expected) {
      context.addIssue({
        code: "custom",
        path: ["totalMinutes"],
        message: "Total minutes must equal walking, stop, and buffer minutes.",
      });
    }
  });

export const PreparedCardStopSchema = z.strictObject({
  destinationId: id,
  destinationLabel: boundedText(160),
  errandIds: z.array(id).min(1).max(20),
});

export const PreparedCardSchema = z.strictObject({
  id,
  sourceRevision: z.number().int().nonnegative(),
  createdAt: timestamp,
  stops: z.array(PreparedCardStopSchema).min(1).max(5),
  includedErrands: z.array(ReviewedErrandSchema).min(1).max(20),
  cancelledItems: z.array(ReviewedErrandSchema).max(20),
  deferredItems: z.array(ReviewedErrandSchema).max(20),
  estimate: CardEstimateSchema.nullable(),
  limitations: z.array(boundedText(240)).max(20),
  packVersion: boundedText(64),
});

export const TaskOutcomeSchema = z.strictObject({
  errandId: id,
  status: z.enum(["done", "unavailable", "deferred", "unresolved"]),
  note: z.string().max(500).optional(),
  updatedAt: timestamp,
});

export type SourceInput = z.infer<typeof SourceInputSchema>;
export type Quantity = z.infer<typeof QuantitySchema>;
export type ExtractionItem = z.infer<typeof ExtractionItemSchema>;
export type ExtractionDraft = z.infer<typeof ExtractionDraftSchema>;
export type EvidenceSpan = z.infer<typeof EvidenceSpanSchema>;
export type ReviewedErrand = z.infer<typeof ReviewedErrandSchema>;
export type DestinationPlace = z.infer<typeof DestinationPlaceSchema>;
export type DestinationAlias = z.infer<typeof DestinationAliasSchema>;
export type DestinationConnection = z.infer<typeof DestinationConnectionSchema>;
export type DestinationPack = z.infer<typeof DestinationPackSchema>;
export type CardEstimate = z.infer<typeof CardEstimateSchema>;
export type PreparedCardStop = z.infer<typeof PreparedCardStopSchema>;
export type PreparedCard = z.infer<typeof PreparedCardSchema>;
export type TaskOutcome = z.infer<typeof TaskOutcomeSchema>;
