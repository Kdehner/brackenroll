-- Break recursive RLS on campaign_members: the SELECT policy was querying
-- campaign_members within itself, causing infinite recursion (HTTP 500).
-- SECURITY DEFINER lets the function bypass RLS to do the lookup safely.
CREATE OR REPLACE FUNCTION get_my_campaign_ids()
RETURNS SETOF uuid
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT campaign_id FROM campaign_members WHERE user_id = auth.uid();
$$;

DROP POLICY IF EXISTS "campaign_members_select" ON campaign_members;
CREATE POLICY "campaign_members_select" ON campaign_members FOR SELECT
  USING (campaign_id IN (SELECT get_my_campaign_ids()));

-- Re-apply characters SELECT using the same non-recursive helper
DROP POLICY IF EXISTS "characters_select" ON characters;
CREATE POLICY "characters_select" ON characters FOR SELECT
  USING (
    user_id = auth.uid() OR
    campaign_id IN (SELECT get_my_campaign_ids())
  );
