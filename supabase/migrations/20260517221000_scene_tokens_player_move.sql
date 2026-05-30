-- Allow players to update position of their own moveable tokens.
-- GM update policy stays; we add a second policy for players.
CREATE POLICY "scene_tokens_update_player" ON scene_tokens FOR UPDATE
  USING (
    scene_id IN (
      SELECT s.id FROM scenes s
      JOIN campaign_members cm ON cm.campaign_id = s.campaign_id
      WHERE cm.user_id = auth.uid()
    )
    AND token_definition_id IN (
      SELECT id FROM token_definitions
      WHERE owner_id = auth.uid() AND player_moveable = true
    )
  );
