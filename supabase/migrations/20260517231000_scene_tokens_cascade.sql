-- Add ON DELETE CASCADE to scene_tokens so deleting a scene removes its tokens.
-- Also cascade token_definition deletes so removing a definition cleans up scene placements.

ALTER TABLE scene_tokens
  DROP CONSTRAINT scene_tokens_scene_id_fkey,
  ADD CONSTRAINT scene_tokens_scene_id_fkey
    FOREIGN KEY (scene_id) REFERENCES scenes(id) ON DELETE CASCADE;

ALTER TABLE scene_tokens
  DROP CONSTRAINT scene_tokens_token_definition_id_fkey,
  ADD CONSTRAINT scene_tokens_token_definition_id_fkey
    FOREIGN KEY (token_definition_id) REFERENCES token_definitions(id) ON DELETE CASCADE;
