-- Phase 10: Campaign Pages RLS — replace any existing policies

DROP POLICY IF EXISTS "campaign_pages_select" ON campaign_pages;
DROP POLICY IF EXISTS "campaign_pages_insert" ON campaign_pages;
DROP POLICY IF EXISTS "campaign_pages_update" ON campaign_pages;
DROP POLICY IF EXISTS "campaign_pages_delete" ON campaign_pages;

-- Members see 'players' pages; GMs see all pages for their campaigns
CREATE POLICY "campaign_pages_select" ON campaign_pages
  FOR SELECT USING (
    campaign_id IN (SELECT get_my_campaign_ids()) AND (
      visibility = 'players' OR
      campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
    )
  );

-- Only the campaign GM can insert pages
CREATE POLICY "campaign_pages_insert" ON campaign_pages
  FOR INSERT WITH CHECK (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
    AND auth.uid() = created_by
  );

-- Only the campaign GM can update pages
CREATE POLICY "campaign_pages_update" ON campaign_pages
  FOR UPDATE USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

-- Only the campaign GM can delete pages
CREATE POLICY "campaign_pages_delete" ON campaign_pages
  FOR DELETE USING (
    campaign_id IN (SELECT id FROM campaigns WHERE gm_id = auth.uid())
  );

GRANT SELECT, INSERT, UPDATE, DELETE ON campaign_pages TO authenticated;
