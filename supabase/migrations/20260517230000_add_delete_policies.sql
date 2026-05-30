-- Missing DELETE policies for GM-writable tables.
-- RLS was enabled but no FOR DELETE policy existed, silently blocking all deletes.

CREATE POLICY "scenes_delete" ON scenes FOR DELETE
  USING (campaign_id IN (
    SELECT campaign_id FROM campaign_members
    WHERE user_id = auth.uid() AND role = 'gm'
  ));

CREATE POLICY "token_definitions_delete" ON token_definitions FOR DELETE
  USING (campaign_id IN (
    SELECT campaign_id FROM campaign_members
    WHERE user_id = auth.uid() AND role = 'gm'
  ));

CREATE POLICY "scene_tokens_delete" ON scene_tokens FOR DELETE
  USING (scene_id IN (
    SELECT s.id FROM scenes s
    JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
    WHERE cm.user_id = auth.uid() AND cm.role = 'gm'
  ));
