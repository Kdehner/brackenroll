# Brackenroll VTT — QC Audit Log

Session: 2026-06-11  
Auditor: automated Playwright + manual code review  
Target: https://devverheart.fwbgaming.win (dev)  
Campaign: a6762bff-15ea-4e13-a4f0-dc61b26cf37a

---

## Fixed During Audit

| # | File | Issue | Fix Applied |
|---|------|-------|-------------|
| F1 | `supabase-client.js:471` | `getTokenDefinitions()` called `.order('created_at', ...)` but `token_definitions` had no `created_at` column → HTTP 400 on every table page load | `ALTER TABLE public.token_definitions ADD COLUMN IF NOT EXISTS created_at timestamptz DEFAULT now()` |
| H1 | `character-builder.html · renderReview()` | User fields (`name`, `pronouns`, `concept`, `ancestry`, `community`, `subclassName`, `domainCards`, `exp1/2`) injected into `innerHTML` without `escHtml()` → XSS | Applied `escHtml()` to all user-authored fields |
| H2 | `encounter-builder.html · buildEntryRow()` | `role` string from homebrew adversaries table spliced into badge `innerHTML` without escaping → stored XSS | Applied `escHtml()` to `tier` and `role` before badge construction |
| H3 | `character-builder.html · renderStep11/12()` | `backgroundQuestions` and `connections` embedded in innerHTML template literals without `escHtml()` | Applied `escHtml(q)` to all question and connection strings |
| M1 | `loot-roller.js · matchingHomebrew` | Type filter inverted: `items` returned weapons/armor, `consumables` returned loot_item | Rewrote filter: `items` = `loot_item` where `consumable !== true`; `consumables` = `loot_item` where `consumable === true` |
| M2 | `campaign.html` | Unauthenticated redirect went to `index.html` instead of `signin.html?redirect=…`, losing deep-link | Changed to `signin.html?redirect=${encodeURIComponent(...)}` |
| M3 | `table.html` | `campaignId` null-check ran synchronously before `onAuthChange`; auth redirect went to `index.html` losing deep-link | Moved null-check inside `onAuthChange`; fixed redirect to `signin.html?redirect=…` |
| L1 | `characters.html` | No `onAuthChange` guard — pattern break, future data leak risk | Added auth guard; unauthenticated users redirect to `signin.html?redirect=…` |
| L2 | `character-sheet.html · boot()` | Unknown `classId` caused silent blank render with no error shown | Added explicit check after class lookup; shows `Class not found (id) — character data may be corrupt.` |
| U1 | `library.html` / `adversary-editor.html` | "+ New → Adversary" from My Library landed on adversary list, required second click | Added `&new=1` to library redirect; `showForm()`/`hideForm()` now toggle `listSection` visibility |

---

### UX / Cosmetic — Not Fixed

**U2 · Scenes panel · `.pushed` class race on push**

After clicking the push button on a scene, the `.pushed` CSS class (green dot) is not set immediately — it updates on the next realtime sync or `renderScenes()` call. The scene IS pushed (scene label appears on canvas and in player view). Cosmetic delay only; fixing requires optimistic UI update wired into the realtime subscription path — deferred to V4.

---

## Verified Working (from automated + manual QC)

| Area | Details |
|------|---------|
| Auth | Signin, GM auth, player auth, unauthenticated redirect |
| Index | Nav injection, campaign UI, sign-in prompt |
| Campaign hub | Name, homebrew link, table link, world pages link |
| Handbook | 7 tabs, 9 class cards + modals, domain cards tab, rich text |
| Character builder | Page loads, roster, step 1–2 flow |
| Table — scene creation | Create via UI with URL background, push to players, label appears |
| Table — quick token | Popover, swatches, add to scene, appears in tokens panel with ✓ badge |
| Table — tokens panel | Add-to-scene, delete buttons, in-scene badges |
| Table — fear tracker | Increment, decrement, visibility toggle |
| Table — player view | Canvas loads, GM toolbar hidden, scene label shows pushed scene |
| Encounter builder | Create encounter, open detail, adversary picker (129 official), add adversary |
| Homebrew browser | 19 type tabs, new/search/import, empty state |
| Homebrew editor | weapon, armor, loot_item, domain_card, ancestry, community, class (7/9 types) |
| Adversary editor | Name input, template picker |
| Loot generator | Data loads (60 items + 60 consumables), roll button, rarity/type controls |
| Primer | Loads with campaign context, empty state handled |
| Nav | Present and correct on all tested pages |
| Data files | adversaries.json (129), classes (9), domain-cards (184), loot (60+60) — all 200 OK |

---

## Test Artifacts

```
brackenroll-dev/tests/
  qc.spec.js          — general auth/page load tests
  qc-campaign.spec.js — campaign-context page tests
  qc-table.spec.js    — table creation flow (scene, token, fear, encounter)
  package.json        — playwright 1.52.0
```

Run via:
```bash
docker run --rm \
  -v /path/to/brackenroll-dev/tests:/tests \
  mcr.microsoft.com/playwright:v1.52.0-jammy \
  bash -c "cd /tests && npm install --silent && node qc-table.spec.js"
```

Test users: `qc-gm@brackenroll.test` / `qc-player@brackenroll.test` (pass: `QCtest2026!`)  
Both have `display_name` set in `profiles` table to bypass onboarding redirect.
