import type {
  CardEstimate,
  DestinationAlias,
  DestinationConnection,
  DestinationPack,
  DestinationPlace,
  ExtractionDraft,
  ExtractionItem,
  EvidenceSpan,
  PreparedCard,
  PreparedCardStop,
  Quantity,
  ReviewedErrand,
  SourceInput,
  TaskOutcome,
} from "./schemas";

export type {
  CardEstimate,
  DestinationAlias,
  DestinationConnection,
  DestinationPack,
  DestinationPlace,
  ExtractionDraft,
  ExtractionItem,
  EvidenceSpan,
  PreparedCard,
  PreparedCardStop,
  Quantity,
  ReviewedErrand,
  SourceInput,
  TaskOutcome,
};

export type DomainError = {
  code: string;
  message: string;
};

export type DomainResult<T> =
  | { ok: true; value: T }
  | { ok: false; error: DomainError };
