import assert from "node:assert/strict";
import { test } from "node:test";
import { ExtractionDraftSchema } from "../lib/domain/schemas";
import { ExtractRequestSchema } from "../lib/server/contracts";
import { normalizeBackboardContent, normalizeTranscriptionResponse, parseBackboardDraft } from "../lib/server/provider-normalization";

const modelDraft = {
  schemaVersion: 1,
  sourceLanguage: "en",
  displayTone: "casual",
  items: [{ kind: "buy", displayLabel: "Milk", quantity: { value: 1, unit: "litre" }, disposition: "include", destinationHint: null, evidenceQuotes: ["Buy milk"], questions: [], warnings: [] }],
  clarifications: [], warnings: [],
};

test("extract request-shaped provider output is normalized with exact evidence offsets", () => {
  const result = parseBackboardDraft(JSON.stringify(modelDraft), "Buy milk");
  assert.equal(result.items[0].evidence[0].start, 0);
  assert.equal(result.items[0].evidence[0].end, 8);
  assert.equal(result.items[0].evidence[0].ambiguous, false);
});

test("Backboard text-part arrays are supported and unknown shapes fail closed", () => {
  assert.equal(normalizeBackboardContent([{ type: "text", text: "{" }, { type: "text", text: "}" }]), "{}");
  assert.throws(() => normalizeBackboardContent([{ type: "markdown", text: "{}" }]));
  assert.throws(() => normalizeBackboardContent({ text: "{}" }));
});

test("provider normalization rejects invalid JSON and evidence", () => {
  assert.throws(() => parseBackboardDraft("not json", "Buy milk"));
  assert.throws(() => parseBackboardDraft(JSON.stringify({ ...modelDraft, items: [{ ...modelDraft.items[0], evidenceQuotes: ["milk"] }] }), "Buy bread"));
  assert.equal(ExtractionDraftSchema.safeParse({ ...modelDraft, extra: true }).success, false);
});

test("extract route input validation is strict and requires consent", () => {
  const valid = {
    schemaVersion: 1,
    requestId: "00000000-0000-4000-8000-000000000001",
    source: { id: "00000000-0000-4000-8000-000000000002", revision: 0, text: "Buy milk" },
    workspaceRevision: 3,
    hostedProcessingConsent: true,
  };
  assert.equal(ExtractRequestSchema.safeParse(valid).success, true);
  assert.equal(ExtractRequestSchema.safeParse({ ...valid, hostedProcessingConsent: false }).success, false);
  assert.equal(ExtractRequestSchema.safeParse({ ...valid, model: "browser-controlled" }).success, false);
});

test("transcription normalization returns only text and optional language", () => {
  assert.deepEqual(normalizeTranscriptionResponse({ text: "Buy milk", language: "en" }), { text: "Buy milk", language: "en" });
  assert.deepEqual(normalizeTranscriptionResponse({ text: "Buy milk" }), { text: "Buy milk", language: null });
  assert.throws(() => normalizeTranscriptionResponse({ text: 42 }));
});
