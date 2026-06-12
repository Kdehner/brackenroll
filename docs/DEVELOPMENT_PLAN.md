# Brackenroll VTT — Development Plan

---

## V4.1 — Character Builder

**Goal:** Overhaul the character builder UX — richer information, better selection flow, cleaner layout.

**Scope (deferred):** Handbook equipment section breaks (Normal / Magical / Wheelchair) — moved to V4.2.

---

### Phase 1 — Layout & Persistent Summary Panel

**Goal:** Center the builder and give players a live-updating "what am I building" view throughout all 13 steps.

| Part | Task | Status |
|------|------|--------|
| 1a | Center main builder content area (constrain width, center with margin auto) | done |
| 1b | Design and implement summary panel HTML/CSS — name, ancestry, community, class, subclass, domains; tome-styled | done |
| 1c | Wire summary panel to state — re-renders on every step transition (goTo) | done |

---

### Phase 2 — Stat Picker Redesign

**Goal:** Replace two-step chip → row click with per-stat dropdowns. Used values drop out of all other dropdowns as assigned.

**Current:** `renderStep6()` uses `selectedChip` + click-chip-then-click-row pattern.  
**Target:** Each trait row gets a `<select>`. Options = unassigned values from `TRAIT_POOL`. Selecting one removes it from all other selects. Blank option allows unassigning.

| Part | Task | Status |
|------|------|--------|
| 2a | Replace chip pool + trait rows with per-stat `<select>` dropdowns | done |
| 2b | Pool management — on change, rebuild available options across all dropdowns | done |
| 2c | Remove `selectedChip` state; ensure validation on step advance still works | done |

---

### Phase 3 — Info Modals (D&D Beyond Style)

**Goal:** Clicking any selectable item opens a scrollable detail modal with full description + Cancel + Select/Confirm button. No information loss from picking blind.

**Applies to:** class, subclass, ancestry, community, domain cards, equipment.

| Part | Task | Status |
|------|------|--------|
| 3a | Build reusable modal component — overlay, scrollable body, Cancel + Confirm buttons, close on overlay click | done |
| 3b | Wire to Class (step 2) and Subclass (step 3) — show full class/subclass detail in modal | done |
| 3c | Wire to Ancestry (step 4) and Community (step 5) | done |
| 3d | Wire to Domain Cards (step 7) — show full card description, type, recall cost | done |
| 3e | Wire to Equipment (step 9) — show weapon/armor full stats and tags | done |

---

### Phase 4 — Editable Background & Connections

**Goal:** Questions in steps 11 and 12 are pre-filled from class data but fully editable. Players can rewrite prompts or add their own. Both modified question and answer saved to state and draft.

**Current:** `renderStep11/12()` renders question text as a read-only div; only the answer textarea is editable.

| Part | Task | Status |
|------|------|--------|
| 4a | Step 11 — convert question text divs to editable inputs pre-filled from `cls.backgroundQuestions` | done |
| 4b | Step 12 — same for `cls.connections` | done |
| 4c | Persist custom question text in `state.backgroundQuestions[]` / `state.connectionQuestions[]`; include in draft save and review | done |

---

### Phase 5 — Review Screen Redesign

**Goal:** Replace the half-baked inline text dump with a proper character dossier. Should feel like the payoff for completing 13 steps.

**Current problems:**
- All inline styles, no visual hierarchy
- Tiny text, cramped layout
- Missing: background answers, connection answers
- Stats block is barely readable
- No sense of celebration or completion

**Target:** Full-width character sheet preview — large name header, class/ancestry/community identity line, concept quote, prominent stat blocks, domain card names styled as cards, equipment section, inventory list, background + connections sections. Tome aesthetic. Feels earned.

| Part | Task | Status |
|------|------|--------|
| 5a | Design review layout — header identity block, stat grid, equipment, cards | done |
| 5b | Implement HTML/CSS for review block (extract inline styles to classes) | done |
| 5c | Add background answers and connection answers sections to review | done |
| 5d | Polish — spacing, section dividers, final CTA ("Create Character") prominence | done |

---

## Post-V4.1 Fixes

| Fix | Notes |
|-----|-------|
| Review callout text | Removed campaign-specific "Ready to step into The Verdant Curse." → "Your character is ready." |

---

## Backlog / Future

| Item | Notes |
|------|-------|
| V4.2 — Handbook equipment sections | Normal / Magical / Wheelchair section breaks + `is_magical` tag on items and homebrew editor |
| U2 — Scenes panel `.pushed` class race | Cosmetic; needs optimistic UI update in realtime subscription path |
| CLEANUP — Cache-bust params on base JSON fetches | `weapons.json?v=3` / `armor.json?v=3` were dev artifacts; normalize or remove across all 6 base fetches. Non-priority. |
