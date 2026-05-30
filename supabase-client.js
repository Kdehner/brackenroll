import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import { makeLog } from './logger.js';

const authLog     = makeLog('auth');
const dataLog     = makeLog('data');
const realtimeLog = makeLog('realtime');

const SUPABASE_URL     = 'https://axmnirgopsowbuliowpw.supabase.co';
const SUPABASE_ANON_KEY = 'sb_publishable_soF0Emd0FuQ2GLW3QpYTvg_BSFnukuo';

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);

// Map Supabase user.id → user.uid for backward compat across all pages
function normalizeUser(user) {
    if (!user) return null;
    return { ...user, uid: user.id };
}

// ── Auth ─────────────────────────────────────────────────────────────────────

export const signInWithGoogle = () =>
    supabase.auth.signInWithOAuth({
        provider: 'google',
        options: { redirectTo: `${window.location.origin}/index.html` }
    });

export const signInWithDiscord = () =>
    supabase.auth.signInWithOAuth({
        provider: 'discord',
        options: { redirectTo: `${window.location.origin}/index.html` }
    });

export const emailRegister = async (email, password) => {
    const { data, error } = await supabase.auth.signUp({ email, password });
    if (error) throw error;
    return normalizeUser(data.user);
};

export const emailSignIn = async (email, password) => {
    const { data, error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) throw error;
    return normalizeUser(data.user);
};

export const signOutUser = () => supabase.auth.signOut();

// Mirrors Firebase onAuthStateChanged — cb receives (user, needsOnboarding)
export const onAuthChange = cb => {
    let initialHandled = false;

    const invoke = async session => {
        if (session?.user) {
            const user = normalizeUser(session.user);
            authLog.info('signed in', user.email ?? user.id);
            const needsOnboarding = await ensureUserProfile(user);
            if (needsOnboarding) authLog.info('new user — onboarding required');
            cb(user, needsOnboarding);
        } else {
            authLog.info('signed out');
            cb(null, false);
        }
    };

    // Fast initial state — don't wait for onAuthStateChange INITIAL_SESSION
    supabase.auth.getSession().then(({ data: { session } }) => {
        if (!initialHandled) {
            initialHandled = true;
            invoke(session);
        }
    }).catch(() => {
        if (!initialHandled) {
            initialHandled = true;
            cb(null, false);
        }
    });

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
        if (event === 'INITIAL_SESSION') {
            if (!initialHandled) {
                initialHandled = true;
                invoke(session);
            }
            return;
        }
        authLog.info('auth event:', event);
        invoke(session);
    });

    return () => subscription.unsubscribe();
};

// ── User profiles ─────────────────────────────────────────────────────────────

async function ensureUserProfile(user) {
    const { data, error } = await supabase
        .from('profiles')
        .select('display_name, avatar_color')
        .eq('id', user.id)
        .single();

    if (error && error.code !== 'PGRST116') {
        authLog.warn('ensureUserProfile error:', error);
        return false;
    }

    if (!data) {
        authLog.info('creating profile for new user', user.id);
        const { error: upsertError } = await supabase.from('profiles').upsert({
            id: user.id,
            display_name: user.user_metadata?.full_name || user.user_metadata?.name || '',
            avatar_color: '',
        });
        if (upsertError) authLog.warn('profile upsert error:', upsertError);
        return true;
    }
    return !data.display_name;
}

export async function getUserProfile(uid) {
    const { data } = await supabase
        .from('profiles')
        .select('*')
        .eq('id', uid)
        .single();
    return data ? { ...data, uid: data.id } : null;
}

export async function updateUserProfile(uid, data) {
    const { error } = await supabase.from('profiles').update(data).eq('id', uid);
    if (error) throw error;
}

// Role is now campaign-scoped — returns 'player' as global default
export async function getUserRole(uid) {
    return 'player';
}

// ── Account ───────────────────────────────────────────────────────────────────

export async function isEmailUser() {
    const { data: { user } } = await supabase.auth.getUser();
    return user?.identities?.some(i => i.provider === 'email') ?? false;
}

export async function changePassword(currentPassword, newPassword) {
    const { data: { user } } = await supabase.auth.getUser();
    const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword
    });
    if (verifyError) throw new Error('Current password is incorrect');
    const { error } = await supabase.auth.updateUser({ password: newPassword });
    if (error) throw error;
}

// ── Characters ────────────────────────────────────────────────────────────────

export async function saveCharacter(uid, character) {
    dataLog.info('saveCharacter', character.id ?? '(new)', character.name ?? '');
    const payload = {
        user_id: uid,
        campaign_id: character.campaignId || null,
        sheet_state: character,
        updated_at: new Date().toISOString()
    };
    if (character.id) payload.id = character.id;

    const { data, error } = await supabase
        .from('characters')
        .upsert(payload, { onConflict: 'id' })
        .select('id')
        .single();
    if (error) { dataLog.error('saveCharacter failed:', error); throw error; }
    dataLog.info('saveCharacter ok', data.id);
    return data.id;
}

export async function loadCharacters(uid) {
    const { data } = await supabase
        .from('characters')
        .select('id, sheet_state, updated_at')
        .eq('user_id', uid)
        .order('updated_at', { ascending: false });
    return (data || []).map(row => ({ ...row.sheet_state, id: row.id }));
}

export async function getCharacter(uid, charId) {
    const { data } = await supabase
        .from('characters')
        .select('id, sheet_state')
        .eq('id', charId)
        .eq('user_id', uid)
        .single();
    return data ? { ...data.sheet_state, id: data.id } : null;
}

export async function deleteCharacter(uid, charId) {
    await supabase.from('characters').delete().eq('id', charId).eq('user_id', uid);
}

export async function updateCharacter(uid, charId, updates) {
    const { data: existing } = await supabase
        .from('characters')
        .select('sheet_state')
        .eq('id', charId)
        .single();
    const sheet_state = { ...(existing?.sheet_state || {}), ...updates };
    await supabase
        .from('characters')
        .update({ sheet_state, updated_at: new Date().toISOString() })
        .eq('id', charId);
}

// ── Campaigns ─────────────────────────────────────────────────────────────────

function generateInviteCode() {
    return Math.random().toString(36).substring(2, 8).toUpperCase();
}

export async function createCampaign(uid, name) {
    dataLog.info('createCampaign', name);
    const invite_code = generateInviteCode();
    const { data: campaign, error } = await supabase
        .from('campaigns')
        .insert({ name, gm_id: uid, invite_code })
        .select('id')
        .single();
    if (error) { dataLog.error('createCampaign failed:', error); throw error; }

    await supabase.from('campaign_members').insert({
        campaign_id: campaign.id,
        user_id: uid,
        role: 'gm'
    });
    dataLog.info('createCampaign ok', campaign.id);
    return campaign.id;
}

export async function getCampaigns(uid) {
    const { data: memberships } = await supabase
        .from('campaign_members')
        .select('role, campaign_id')
        .eq('user_id', uid);
    if (!memberships?.length) return [];

    const ids = memberships.map(m => m.campaign_id);
    const { data: campaigns } = await supabase
        .from('campaigns')
        .select('*')
        .in('id', ids);

    return (campaigns || []).map(c => ({
        ...c,
        role: memberships.find(m => m.campaign_id === c.id)?.role
    }));
}

export async function getCampaign(campaignId) {
    const { data } = await supabase
        .from('campaigns')
        .select('*')
        .eq('id', campaignId)
        .single();
    return data ? { ...data, id: data.id } : null;
}

export async function joinCampaignByCode(uid, code) {
    dataLog.info('joinCampaignByCode', code.toUpperCase());
    const { data: campaign } = await supabase
        .from('campaigns')
        .select('id')
        .eq('invite_code', code.toUpperCase())
        .single();
    if (!campaign) { dataLog.warn('joinCampaignByCode: code not found', code); throw new Error('Campaign not found'); }

    await supabase.from('campaign_members').upsert({
        campaign_id: campaign.id,
        user_id: uid,
        role: 'player'
    }, { onConflict: 'campaign_id,user_id', ignoreDuplicates: true });

    return campaign.id;
}

export async function getCampaignMembers(campaignId) {
    const { data } = await supabase
        .from('campaign_members')
        .select('role, profiles(*)')
        .eq('campaign_id', campaignId);
    return (data || []).map(m => ({ ...m.profiles, uid: m.profiles.id, role: m.role }));
}

// In new schema, characters carry campaign_id directly
export async function linkCharacterToCampaign(uid, campaignId, charId) {
    await supabase
        .from('characters')
        .update({ campaign_id: campaignId })
        .eq('id', charId)
        .eq('user_id', uid);
}

export async function unlinkCharacterFromCampaign(uid, campaignId, charId) {
    await supabase
        .from('characters')
        .update({ campaign_id: null })
        .eq('id', charId)
        .eq('user_id', uid);
}

// ── Sessions ──────────────────────────────────────────────────────────────────

export async function createSession(campaignId, gmUid) {
    await supabase
        .from('sessions')
        .update({ is_active: false })
        .eq('campaign_id', campaignId)
        .eq('is_active', true);

    const { data, error } = await supabase
        .from('sessions')
        .insert({ campaign_id: campaignId, is_active: true })
        .select('id')
        .single();
    if (error) throw error;
    return data.id;
}

export async function getActiveSession(campaignId) {
    const { data } = await supabase
        .from('sessions')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('is_active', true)
        .maybeSingle();
    return data || null;
}

export async function closeSession(campaignId, sessionId) {
    await supabase.from('sessions').update({ is_active: false }).eq('id', sessionId);
}

export function onSessionChange(campaignId, sessionId, cb) {
    const channelName = `session-${sessionId}`;
    const stale = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (stale) { realtimeLog.info('removing stale channel', channelName); supabase.removeChannel(stale); }

    realtimeLog.info('subscribing to session changes', sessionId);
    const channel = supabase
        .channel(channelName)
        .on('postgres_changes', {
            event: '*',
            schema: 'public',
            table: 'sessions',
            filter: `id=eq.${sessionId}`
        }, payload => { realtimeLog.info('session change', payload.eventType); cb(payload.new); })
        .subscribe(status => realtimeLog.info('session channel', status));
    return () => { realtimeLog.info('unsubscribing session channel', sessionId); supabase.removeChannel(channel); };
}

export async function updateGmState(sessionId, patch) {
    const { data } = await supabase.from('sessions').select('gm_state').eq('id', sessionId).single();
    const gm_state = { ...(data?.gm_state || {}), ...patch };
    const { error } = await supabase.from('sessions').update({ gm_state }).eq('id', sessionId);
    if (error) throw error;
}

export async function updateSessionTokens(campaignId, sessionId, tokens) {
    await updateGmState(sessionId, { tokens });
}

export async function updateSessionMap(campaignId, sessionId, mapUrl) {
    await updateGmState(sessionId, { mapUrl });
}

// ── Assets / R2 upload ────────────────────────────────────────────────────────

export async function uploadAsset(campaignId, type, file) {
    const buffer = await file.arrayBuffer();
    const hashBuffer = await crypto.subtle.digest('SHA-256', buffer);
    const hash = Array.from(new Uint8Array(hashBuffer))
        .map(b => b.toString(16).padStart(2, '0')).join('');

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    const res = await fetch(`${SUPABASE_URL}/functions/v1/get-upload-url`, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${token}`
        },
        body: JSON.stringify({ campaignId, type, hash, filename: file.name, contentType: file.type })
    });
    if (!res.ok) throw new Error('Failed to get upload URL');

    const { uploadUrl, publicUrl, key } = await res.json();

    const uploadRes = await fetch(uploadUrl, {
        method: 'PUT',
        headers: { 'Content-Type': file.type },
        body: file
    });
    if (!uploadRes.ok) throw new Error('Failed to upload file');

    return { publicUrl, key };
}

// Kept for backward compat with table.html — requires campaignId to be added when table is refactored
export async function uploadSessionMap(sessionId, file, campaignId) {
    const { publicUrl } = await uploadAsset(campaignId, 'map', file);
    return publicUrl;
}

// Returns all characters belonging to a campaign, keyed by user_id
export async function getCharactersByCampaign(campaignId) {
    const { data } = await supabase
        .from('characters')
        .select('id, user_id, sheet_state')
        .eq('campaign_id', campaignId);
    const map = {};
    (data || []).forEach(row => {
        const char = { ...row.sheet_state, id: row.id };
        if (!map[row.user_id]) map[row.user_id] = [];
        map[row.user_id].push(char);
    });
    return map;
}

// ── Scenes ────────────────────────────────────────────────────────────────────

export async function createScene(campaignId, name, background = 'table') {
    const { data, error } = await supabase
        .from('scenes')
        .insert({ campaign_id: campaignId, name, background })
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

export async function getScenes(campaignId) {
    const { data } = await supabase
        .from('scenes')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });
    return data || [];
}

export async function getScene(sceneId) {
    const { data } = await supabase
        .from('scenes')
        .select('*')
        .eq('id', sceneId)
        .single();
    return data || null;
}

export async function updateScene(sceneId, updates) {
    const { error } = await supabase.from('scenes').update(updates).eq('id', sceneId);
    if (error) throw error;
}

export async function deleteScene(sceneId) {
    const { error } = await supabase.from('scenes').delete().eq('id', sceneId);
    if (error) throw error;
}

// ── Token definitions ─────────────────────────────────────────────────────────

export async function getTokenDefinitions(campaignId) {
    const { data } = await supabase
        .from('token_definitions')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: true });
    return data || [];
}

export async function createTokenDefinition(campaignId, { label, image_url = null, token_type = 'generic', character_id = null, adversary_id = null, custom_adversary_id = null, player_moveable = true, owner_id = null, color = null }) {
    const { data, error } = await supabase
        .from('token_definitions')
        .insert({ campaign_id: campaignId, label, image_url, token_type, character_id, adversary_id, custom_adversary_id, player_moveable, owner_id, color })
        .select('*')
        .single();
    if (error) throw error;
    return data;
}

export async function updateTokenDefinition(tokenId, updates) {
    const { error } = await supabase
        .from('token_definitions')
        .update(updates)
        .eq('id', tokenId);
    if (error) throw error;
}

export async function deleteTokenDefinition(tokenId) {
    const { error } = await supabase
        .from('token_definitions')
        .delete()
        .eq('id', tokenId);
    if (error) throw error;
}

// ── Scene tokens ──────────────────────────────────────────────────────────────

export async function getSceneTokens(sceneId) {
    const { data } = await supabase
        .from('scene_tokens')
        .select('*, token_definitions(*)')
        .eq('scene_id', sceneId);
    return (data || []).map(row => ({
        ...row.token_definitions,
        scene_token_id: row.id,
        scene_id: row.scene_id,
        nx: row.x,
        ny: row.y,
        visible: row.visible,
    }));
}

export async function upsertSceneToken(sceneId, tokenDefinitionId, nx, ny) {
    const { error } = await supabase
        .from('scene_tokens')
        .upsert(
            { scene_id: sceneId, token_definition_id: tokenDefinitionId, x: nx, y: ny },
            { onConflict: 'scene_id,token_definition_id' }
        );
    if (error) throw error;
}

export async function setSceneTokenVisibility(sceneId, tokenDefinitionId, visible) {
    const { error } = await supabase
        .from('scene_tokens')
        .update({ visible })
        .eq('scene_id', sceneId)
        .eq('token_definition_id', tokenDefinitionId);
    if (error) throw error;
}

export async function removeSceneToken(sceneId, tokenDefinitionId) {
    const { error } = await supabase
        .from('scene_tokens')
        .delete()
        .eq('scene_id', sceneId)
        .eq('token_definition_id', tokenDefinitionId);
    if (error) throw error;
}

export function onSceneTokensChange(sceneId, cb) {
    const channelName = `scene-tokens-${sceneId}`;
    const stale = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (stale) { realtimeLog.info('removing stale channel', channelName); supabase.removeChannel(stale); }

    realtimeLog.info('subscribing to scene token changes', sceneId);
    const ch = supabase
        .channel(channelName)
        .on('postgres_changes', { event: '*', schema: 'public', table: 'scene_tokens', filter: `scene_id=eq.${sceneId}` }, () => { realtimeLog.info('scene_tokens change'); cb(); })
        .on('postgres_changes', { event: '*', schema: 'public', table: 'token_definitions' }, () => { realtimeLog.info('token_definitions change'); cb(); })
        .subscribe(status => realtimeLog.info('scene-tokens channel', status));
    return () => { realtimeLog.info('unsubscribing scene-tokens channel', sceneId); supabase.removeChannel(ch); };
}

// ── Session movement lock ─────────────────────────────────────────────────────

export async function setSessionMoveLock(sessionId, locked) {
    const { error } = await supabase
        .from('sessions')
        .update({ player_move_locked: locked })
        .eq('id', sessionId);
    if (error) throw error;
}

// ── Table Broadcast (token live drag) ────────────────────────────────────────

export function createTableBroadcastChannel(sessionId, onTokenMove, onFogUpdate, parchmentHandlers = {}) {
    const channelName = `table-broadcast-${sessionId}`;
    const stale = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (stale) { realtimeLog.info('removing stale channel', channelName); supabase.removeChannel(stale); }

    realtimeLog.info('subscribing to table broadcast', sessionId);
    let ch = supabase.channel(channelName)
        .on('broadcast', { event: 'token_move' }, ({ payload }) => onTokenMove(payload));
    if (onFogUpdate)                    ch = ch.on('broadcast', { event: 'fog_update'       }, ({ payload }) => onFogUpdate(payload));
    if (parchmentHandlers.onStroke)     ch = ch.on('broadcast', { event: 'parchment_stroke' }, ({ payload }) => parchmentHandlers.onStroke(payload));
    if (parchmentHandlers.onOpen)       ch = ch.on('broadcast', { event: 'parchment_open'   }, ({ payload }) => parchmentHandlers.onOpen(payload));
    if (parchmentHandlers.onClose)      ch = ch.on('broadcast', { event: 'parchment_close'  }, ({ payload }) => parchmentHandlers.onClose(payload));
    if (parchmentHandlers.onDelivery)   ch = ch.on('broadcast', { event: 'parchment_send'   }, ({ payload }) => parchmentHandlers.onDelivery(payload));
    return ch.subscribe(status => realtimeLog.info('table broadcast channel', status));
}

export function sendTokenMove(channel, tokenId, nx, ny) {
    channel.send({ type: 'broadcast', event: 'token_move', payload: { tokenId, nx, ny } });
}

export function sendFogUpdate(channel, fogState) {
    channel.send({ type: 'broadcast', event: 'fog_update', payload: fogState });
}

// ── Dice rolls ────────────────────────────────────────────────────────────────

let _diceChannel = null;

export async function addSessionRoll(campaignId, sessionId, rollData) {
    if (_diceChannel) {
        _diceChannel.send({ type: 'broadcast', event: 'dice_roll', payload: rollData });
    }
}

export function onRollsChange(campaignId, sessionId, cb) {
    const rolls = [];
    const channelName = `dice-${sessionId}`;
    const stale = supabase.getChannels().find(c => c.topic === `realtime:${channelName}`);
    if (stale) supabase.removeChannel(stale);

    realtimeLog.info('subscribing to dice broadcast', sessionId);
    _diceChannel = supabase
        .channel(channelName, { config: { broadcast: { self: true } } })
        .on('broadcast', { event: 'dice_roll' }, ({ payload }) => {
            realtimeLog.info('dice_roll received', payload.roller ?? '');
            rolls.unshift(payload);
            if (rolls.length > 50) rolls.length = 50;
            cb([...rolls]);
        })
        .subscribe(status => realtimeLog.info('dice channel', status));

    return () => { supabase.removeChannel(_diceChannel); _diceChannel = null; };
}

// ── Adversaries ────────────────────────────────────────────────────────────────

function normalizeAdversary(row) {
    return {
        id:              row.id,
        campaign_id:     row.campaign_id,
        owner_id:        row.owner_id,
        name:            row.name,
        image_url:       row.image_url,
        current_version: row.current_version,
        created_by:      row.created_by,
        created_at:      row.created_at,
        ...(row.data || {}),
    };
}

export async function getAdversaries(campaignId) {
    const { data } = await supabase
        .from('homebrew_content')
        .select('*')
        .eq('campaign_id', campaignId)
        .eq('content_type', 'adversary')
        .order('name', { ascending: true });
    return (data || []).map(normalizeAdversary);
}

export async function saveAdversary(uid, adversaryData) {
    dataLog.info('saveAdversary', adversaryData.id ?? '(new)', adversaryData.name);
    const {
        id, campaign_id, name, image_url, change_notes,
        tier, role, lore, difficulty, thresholds, hp, stress, attack, features, experience,
    } = adversaryData;
    return saveHomebrew(uid, campaign_id, {
        id,
        content_type: 'adversary',
        name,
        player_description: null,
        notes:              null,
        image_url:          image_url || null,
        data: { tier, role, lore, difficulty, thresholds, hp, stress, attack, features, experience },
        change_notes,
    });
}

export async function deleteAdversary(adversaryId) {
    return deleteHomebrew(adversaryId);
}

// ── Encounters ────────────────────────────────────────────────────────────────

export async function getEncounters(campaignId) {
    const { data } = await supabase
        .from('encounters')
        .select('*, encounter_entries(id)')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
    return (data || []).map(e => ({ ...e, entry_count: e.encounter_entries?.length || 0 }));
}

export async function createEncounter(uid, { campaign_id, name, scene_id }) {
    dataLog.info('createEncounter', name);
    const { data, error } = await supabase
        .from('encounters')
        .insert({ campaign_id, name, scene_id: scene_id || null, created_by: uid })
        .select('id')
        .single();
    if (error) { dataLog.error('createEncounter failed:', error); throw error; }
    dataLog.info('createEncounter ok', data.id);
    return data.id;
}

export async function deleteEncounter(id) {
    const { error } = await supabase.from('encounters').delete().eq('id', id);
    if (error) throw error;
}

export async function getEncounterWithEntries(encounterId) {
    const { data, error } = await supabase
        .from('encounters')
        .select('*, encounter_entries(*, token_definitions(*))')
        .eq('id', encounterId)
        .order('sort_order', { referencedTable: 'encounter_entries', ascending: true })
        .single();
    if (error) throw error;
    return data;
}

export async function addEncounterEntry(uid, { encounterId, campaignId, sceneId, adversary, isCustom }) {
    dataLog.info('addEncounterEntry', adversary.name, isCustom ? '(custom)' : '(official)');

    // Count same-adversary entries to determine letter (A, B, C…)
    let countQ = supabase
        .from('encounter_entries')
        .select('id', { count: 'exact', head: true })
        .eq('encounter_id', encounterId);
    countQ = isCustom
        ? countQ.eq('custom_adversary_id', adversary.id)
        : countQ.eq('adversary_id', adversary.id);
    const { count: sameCount } = await countQ;

    // Count total entries for sort_order
    const { count: totalCount } = await supabase
        .from('encounter_entries')
        .select('id', { count: 'exact', head: true })
        .eq('encounter_id', encounterId);

    const letter = String.fromCharCode(65 + (sameCount || 0));
    const displayName = isCustom
        ? adversary.name
        : adversary.name.toLowerCase().replace(/\b\w/g, c => c.toUpperCase());
    const label = `${displayName} ${letter}`;

    // Create token definition
    const tokenDef = await createTokenDefinition(campaignId, {
        label,
        token_type: 'adversary',
        adversary_id: isCustom ? null : adversary.id,
        custom_adversary_id: isCustom ? adversary.id : null,
        player_moveable: false,
        image_url: adversary.image_url || null,
        owner_id: null,
        color: null,
    });

    // Place token in linked scene (stacked at center — GM repositions)
    if (sceneId) {
        await upsertSceneToken(sceneId, tokenDef.id, 0.5, 0.5);
    }

    // Create entry
    const { data, error } = await supabase
        .from('encounter_entries')
        .insert({
            encounter_id: encounterId,
            adversary_id: isCustom ? null : adversary.id,
            custom_adversary_id: isCustom ? adversary.id : null,
            label,
            token_definition_id: tokenDef.id,
            sort_order: totalCount || 0,
        })
        .select('*, token_definitions(*)')
        .single();
    if (error) { dataLog.error('addEncounterEntry failed:', error); throw error; }

    dataLog.info('addEncounterEntry ok', label);
    return data;
}

export async function removeEncounterEntry(entryId, tokenDefinitionId) {
    // Delete entry first (clears FK), then token_definition (cascades scene_tokens)
    const { error: entryErr } = await supabase.from('encounter_entries').delete().eq('id', entryId);
    if (entryErr) throw entryErr;
    if (tokenDefinitionId) {
        const { error: tokenErr } = await supabase.from('token_definitions').delete().eq('id', tokenDefinitionId);
        if (tokenErr) throw tokenErr;
    }
}

export async function saveFogState(sceneId, fogState) {
    const { error } = await supabase.from('scenes').update({ fog_state: fogState }).eq('id', sceneId);
    if (error) throw error;
}

export function sendParchmentStroke(channel, activeParchmentId, stroke) {
    channel.send({ type: 'broadcast', event: 'parchment_stroke', payload: { id: activeParchmentId, stroke } });
}

export function sendParchmentOpen(channel, activeParchment) {
    channel.send({ type: 'broadcast', event: 'parchment_open', payload: activeParchment });
}

export function sendParchmentClose(channel, activeParchmentId) {
    channel.send({ type: 'broadcast', event: 'parchment_close', payload: { id: activeParchmentId } });
}

export function sendParchmentDelivery(channel, parchmentData) {
    channel.send({ type: 'broadcast', event: 'parchment_send', payload: parchmentData });
}

// ── Parchments ────────────────────────────────────────────────────────────────

export async function saveParchment(uid, campaignId, { name, canvas_data }) {
    dataLog.info('saveParchment', name);
    const { data, error } = await supabase
        .from('parchments')
        .insert({ campaign_id: campaignId, name: name || 'Untitled', canvas_data, created_by: uid })
        .select('*')
        .single();
    if (error) { dataLog.error('saveParchment failed:', error); throw error; }
    return data;
}

export async function updateParchment(parchmentId, updates) {
    const { error } = await supabase.from('parchments').update(updates).eq('id', parchmentId);
    if (error) throw error;
}

export async function loadCampaignParchments(campaignId) {
    const { data } = await supabase
        .from('parchments')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('created_at', { ascending: false });
    return data || [];
}

export async function deleteParchment(parchmentId) {
    const { error } = await supabase.from('parchments').delete().eq('id', parchmentId);
    if (error) throw error;
}

export async function createActiveParchment(uid, sessionId, campaignId, { label, canvas_data, x = 0.05, y = 0.08 }) {
    const { data, error } = await supabase
        .from('active_parchments')
        .insert({ session_id: sessionId, campaign_id: campaignId, created_by: uid, label: label || 'Untitled', canvas_data, x, y })
        .select('*')
        .single();
    if (error) { dataLog.error('createActiveParchment failed:', error); throw error; }
    return data;
}

export async function updateActiveParchmentData(activeParchmentId, canvas_data) {
    const { error } = await supabase
        .from('active_parchments')
        .update({ canvas_data })
        .eq('id', activeParchmentId);
    if (error) throw error;
}

export async function loadActiveParchments(sessionId) {
    const { data } = await supabase
        .from('active_parchments')
        .select('*')
        .eq('session_id', sessionId)
        .order('created_at', { ascending: true });
    return data || [];
}

export async function deleteActiveParchment(activeParchmentId) {
    const { error } = await supabase.from('active_parchments').delete().eq('id', activeParchmentId);
    if (error) throw error;
}

export async function sendParchmentToPlayer(parchmentId, playerId, contextNote) {
    const { error } = await supabase
        .from('player_parchments')
        .insert({ parchment_id: parchmentId, player_id: playerId, context_note: contextNote || null, received_at: new Date().toISOString() });
    if (error) throw error;
}

export async function loadPlayerParchments(playerId) {
    const { data } = await supabase
        .from('player_parchments')
        .select('*, parchments(*)')
        .eq('player_id', playerId)
        .order('received_at', { ascending: false });
    return (data || []).map(row => ({
        ...(row.parchments || {}),
        received_at:         row.received_at,
        context_note:        row.context_note,
        player_parchment_id: row.id,
    }));
}

export async function saveLootResults(encounterId, payload) {
    // payload: { rarity, type, items } or null to clear
    const { error } = await supabase
        .from('encounters')
        .update({ loot_results: payload })
        .eq('id', encounterId);
    if (error) throw error;
}

// ── Homebrew ──────────────────────────────────────────────────────────────────

export async function saveHomebrew(uid, campaignId, homebrewData) {
    dataLog.info('saveHomebrew', homebrewData.id ?? '(new)', homebrewData.name);
    const { id, change_notes, ...fields } = homebrewData;

    if (id) {
        const { data: row, error: fetchErr } = await supabase
            .from('homebrew_content')
            .select('current_version')
            .eq('id', id)
            .single();
        if (fetchErr) throw fetchErr;

        const nextVersion = (row.current_version || 1) + 1;
        const { error } = await supabase
            .from('homebrew_content')
            .update({ ...fields, current_version: nextVersion, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) { dataLog.error('saveHomebrew update failed:', error); throw error; }

        await supabase.from('homebrew_versions').insert({
            homebrew_content_id: id,
            version_number: nextVersion,
            data: fields,
            player_description: fields.player_description || null,
            change_notes: change_notes || null,
            created_by: uid,
        });

        dataLog.info('saveHomebrew updated', id, 'v' + nextVersion);
        return id;
    }

    const scope = campaignId ? { campaign_id: campaignId } : { owner_id: uid };
    const { data, error } = await supabase
        .from('homebrew_content')
        .insert({ ...fields, ...scope, created_by: uid })
        .select('id')
        .single();
    if (error) { dataLog.error('saveHomebrew insert failed:', error); throw error; }

    await supabase.from('homebrew_versions').insert({
        homebrew_content_id: data.id,
        version_number: 1,
        data: fields,
        player_description: fields.player_description || null,
        change_notes: change_notes || null,
        created_by: uid,
    });

    dataLog.info('saveHomebrew created', data.id);
    return data.id;
}

export async function getHomebrew(campaignId, contentType = null) {
    let query = supabase
        .from('homebrew_content')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('name', { ascending: true });
    if (contentType) query = query.eq('content_type', contentType);
    const { data } = await query;
    return data || [];
}

export async function getHomebrewItem(id) {
    const { data } = await supabase
        .from('homebrew_content')
        .select('*')
        .eq('id', id)
        .single();
    return data || null;
}

export async function getHomebrewVersions(homebrewId) {
    const { data } = await supabase
        .from('homebrew_versions')
        .select('*')
        .eq('homebrew_content_id', homebrewId)
        .order('version_number', { ascending: false });
    return data || [];
}

export async function deleteHomebrew(id) {
    // Remove any campaign imports referencing this item before deleting
    await supabase.from('campaign_homebrew_imports').delete().eq('homebrew_content_id', id);
    const { error } = await supabase.from('homebrew_content').delete().eq('id', id);
    if (error) throw error;
}

export async function getLootHomebrew(campaignId) {
    const { data } = await supabase
        .from('homebrew_content')
        .select('*')
        .eq('campaign_id', campaignId)
        .in('content_type', ['weapon', 'armor', 'loot_item'])
        .order('name', { ascending: true });
    return data || [];
}

// ── Campaign Pages ────────────────────────────────────────────────────────────

export async function getCampaignPages(campaignId) {
    const { data } = await supabase
        .from('campaign_pages')
        .select('*')
        .eq('campaign_id', campaignId)
        .order('sort_order', { ascending: true });
    return data || [];
}

export async function getCampaignPage(pageId) {
    const { data } = await supabase
        .from('campaign_pages')
        .select('*')
        .eq('id', pageId)
        .single();
    return data || null;
}

export async function saveCampaignPage(uid, campaignId, pageData) {
    dataLog.info('saveCampaignPage', pageData.id ?? '(new)', pageData.title);
    const { id, ...fields } = pageData;
    if (id) {
        const { error } = await supabase
            .from('campaign_pages')
            .update({ ...fields, updated_at: new Date().toISOString() })
            .eq('id', id);
        if (error) { dataLog.error('saveCampaignPage update failed:', error); throw error; }
        dataLog.info('saveCampaignPage updated', id);
        return id;
    }
    const { data, error } = await supabase
        .from('campaign_pages')
        .insert({ ...fields, campaign_id: campaignId, created_by: uid })
        .select('id')
        .single();
    if (error) { dataLog.error('saveCampaignPage insert failed:', error); throw error; }
    dataLog.info('saveCampaignPage created', data.id);
    return data.id;
}

export async function deleteCampaignPage(pageId) {
    const { error } = await supabase.from('campaign_pages').delete().eq('id', pageId);
    if (error) throw error;
}

export async function reorderCampaignPages(pages) {
    await Promise.all(pages.map(({ id, sort_order }) =>
        supabase.from('campaign_pages').update({ sort_order }).eq('id', id)
    ));
}

// ── Global library (Phase 12) ─────────────────────────────────────────────────

export async function getMyLibrary(uid, contentType = null) {
    let query = supabase
        .from('homebrew_content')
        .select('*')
        .eq('owner_id', uid)
        .order('name', { ascending: true });
    if (contentType) query = query.eq('content_type', contentType);
    const { data } = await query;
    return data || [];
}

export async function getCampaignImports(campaignId) {
    const { data } = await supabase
        .from('campaign_homebrew_imports')
        .select('homebrew_content_id, homebrew_content(*)')
        .eq('campaign_id', campaignId)
        .order('added_at', { ascending: true });
    return (data || []).map(row => ({ ...row.homebrew_content, _imported: true }));
}

export async function importToCampaign(campaignId, homebrewContentId, uid) {
    const { error } = await supabase
        .from('campaign_homebrew_imports')
        .insert({ campaign_id: campaignId, homebrew_content_id: homebrewContentId, added_by: uid });
    if (error) throw error;
}

export async function removeImport(campaignId, homebrewContentId) {
    const { error } = await supabase
        .from('campaign_homebrew_imports')
        .delete()
        .eq('campaign_id', campaignId)
        .eq('homebrew_content_id', homebrewContentId);
    if (error) throw error;
}

// ── Sharing (Phase 12) ────────────────────────────────────────────────────────

export async function shareHomebrew(fromUid, toEmail, homebrewContentId) {
    const { data, error: lookupErr } = await supabase.rpc('find_profile_by_email', { lookup_email: toEmail });
    if (lookupErr) throw lookupErr;
    if (!data?.length) throw new Error('No account found with that email.');
    const toUserId = data[0].id;
    if (toUserId === fromUid) throw new Error('You cannot share with yourself.');
    const { error } = await supabase
        .from('homebrew_shares')
        .insert({ from_user_id: fromUid, to_user_id: toUserId, homebrew_content_id: homebrewContentId });
    if (error) throw error;
    return data[0].display_name || toEmail;
}

export async function getPendingShares(uid) {
    const { data } = await supabase
        .from('homebrew_shares')
        .select('*, homebrew_content(*)')
        .eq('to_user_id', uid)
        .is('accepted_at', null)
        .order('shared_at', { ascending: false });
    return data || [];
}

export async function acceptShare(shareId, uid) {
    const { data: share, error: fetchErr } = await supabase
        .from('homebrew_shares')
        .select('*, homebrew_content(*)')
        .eq('id', shareId)
        .eq('to_user_id', uid)
        .single();
    if (fetchErr || !share) throw fetchErr || new Error('Share not found.');

    const { id: srcId, created_at: _ca, updated_at: _ua, created_by: _cb,
            campaign_id: _cid, owner_id: _oid, current_version: _cv, ...fields } = share.homebrew_content;

    const { data: newItem, error: insertErr } = await supabase
        .from('homebrew_content')
        .insert({ ...fields, owner_id: uid, campaign_id: null, created_by: uid,
                  based_on_source: 'global', based_on_id: srcId, current_version: 1 })
        .select('id')
        .single();
    if (insertErr) throw insertErr;

    await supabase.from('homebrew_versions').insert({
        homebrew_content_id: newItem.id,
        version_number: 1,
        data: fields.data || {},
        player_description: fields.player_description || null,
        change_notes: 'Accepted shared item',
        created_by: uid,
    });

    await supabase.from('homebrew_shares').update({ accepted_at: new Date().toISOString() }).eq('id', shareId);
    return newItem.id;
}

export async function declineShare(shareId) {
    const { error } = await supabase.from('homebrew_shares').delete().eq('id', shareId);
    if (error) throw error;
}
