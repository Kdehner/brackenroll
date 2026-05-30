ALTER TABLE profiles
  ADD COLUMN IF NOT EXISTS dice_prefs jsonb
    NOT NULL DEFAULT '{"standard_theme":"smooth","hope_theme":"default","fear_theme":"rust"}';
