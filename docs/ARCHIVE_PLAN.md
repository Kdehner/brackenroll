# Brackenroll — Shelve & Archive Plan

**Goal:** Shelve brackenroll-dev (cost/time no longer justified, moving to FoundryVTT for actual play). Preserve campaign data for migration into Foundry. Keep `daggerheart` (PDF extractor/MCP) and `daggerheart-resources` (canonical manual data — single source of truth) alive and untouched.

**Decisions locked (user, 2026-07-30):**
- Archive both ways: git tag+push+`gh repo archive` AND local tarball.
- Live container: stop + remove, drop Traefik route.
- Campaign data (Supabase DB, R2 assets): **export and preserve** — needed for Foundry migration. Not discarded.
- `daggerheart-resources/data/base/*` (the "manual") stays the single source of truth — no changes, no duplication drift.
- Firebase (`firebase-init.js`) confirmed dead code — not imported anywhere, vestigial from pre-Supabase migration. No export needed there.

---

## Phase A — Data Preservation (do FIRST, before any teardown)

**Goal:** Nothing gets deleted before it's safely exported. This phase blocks Phase C.

| Part | Task | Status |
|------|------|--------|
| A1 | Dump Supabase tables — **skipped (user 2026-07-30): all dummy data, rebuild later if needed** | skipped |
| A2 | Enumerate + download R2 assets — **skipped, same reason as A1** | skipped |
| A3 | Confirm Firebase project unused — confirmed dead code, not imported anywhere | done |
| A4 | Package Verdant Curse campaign content — **found already safe**: full campaign master lives in `daggerheart-resources/CAMPAIGN.md` (+ ENCOUNTERS/HISTORY/HOMEBREW/PLAYER-PRIMER.md), untouched by this plan, already scoped for FoundryVTT. Pre-Session-0, no play history to lose. Nothing unique in brackenroll-dev to extract. | done |
| A5 | Verify export restorable — **n/a, no export taken (A1/A2 skipped)** | skipped |

---

## Phase B — Git Archive

**Goal:** brackenroll-dev repo preserved, read-only, recoverable.

| Part | Task | Status |
|------|------|--------|
| B1 | Confirm working tree clean (already verified clean at plan time) | done |
| B2 | Tag final state (e.g. `v-final-archive`) | not started |
| B3 | Push tag to `origin` (Kdehner/brackenroll) | not started |
| B4 | `gh repo archive` — make GitHub repo read-only | not started |
| B5 | Fresh local tarball of working dir → durable archive location (existing `brackenroll-dev.tar.gz` in home dir is stale, May snapshot) | not started |

---

## Phase C — Live Teardown

**Goal:** Stop the recurring cost — container down, route gone. Gated on Phase A complete.

| Part | Task | Status |
|------|------|--------|
| C1 | `docker compose down` in `brackenroll-dev` (removes container + Traefik route automatically — label-based routing) | not started |
| C2 | Confirm `devverheart.fwbgaming.win` no longer resolves to a live backend (wildcard DNS stays, just no container — no DNS change needed) | not started |
| C3 | Flag open question: Supabase/Cloudflare R2/Firebase are external cloud projects, not VPS-local — deleting/downgrading those projects is a separate decision (billing lives there, not in Docker). Not in scope of this plan unless you want it added. | open question |

---

## Phase D — Local Cleanup & Memory Update

| Part | Task | Status |
|------|------|--------|
| D1 | Leave `brackenroll-dev/` in place on disk, add `ARCHIVED` banner to top of `CLAUDE.md`/README (reversible, no move/delete) | not started |
| D2 | Update `project_vps_setup.md` memory — remove brackenroll-dev from "Running Projects" table, note archived | not started |
| D3 | `brackenroll_github` SSH key — keep (still needed for the tag push in B3) | n/a |

---

## Phase E — Foundry Handoff (future, separate project)

Out of scope for this plan — once Phase A export exists, migrating that data into FoundryVTT (module choice, actor mapping, etc.) is its own project and gets its own Phase 0/1 discussion when you're ready to start it. Listed here only so it's not forgotten.

---

## Out of scope / untouched by this plan

- `daggerheart` (scanner/PDF extractor/MCP) — stays paused at Phase C-complete, no action.
- `daggerheart-resources` (`data/base/*` canonical manual) — stays live (`dhgm.kevbot.app`), `daggerheart-player` still depends on it. No changes.
