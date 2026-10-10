import assert from "node:assert/strict";
import { test } from "node:test";
import { createPreparedCard } from "../lib/domain/card";
import { matchDestinationHint, validateDestinationPack } from "../lib/domain/destinations";
import { evidenceSpanMatches, validateEvidenceQuotes } from "../lib/domain/evidence";
import { summarizeUnfinishedTasks } from "../lib/domain/outcomes";
import { ExtractionItemSchema, type DestinationPack, type ReviewedErrand } from "../lib/domain/schemas";
import { canPrepareManualCard, readPersistedWorkspace, splitRequest, type PersistedWorkspace, type Task } from "../lib/domain/manual-workspace";

// Synthetic examples only; this timestamp is fixture metadata, not a field check.
const timestamp = "2026-10-10T00:00:00Z";
const pack: DestinationPack = {
  schemaVersion: 1, id: "demo", version: "demo-1", label: "Synthetic", checkedAt: timestamp,
  places: [{ id: "grocery", label: "Demo grocery", limitations: ["Fictional"] }],
  aliases: [{ destinationId: "grocery", alias: "shop" }], connections: [],
};
const errand: ReviewedErrand = {
  id: "milk", kind: "buy", displayLabel: "Milk", quantity: { value: 1, unit: "litre" },
  disposition: "included", evidence: [], destinationHint: null, destinationId: "grocery",
  reviewed: true, manualEdit: true, origin: "manual",
};
const task: Task = {
  id: "milk", label: "Milk · 1 litre", destinationId: "local-grocery",
  disposition: "included", outcome: "pending",
};
const workspace: PersistedWorkspace = {
  version: 1, sourceText: "", lastSource: "Buy milk", tasks: [task],
  sourceReviewed: true, cardTasks: [{ ...task, outcome: "unavailable" }],
};
const prepare = (errands: ReviewedErrand[]) => createPreparedCard({
  id: "card", sourceRevision: 1, createdAt: timestamp, errands, pack,
});

test("evidence preserves exact Unicode, ambiguity, and integer offsets", () => {
  const source = "🥛 दूध लो. दूध लो.";
  const result = validateEvidenceQuotes(source, ["दूध"]);
  assert.ok(result.ok);
  assert.equal(result.value[0].ambiguous, true);
  assert.equal(result.value[0].start, 3);
  assert.equal(evidenceSpanMatches(source, result.value[0]), true);
  assert.equal(evidenceSpanMatches("milk", { quote: "milk", start: 0.1, end: 4 }), false);
  assert.equal(validateEvidenceQuotes(source, ["Milk"]).ok, false);
  assert.equal(validateEvidenceQuotes(source, []).ok, false);
});

test("model schema rejects trusted destination IDs and empty labels", () => {
  const item = { kind: "buy", displayLabel: "Milk", quantity: null, disposition: "include", destinationHint: null, evidenceQuotes: ["milk"] };
  assert.equal(ExtractionItemSchema.safeParse(item).success, true);
  assert.equal(ExtractionItemSchema.safeParse({ ...item, destinationId: "grocery" }).success, false);
  assert.equal(ExtractionItemSchema.safeParse({ ...item, displayLabel: "   " }).success, false);
});

test("destination aliases are suggestions, never guesses or confirmations", () => {
  assert.equal(matchDestinationHint(" SHOP ", pack).status, "suggestion");
  assert.equal(matchDestinationHint("nearby shop", pack).status, "none");
  const ambiguous = { ...pack, places: [...pack.places, { id: "other", label: "Other", limitations: [] }], aliases: [...pack.aliases, { destinationId: "other", alias: "shop" }] };
  assert.equal(matchDestinationHint("shop", ambiguous).status, "ambiguous");
  assert.equal(validateDestinationPack({ ...pack, aliases: [{ destinationId: "missing", alias: "shop" }] }).ok, false);
});

test("cards preserve cancellations and deferrals without inventing estimates", () => {
  const result = prepare([errand, { ...errand, id: "bread", disposition: "cancelled", destinationId: null }, { ...errand, id: "parcel", disposition: "deferred", dispositionReason: "Tomorrow", destinationId: null }]);
  assert.ok(result.ok);
  assert.equal(result.value.estimate, null);
  assert.deepEqual(result.value.stops[0].errandIds, ["milk"]);
  assert.equal(result.value.cancelledItems[0].id, "bread");
  assert.equal(result.value.deferredItems[0].id, "parcel");
  result.value.includedErrands[0].quantity!.value = 2;
  assert.equal(errand.quantity!.value, 1, "card must not mutate the source review");
});

test("card preparation blocks missing review, destinations, ambiguity, and duplicate IDs", () => {
  for (const change of [{ reviewed: false }, { destinationId: null }, { destinationId: "unknown" }, { disposition: "unresolved" as const }]) {
    assert.equal(prepare([{ ...errand, ...change }]).ok, false);
  }
  assert.equal(prepare([errand, errand]).ok, false);
  assert.equal(prepare([]).ok, false);
});

test("unavailable and deferred outcomes remain unfinished", () => {
  const outcomes = (["done", "unavailable", "deferred", "unresolved"] as const).map((status) => ({ errandId: status, status, updatedAt: timestamp }));
  assert.deepEqual(summarizeUnfinishedTasks(outcomes).map((o) => o.status), ["unavailable", "deferred", "unresolved"]);
});

test("manual splitting preserves cancellations as text without guessing intent", () => {
  assert.deepEqual(splitRequest("Buy 1.5 litres milk. Don't buy bread.\nDrop parcel"), ["Buy 1.5 litres milk", "Don't buy bread", "Drop parcel"]);
  assert.deepEqual(splitRequest("   \n"), []);
});

test("manual card requires nonempty labels, destination, and renewed review", () => {
  assert.equal(canPrepareManualCard([task], true), true);
  assert.equal(canPrepareManualCard([task], false), false);
  assert.equal(canPrepareManualCard([{ ...task, label: " " }], true), false);
  assert.equal(canPrepareManualCard([{ ...task, destinationId: null }], true), false);
  assert.equal(canPrepareManualCard([{ ...task, disposition: "cancelled" }], true), false);
});

test("storage round-trip preserves card outcomes and an explicitly empty workspace", () => {
  assert.deepEqual(readPersistedWorkspace(JSON.stringify(workspace)), workspace);
  const empty = { ...workspace, tasks: [], cardTasks: null, sourceReviewed: false };
  assert.deepEqual(readPersistedWorkspace(JSON.stringify(empty)), empty);
});

test("storage rejects malformed, unsupported, oversized, or inconsistent workspaces", () => {
  for (const raw of [null, "{", JSON.stringify({ ...workspace, version: 2 }),
    JSON.stringify({ ...workspace, tasks: [task, task] }),
    JSON.stringify({ ...workspace, tasks: [{ ...task, destinationId: "invented" }] }),
    JSON.stringify({ ...workspace, sourceReviewed: false }),
    JSON.stringify({ ...workspace, lastSource: "x".repeat(4001) }),
    JSON.stringify({ ...workspace, cardTasks: [{ ...task, label: "changed" }] })]) {
    assert.equal(readPersistedWorkspace(raw), null);
  }
});
