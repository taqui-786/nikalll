# Nikal — implementation plan

**Status:** Early Phase 1/2 prototype implemented; not all phase acceptance criteria are complete.  
**Project directory:** `/home/md-taqui-imam/my-projects/walkrecall`  
**Package name:** `walkrecall` remains unchanged.  
**Product name:** Nikal.  
**Primary device:** mobile browser; tablet is a secondary layout.  
**Architecture source:** [`ARCHITECTURE.md`](./ARCHITECTURE.md).

This plan implements one narrow promise:

> A person can turn one messy family request into a reviewed, destination-assigned, offline-ready errand card and honestly record what happened outside.

The plan intentionally does not build a general shopping app, map application, WhatsApp integration, account system, or autonomous agent.

### Implementation checkpoint — 10 October 2026 (Updated)

- `app/page.tsx`: Clean step-wise workflow (`01 Input` → `02 Review & Assign` → `03 Pocket Card`).
  - Step 1: Centered on an ambient background pattern, with quick sample, manual split, browser MediaRecorder speech-to-text recording, audio upload, and AI extraction.
  - Step 2: Errand list with editable labels, disposition toggles (`Included`, `Cancelled`, `Deferred`), destination selector, manual task addition, and source review verification.
  - Step 3: Paper-ticket style pocket card with destination grouping, single-tap outcome markers (`Done`, `Unavailable`, `Deferred`), cancelled/deferred lists, and print/save formatting.
- `app/api/extract/route.ts` & `app/api/transcribe/route.ts`: Connected to Backboard/Gemma extraction and ElevenLabs Speech-to-Text with graceful local fallback when APIs are unconfigured or fail. Removed segment configs `runtime` and `dynamic` for full Next.js 16.4 `cacheComponents` compatibility.
- Verification checks:
  - `npm test`: 15 domain and provider tests passing.
  - `npm run lint`: 0 errors.
  - `npx tsc --noEmit`: 0 errors.
  - `npm run build`: Production Turbopack build succeeds with static page generation and dynamic route handlers.
- Ready for manual browser testing by user.

## 1. Final stack

### Existing stack to keep

- Next.js 16.4 App Router.
- React 19.3 and TypeScript strict mode.
- Tailwind CSS 4.
- shadcn/ui configured for Base UI primitives with the `base-sera` style.
- Hugeicons, as configured in `components.json`.
- Existing `cn` utility and CSS token system.
- npm and the existing `package-lock.json`.

### Required product dependencies

Add only when the relevant phase starts:

- `zod`: runtime validation and inferred TypeScript types for application and model payloads.
- `@elevenlabs/elevenlabs-js`: server-side audio transcription using Speech to Text, provisionally Scribe v2.

Backboard can use the native server-side `fetch` API at first. Do not add a Backboard SDK unless its official SDK is required for a capability that the documented HTTP API cannot provide. Fewer dependencies make the hackathon repository easier to reproduce.

### Partner technologies

1. **ElevenLabs:** audio input transcription, only when the user chooses voice.
2. **Gemma through Backboard:** central errand extraction and language/tone preservation.
3. **Backboard:** optional but meaningful model comparison through request-level provider/model selection.
4. **Render:** public hosting for the Next.js app and server endpoint.

No additional partner technology is required. Do not add a partner service merely to increase the prize-category list.

## 2. Delivery strategy

Implement in vertical slices. Every slice must leave the app usable:

1. Local text input and manual task card.
2. Text extraction with a real provider and safe fallback.
3. Review and destination assignment in one screen.
4. Mobile pocket card and browser persistence.
5. Audio input through ElevenLabs.
6. Field validation, evaluation evidence, deployment, and submission materials.

Do not start with the map, visual polish, voice, model comparison, or partner category copy. The first working vertical slice is more valuable than a large empty shell.

## 3. Pre-implementation gate: prove the problem first

Before spending time on styling:

1. Identify one real household member or use the user's own real errand messages.
2. Collect three consented or carefully redacted representative requests.
3. Confirm that at least one request can be completed on foot using known public destinations.
4. Make a plain checklist for the same request and estimate its preparation effort.
5. Write down the exact failure Nikal is supposed to prevent: missed cancellation, forgotten quantity, lost destination, or scattered messages.

If there is no real person, no safe real example, or no walkable errand, do not invent the story. Switch to labelled synthetic data and describe the project as a prototype, or choose a better problem before implementation.

## 4. Proposed source layout

```text
app/
  page.tsx
  workspace/
    page.tsx
  card/
    [id]/page.tsx
  api/
    extract/route.ts
    transcribe/route.ts
    health/route.ts
  manifest.ts                         # add only when PWA assets are ready

components/
  nikal/                                # extract product UI here as it grows
    capture-panel.tsx
    source-preview.tsx
    review-assign-screen.tsx
    errand-row.tsx
    destination-selector.tsx
    clarification-panel.tsx
    prepare-card-button.tsx
    nikal-card.tsx
    outing-screen.tsx
    audio-recorder.tsx
    processing-status.tsx
    storage-status.tsx
  ui/                                  # shadcn-generated primitives only

lib/
  domain/
    types.ts
    schemas.ts
    extraction.ts
    evidence.ts
    destinations.ts
    card.ts
    outcomes.ts
  client/
    workspace-store.ts
    audio-recorder.ts
    workspace-controller.ts
  server/
    env.ts
    elevenlabs.ts
    backboard.ts
    extract-source.ts
    redacted-logging.ts
  fixtures/
    extraction-cases.ts
    neighbourhood-pack.ts
  utils.ts

public/
  icons/                               # only when manifest/offline install is ready

tests/                                 # must be committed; never ignored
  domain/
  contracts/
  evaluation/
  browser/
```

The current shadcn folder uses `components/ui`. Keep product components outside that folder. Use the actual configured aliases and Base UI APIs; do not paste Radix/Lucide examples into this repository. The tree above is a future layout, not scaffolding to create upfront: the current interactive prototype lives in `app/page.tsx`, with the manual storage schema in `lib/domain/manual-workspace.ts`.

## 5. Phase 1 — domain contracts before UI

### 5.1 Define one source of truth

Create Zod schemas in `lib/domain/schemas.ts` and infer the TypeScript types from them. Use these schemas for:

- Stored workspace data.
- Audio/transcription response normalization.
- Backboard/Gemma output.
- Destination pack data.
- Prepared card data.
- API request and response envelopes.

Use `safeParse` at request boundaries where the UI needs a controlled error result. Use `parse` only after the caller has decided that invalid data is an internal invariant violation and the error should be handled by the nearest boundary.

### 5.2 Core schemas

Implement these first:

```text
SourceInput
  id, revision, kind: text | audio, text, language?, createdAt

ExtractionItem
  kind: buy | collect | drop_off | other
  displayLabel
  quantity: { value, unit } | null
  disposition: include | cancel | clarify
  destinationHint: string | null
  evidenceQuotes: string[]
  questions: string[]

ExtractionDraft
  schemaVersion
  sourceLanguage: string | null
  displayTone: formal | casual | casual_mixed | unknown
  items: ExtractionItem[]
  clarifications: string[]
  warnings: string[]

ReviewedErrand
  id, kind, displayLabel, quantity, disposition
  evidence, destinationHint, destinationId
  reviewed, manualEdit, clarification

DestinationPack
  schemaVersion, id, version, label, checkedAt
  places[], aliases[], optional connections[]

PreparedCard
  id, sourceRevision, createdAt, stops[], cancelledItems[]
  estimate, limitations, packVersion

TaskOutcome
  errandId, status: done | unavailable | deferred | unresolved, note?
```

Do not let the model return `destinationId`, application IDs, trusted timestamps, provider metadata, or completion statuses. The application assigns those values after validation and user actions.

### 5.3 Domain functions

Implement pure functions with no React, Next, provider, or browser imports:

- `normalizeSourceText`
- `validateEvidenceQuotes`
- `normalizeExtractionDraft`
- `createReviewedErrands`
- `matchDestinationHint`
- `validateDestinationPack`
- `createPreparedCard`
- `validateCardForStart`
- `applyTaskOutcome`
- `summarizeUnfinishedTasks`

Each function should return either a valid domain value or a structured error. Never return an empty success object when the required interpretation failed.

## 6. Phase 2 — manual text-to-card slice

Before adding AI, make the complete manual flow work:

1. Text entry.
2. Manual task rows.
3. Inline destination assignment.
4. Card preparation.
5. Mobile card view.
6. Outcome marking.

This proves the product UX without waiting for a provider and gives a baseline for the AI evaluation.

### Manual flow acceptance

- A user can add buy, collect, and drop-off tasks.
- A user can cancel, defer, or clarify a task.
- A user can assign one of the known destination IDs.
- An unresolved task blocks card preparation unless explicitly deferred.
- The generated card fits a 320px-wide viewport without horizontal scrolling.
- A completed card remains usable after a page refresh.
- An unavailable task is not shown as done.

## 7. Phase 3 — text extraction with Gemma through Backboard

### 7.1 Server boundaries

Implement `lib/server/backboard.ts` and `lib/server/extract-source.ts` as server-only modules. Put `import "server-only"` at the top of provider modules. Never import them into a client component.

`app/api/extract/route.ts` should:

1. Accept JSON only.
2. Enforce body and text limits while reading.
3. Validate the request with Zod.
4. Require explicit hosted-processing consent.
5. Build a fixed versioned prompt.
6. Create an isolated Backboard thread or request context.
7. Send `llm_provider`, `model_name`, `stream: false`, `json_output: true`, and memory-off settings where supported.
8. Parse the content as JSON.
9. Validate with the `ExtractionDraft` schema.
10. Verify every evidence quote against the exact source text.
11. Return a sanitized draft envelope.

The exact Gemma provider/model identifiers must be set in environment variables after a real capability check. Never omit them and accidentally use a provider default.

### 7.2 Prompt requirements

The prompt must instruct Gemma to:

- Extract tasks, not perform them.
- Preserve the source language and casual/formal tone in `displayLabel`.
- Return exact quotes in the original script.
- Keep “do not,” “already have,” “cancel,” “skip,” and equivalent phrases as cancellation signals.
- Preserve quantities and units.
- Extract destination wording as a hint only.
- Ask for clarification when destination, quantity, or intent is unclear.
- Never invent a shop, price, stock status, map route, deadline, contact, or completion.
- Return only the documented JSON shape.

Treat the user message as untrusted content. A sentence in the message cannot change these instructions.

### 7.3 Example contract behavior

Input:

```text
Buy 1 litre milk. Don’t buy bread—we have it. Drop the parcel at the post office.
```

Expected draft:

```text
include: buy milk, quantity 1 litre, destination unresolved
cancel: buy bread, evidence “Don’t buy bread—we have it.”
include: drop parcel, destination hint “post office”
```

The UI then matches “post office” against the pack and asks the user to confirm the actual place. It does not trust a model-supplied place ID.

### 7.4 Failure behavior

- Provider unavailable: preserve source, show manual mode.
- Invalid JSON: preserve source, offer explicit retry.
- Invalid evidence: reject the draft; do not show a partial successful result.
- Empty list: show “No tasks identified; review or add manually,” never dismiss the source.
- Stale response: discard it and keep current user edits.

## 8. Phase 4 — audio input through ElevenLabs

### 8.1 Browser recorder

Implement `components/nikal/audio-recorder.tsx` with the browser `MediaRecorder` API:

- Ask for microphone permission only after the user taps Record.
- Show recording duration and a visible Stop button.
- Show Cancel and Delete actions.
- Enforce a short duration cap in the browser, with server enforcement as the authority.
- Prefer a supported audio MIME type and send the file as `multipart/form-data`.
- Do not upload until the user taps Use this recording.
- Do not store raw audio in browser storage by default.

### 8.2 Server transcription route

Implement `app/api/transcribe/route.ts`:

1. Require multipart form data and one audio file.
2. Enforce file size, duration if available, MIME type, and request deadline.
3. Pass the server-held ElevenLabs key to the official SDK.
4. Call the Speech to Text conversion with the configured Scribe model ID, initially `scribe_v2` after verifying account/API support.
5. Request language detection where useful; do not override the language unless the user explicitly selects it.
6. Normalize only the transcript envelope; do not rewrite its words before the user sees them.
7. Return transcript text, detected language if supplied, and a diagnostic ID.
8. Delete temporary file/buffer references after completion.

The transcript is editable. The user must be able to correct “bread” versus “brand,” quantities, or a wrong name before Gemma sees it. Transcription success does not mean semantic extraction success.

### 8.3 Audio acceptance checks

- A short English sample transcribes and reaches the editable transcript.
- A Hinglish/Hindi sample is tested and its limitations are recorded.
- The user can cancel without uploading.
- A too-large or too-long file is rejected without provider use.
- API keys never appear in browser code, responses, or logs.
- A transcription error can be corrected before extraction.

## 9. Phase 5 — single Review & Assign screen

Do not create separate “review” and “destination” pages in v1. Use one responsive screen.

### Row structure

Each errand row contains:

1. Checkbox/status icon only as a display indicator before outing.
2. Editable display label in the source tone.
3. Quantity/unit editor.
4. Disposition control: Include, Cancel, Clarify, Defer.
5. Destination suggestion or selector.
6. Source quote disclosure.
7. One warning/question if needed.

### Confirm rules

`Prepare card` is enabled only when:

- Every included errand has a confirmed destination.
- Every non-included errand is cancelled or deferred.
- Every clarification has been answered or explicitly deferred.
- The source has been reviewed for omissions.
- The current workspace revision is saved.

The user can always add a manual task, even if the model missed it. Manual tasks are visually labelled as manual and still require a destination.

### Destination matching

Implement deterministic alias matching first:

- Normalize whitespace and case for matching only.
- Preserve original text for display and evidence.
- Support aliases such as `post office`, `dak ghar`, and `डाकघर`.
- One match becomes a suggestion.
- Multiple matches require selection.
- No match requires manual destination selection or deferral.

Do not use a second model to choose a place.

## 10. Phase 6 — mobile-first pocket card

### Product shape

The card is a vertical errand ticket, not a dashboard:

- Header: NIKAL, card state, stop count, estimated total.
- One section per destination with a large number.
- Task rows with quantity and short same-tone labels.
- Cancelled items in a compact “Do not pick up” block.
- Unresolved/deferred items in an attention block.
- Return reminder and limitation note.
- One primary action: Start outing or Print/Save.

### Mobile quality gates

Test at 320px, 360px, 390px, 430px, and one small tablet width:

- No horizontal scroll.
- No clipped task text.
- No fixed footer covering content.
- Buttons are thumb reachable and keyboard accessible.
- Long Hindi/Hinglish labels wrap cleanly.
- The card can be read in bright conditions.
- Print output removes buttons and keeps task states.
- Card remains available after refresh and after the network is disabled.

### Visual identity

Use the existing olive/cream token system with a paper-ticket rhythm:

- warm background surface;
- ink-like foreground text;
- restrained olive accent;
- thin rules and numbered stop markers;
- one compact status badge per state;
- no gradients or decorative map UI.

The visual design should make the correct action obvious: review quickly, save the card, leave the screen.

## 11. Phase 7 — browser storage and offline card

Use the existing adapter boundary from `ARCHITECTURE.md`. Start with a versioned local store for the workspace and prepared card. Do not store provider keys, raw audio, or full provider responses.

Offline scope:

- Prepared card opens after the network is disabled.
- Print/download remains available.
- Outcome changes save locally.
- Audio transcription and Gemma extraction require a network.
- Manual task editing remains available if AI is unavailable.

Do not add service-worker complexity until the card works through normal browser storage and print/export. If a PWA is added, bypass `/api/*` and never cache household text or provider responses.

## 12. Phase 8 — Backboard comparison

This is a developer evaluation, not a user-facing model selector.

1. Create a labelled fixture set: ordinary requests, quantities, cancellations, corrections, Hindi/Hinglish, missing destinations, casual non-errand text, and mixed requests.
2. Hold out a final set before tuning prompts.
3. Send identical inputs through Gemma and one comparison open model using isolated contexts and the same Zod/evidence validator.
4. Record omitted tasks, wrong cancellations, quantity errors, clarification behavior, latency, and cost.
5. Select one production model and record why.
6. Keep the comparison report in the repository without secrets or raw private messages.

If Backboard cannot reliably provide the required model or JSON mode, ship one verified Gemma path and omit the Backboard category claim. A category is optional; a broken core flow is not.

## 13. Phase 9 — verification and field proof

### Automated tests

Add a test runner only when implementation begins. Minimum checks:

- Zod accepts valid structured output and rejects unknown/oversized values.
- Evidence quotes match exact source text and reject invalid offsets/quotes.
- “Bread mat lana” is cancelled, not included.
- Quantities and units survive normalization.
- Destination aliases suggest the right place but never assign an untrusted model ID.
- Multiple destination matches require user selection.
- Empty/invalid AI output preserves the source and enters manual mode.
- Stale extraction cannot overwrite edits.
- Card preparation blocks unresolved included tasks.
- Browser storage migration and corrupted data recover safely.
- Planner includes the return leg and does not silently drop a task.
- Outcomes distinguish unavailable/deferred from done.

### Browser/mobile checks

- Text capture works at mobile width.
- Audio permission cancellation behaves cleanly.
- Transcript editing precedes Gemma submission.
- Review and destination selection fit one mobile workflow.
- Pocket card is readable and scroll-safe.
- Offline prepared card reloads after network disable.

### Field evidence

Record:

- one real or clearly consented request;
- one actual draft and correction;
- one prepared card;
- one outing or a transparent reason the outing could not happen;
- actual task outcomes;
- user feedback compared with a plain checklist.

Do not claim long-term habit change, health improvement, route safety, or universal Hindi/Hinglish accuracy from one walk.

## 14. Exact implementation order

| Order | Deliverable | Stop condition |
|---|---|---|
| 0 | Confirm real user, examples, and walkable destinations | Stop if the user/problem is invented or inaccessible |
| 1 | Domain schemas, fixtures, manual task flow | Manual card works without AI |
| 2 | Mobile Review & Assign screen | One screen handles review plus destination |
| 3 | Mobile pocket card and local storage | Card survives refresh and fits 320px |
| 4 | `/api/extract` with Gemma/Backboard | Real structured output is validated and safe failure works |
| 5 | Audio recorder and `/api/transcribe` | Transcript is editable before extraction |
| 6 | Destination alias matching and card preparation | Unknown/multiple destinations never auto-assign |
| 7 | Offline/print behavior | Prepared card works without network |
| 8 | Evaluation and Backboard comparison | Metrics answer omissions, negations, quantities, and clarification |
| 9 | Render deployment and field test | Fresh-clone, public demo, and real evidence are ready |
| 10 | DEV submission post | Every claim is labelled real, synthetic, measured, or unfinished |

## 15. Environment configuration

Use server-only environment variables; never expose these with `NEXT_PUBLIC_`:

```text
ELEVENLABS_API_KEY=
ELEVENLABS_STT_MODEL_ID=scribe_v2

BACKBOARD_API_KEY=
BACKBOARD_LLM_PROVIDER=
BACKBOARD_MODEL_NAME=
BACKBOARD_MEMORY_MODE=off

NIKAL_MAX_AUDIO_BYTES=
NIKAL_MAX_AUDIO_SECONDS=
NIKAL_MAX_SOURCE_CHARS=4000
```

The exact Backboard provider/model pair and available ElevenLabs account features must be verified during implementation. `.env*` remains ignored. Use placeholders in `.env.example`; never commit credentials, cookies, audio, private messages, or raw provider responses.

## 16. Definition of done

Nikal is ready for submission only when all are true:

- Text and audio input share one source/extraction flow.
- Audio transcript is editable before Gemma receives it.
- Gemma output is structured, Zod-validated, evidence-checked, and destination-hint-only.
- Review and destination assignment happen in one quick mobile screen.
- User can preserve the source, correct tasks, cancel, defer, or add manually.
- Pocket card is polished at mobile widths and useful without network after preparation.
- No task silently disappears; no unavailable task becomes done.
- Tests and nonsecret fixtures are committed and reproducible.
- Model/provider names, limitations, and hosted-data handling are documented honestly.
- At least one real person uses or reviews the workflow, and the field result is reported without invention.
- Render deployment works, or a reliable local/video demonstration is clearly labelled.
- Partner categories claimed in the DEV post match technology that actually ran.

## 17. Documentation basis

- [Next.js Route Handlers](https://nextjs.org/docs/app/getting-started/route-handlers): Route Handlers use the Web Request/Response APIs, live in `app`, and non-GET methods are not cached by default.
- [Next.js Progressive Web Apps](https://nextjs.org/docs/app/guides/progressive-web-apps): a manifest enables install metadata; offline service-worker behavior is a separate concern.
- [ElevenLabs JavaScript Speech to Text](https://github.com/elevenlabs/elevenlabs-js/blob/main/_autodocs/api-reference/SpeechToTextClient.md): `speechToText.convert` accepts audio and returns transcript/language metadata; verify the exact Scribe model/account support before implementation.
- [Backboard model selection](https://docs.backboard.io/concepts/models): message requests can specify `llm_provider` and `model_name`.
- [Backboard message JSON output](https://docs.backboard.io/concepts/messages): `json_output` requests structured JSON; verify selected-model compatibility and still validate the response locally.
- [Zod parsing and inference](https://zod.dev/): define runtime schemas and infer TypeScript types from the same schemas.
