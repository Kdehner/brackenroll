-- Phase 11: Migrate adversaries → homebrew_content
-- Adversaries are now homebrew content so they can be globally scoped in Phase 12.

-- 1. Expand the content_type check to include 'adversary'
ALTER TABLE homebrew_content DROP CONSTRAINT homebrew_content_content_type_check;
ALTER TABLE homebrew_content ADD CONSTRAINT homebrew_content_content_type_check
    CHECK (content_type IN (
        'class','ancestry','community','domain','domain_card',
        'weapon','armor','loot_item','campaign_frame','environment','adversary'
    ));

-- 2. Migrate adversaries → homebrew_content
INSERT INTO homebrew_content (
    id, campaign_id, content_type, name,
    player_description, notes, image_url,
    current_version,
    data, created_by, created_at, updated_at
)
SELECT
    id,
    campaign_id,
    'adversary',
    name,
    NULL,
    NULL,
    portrait_url,
    current_version,
    jsonb_build_object(
        'tier',       tier,
        'role',       role,
        'lore',       lore,
        'difficulty', difficulty,
        'thresholds', thresholds,
        'hp',         hp,
        'stress',     stress,
        'attack',     attack,
        'features',   features,
        'experience', experience
    ),
    created_by,
    created_at,
    created_at
FROM adversaries;

-- 3. Migrate adversary_versions → homebrew_versions
INSERT INTO homebrew_versions (
    id, homebrew_content_id, version_number,
    data, change_notes, created_by, created_at
)
SELECT
    id,
    adversary_id,
    version_number,
    data,
    change_notes,
    created_by,
    created_at
FROM adversary_versions;

-- 4. Re-key encounter_entries.custom_adversary_id → homebrew_content
ALTER TABLE encounter_entries
    DROP CONSTRAINT IF EXISTS encounter_entries_custom_adversary_id_fkey;
ALTER TABLE encounter_entries
    ADD CONSTRAINT encounter_entries_custom_adversary_id_fkey
    FOREIGN KEY (custom_adversary_id) REFERENCES homebrew_content(id);

-- 5. Re-key token_definitions.custom_adversary_id → homebrew_content
ALTER TABLE token_definitions
    DROP CONSTRAINT IF EXISTS fk_token_custom_adversary;
ALTER TABLE token_definitions
    ADD CONSTRAINT fk_token_custom_adversary
    FOREIGN KEY (custom_adversary_id) REFERENCES homebrew_content(id);

-- 6. Drop old tables (versions first due to FK)
DROP TABLE IF EXISTS adversary_versions;
DROP TABLE IF EXISTS adversaries;
