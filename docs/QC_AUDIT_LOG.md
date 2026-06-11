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

---

## Open Bugs

### HIGH — XSS (must fix before any public/prod push)

**H1 · character-builder.html · renderReview() · ~line 1176**

`renderReview()` builds review blocks with `block.innerHTML = ...` using:
- `state.name`
- `state.pronouns`
- `state.concept`
- `state.ancestry`
- `state.community`
- `state.subclassName`

None pass through `escHtml()`. User types `<img src=x onerror=alert(1)>` in the name field → XSS fires on the review step. `escHtml()` is already defined (line 430) and used everywhere else in the file — omitted here.

**H2 · encounter-builder.html · buildEntryRow() · ~line 943**

`truncRole()` trims an adversary role string but does not escape it. Result is spliced into a badge via:
```js
badges.push('<span class="badge badge-role">' + role + '</span>');
sourceEl.innerHTML = badges.join(' ');
```
Adversary roles come from the homebrew `adversaries` table (user-authored content) → stored XSS path. Confirmed firing by automated test (WARN emitted).

**H3 · character-builder.html · renderStep11/12() · ~lines 1140–1163**

`cls.backgroundQuestions` and `cls.connections` are embedded as `${q}` in innerHTML template literals without `escHtml(q)`. Official data is safe today, but homebrew classes will expose stored XSS when that feature ships.

---

### MEDIUM

**M1 · loot-roller.js · matchingHomebrew filter · ~line 71**

Type filter logic is inverted:
```js
// Current (wrong):
if (type === 'items')       return hb.content_type !== 'loot_item'; // returns weapons/armor
if (type === 'consumables') return hb.content_type === 'loot_item'; // returns loot_item
```
When GM enables homebrew toggle on the loot generator: "items" roll pulls weapons/armor homebrew into the pool instead of homebrew loot items, and vice versa for "consumables". No visible error — just wrong results silently.

**M2 · campaign.html · unauthenticated redirect · ~line 546**

Unauthenticated access to `campaign.html` redirects to `index.html` instead of `signin.html?redirect=campaign.html?id=…`. Every other guarded page uses the `?redirect=` pattern. Deep-link is lost for players clicking a campaign invite while logged out.

**M3 · table.html · campaignId guard · ~line 1320**

`campaignId` is read synchronously before `onAuthChange` fires. Race condition: in theory can hit the guard before auth resolves. Harmless in practice today — no observed failure — but will produce double-redirects if `onAuthChange` latency increases.

---

### LOW

**L1 · characters.html · no auth guard**

No `onAuthChange` import, no redirect to `signin.html`, no auth gating at all. Currently static content so no data leaks. Breaks the pattern and becomes a hole if dynamic content is added.

**L2 · character-sheet.html · silent blank on unknown classId**

Unknown or missing `classId` in URL silently renders a blank character sheet. Should show a visible "class not found" error state.

---

### UX / Not Bugs

**U1 · homebrew-editor.html · `?type=adversary` and `?type=domain` timeout**

Navigating to `homebrew-editor.html?type=adversary` causes a load timeout. Adversary editing is intentionally handled by `adversary-editor.html` — the route is undefined by design. However the page hangs instead of redirecting or showing an error, which breaks any deep-link into adversary homebrew editing.

**U2 · Scenes panel · `.pushed` class race on push**

After clicking the push button on a scene, the `.pushed` CSS class (green dot) is not set immediately — it updates on the next realtime sync or `renderScenes()` call. The scene IS pushed (scene label appears on canvas and in player view). Cosmetic delay only.

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
