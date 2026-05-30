-- Phase 12: Global homebrew, campaign imports, and sharing

-- ── find_profile_by_email: email → profile lookup for sharing ─────────────────
CREATE OR REPLACE FUNCTION find_profile_by_email(lookup_email text)
RETURNS TABLE(id uuid, display_name text)
LANGUAGE sql SECURITY DEFINER AS $$
    SELECT p.id, p.display_name
    FROM profiles p
    JOIN auth.users u ON u.id = p.id
    WHERE lower(u.email) = lower(lookup_email)
    LIMIT 1;
$$;

-- ── get_my_gm_campaign_ids: campaigns where current user is a GM ──────────────
CREATE OR REPLACE FUNCTION get_my_gm_campaign_ids()
RETURNS SETOF uuid LANGUAGE sql SECURITY DEFINER AS $$
    SELECT campaign_id FROM campaign_members
    WHERE user_id = auth.uid() AND role = 'gm';
$$;

-- ── homebrew_content: replace campaign-only policies with global + campaign ────
DROP POLICY IF EXISTS "homebrew_content_select" ON homebrew_content;
DROP POLICY IF EXISTS "homebrew_content_insert" ON homebrew_content;
DROP POLICY IF EXISTS "homebrew_content_update" ON homebrew_content;
DROP POLICY IF EXISTS "homebrew_content_delete" ON homebrew_content;

CREATE POLICY "homebrew_content_select" ON homebrew_content
FOR SELECT USING (
    campaign_id IN (SELECT get_my_campaign_ids())
    OR owner_id = auth.uid()
    OR id IN (
        SELECT homebrew_content_id FROM campaign_homebrew_imports
        WHERE campaign_id IN (SELECT get_my_campaign_ids())
    )
    OR id IN (
        SELECT homebrew_content_id FROM homebrew_shares
        WHERE to_user_id = auth.uid()
    )
);

CREATE POLICY "homebrew_content_insert" ON homebrew_content
FOR INSERT WITH CHECK (
    auth.uid() = created_by AND (
        campaign_id IN (SELECT get_my_campaign_ids())
        OR (owner_id = auth.uid() AND campaign_id IS NULL)
    )
);

CREATE POLICY "homebrew_content_update" ON homebrew_content
FOR UPDATE USING (
    campaign_id IN (SELECT get_my_campaign_ids())
    OR owner_id = auth.uid()
);

CREATE POLICY "homebrew_content_delete" ON homebrew_content
FOR DELETE USING (
    campaign_id IN (SELECT get_my_campaign_ids())
    OR owner_id = auth.uid()
);

-- ── homebrew_versions: extend for global scope ────────────────────────────────
DROP POLICY IF EXISTS "homebrew_versions_select" ON homebrew_versions;
DROP POLICY IF EXISTS "homebrew_versions_insert" ON homebrew_versions;

CREATE POLICY "homebrew_versions_select" ON homebrew_versions
FOR SELECT USING (
    homebrew_content_id IN (
        SELECT id FROM homebrew_content
        WHERE campaign_id IN (SELECT get_my_campaign_ids())
           OR owner_id = auth.uid()
    )
);

CREATE POLICY "homebrew_versions_insert" ON homebrew_versions
FOR INSERT WITH CHECK (
    auth.uid() = created_by AND
    homebrew_content_id IN (
        SELECT id FROM homebrew_content
        WHERE campaign_id IN (SELECT get_my_campaign_ids())
           OR owner_id = auth.uid()
    )
);

-- ── campaign_homebrew_imports: replace initial policies + add DELETE ───────────
DROP POLICY IF EXISTS "campaign_homebrew_imports_select" ON campaign_homebrew_imports;
DROP POLICY IF EXISTS "campaign_homebrew_imports_insert" ON campaign_homebrew_imports;
DROP POLICY IF EXISTS "campaign_homebrew_imports_delete" ON campaign_homebrew_imports;
DROP POLICY IF EXISTS "chi_select" ON campaign_homebrew_imports;
DROP POLICY IF EXISTS "chi_insert" ON campaign_homebrew_imports;
DROP POLICY IF EXISTS "chi_delete" ON campaign_homebrew_imports;

CREATE POLICY "chi_select" ON campaign_homebrew_imports
FOR SELECT USING (
    campaign_id IN (SELECT get_my_campaign_ids())
);

CREATE POLICY "chi_insert" ON campaign_homebrew_imports
FOR INSERT WITH CHECK (
    campaign_id IN (SELECT get_my_gm_campaign_ids())
    AND added_by = auth.uid()
);

CREATE POLICY "chi_delete" ON campaign_homebrew_imports
FOR DELETE USING (
    campaign_id IN (SELECT get_my_gm_campaign_ids())
);

-- ── homebrew_shares: replace initial policies + add UPDATE and DELETE ──────────
DROP POLICY IF EXISTS "homebrew_shares_select" ON homebrew_shares;
DROP POLICY IF EXISTS "homebrew_shares_insert" ON homebrew_shares;
DROP POLICY IF EXISTS "homebrew_shares_update" ON homebrew_shares;
DROP POLICY IF EXISTS "homebrew_shares_delete" ON homebrew_shares;

CREATE POLICY "homebrew_shares_select" ON homebrew_shares
FOR SELECT USING (from_user_id = auth.uid() OR to_user_id = auth.uid());

CREATE POLICY "homebrew_shares_insert" ON homebrew_shares
FOR INSERT WITH CHECK (from_user_id = auth.uid());

-- to_user sets accepted_at when accepting
CREATE POLICY "homebrew_shares_update" ON homebrew_shares
FOR UPDATE USING (to_user_id = auth.uid());

-- either party can remove a share record
CREATE POLICY "homebrew_shares_delete" ON homebrew_shares
FOR DELETE USING (from_user_id = auth.uid() OR to_user_id = auth.uid());
