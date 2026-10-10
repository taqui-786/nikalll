import { DestinationPackSchema } from "./schemas";
import type { DestinationPack } from "./types";
import type { DomainResult } from "./types";

export type DestinationMatch = {
  hint: string;
  normalizedHint: string;
  status: "none" | "suggestion" | "ambiguous";
  destinationIds: string[];
};

export function normalizeDestinationText(value: string): string {
  return value.trim().replace(/\s+/gu, " ").toLowerCase();
}

export function validateDestinationPack(input: unknown): DomainResult<DestinationPack> {
  const parsed = DestinationPackSchema.safeParse(input);
  return parsed.success
    ? { ok: true, value: parsed.data }
    : {
        ok: false,
        error: {
          code: "DESTINATION_PACK_INVALID",
          message: "Destination pack failed validation.",
        },
      };
}

/**
 * Matches only checked aliases. A suggestion is never a user confirmation.
 */
export function matchDestinationHint(
  hint: string | null | undefined,
  pack: DestinationPack,
): DestinationMatch {
  const originalHint = hint ?? "";
  const normalizedHint = normalizeDestinationText(originalHint);
  if (!normalizedHint) {
    return {
      hint: originalHint,
      normalizedHint,
      status: "none",
      destinationIds: [],
    };
  }

  const destinationIds = [
    ...new Set(
      pack.aliases
        .filter((entry) => normalizeDestinationText(entry.alias) === normalizedHint)
        .map((entry) => entry.destinationId),
    ),
  ];

  return {
    hint: originalHint,
    normalizedHint,
    status:
      destinationIds.length === 1
        ? "suggestion"
        : destinationIds.length > 1
          ? "ambiguous"
          : "none",
    destinationIds,
  };
}
