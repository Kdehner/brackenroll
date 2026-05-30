-- ============================================================
-- Core tables
-- ============================================================

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

-- ============================================================
-- Table / Scene tables
-- ============================================================

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
  player_moveable boolean DEFAULT true
);

CREATE TABLE scene_tokens (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  scene_id uuid REFERENCES scenes(id),
  token_definition_id uuid REFERENCES token_definitions(id),
  x numeric,
  y numeric,
  visible boolean DEFAULT true
);

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
  x numeric,
  y numeric,
  created_at timestamptz DEFAULT now()
);

CREATE TABLE scene_parchments (
  scene_id uuid REFERENCES scenes(id),
  parchment_id uuid REFERENCES parchments(id),
  x numeric,
  y numeric,
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

-- ============================================================
-- Adversaries & Encounters
-- ============================================================

CREATE TABLE adversaries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id),
  name text NOT NULL,
  tier int CHECK (tier BETWEEN 1 AND 4),
  role text,
  lore text,
  difficulty int,
  thresholds jsonb,
  hp int,
  stress int,
  attack jsonb,
  features jsonb,
  experience jsonb,
  portrait_url text,
  current_version int NOT NULL DEFAULT 1,
  change_notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now()
);

CREATE TABLE adversary_versions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  adversary_id uuid REFERENCES adversaries(id) ON DELETE CASCADE,
  version_number int NOT NULL,
  data jsonb NOT NULL,
  change_notes text,
  created_by uuid REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  UNIQUE (adversary_id, version_number)
);

ALTER TABLE token_definitions
  ADD CONSTRAINT fk_token_custom_adversary
  FOREIGN KEY (custom_adversary_id) REFERENCES adversaries(id);

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
  custom_adversary_id uuid REFERENCES adversaries(id),
  label text NOT NULL,
  token_definition_id uuid REFERENCES token_definitions(id),
  sort_order int DEFAULT 0
);

-- ============================================================
-- Homebrew System
-- ============================================================

CREATE TABLE homebrew_content (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id uuid REFERENCES profiles(id),
  campaign_id uuid REFERENCES campaigns(id),
  CONSTRAINT one_scope CHECK (
    (owner_id IS NOT NULL AND campaign_id IS NULL) OR
    (owner_id IS NULL AND campaign_id IS NOT NULL)
  ),
  content_type text NOT NULL CHECK (content_type IN (
    'class', 'ancestry', 'community',
    'domain', 'domain_card',
    'weapon', 'armor',
    'loot_item',
    'campaign_frame', 'environment'
  )),
  name text NOT NULL,
  player_description text,
  notes text,
  image_url text,
  based_on_source text CHECK (based_on_source IN ('official', 'global', 'campaign')),
  based_on_id text,
  current_version int NOT NULL DEFAULT 1,
  update_policy text NOT NULL DEFAULT 'opt_in'
    CHECK (update_policy IN ('push', 'opt_in')),
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

-- ============================================================
-- Campaign Pages
-- ============================================================

CREATE TABLE campaign_pages (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  campaign_id uuid REFERENCES campaigns(id) ON DELETE CASCADE,
  title text NOT NULL,
  slug text NOT NULL,
  visibility text NOT NULL DEFAULT 'players'
    CHECK (visibility IN ('players', 'gm_only')),
  icon text,
  sort_order int DEFAULT 0,
  blocks jsonb NOT NULL DEFAULT '[]',
  created_by uuid NOT NULL REFERENCES profiles(id),
  created_at timestamptz DEFAULT now(),
  updated_at timestamptz DEFAULT now(),
  UNIQUE (campaign_id, slug)
);

-- ============================================================
-- Row Level Security
-- ============================================================

ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaigns ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE characters ENABLE ROW LEVEL SECURITY;
ALTER TABLE sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE assets ENABLE ROW LEVEL SECURITY;
ALTER TABLE scenes ENABLE ROW LEVEL SECURITY;
ALTER TABLE token_definitions ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_tokens ENABLE ROW LEVEL SECURITY;
ALTER TABLE parchments ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_parchments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_parchments ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_parchments ENABLE ROW LEVEL SECURITY;
ALTER TABLE adversaries ENABLE ROW LEVEL SECURITY;
ALTER TABLE adversary_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounters ENABLE ROW LEVEL SECURITY;
ALTER TABLE encounter_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_content ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_homebrew_refs ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_homebrew_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_shares ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_content_versions ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_pages ENABLE ROW LEVEL SECURITY;

-- profiles: anyone can read, own row only for writes
CREATE POLICY "profiles_select" ON profiles FOR SELECT USING (true);
CREATE POLICY "profiles_insert" ON profiles FOR INSERT WITH CHECK (auth.uid() = id);
CREATE POLICY "profiles_update" ON profiles FOR UPDATE USING (auth.uid() = id);

-- campaigns: readable by members, writable by GM
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT
  USING (id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "campaigns_insert" ON campaigns FOR INSERT
  WITH CHECK (gm_id = auth.uid());
CREATE POLICY "campaigns_update" ON campaigns FOR UPDATE
  USING (gm_id = auth.uid());

-- campaign_members: readable by members, insertable by anyone (invite flow)
CREATE POLICY "campaign_members_select" ON campaign_members FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "campaign_members_insert" ON campaign_members FOR INSERT
  WITH CHECK (user_id = auth.uid());

-- characters: readable by campaign members, writable by owner or GM
CREATE POLICY "characters_select" ON characters FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "characters_insert" ON characters FOR INSERT
  WITH CHECK (user_id = auth.uid());
CREATE POLICY "characters_update" ON characters FOR UPDATE
  USING (
    user_id = auth.uid() OR
    campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm')
  );

-- sessions: readable by members, writable by GM
CREATE POLICY "sessions_select" ON sessions FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "sessions_insert" ON sessions FOR INSERT
  WITH CHECK (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "sessions_update" ON sessions FOR UPDATE
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));

-- assets: readable by members, insertable by any member
CREATE POLICY "assets_select" ON assets FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "assets_insert" ON assets FOR INSERT
  WITH CHECK (
    user_id = auth.uid() AND
    campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  );

-- scenes: readable by members, writable by GM
CREATE POLICY "scenes_select" ON scenes FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "scenes_insert" ON scenes FOR INSERT
  WITH CHECK (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "scenes_update" ON scenes FOR UPDATE
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));

-- token_definitions: readable by members, writable by GM
CREATE POLICY "token_definitions_select" ON token_definitions FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "token_definitions_insert" ON token_definitions FOR INSERT
  WITH CHECK (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "token_definitions_update" ON token_definitions FOR UPDATE
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));

-- scene_tokens: readable by members, writable by GM
CREATE POLICY "scene_tokens_select" ON scene_tokens FOR SELECT
  USING (scene_id IN (
    SELECT s.id FROM scenes s
    JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE cm.user_id = auth.uid()
  ));
CREATE POLICY "scene_tokens_insert" ON scene_tokens FOR INSERT
  WITH CHECK (scene_id IN (
    SELECT s.id FROM scenes s
    JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE cm.user_id = auth.uid() AND cm.role = 'gm'
  ));
CREATE POLICY "scene_tokens_update" ON scene_tokens FOR UPDATE
  USING (scene_id IN (
    SELECT s.id FROM scenes s
    JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE cm.user_id = auth.uid() AND cm.role = 'gm'
  ));

-- adversaries: readable by members, writable by GM
CREATE POLICY "adversaries_select" ON adversaries FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "adversaries_insert" ON adversaries FOR INSERT
  WITH CHECK (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "adversaries_update" ON adversaries FOR UPDATE
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));

CREATE POLICY "adversary_versions_select" ON adversary_versions FOR SELECT
  USING (adversary_id IN (
    SELECT a.id FROM adversaries a
    JOIN campaign_members cm ON cm.campaign_id = a.campaign_id
    WHERE cm.user_id = auth.uid()
  ));
CREATE POLICY "adversary_versions_insert" ON adversary_versions FOR INSERT
  WITH CHECK (adversary_id IN (
    SELECT a.id FROM adversaries a
    JOIN campaign_members cm ON cm.campaign_id = a.campaign_id
    WHERE cm.user_id = auth.uid() AND cm.role = 'gm'
  ));

-- encounters: readable by members, writable by GM
CREATE POLICY "encounters_select" ON encounters FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "encounters_insert" ON encounters FOR INSERT
  WITH CHECK (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "encounters_update" ON encounters FOR UPDATE
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));

CREATE POLICY "encounter_entries_select" ON encounter_entries FOR SELECT
  USING (encounter_id IN (
    SELECT e.id FROM encounters e
    JOIN campaign_members cm ON cm.campaign_id = e.campaign_id
    WHERE cm.user_id = auth.uid()
  ));
CREATE POLICY "encounter_entries_insert" ON encounter_entries FOR INSERT
  WITH CHECK (encounter_id IN (
    SELECT e.id FROM encounters e
    JOIN campaign_members cm ON cm.campaign_id = e.campaign_id
    WHERE cm.user_id = auth.uid() AND cm.role = 'gm'
  ));
CREATE POLICY "encounter_entries_update" ON encounter_entries FOR UPDATE
  USING (encounter_id IN (
    SELECT e.id FROM encounters e
    JOIN campaign_members cm ON cm.campaign_id = e.campaign_id
    WHERE cm.user_id = auth.uid() AND cm.role = 'gm'
  ));

-- homebrew_content: readable by owner or campaign members
CREATE POLICY "homebrew_content_select" ON homebrew_content FOR SELECT
  USING (
    owner_id = auth.uid() OR
    campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  );
CREATE POLICY "homebrew_content_insert" ON homebrew_content FOR INSERT
  WITH CHECK (created_by = auth.uid());
CREATE POLICY "homebrew_content_update" ON homebrew_content FOR UPDATE
  USING (created_by = auth.uid());

CREATE POLICY "homebrew_versions_select" ON homebrew_versions FOR SELECT
  USING (homebrew_content_id IN (
    SELECT id FROM homebrew_content WHERE owner_id = auth.uid() OR
    campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  ));
CREATE POLICY "homebrew_versions_insert" ON homebrew_versions FOR INSERT
  WITH CHECK (homebrew_content_id IN (
    SELECT id FROM homebrew_content WHERE created_by = auth.uid()
  ));

CREATE POLICY "character_homebrew_refs_select" ON character_homebrew_refs FOR SELECT
  USING (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));
CREATE POLICY "character_homebrew_refs_insert" ON character_homebrew_refs FOR INSERT
  WITH CHECK (character_id IN (SELECT id FROM characters WHERE user_id = auth.uid()));

CREATE POLICY "campaign_homebrew_imports_select" ON campaign_homebrew_imports FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "campaign_homebrew_imports_insert" ON campaign_homebrew_imports FOR INSERT
  WITH CHECK (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));

CREATE POLICY "homebrew_shares_select" ON homebrew_shares FOR SELECT
  USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
CREATE POLICY "homebrew_shares_insert" ON homebrew_shares FOR INSERT
  WITH CHECK (from_user_id = auth.uid());

CREATE POLICY "official_content_versions_select" ON official_content_versions FOR SELECT USING (true);

-- parchments: readable by members, writable by GM
CREATE POLICY "parchments_select" ON parchments FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "parchments_insert" ON parchments FOR INSERT
  WITH CHECK (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "parchments_update" ON parchments FOR UPDATE
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));

CREATE POLICY "active_parchments_select" ON active_parchments FOR SELECT
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid()));
CREATE POLICY "active_parchments_insert" ON active_parchments FOR INSERT
  WITH CHECK (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));

CREATE POLICY "scene_parchments_select" ON scene_parchments FOR SELECT
  USING (scene_id IN (
    SELECT s.id FROM scenes s
    JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE cm.user_id = auth.uid()
  ));

CREATE POLICY "player_parchments_select" ON player_parchments FOR SELECT
  USING (player_id = auth.uid());

-- campaign_pages: players see player-visible pages, GMs see all
CREATE POLICY "campaign_pages_select" ON campaign_pages FOR SELECT
  USING (
    campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
    AND (
      visibility = 'players' OR
      campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm')
    )
  );
CREATE POLICY "campaign_pages_insert" ON campaign_pages FOR INSERT
  WITH CHECK (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));
CREATE POLICY "campaign_pages_update" ON campaign_pages FOR UPDATE
  USING (campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid() AND role = 'gm'));
