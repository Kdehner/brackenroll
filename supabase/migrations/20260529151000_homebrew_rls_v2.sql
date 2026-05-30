-- Phase 9: Homebrew RLS — fresh apply (prior migration was a no-op due to repair)

ALTER TABLE homebrew_content          ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_versions         ENABLE ROW LEVEL SECURITY;
ALTER TABLE character_homebrew_refs   ENABLE ROW LEVEL SECURITY;
ALTER TABLE campaign_homebrew_imports ENABLE ROW LEVEL SECURITY;
ALTER TABLE homebrew_shares           ENABLE ROW LEVEL SECURITY;
ALTER TABLE official_content_versions ENABLE ROW LEVEL SECURITY;

-- homebrew_content
DROP POLICY IF EXISTS "homebrew_content_select" ON homebrew_content;
DROP POLICY IF EXISTS "homebrew_content_insert" ON homebrew_content;
DROP POLICY IF EXISTS "homebrew_content_update" ON homebrew_content;
DROP POLICY IF EXISTS "homebrew_content_delete" ON homebrew_content;

CREATE POLICY "homebrew_content_select" ON homebrew_content
  FOR SELECT USING (campaign_id IN (SELECT get_my_campaign_ids()));

CREATE POLICY "homebrew_content_insert" ON homebrew_content
  FOR INSERT WITH CHECK (
    campaign_id IN (SELECT get_my_campaign_ids()) AND auth.uid() = created_by
  );

CREATE POLICY "homebrew_content_update" ON homebrew_content
  FOR UPDATE USING (campaign_id IN (SELECT get_my_campaign_ids()));

CREATE POLICY "homebrew_content_delete" ON homebrew_content
  FOR DELETE USING (campaign_id IN (SELECT get_my_campaign_ids()));

-- homebrew_versions (append-only history)
DROP POLICY IF EXISTS "homebrew_versions_select" ON homebrew_versions;
DROP POLICY IF EXISTS "homebrew_versions_insert" ON homebrew_versions;

CREATE POLICY "homebrew_versions_select" ON homebrew_versions
  FOR SELECT USING (
    homebrew_content_id IN (
      SELECT id FROM homebrew_content
      WHERE campaign_id IN (SELECT get_my_campaign_ids())
    )
  );

CREATE POLICY "homebrew_versions_insert" ON homebrew_versions
  FOR INSERT WITH CHECK (
    homebrew_content_id IN (
      SELECT id FROM homebrew_content
      WHERE campaign_id IN (SELECT get_my_campaign_ids())
    ) AND auth.uid() = created_by
  );

-- character_homebrew_refs
DROP POLICY IF EXISTS "char_homebrew_refs_select" ON character_homebrew_refs;
DROP POLICY IF EXISTS "char_homebrew_refs_insert" ON character_homebrew_refs;
DROP POLICY IF EXISTS "char_homebrew_refs_delete" ON character_homebrew_refs;

CREATE POLICY "char_homebrew_refs_select" ON character_homebrew_refs
  FOR SELECT USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

CREATE POLICY "char_homebrew_refs_insert" ON character_homebrew_refs
  FOR INSERT WITH CHECK (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

CREATE POLICY "char_homebrew_refs_delete" ON character_homebrew_refs
  FOR DELETE USING (
    character_id IN (SELECT id FROM characters WHERE user_id = auth.uid())
  );

-- Grants
GRANT SELECT, INSERT, UPDATE, DELETE ON homebrew_content          TO authenticated;
GRANT SELECT, INSERT                 ON homebrew_versions         TO authenticated;
GRANT SELECT, INSERT, DELETE         ON character_homebrew_refs   TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_homebrew_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON homebrew_shares           TO authenticated;
GRANT SELECT                         ON official_content_versions TO authenticated;
