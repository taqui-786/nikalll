# Final idea recommendation: Nikal

Research decision: 10 October 2026. This is the final idea recommendation before implementation planning. It is not a promise of a prize or a substitute for a real-user check.

## The decision

Build **Nikal** — a pocket-sized family errand handoff.

> A family member sends messy Hindi/Hinglish/English requests. Nikal turns them into a reviewed outside-task card that a person can actually carry, complete, and report back.

This is a narrower and stronger version of ChaloList. ChaloList was drifting toward a general multi-stop shopping and route planner. Nikal removes the weakest and riskiest parts—shop discovery, live maps, stock, prices, and route claims—and keeps the part with the best contest story:

**noisy real messages → source-linked review → one physical errand handoff → honest completion.**

Example, illustrative until replaced by a real consented message:

> “Doodh 1 litre le aana. Bread mat lana, already hai. Parcel post office pe chhod dena. Notebook bhi le lena.”

The result is not an autonomous shopping plan. It is:

- Buy milk — 1 litre
- **Do not buy bread** — already available
- Drop parcel — post office
- Buy notebook — destination needs confirmation
- Question: “Which stationery shop should I use?”

The person reviews this, chooses from a few manually known destinations, saves a compact card, goes outside, and marks each task **done**, **unavailable**, **deferred**, or **still unresolved**.

## Why this is stronger than the original ChaloList framing

| ChaloList as first proposed | Nikal as recommended |
|---|---|
| “Plan my errands and find the best route” | “Do not lose what my family asked me to do” |
| Needs maps, route data, place search, timing and more infrastructure | Needs one real person, a few known places and one reliable handoff |
| Overlaps with food-adventure and walking planners | Differentiates through family-message interpretation and task coverage |
| Could become a shopping app | Clearly becomes an outdoor handoff tool |
| More difficult to prove in one weekend | One real request and one real errand can demonstrate the whole promise |
| AI could be decorative | Mixed-language correction, negation and quantity extraction are central |

The product's success is not “AI planned a route.” It is “the person completed the right physical tasks without a dropped cancellation or invented detail.”

## Why it addresses the previous Hacktoberfest failure

The previous TiffinTally report identified five visible weaknesses. Nikal can directly correct all five if we enforce the boundaries below.

### 1. Real person instead of fictional beneficiary

The product must be built for a real household member or for the user themselves. The story should begin with an actual repeated failure:

> “My mother sends errands in several messages while I am working, and I sometimes forget a cancellation or quantity.”

Do not use that sentence unless it is true. Before implementation, collect three real, consented examples or stop and choose a different user/problem.

### 2. One complete proof instead of a feature tour

The demo must show:

1. Redacted real message or clearly labelled test message.
2. Actual open-model draft.
3. Original wording beside every proposed task.
4. Human correction/approval.
5. Pocket card.
6. Real or clearly labelled field completion.
7. One task marked unavailable or deferred without disappearing.

This is a better 60–90 second story than ten pages of settings, maps, accounts and dashboards.

### 3. Central-task evidence instead of browser-rendering evidence

The evaluation must measure:

- Omitted task rate: a request present in the source but absent from the draft.
- Quantity accuracy: correct value and unit.
- Cancellation/negation accuracy: “do not buy” must not become “buy.”
- Destination uncertainty: unknown places must ask, not guess.
- Clarification quality: ambiguous requests should remain visible.
- Review effort: corrections and time compared with making a plain checklist.

Task-level precision alone is not enough: it cannot detect something the model failed to extract. The labelled examples must record the full intended task set.

### 4. Concrete open-model value instead of future flexibility

Run the same held-out mixed-language examples through:

- A simple non-AI baseline or manually structured form.
- The selected Gemma model.
- One comparison open model only if Backboard testing is practical.

Record model IDs, prompt version, latency, cost, correct tasks, omitted tasks, wrong cancellations, and clarification decisions. If Gemma is not best, report that honestly and do not keep it only for a category badge.

Hosted Gemma is allowed, but the write-up must say the request is sent to the provider. Do not claim “offline AI” unless the actual selected model runs locally in the target environment.

### 5. Reproducibility instead of private tests and broad claims

The new repository must contain nonsecret fixtures, validators, planner checks, a license, exact setup instructions, and the actual demo path. Do not exclude the tests from Git. Do not include real private messages, credentials, phone numbers, or home addresses.

## Competition assessment

The supplied public feed response contained 100 records and no total count. I re-screened all returned titles and read the closest related entries. This cannot prove global originality, but it is enough to choose a direction.

### Direct overlap not found in the inspected sample

No returned title matched household errands, grocery lists, parcels, chores, shopping handoff, or the Nikal concept. This is a title-level result, not a feature-level uniqueness guarantee.

### Closest overlap

- **Seasalt** turns a natural-language food craving into a multi-stop food adventure with budget checks. Nikal is not a recommendation or restaurant adventure; it preserves a family member's instructions, corrections and cancellations.
- **FoodieCompass** sends someone walking to one food destination. Nikal is about executing household duties already requested by someone else.
- **Free Time Walk Planner**, **WanderWise**, **Touch Grass Planner**, and **Outside in 20** generate constrained outdoor activities. Nikal's outside action is a real obligation, not a generated leisure prompt.
- **CivicLens Mini** structures street complaints. Nikal structures household handoffs and private errands, with no civic dashboard.
- **Trail Journal**, **Pocket Field Trip**, bird tools, plant tools, and nature quests occupy the observation/exploration space. Nikal should avoid that crowded field.

The strongest competitive claim is therefore not “nobody has planned multiple stops.” It is:

> Among this snapshot, no inspected project centered on preserving noisy household task instructions through a human-reviewed, offline-ready physical handoff.

That claim must remain qualified and source-backed.

## The smallest winning-shaped product

### User flow

1. **Paste or type a request** — no WhatsApp integration in the first version.
2. **Extract a draft** — Gemma proposes tasks with exact source quotes.
3. **Review every task** — include, cancel, clarify, or defer.
4. **Assign known destinations** — select from three to five manually verified public places.
5. **Prepare a card** — compact task groups, destination labels, path notes and limitations.
6. **Leave the app** — printed/downloaded card or pocket mode.
7. **Report outcomes** — done, unavailable, deferred, unresolved.

### What must be visible

- The original message.
- Proposed interpretation and evidence.
- Missing or ambiguous details.
- Cancelled tasks.
- Manual corrections.
- Model/provider label and whether the result is real or synthetic.
- The difference between estimated time and guaranteed facts.
- Provider failure and manual fallback.

### What must not exist in v1

- Map tiles or live route discovery.
- Online shop/inventory/prices.
- Payments or ordering.
- Accounts or a family database.
- Automatic messaging.
- GPS background tracking.
- Weather/air-quality claims.
- Voice unless the real user actually needs it.
- Forecasting, memory, RAG, Temporal, vector search or fine-tuning.

This is not cutting corners that matter. It is protecting the only story that needs to work.

## Partner category strategy

The challenge permits one project to enter every category it genuinely uses, but the project can win only once. There is no public category-count dataset proving which category has low competition. Treat “smaller pool” as a contest hint, not a guaranteed probability.

### Primary: Best Use of Gemma

Gemma should perform the central task: interpreting noisy, mixed-language household requests. The category evidence is the held-out evaluation and an honest failure case, not simply a model name in the README.

### Strong secondary: Best Use of Backboard

Use Backboard only if it enables a real open-model comparison or a meaningful model boundary. Send identical isolated cases through two open models, with memory disabled and the same server validators. Publish the result and select one production model.

Backboard is weak if it is only a pass-through SDK. It is strong if it answers: “Which open model handled Hindi/Hinglish negation and corrections better under the same conditions?”

### Supporting: Best Use of Render

Deploy the working application and server endpoint. The category claim should show:

- A public end-to-end request.
- Safe failure when the provider is unavailable.
- No client-exposed provider secret.
- Card preparation and offline/print fallback.
- A reproducible fresh-clone setup.

Hosting alone is not the product.

### Optional: Best Use of ElevenLabs

Only add it if the intended person sends voice notes or cannot easily type. Then test transcription on real consented examples, especially quantities and negations. A voice demo added for a prize category without user need would repeat the old feature-list problem.

### Skip for this project

Skip TabPFN, Tinker, Arduino, Temporal, MongoDB Atlas, Tiger Data, Sentry tracing, and SerpApi unless a real requirement appears. Adding them would increase surface area without increasing the evidence for Nikal's core promise.

## The decisive field experiment

Before investing in visual polish, ask one real person for three recent or representative request examples. Remove names and sensitive details with permission.

Then perform one walk:

1. Use the actual request.
2. Compare Nikal with a plain checklist.
3. Record each correction.
4. Take the prepared card outside.
5. Mark one completed task and one unavailable/deferred task if the situation naturally occurs.
6. Ask: “Was this easier than the way you normally remember these requests?”

Do not manufacture a failure or force a task to be unavailable. Report what really happened.

If the person says a normal checklist is faster, Nikal has failed its product hypothesis. That is useful information before submission.

## Final recommendation

**Build Nikal, not the broad ChaloList planner.** It has the best combination of:

- a daily, understandable problem;
- a physical-world outcome;
- a narrow buildable flow;
- a clear open-model role;
- a direct answer to the prior submission's missing-evidence problem;
- and no exact counterpart identified in the inspected 100-entry snapshot.

I am confident Nikal gives you a **stronger submission position** than a generic walking planner or general shopping assistant. I am not confident—and no honest researcher can be—that it will win. The idea becomes genuinely competitive only if a real person uses it and the post shows one complete, measured, honest handoff.
