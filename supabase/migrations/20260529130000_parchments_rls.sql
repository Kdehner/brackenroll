-- Phase 8: Enable RLS on parchment tables and add campaign-member policies

ALTER TABLE parchments        ENABLE ROW LEVEL SECURITY;
ALTER TABLE active_parchments ENABLE ROW LEVEL SECURITY;
ALTER TABLE scene_parchments  ENABLE ROW LEVEL SECURITY;
ALTER TABLE player_parchments ENABLE ROW LEVEL SECURITY;

-- ── parchments ────────────────────────────────────────────────────────────────

CREATE POLICY "campaign members can select parchments"
  ON parchments FOR SELECT
  USING (campaign_id IN (SELECT get_my_campaign_ids()));

CREATE POLICY "campaign members can insert parchments"
  ON parchments FOR INSERT
  WITH CHECK (campaign_id IN (SELECT get_my_campaign_ids()));

CREATE POLICY "campaign members can update parchments"
  ON parchments FOR UPDATE
  USING  (campaign_id IN (SELECT get_my_campaign_ids()))
  WITH CHECK (campaign_id IN (SELECT get_my_campaign_ids()));

CREATE POLICY "campaign members can delete parchments"
  ON parchments FOR DELETE
  USING (campaign_id IN (SELECT get_my_campaign_ids()));

-- ── active_parchments ─────────────────────────────────────────────────────────
-- Any campaign member (GM or player) can open, draw on, and close active parchments.

CREATE POLICY "campaign members can manage active parchments"
  ON active_parchments FOR ALL
  USING  (campaign_id IN (SELECT get_my_campaign_ids()))
  WITH CHECK (campaign_id IN (SELECT get_my_campaign_ids()));

-- ── scene_parchments ──────────────────────────────────────────────────────────

CREATE POLICY "campaign members can manage scene parchments"
  ON scene_parchments FOR ALL
  USING (
    scene_id IN (
      SELECT id FROM scenes WHERE campaign_id IN (SELECT get_my_campaign_ids())
    )
  );

-- ── player_parchments ─────────────────────────────────────────────────────────
-- Players see their own inbox; any campaign member can create send records.

CREATE POLICY "players can select their own parchments"
  ON player_parchments FOR SELECT
  USING (
    player_id = auth.uid()
    OR parchment_id IN (
      SELECT id FROM parchments WHERE campaign_id IN (SELECT get_my_campaign_ids())
    )
  );

CREATE POLICY "campaign members can send parchments to players"
  ON player_parchments FOR INSERT
  WITH CHECK (
    parchment_id IN (
      SELECT id FROM parchments WHERE campaign_id IN (SELECT get_my_campaign_ids())
    )
  );

CREATE POLICY "campaign members can delete player parchments"
  ON player_parchments FOR DELETE
  USING (
    parchment_id IN (
      SELECT id FROM parchments WHERE campaign_id IN (SELECT get_my_campaign_ids())
    )
  );
