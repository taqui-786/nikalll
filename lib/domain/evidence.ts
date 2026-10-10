import type { DomainResult } from "./types";
import type { EvidenceSpan } from "./schemas";

export type EvidenceMatch = EvidenceSpan & {
  occurrences: number[];
};

export function evidenceSpanMatches(
  sourceText: string,
  span: Pick<EvidenceSpan, "quote" | "start" | "end">,
): boolean {
  return (
    Number.isInteger(span.start) &&
    Number.isInteger(span.end) &&
    span.start >= 0 &&
    span.end > span.start &&
    span.end <= sourceText.length &&
    sourceText.slice(span.start, span.end) === span.quote
  );
}

function findOccurrences(sourceText: string, quote: string): number[] {
  const occurrences: number[] = [];
  let start = sourceText.indexOf(quote);

  while (start !== -1) {
    occurrences.push(start);
    start = sourceText.indexOf(quote, start + 1);
  }

  return occurrences;
}

/**
 * Finds exact, case-sensitive occurrences using JavaScript UTF-16 offsets.
 * An ambiguous match is returned explicitly instead of being treated as unique.
 */
export function matchEvidenceQuote(
  sourceText: string,
  quote: string,
): DomainResult<EvidenceMatch> {
  if (quote.length === 0) {
    return {
      ok: false,
      error: { code: "EMPTY_EVIDENCE", message: "Evidence quote cannot be empty." },
    };
  }

  const occurrences = findOccurrences(sourceText, quote);
  if (occurrences.length === 0) {
    return {
      ok: false,
      error: {
        code: "EVIDENCE_NOT_FOUND",
        message: "Evidence quote does not occur in the source text.",
      },
    };
  }

  const start = occurrences[0];
  return {
    ok: true,
    value: {
      quote,
      start,
      end: start + quote.length,
      ambiguous: occurrences.length > 1,
      occurrences,
    },
  };
}

export function validateEvidenceQuotes(
  sourceText: string,
  quotes: readonly string[],
): DomainResult<EvidenceMatch[]> {
  if (quotes.length === 0) {
    return {
      ok: false,
      error: { code: "MISSING_EVIDENCE", message: "At least one evidence quote is required." },
    };
  }

  const matches: EvidenceMatch[] = [];
  for (const quote of quotes) {
    const result = matchEvidenceQuote(sourceText, quote);
    if (!result.ok) return result;
    matches.push(result.value);
  }

  return { ok: true, value: matches };
}

export const findEvidenceQuote = matchEvidenceQuote;
