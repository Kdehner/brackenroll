GRANT USAGE ON SCHEMA public TO anon, authenticated;

-- profiles: anon can read (for nav), authenticated can write own row
GRANT SELECT ON profiles TO anon, authenticated;
GRANT INSERT, UPDATE ON profiles TO authenticated;

-- All other tables: authenticated only
GRANT SELECT, INSERT, UPDATE, DELETE ON campaigns TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_members TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON characters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON sessions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON assets TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scenes TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON token_definitions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scene_tokens TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON parchments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON active_parchments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON scene_parchments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON player_parchments TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON adversaries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON adversary_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON encounters TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON encounter_entries TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON homebrew_content TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON homebrew_versions TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON character_homebrew_refs TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_homebrew_imports TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON homebrew_shares TO authenticated;
GRANT SELECT ON official_content_versions TO anon, authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_pages TO authenticated;
