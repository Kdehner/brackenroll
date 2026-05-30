-- color for avatar-based character tokens
ALTER TABLE token_definitions
  ADD COLUMN IF NOT EXISTS color text;

-- unique constraint required for upsert by (scene_id, token_definition_id)
ALTER TABLE scene_tokens
  DROP CONSTRAINT IF EXISTS scene_tokens_scene_token_unique;

ALTER TABLE scene_tokens
  ADD CONSTRAINT scene_tokens_scene_token_unique
  UNIQUE (scene_id, token_definition_id);
