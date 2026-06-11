# Brackenroll VTT — Test Suite

## Quick Start

```bash
# Run full suite
docker run --rm \
  -v /home/kevbot/projects/brackenroll-dev/tests:/tests \
  mcr.microsoft.com/playwright:v1.52.0-jammy \
  bash -c "cd /tests && npm install && npx playwright test"

# Run one spec
docker run --rm \
  -v /home/kevbot/projects/brackenroll-dev/tests:/tests \
  mcr.microsoft.com/playwright:v1.52.0-jammy \
  bash -c "cd /tests && npm install && npx playwright test specs/table.spec.js"
```

---

## Directory Layout

```
tests/
  playwright.config.js   — base URL, timeouts, auth projects, reporter config
  global-setup.js        — runs once: signs in as GM + player, saves .auth/ state
  package.json           — @playwright/test 1.52.0
  .gitignore             — ignores .auth/, node_modules/, playwright-report/

  lib/
    config.js            — BASE_URL, campaign IDs, test credentials, RUN_ID
    helpers.js           — nav(), openPanel(), signIn(), waitForCount(), etc.
    selectors.js         — all DOM selectors indexed by feature area

  specs/
    auth.spec.js         — sign-in, redirect, session validation
    handbook.spec.js     — tabs, class cards, domain cards, modals
    character-builder.spec.js — step navigation, full creation flow, save
    homebrew.spec.js     — browser, editor create for each type
    campaign.spec.js     — create campaign, hub links, deep links
    table.spec.js        — scene creation, tokens, fear, player view
    encounter-builder.spec.js — create, open, adversary picker, add/remove
    loot-generator.spec.js — load, roll, count, reroll
    profile.spec.js      — display name, avatar preview, save

  legacy/
    qc.spec.js           — original node runner (reference only)
    qc-campaign.spec.js  — original campaign runner
    qc-table.spec.js     — original table runner
```

---

## Selector Registry (`lib/selectors.js`)

All DOM selectors live in one file, grouped by feature. **When a page is refactored, update the selector here — every test that uses it picks up the change automatically.**

| Namespace | Page | Example selectors |
|-----------|------|-------------------|
| `AUTH` | signin.html | `#signInEmail`, `#signInPassword`, `#emailSignInBtn` |
| `NAV` | all pages | `.site-nav` (nav.js injects this class, not an ID) |
| `INDEX` | index.html | `#hubContent`, `#signinPrompt`, `#createCampaignBtn` |
| `HANDBOOK` | handbook.html | `.tab-btn`, `#class-grid .click-card`, `.domain-card` |
| `CHAR_BUILDER` | character-builder.html | `#btn-new-char`, `#view-builder .step.active .btn-next`, `[data-class]`, `#btn-save-char` |
| `HB_BROWSER` | homebrew.html | `.hb-type-btn`, `#btnNew`, `#hbSearch` |
| `HB_EDITOR` | homebrew-editor.html | `#fName`, `#btnSave`, `#hbeOuter`, `#statusMsg` |
| `TABLE` | table.html | `#tableCanvas`, `#gmToolbar.visible`, scenes/token/fear panels |
| `ENCOUNTER` | encounter-builder.html | `#encName`, `#createEncBtn`, `.enc-card`, picker controls |
| `LOOT` | loot-generator.html | `#btnRoll`, `#ctrlRarity`, `.loot-card` |
| `PROFILE` | profile.html | `#displayNameInput`, `#saveProfileBtn`, `#profileSuccess` |

---

## Auth

`global-setup.js` runs before all tests. It signs in as `qc-gm@brackenroll.test` and `qc-player@brackenroll.test`, saves localStorage + cookies to `tests/.auth/gm.json` and `tests/.auth/player.json`.

Most specs run as GM by default (`storageState: '.auth/gm.json'` in `playwright.config.js`). Specs that need player perspective use:

```js
test.use({ storageState: '.auth/player.json' });
```

Unauthenticated tests use:

```js
test.use({ storageState: { cookies: [], origins: [] } });
```

---

## Adding Tests for a New Feature

### Step 1 — Does a spec file already exist for this area?

| Feature area | Spec file |
|---|---|
| Auth, session, redirect | `specs/auth.spec.js` |
| Handbook, rules content | `specs/handbook.spec.js` |
| Character creation | `specs/character-builder.spec.js` |
| Homebrew CRUD | `specs/homebrew.spec.js` |
| Campaign management | `specs/campaign.spec.js` |
| VTT table | `specs/table.spec.js` |
| Encounter builder | `specs/encounter-builder.spec.js` |
| Loot generator | `specs/loot-generator.spec.js` |
| User profile | `specs/profile.spec.js` |
| New page/feature | Create `specs/<feature>.spec.js` |

### Step 2 — Add the selector to `lib/selectors.js`

```js
// In the appropriate namespace:
NEW_PAGE: {
    myElement: '#my-element-id',
    myList:    '.my-list-item',
},
```

### Step 3 — Write the test

```js
const { test, expect } = require('@playwright/test');
const { nav } = require('../lib/helpers');
const SEL = require('../lib/selectors');

test.describe('My Feature', () => {

    test('does the thing', async ({ page }) => {
        await nav(page, '/my-page.html', 2000);
        const el = await page.$(SEL.NEW_PAGE.myElement);
        expect(el).not.toBeNull();
    });
});
```

### Step 4 — Run it

```bash
docker run --rm \
  -v /path/to/tests:/tests \
  mcr.microsoft.com/playwright:v1.52.0-jammy \
  bash -c "cd /tests && npm install && npx playwright test specs/my-feature.spec.js"
```

---

## Updating Tests When Code Changes

### ID or class name changed on a page

1. Open `lib/selectors.js`
2. Find the relevant namespace
3. Update the selector value
4. Re-run affected spec to verify

### New form field or button added

1. Add selector to `lib/selectors.js`
2. Add a test asserting the element is present and functional
3. If it changes a flow (e.g. new required step in character builder), update the full-flow test

### New page added

1. Create `specs/<page>.spec.js`
2. Add selectors to `lib/selectors.js` under a new namespace
3. Write: load test, element presence tests, happy-path interaction test
4. Add to `package.json` scripts if you want a named shortcut

### Feature removed or hidden

1. Delete or comment out tests that specifically exercise it
2. Remove its selectors from `lib/selectors.js`
3. Update this doc if the spec file is no longer needed

---

## Test Users

| User | Email | Password | Role |
|------|-------|----------|------|
| GM | `qc-gm@brackenroll.test` | `QCtest2026!` | GM of QC campaign |
| Player | `qc-player@brackenroll.test` | `QCtest2026!` | Player of QC campaign |

Both accounts have `display_name` set in `profiles` table to bypass the onboarding redirect.

QC Campaign ID: `a6762bff-15ea-4e13-a4f0-dc61b26cf37a`

---

## Gotchas

**character-builder.html has a roster view**
Page loads showing `#view-roster` (existing characters list). The actual builder form is in `#view-builder` (hidden). Always click `#btn-new-char` before filling form fields. Note: `#btn-new-char` also has class `.btn-next` — always use `#view-builder .step.active .btn-next` for step navigation, never bare `.btn-next`.

**Supabase data loads async**
Class cards, adversaries, homebrew items all fetch from Supabase after page load. Use `waitForCount(page, selector, n, 20000)` with a 20s timeout (default 10s is too short under load).

**Realtime panel updates need time**
Quick token drop, scene push, fear changes all update UI via Supabase Realtime subscription. Wait at least 5s after the triggering action before asserting panel state.

**nav.js injects `.site-nav`, not `#mainNav`**
The nav element has class `site-nav`. Use `SEL.NAV.root` (`.site-nav`) — never `#mainNav`.

**Homebrew browser is `homebrew.html`**
The URL is `/homebrew.html?campaign=...`, not `/homebrew-browser.html`.

**`#hubContent` and `#signinPrompt` use inline `style.display`**
Both divs are always in the DOM. Test visibility via `el.style.display` not element presence.

---

## Known Open Bugs (see `docs/QC_AUDIT_LOG.md`)

- H1–H3: XSS in character-builder and encounter-builder (open, not tested)
- M1: Loot homebrew filter inverted (open bug)
- M2: campaign.html unauthenticated redirect loses deep-link (open bug)
