// Dice counts per rarity — higher count = bell curve toward higher-numbered items
export const RARITY_DICE = { common: 2, uncommon: 3, rare: 4, legendary: 5 };
export const RARITIES    = ['common', 'uncommon', 'rare', 'legendary'];

let _cache = null;

export async function loadLootData() {
    if (_cache) return _cache;
    const r   = await fetch('/data/base/loot.json');
    const raw = await r.json();
    _cache = { items: raw.items, consumables: raw.consumables };
    return _cache;
}

function d12s(n) {
    let t = 0;
    for (let i = 0; i < n; i++) t += Math.ceil(Math.random() * 12);
    return t;
}

function fromPool(roll, pool) {
    const exact = pool.find(it => it.roll === roll);
    if (exact) return { ...exact };
    // Nearest fallback (shouldn't happen with valid roll ranges)
    return { ...pool.reduce((a, b) => Math.abs(a.roll - roll) <= Math.abs(b.roll - roll) ? a : b) };
}

function resolvePool(type, data) {
    if (type === 'items')       return data.items;
    if (type === 'consumables') return data.consumables;
    return Math.random() < 0.5 ? data.items : data.consumables;
}

export function rollOne(rarity, type, data) {
    const n    = RARITY_DICE[rarity];
    const roll = d12s(n);
    const pool = resolvePool(type, data);
    return { diceRolled: n, roll, ...fromPool(roll, pool) };
}

export function rollSet(rarity, type, count, data) {
    return Array.from({ length: count }, () => rollOne(rarity, type, data));
}

// ── Homebrew-aware rolling ────────────────────────────────────────────────────

// Normalise a homebrew_content row into a loot result shape
function homebrewToResult(hb) {
    const d = hb.data || {};
    let description = hb.player_description || '';
    if (hb.content_type === 'loot_item' && d.effect) description = d.effect;
    if (hb.content_type === 'weapon')    description = [d.damage_dice, d.range, d.trait].filter(Boolean).join(' · ');
    if (hb.content_type === 'armor')     description = `Base ${d.base_score} · ${d.armor_slots} slots`;
    return {
        name:       hb.name,
        description,
        rarity:     d.rarity || 'uncommon',
        type:       hb.content_type,
        homebrew:   true,
        homebrew_id: hb.id,
        diceRolled: null,
        roll:       null,
    };
}

// Filter homebrew items by rarity and optional type hint
function matchingHomebrew(homebrewItems, rarity, type) {
    return homebrewItems.filter(hb => {
        const hbRarity = hb.data?.rarity || 'uncommon';
        if (hbRarity !== rarity) return false;
        if (type === 'items')       return hb.content_type === 'loot_item' && hb.data?.consumable !== true;
        if (type === 'consumables') return hb.content_type === 'loot_item' && hb.data?.consumable === true;
        return true; // 'both' accepts all
    });
}

// Roll one item; if homebrew items are provided they compete equally with official items
export function rollOneWithHomebrew(rarity, type, data, homebrewItems = []) {
    const candidates = matchingHomebrew(homebrewItems, rarity, type);
    if (!candidates.length) return rollOne(rarity, type, data);

    // Official pool size approximation: average items per rarity bucket
    const officialPool = resolvePool(type, data);
    const officialWeight = officialPool.length;
    const total = officialWeight + candidates.length;

    if (Math.random() * total < candidates.length) {
        const hb = candidates[Math.floor(Math.random() * candidates.length)];
        return homebrewToResult(hb);
    }
    return rollOne(rarity, type, data);
}

export function rollSetWithHomebrew(rarity, type, count, data, homebrewItems = []) {
    return Array.from({ length: count }, () => rollOneWithHomebrew(rarity, type, data, homebrewItems));
}

// Directly convert a homebrew item into a loot result (for hand-pick flow)
export function pickHomebrew(hb) {
    return homebrewToResult(hb);
}
