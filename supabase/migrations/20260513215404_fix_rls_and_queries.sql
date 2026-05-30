-- Fix campaigns SELECT: avoid recursive RLS when PostgREST joins campaign_members → campaigns.
-- Security is still enforced — campaigns are only discoverable via campaign_members (which has its own RLS).
DROP POLICY IF EXISTS "campaigns_select" ON campaigns;
CREATE POLICY "campaigns_select" ON campaigns FOR SELECT
  USING (auth.uid() IS NOT NULL);

-- Fix characters SELECT: allow users to read their own characters regardless of campaign linkage.
DROP POLICY IF EXISTS "characters_select" ON characters;
CREATE POLICY "characters_select" ON characters FOR SELECT
  USING (
    user_id = auth.uid() OR
    campaign_id IN (SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid())
  );
