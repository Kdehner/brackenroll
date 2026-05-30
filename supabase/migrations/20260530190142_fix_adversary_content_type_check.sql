-- Fix: 20260530010000 was repaired before the ALTER TABLE ran, so 'adversary' was never
-- added to the content_type CHECK constraint on the live DB.

ALTER TABLE homebrew_content DROP CONSTRAINT IF EXISTS homebrew_content_content_type_check;
ALTER TABLE homebrew_content ADD CONSTRAINT homebrew_content_content_type_check
    CHECK (content_type IN (
        'class','ancestry','community','domain','domain_card',
        'weapon','armor','loot_item','campaign_frame','environment','adversary'
    ));
