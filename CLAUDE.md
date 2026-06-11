# Brackenroll VTT — Claude Context

## Who You Are

Act as a **coding wizard who also knows everything about Daggerheart**. Both roles equally — expert developer AND expert in the game's rules, mechanics, classes, adversaries, lore, and design intent.

---

## How We Work

- **Planning-first, always.** Never write code without an explicit go-ahead. "Let's do X" is not a go-ahead. "Go ahead" / "build it" / "do it" is.
- **Kevbot does not write code.** Claude writes all code. Kevbot drives product direction.
- **No assumptions.** Before implementing anything, verify against current docs (MDN, Konva.js docs, Supabase docs, Cloudflare docs, Daggerheart MCP tools).
- **No unnecessary automation in GM tools.** Tools help the GM track things — they don't make decisions or enforce rules. If a feature could auto-do something, suggest it before building it in.
- **Log significant decisions.** Update memory when things change.
- **No self-hosting ever.** Fully managed/hosted services only. Stay on free tiers during dev.
- **Tests travel with features.** Any feature add or change must include a test update. New page → new spec. Changed selector/ID → update `tests/lib/selectors.js`. Changed flow → update the relevant spec. See the Test Suite section below.

---

## Project Layout

### Folder names are counterintuitive — do not judge by name:

| Folder | Role | URL |
|---|---|---|
| `/home/kevbot/projects/brackenroll-dev` | **DEV** — all active work happens here | `devverheart.fwbgaming.win` |
| `/home/kevbot/projects/daggerheart-player` | **LIVE** — what players actually use | `daggerheart.fwbgaming.win` |
| `/home/kevbot/projects/daggerheart-resources` | GM reference site + data source | `dhgm.kevbot.app` |

Both brackenroll-dev and daggerheart-player mount `/home/kevbot/projects/daggerheart-resources/data/` for static game data (nginx volume mount — daggerheart-resources container must be running).

### Git

**Repo:** `Kdehner/brackenroll.git`
**Dev branch:** `dev` (all active work)
**Live branch:** `main`

brackenroll-dev → `dev` branch → `devverheart.fwbgaming.win`
daggerheart-player → `main` branch → `daggerheart.fwbgaming.win`

**To deploy dev → live:**
```bash
# In daggerheart-player directory
git fetch origin && git merge origin/dev && git push origin main
```

`firebase-init.js` and `docker-compose.yml` are gitignored — each clone keeps its own copy.

### VPS / Infra
- Ubuntu 24.04 LTS, 2 vCPU, 7.8GB RAM
- Everything runs in Docker — no local services on host
- Traefik v2.11 reverse proxy (v3.3 had Docker API incompatibility)
- Cloudflare DNS + Full Strict SSL
- Tailscale access: `100.93.68.20`
- Run docker without sudo (kevbot is in docker group)

---

## Tech Stack

- **Auth + live data:** Supabase (Postgres + Realtime Broadcast + postgres_changes)
- **Asset storage:** Cloudflare R2 via Supabase Edge Function (`get-upload-url`)
- **Canvas/tokens:** Konva.js v9
- **Dice:** @3d-dice/dice-box v1.1.4 (WebGL physics, served from `/assets/dice-box/assets/`)
- **Frontend:** Vanilla JS ES modules, no build pipeline
- **Static data:** JSON files served via nginx, mounted from `daggerheart-resources/data/`
- **Firebase:** FULLY DECOMMISSIONED — everything is on Supabase

**Supabase Projects:**
- Dev: `brackenroll-dev`
- Live: `brackenroll`

---

## Pages

- `index.html` — Campaign hub home
- `signin.html` — Centralized auth (reads `?redirect=` param)
- `primer.html` — The World (5 tabs)
- `handbook.html` — Player Handbook (7 tabs)
- `character-builder.html` — Character roster + builder wizard
- `character-sheet.html` — Full character sheet
- `characters.html` — Session Zero questions
- `table.html` — VTT canvas (Konva.js, scenes, tokens, dice, GM panels)
- `join.html` — Invite code flow
- `campaign.html` — Campaign hub (promo when no `?id=`)
- `profile.html` — User profile, avatar color, dice theme prefs
- `panel-clocks.html` — Countdown Clocks panel (pop-out via BroadcastChannel)
- `panel-fear.html` — Fear Tracker panel (pop-out)
- `factions.html` — Static Verdant Curse faction reference (personal campaign, no auth, not linked)
- `conditions.html` — Static Verdant Curse conditions reference (personal campaign, no auth, not linked)

**Nav system:** `nav.js` injects nav HTML on every page. Nav changes go in `nav.js` only — never hardcode nav HTML in a page.

---

## V3 Build Status

### COMPLETE ✅
- **Phase 1 — Supabase + R2 Migration:** Full Supabase client, Google/Discord/email auth, RLS with `SECURITY DEFINER get_my_campaign_ids()`, character save/load (Supabase UUID), campaign create/join via invite, GM/Players sections, read-only GM view of player sheets, profile page, onboarding guard, universal nav, session rooms.
- **Un-authed site:** `signin.html` centralized auth, all pages have sign-in prompts, OAuth sessionStorage redirect, marketing copy on index/campaign/character-builder.
- **Phase 2 — Table Core:** Panel shell (draggable, pop-out via BroadcastChannel, localStorage positions), Fear Tracker panel, Countdown Clocks panel, scene switching (GM private + push to players), Supabase Realtime swap on canvas.
- **Phase 3 — Dice Roller:** dice-box v1.1.4 on canvas, HOPE/FEAR duality button, solo Hope/Fear single-die buttons, d4–d20 buttons, Supabase Broadcast roll sync (`self:true`), roll attribution overlay, profile theme picker (Standard/Hope/Fear → `profiles.dice_prefs`), 12s auto-clear.
- **Phase 4 — Token System:** `token_definitions` + `scene_tokens`, character tokens auto-created on GM boot, generic token quick-add popover, Tokens panel, token context menu (rename/hide/lock/remove), global movement lock (`sessions.player_move_locked`), per-token lock (`token_definitions.player_moveable`), optimistic UI deletes, token color column, Spawn PCs button, player-moveable RLS policy, cascade deletes on scene/token removal.
- **Phase 5 — Encounters:** Homebrew adversary editor (`adversary-editor.html`) with portrait upload, version history, "From Template…" picker (official + homebrew tabs, tier filter, live search). Encounter builder (`encounter-builder.html`) with A/B/C auto-labeling, token pre-creation, adversary picker panel, encounter runner panel (Browse + Live modes, HP tracking, bloodied at 50%, defeated), loot roller integrated + loot_results saved to DB.
- **Phase 6 — Loot Generator:** `loot-roller.js` shared module, `loot-generator.html` standalone page, Loot panel in `table.html` (draggable, pop-outable to `panel-loot.html`), loot roller in encounter builder with fire-and-forget save to `encounters.loot_results` (migration applied 2026-05-29).
- **Phase 7 — Fog of War:** Fog layer (Konva.js, `destination-out` composite on cached group), circle/rect/brush/erase tools, brush size slider, brush cursor ring (Konva.Circle, `cursor:none`), Escape key cancels in-progress draw, GM at 45% opacity / players at 90%, Supabase Broadcast for live sync, `scenes.fog_state` jsonb persistence, pop-out `panel-fog.html` (toggle/reveal-all/reset via BroadcastChannel).
- **Phase 8 — Parchments:** `parchment-draw.js` shared drawing engine (ParchmentDraw class, PointerEvent + Apple Pencil, pressure, bezier-smooth strokes, pen/eraser, parchment/blank backgrounds). Active parchment floating overlays on table (HTML canvas, draggable, multi-user simultaneous drawing). Real-time stroke broadcast via `parchment_stroke` event. Debounced save to `active_parchments`. GM parchments library panel + pop-out `panel-parchments.html`. `parchment-editor.html` for desktop text/image creation. `companion.html` iPad companion (Draw tab / Live Table tab / Inbox tab). Player received-parchment toast + lightbox viewer. RLS migration on all four parchment tables.
- **Phase 9 — Homebrew System:** `homebrew.html` library browser (type filter, search, delete). `homebrew-editor.html` type-specific editor with version history sidebar — mirrors adversary editor pattern. Phase 9 types: weapon, armor, loot_item, domain_card, ancestry, community. Common fields: name, player_description, GM notes, image upload. Type fields: weapon (trait/category/range/damage_dice/burden/features/rarity), armor (base_score/armor_slots/features/rarity), loot_item (rarity/value/consumable/effect), domain_card (domain/level/recall_cost/card_type/effect/remembrance), ancestry/community (repeating feature pairs). RLS on all six homebrew tables (two migrations — 20260529150000 + 20260529151000). `loot-roller.js` extended with `rollOneWithHomebrew`, `rollSetWithHomebrew`, `pickHomebrew`. Loot panel (table.html) + `loot-generator.html` both get homebrew toggle (include in random rolls) and "Pick Item" hand-picker. Campaign.html links to Homebrew in GM tools.
- **Phase 10 — Campaign Pages:** `primer.html` rewritten as dynamic viewer (GM-authored world lore). `page-editor.html` new GM editor. Block types: prose, heading, callout (info/warning/quote/flavor), list, card_grid (2 or 3 col), image. RLS: players see `visibility='players'` pages only; GMs see all and can CRUD. `supabase-client.js` extended with `getCampaignPages`, `saveCampaignPage`, `deleteCampaignPage`, `reorderCampaignPages`. `campaign.html` updated: "World Pages" in GM Tools, "The World" resource link for all members.
- **Phase 11 — Class, Domain & Adversary Homebrew:** Added `class`, `domain`, and `adversary` content types to homebrew system. Class editor: starting HP/evasion, spellcast trait, class items, 2 domains (dedup-enforced), hope feature, 2 subclasses with foundation/specialization/mastery tiers, repeating class features. Domain editor: name + flavour text. Domain card picker updated to include campaign homebrew domains. `adversaries` and `adversary_versions` tables migrated into `homebrew_content` + `homebrew_versions` — `getAdversaries`/`saveAdversary`/`deleteAdversary` in `supabase-client.js` now delegate to homebrew functions. `adversary-editor.html` updated: `portrait_url` → `image_url`, `?id=` deeplink support for direct edit from homebrew browser. `homebrew.html` lists adversaries alongside all other content types.

- **Phase 12 — Global Homebrew + Sharing:** `library.html` (personal library browser + share modal), `homebrew-editor.html` + `adversary-editor.html` support `?scope=global`, campaign `homebrew.html` gets "Import from Library" (GM only), `profile.html` gets Pending Shares section. `saveHomebrew` supports `owner_id` scope. Edge function handles global uploads (`global/{uid}/...`). RLS extended for global scope, `campaign_homebrew_imports`, and `homebrew_shares`. Two new SECURITY DEFINER helpers: `find_profile_by_email`, `get_my_gm_campaign_ids`.

### Remaining Work
- **Orphan pages:** `factions.html` + `conditions.html` — static Verdant Curse campaign reference pages, no auth, not linked anywhere. Handle manually when needed.
- **V4** — UI/UX rebuild pass once all V3 functionality confirmed.

**Dependency graph:**
```
Phase 1 (Supabase) ──┬──> Phase 2 (Table) ──> Phase 4 (Tokens) ──> Phase 5 (Encounters)
                     │                    └──> Phase 7 (Fog)
                     │                    └──> Phase 8 (Parchments)
                     ├──> Phase 3 (Dice)        [independent]
                     ├──> Phase 6 (Loot)        [independent]
                     ├──> Phase 9 (Homebrew)    [independent]
                     └──> Phase 10 (Pages)      [independent]
```

**V3 versioning philosophy:** Build full feature set first (Phases 5–10). V4 will be a focused UI/UX rebuild pass once all functionality is in place. Don't polish things that might still change shape.

---

## Supabase Schema (Canonical)

Audited 2026-05-17. Includes all migrations through Phase 4.

```sql
-- Core
CREATE TABLE profiles (
  id uuid PRIMARY KEY REFERENCES auth.users,
  display_name text,
  avatar_color text,
  dice_prefs jsonb DEFAULT '{"standard_theme":"smooth","hope_theme":"gemstone","fear_theme":"rust"}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE campaigns (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  name text NOT NULL,
  gm_id uuid REFERENCES profiles(id),
  invite_code text UNIQUE NOT NULL,
  description text,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE campaign_members (
  campaign_id uuid REFERENCES campaigns(id),
  user_id uuid REFERENCES profiles(id),
  role text CHECK (role IN ('gm', 'player')),
  joined_at timestamptz DEFAULT now(),
  PRIMARY KEY (campaign_id, user_id)
);

CREATE TABLE characters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  campaign_id uuid REFERENCES campaigns(id),
  sheet_state jsonb NOT NULL DEFAULT '{}',
  updated_at timestamptz DEFAULT now()
);

-- gm_state stores Fear, Clocks, Encounter Runner live state
-- player_move_locked is the global token movement lock
CREATE TABLE sessions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  is_active boolean DEFAULT false,
  player_move_locked boolean DEFAULT false,
  gm_state jsonb DEFAULT '{}',
  created_at timestamptz DEFAULT now()
);

CREATE TABLE assets (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id uuid REFERENCES profiles(id),
  campaign_id uuid REFERENCES campaigns(id),
  type text CHECK (type IN ('map', 'token', 'image', 'portrait')),
  name text NOT NULL,
  r2_key text NOT NULL,
  public_url text NOT NULL,
  size_bytes bigint,
  storage_class text DEFAULT 'standard',
  created_at timestamptz DEFAULT now()
);

-- Table / Scene
CREATE TABLE scenes (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  name text,
  background text,
  grid boolean DEFAULT false,
  fog_state jsonb,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE token_definitions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  label text,
  image_url text,
  owner_id uuid REFERENCES profiles(id),
  token_type text CHECK (token_type IN ('character', 'adversary', 'generic')) DEFAULT 'generic',
  character_id uuid REFERENCES characters(id),
  adversary_id text,
  custom_adversary_id uuid,
  player_moveable boolean DEFAULT true,
  color text
);

CREATE TABLE scene_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid REFERENCES scenes(id) ON DELETE CASCADE,
  token_definition_id uuid REFERENCES token_definitions(id) ON DELETE CASCADE,
  x numeric, y numeric,
  visible boolean DEFAULT true,
  UNIQUE (scene_id, token_definition_id)
);

-- Adversaries are stored in homebrew_content (content_type='adversary') since Phase 11.
-- data jsonb shape: { tier, role, lore, difficulty, thresholds, hp, stress, attack, features, experience }
-- image_url holds the portrait. Version history in homebrew_versions.
-- token_definitions.custom_adversary_id and encounter_entries.custom_adversary_id
-- both reference homebrew_content(id) via fk_token_custom_adversary constraint.

CREATE TABLE encounters (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  name text NOT NULL,
  scene_id uuid REFERENCES scenes(id),
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE encounter_entries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  encounter_id uuid REFERENCES encounters(id) ON DELETE CASCADE,
  adversary_id text,
  custom_adversary_id uuid REFERENCES homebrew_content(id),
  label text NOT NULL,
  token_definition_id uuid REFERENCES token_definitions(id),
  sort_order int DEFAULT 0
);

-- Parchments (Phase 8 — schema ready, UI not built)
CREATE TABLE parchments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  name text,
  canvas_data jsonb,
  thumbnail text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE active_parchments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  session_id uuid REFERENCES sessions(id),
  campaign_id uuid REFERENCES campaigns(id),
  canvas_data jsonb,
  label text,
  created_by uuid REFERENCES profiles(id),
  scene_id uuid REFERENCES scenes(id),
  z_layer text DEFAULT 'overlay',
  x numeric, y numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE scene_parchments (
  scene_id uuid REFERENCES scenes(id),
  parchment_id uuid REFERENCES parchments(id),
  x numeric, y numeric,
  z_layer text,
  PRIMARY KEY (scene_id, parchment_id)
);

CREATE TABLE player_parchments (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  parchment_id uuid REFERENCES parchments(id),
  player_id uuid REFERENCES profiles(id),
  character_id uuid REFERENCES characters(id),
  context_note text,
  received_at timestamptz
);

-- Homebrew (Phase 9 — schema ready, UI not built)
CREATE TABLE homebrew_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id),
  campaign_id uuid REFERENCES campaigns(id),
  CONSTRAINT one_scope CHECK (
    (owner_id IS NOT NULL AND campaign_id IS NULL) OR
    (owner_id IS NULL AND campaign_id IS NOT NULL)
  ),
  content_type text NOT NULL CHECK (content_type IN (
    'class','ancestry','community','domain','domain_card',
    'weapon','armor','loot_item','campaign_frame','environment','adversary'
  )),
  name text NOT NULL,
  player_description text,
  notes text,
  image_url text,
  based_on_source text CHECK (based_on_source IN ('official','global','campaign')),
  based_on_id text,
  current_version int NOT NULL DEFAULT 1,
  update_policy text NOT NULL DEFAULT 'opt_in' CHECK (update_policy IN ('push','opt_in')),
  data jsonb NOT NULL DEFAULT '{}',
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now()
);

CREATE TABLE homebrew_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  homebrew_content_id uuid REFERENCES homebrew_content(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  data jsonb NOT NULL,
  player_description text,
  change_notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (homebrew_content_id, version_number)
);

CREATE TABLE character_homebrew_refs (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  character_id uuid REFERENCES characters(id) ON DELETE CASCADE,
  homebrew_content_id uuid REFERENCES homebrew_content(id),
  field text NOT NULL,
  version_pinned int NOT NULL,
  created_at timestamptz DEFAULT now(),
  UNIQUE (character_id, field)
);

CREATE TABLE campaign_homebrew_imports (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  homebrew_content_id uuid REFERENCES homebrew_content(id),
  added_by uuid REFERENCES profiles(id),
  added_at timestamptz DEFAULT now(),
  UNIQUE (campaign_id, homebrew_content_id)
);

CREATE TABLE homebrew_shares (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id uuid REFERENCES profiles(id),
  to_user_id uuid REFERENCES profiles(id),
  homebrew_content_id uuid REFERENCES homebrew_content(id),
  message text,
  shared_at timestamptz DEFAULT now(),
  accepted_at timestamptz
);

CREATE TABLE official_content_versions (
  content_type text,
  content_id text,
  version_number int NOT NULL DEFAULT 1,
  change_notes text,
  updated_at timestamptz DEFAULT now(),
  PRIMARY KEY (content_type, content_id)
);

-- Campaign Pages (Phase 10 — schema ready, UI not built)
CREATE TABLE campaign_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  visibility text NOT NULL DEFAULT 'players' CHECK (visibility IN ('players','gm_only')),
  icon text,
  sort_order int DEFAULT 0,
  blocks jsonb NOT NULL DEFAULT '[]',
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (campaign_id, slug)
);
```

### sessions.gm_state Shape

```json
{
  "fear": 0,
  "clocks": [
    { "id": "uuid", "name": "Rising Flood", "segments": 6, "filled": 2, "visible": false }
  ],
  "encounter": {
    "encounter_id": "uuid",
    "name": "Ambush at the Mill",
    "loaded_at": "ISO timestamp",
    "entries": [
      {
        "encounter_entry_id": "uuid",
        "label": "Zombie A",
        "adversary_id": "zombie",
        "custom_adversary_id": null,
        "token_definition_id": "uuid",
        "hp_max": 5,
        "hp_current": 5,
        "conditions": [],
        "defeated": false,
        "bloodied": false
      }
    ]
  }
}
```

---

## sheetState Schema

```js
{
  hp, stress, hope, armor,
  goldHandfuls, goldBags, goldChest,
  extraInventory, proficiency,
  loot, fixedInv, learnedCards,
  cardLocations, cardState,
  personalHistory, inventoryWeapons, inventoryArmor,
  level, extraHp, extraStress, evasionBonus,
  thresholdBonus, traitBonuses, traitMarks,
  multiclasses, tierSlots, experiences,
  scars, conditions,
}
```

---

## Cloudflare R2 Asset Flow

1. Client requests presigned upload URL from Supabase Edge Function
2. Edge Function validates Supabase JWT (authenticated + campaign member)
3. Edge Function calls Cloudflare Worker → generates R2 presigned PUT URL
4. Client uploads file directly to R2 via presigned URL
5. Client sends public URL + metadata to `assets` table
- Content-hash filenames (never overwrite, new upload = new URL)
- `Cache-Control: max-age=31536000` on static assets

---

## Daggerheart Data Sources

**Check in this order:**
1. `dh_*` MCP tools — fastest, pre-extracted
2. Source JSON at `daggerheart-resources/data/base/` — adversaries, classes, domain-cards, weapons, armor, ancestries, communities, environments, loot, mechanics, campaign-frames, handbook
3. PDFs at `daggerheart/pdfs/Rules/` — cut by chapter (Ch01: Classes/Domains, Ch02: Playing, Ch03: Running, Ch04: Adversaries, Ch05: Campaign Frames, Ch06: Appendix)
4. Errata PDF — check when rules seem off

**Data accuracy protocol:** If data is wrong, fix source JSON first, then update MCP data. Source JSON is single source of truth.

**Data quality status (as of 2026-05-08):**
- ✅ adversaries.json — ligatures cleaned, thresholds normalized, dupes removed
- ✅ classes.json — all 9 classes with correct startingHp + startingEvasion
- ✅ environments.json — rebuilt from PDF, all 19 have features
- ✅ loot.json — rarity field added, consumable descriptions fixed
- ✅ domain-cards.json — 184 cards across 9 domains
- ✅ ancestries, communities — verified clean
- ✅ armor.json — fully rebuilt 2026-05-08, 34 pieces
- ✅ weapons.json — fully rebuilt 2026-05-08, 204 weapons
- ⚠️ classes — subclass features stored as flat strings, not structured (functional but not ideal)
- ⚠️ campaign-frames — structure not fully verified against PDF

---

## The Campaign: The Verdant Curse

A reskin of the official "Witherwild" campaign frame to prevent player meta-gaming.

**Status:** Pre-Session 0 (design complete). No sessions played yet.

### Name Registry (Custom → Official)

| Custom | Original | Role |
|---|---|---|
| Verdanya | Fanewick | Forest nation |
| Ironhold | Haven | Walled city invader |
| Briarcrest | Thornhaven | Hub village |
| Highroot | Alula | Treetop rebel base |
| Fort Ashvale | Fort Greythorn | Flower fields garrison |
| Varen Grimm | Kreil Dirn | Spymaster (quest giver) |
| The Thornwraith | The Fanewraith | Rebel leader title |
| Elara Thornheart | Sylvara Nightbloom | Rebel leader real name |
| Nessa Bramwell | Mira Ashfield | Double agent baker |
| Sergeant Daven Greymark | Halrik Dust-Cough | Garrison commander |
| Elder Rowan Knotwise | Elder Brynn | Village leader |
| Kael Ashborn | Henrick Voss | Deserter |
| Briar | Talon | Thornwraith's lieutenant (Drakona) |
| Sylora, The Verdant Sovereign | Nikta | Goddess of seasons |
| Sylora's Winter Eye | Reaping Eye | Stolen artifact |
| Sylora's Spring Eye | Sowing Eye | Thornwraith's target |
| Ashlung | Serpent's Sickness | Stone plague |
| The Verdant Curse | The Witherwild | Forest corruption |
| Mourning Rose | Crimson Lady's Veil | Cure flower |
| Verdant-Born | Withered | Transformed creatures |
| Thorn-and-Rose Badges | Crimson Sashes | Rebel symbol |

### Crisis Setup
- 6 months ago: Ironhold invaded Verdanya, stole Sylora's Winter Eye
- Endless spring → Verdant Curse spreads
- Ironhold: Ashlung turning citizens to stone; cure = Mourning Roses (grow in Verdanya)
- Both nations dying simultaneously

### The Three Paths
1. Help Thornwraith steal Spring Eye → Verdant Curse ends, endless winter (mass starvation)
2. Stop Thornwraith, return her to Varen → Ironhold wins, Verdant Curse continues
3. **(True Ending)** Recover Winter Eye from Ironhold vault, return BOTH eyes to Sylora → balance restored

### Key NPCs
- **Varen Grimm** — Quest giver, dying of Ashlung, ruthlessly practical
- **Elara Thornheart/Thornwraith** — Main antagonist/potential ally, Verdant-Born
- **Nessa Bramwell** — ⚠️ DOUBLE AGENT. Pretends to be Varen's informant, actually rebel intel officer. Bakery with secret tunnel. 70% truth / 30% misdirection.
- **Sergeant Daven Greymark** — Garrison commander, dying of Ashlung, sympathetic to Verdanya
- **Elder Rowan Knotwise** — Ancient Fungril druid, maintains failing thorn wall (~2 weeks until collapse)
- **Briar** — Drakona scout, Thornwraith's lieutenant, "antlered thief" from Fort Ashvale
- **Kael Ashborn** — Deserter, partially Verdant-Born, saved by rebels, conflicted

### Mechanics
- **Verdant Corruption tokens:** Severe damage from Verdant-Born = 1 token; roll Fear die, if ≤ tokens = permanent transformation
- **Week-long day/night cycles:** 8+ hour sunrises/sunsets

### Session Outline
- Session 0: Character creation, Player Primer, world-building
- Session 1: Varen's briefing, travel to Briarcrest, Verdant Wolves attack, choose first lead
- Sessions 2-3: Investigation (Nessa/Kael/archives/Fort Ashvale)
- Sessions 4-5: Journey north through Verdant Curse to Highroot
- Sessions 6-7: Highroot politics, meet Briar, discover Spring Eye plan, meet Elara (3-day decision)
- Sessions 8+: Path 1/2/3 plays out

---

## Dice Roller Implementation Notes

- `gemstone` theme excluded from pickers — non-standard gem mesh (looks like a cylinder for d12)
- `default` is the Hope die default
- Broadcast channel uses `{ config: { broadcast: { self: true } } }` so roller's own rolls appear in the feed
- `diceBox.clear()` called at start of each new roll (prevents accumulation)
- Auto-clear after 12s via `scheduleDiceClear()` in `handleRollComplete`
- Physics tuned for clustering: `throwForce:3`, `spinForce:2`, `linearDamping:0.6`, `angularDamping:0.6`
- Solo Hope/Fear buttons roll 1d12 with the player's themed die (logged as `standard` roll type)

---

## Test Suite

Full Playwright E2E suite in `tests/`. 91 tests across 9 spec files. Runs in Docker (no local Playwright install needed). See `docs/TESTING.md` for full architecture.

### Run commands
```bash
# Full suite
docker run --rm \
  -v /home/kevbot/projects/brackenroll-dev/tests:/tests \
  mcr.microsoft.com/playwright:v1.52.0-jammy \
  bash -c "cd /tests && npm install && npx playwright test"

# Single spec
docker run --rm \
  -v /home/kevbot/projects/brackenroll-dev/tests:/tests \
  mcr.microsoft.com/playwright:v1.52.0-jammy \
  bash -c "cd /tests && npm install && npx playwright test specs/table.spec.js"
```

### Mandatory test checklist (do this every feature/fix)

| Change type | Required test action |
|---|---|
| New page added | Create `specs/<page>.spec.js`, add selectors to `lib/selectors.js` |
| New UI element (button, input, panel) | Add selector to `lib/selectors.js`, add assertion in relevant spec |
| Existing element renamed/moved | Update selector in `lib/selectors.js` — all tests inherit the fix |
| New user flow (multi-step) | Add a flow test in the relevant spec |
| Flow changed (steps reordered, new step) | Update the flow test in the relevant spec |
| Feature removed | Delete its tests and selectors |

### Which spec owns what

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

### Key gotchas learned from QC

- **character-builder**: Page loads in roster view (`#view-roster`). Must click `#btn-new-char` before interacting with form fields. `#btn-new-char` also has class `.btn-next` — always scope next/back clicks to `#view-builder .step.active .btn-next/back`.
- **Supabase data fetches**: Class cards load async from Supabase. Use `waitForCount(page, selector, n, 20000)` (20s timeout) not the default 10s.
- **Realtime events**: Quick token drop updates tokens panel via Supabase Realtime — wait at least 5s after the action before checking panel state.
- **All selectors in one place**: `tests/lib/selectors.js`. Never hardcode selectors in spec files.

---

## Key Architectural Decisions

- **RLS recursive loop fix:** `get_my_campaign_ids()` function with `SECURITY DEFINER` — never query `campaign_members` directly in RLS policies
- **session_tokens table REMOVED** — replaced by `token_definitions` + `scene_tokens`
- **All live GM state** (Fear, Clocks, Encounter Runner) lives in `sessions.gm_state`, NOT in `scenes`
- **Realtime:** Broadcast for token drag (ephemeral), postgres_changes for persisted state
- **Token drag:** `mousemove` → Broadcast; `dragend` → write to `scene_tokens`
- **Content-hash filenames** for R2 assets — never overwrite, old cache stays valid
- **`freshState()` in character builder** does NOT generate custom IDs — Supabase assigns UUID on insert
- **OAuth flow:** stores redirect in sessionStorage; `onAuthChange` picks it up on return
- **SvelteKit migration deferred** — stay vanilla JS for all active dev, evaluate later
