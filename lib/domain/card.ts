import { DestinationPackSchema, PreparedCardSchema, ReviewedErrandSchema } from "./schemas";
import type { DestinationPack, PreparedCard, ReviewedErrand } from "./types";
import type { CardEstimate } from "./types";
import type { DomainResult } from "./types";

export type PrepareCardInput = {
  id: string;
  sourceRevision: number;
  createdAt: string;
  errands: readonly ReviewedErrand[];
  pack: DestinationPack;
  estimate?: CardEstimate | null;
  limitations?: readonly string[];
};

/**
 * Creates an immutable card snapshot from reviewed errands and a validated pack.
 * Planning and route arithmetic stay outside this helper; the estimate is explicit.
 */
export function createPreparedCard(
  input: PrepareCardInput,
): DomainResult<PreparedCard> {
  if (!DestinationPackSchema.safeParse(input.pack).success ||
      input.errands.length > 20 ||
      input.errands.some((errand) => !ReviewedErrandSchema.safeParse(errand).success) ||
      new Set(input.errands.map((errand) => errand.id)).size !== input.errands.length) {
    return { ok: false, error: { code: "INVALID_CARD_INPUT", message: "Check errands and destination data before preparing a card." } };
  }
  const included = input.errands.filter(
    (errand) => errand.disposition === "included",
  );
  const cancelledItems = input.errands.filter(
    (errand) => errand.disposition === "cancelled",
  );
  const deferredItems = input.errands.filter(
    (errand) => errand.disposition !== "included" && errand.disposition !== "cancelled",
  );
  const places = new Map(input.pack.places.map((place) => [place.id, place]));

  if (included.length === 0) {
    return {
      ok: false,
      error: {
        code: "NO_INCLUDED_ERRANDS",
        message: "At least one included errand is required to prepare a card.",
      },
    };
  }

  for (const errand of input.errands) {
    if (!errand.reviewed) {
      return {
        ok: false,
        error: {
          code: "ERRAND_NOT_REVIEWED",
          message: `Errand ${errand.id} must be reviewed before preparation.`,
        },
      };
    }
    if (errand.disposition === "included") {
      if (!errand.destinationId || !places.has(errand.destinationId)) {
        return {
          ok: false,
          error: {
            code: "DESTINATION_REQUIRED",
            message: `Errand ${errand.id} needs a destination from the selected pack.`,
          },
        };
      }
    } else if (errand.disposition === "unresolved") {
      return {
        ok: false,
        error: {
          code: "UNRESOLVED_ERRAND",
          message: `Errand ${errand.id} must be resolved or deferred before preparation.`,
        },
      };
    }
  }

  const stops = [...new Set(included.map((errand) => errand.destinationId!))].map(
    (destinationId) => ({
      destinationId,
      destinationLabel: places.get(destinationId)!.label,
      errandIds: included
        .filter((errand) => errand.destinationId === destinationId)
        .map((errand) => errand.id),
    }),
  );

  const parsed = PreparedCardSchema.safeParse({
    id: input.id,
    sourceRevision: input.sourceRevision,
    createdAt: input.createdAt,
    stops,
    includedErrands: included.map((errand) => ({
      ...errand,
      evidence: errand.evidence.map((span) => ({ ...span })),
    })),
    cancelledItems: cancelledItems.map((errand) => ({ ...errand })),
    deferredItems: deferredItems.map((errand) => ({ ...errand })),
    estimate: input.estimate ?? null,
    limitations: [...(input.limitations ?? [])],
    packVersion: input.pack.version,
  });

  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        error: {
          code: "PREPARED_CARD_INVALID",
          message: "Prepared card failed domain validation.",
        },
      };
}

export const prepareCard = createPreparedCard;
