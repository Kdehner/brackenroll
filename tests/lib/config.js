// Central config — one place to change when env or credentials change

const BASE_URL    = 'https://devverheart.fwbgaming.win';
const CAMPAIGN_ID = 'a6762bff-15ea-4e13-a4f0-dc61b26cf37a';

const GM_EMAIL    = 'qc-gm@brackenroll.test';
const GM_PASS     = 'QCtest2026!';

const PLAYER_EMAIL = 'qc-player@brackenroll.test';
const PLAYER_PASS  = 'QCtest2026!';

// Battlemap URL used for scene creation tests
const BATTLEMAP_URL = 'https://cdn.discordapp.com/attachments/1478493614689751272/1502836189126856865/Village.jpg?ex=6a2c0184&is=6a2ab004&hm=cd57a7a719ed7e45937515a94a209ad21120430a13491254b73a402f7792b23d';

// Timestamp suffix — keeps test-created data distinguishable from real data
const RUN_ID = Date.now().toString(36).slice(-4).toUpperCase();

module.exports = {
    BASE_URL,
    CAMPAIGN_ID,
    GM_EMAIL,
    GM_PASS,
    PLAYER_EMAIL,
    PLAYER_PASS,
    BATTLEMAP_URL,
    RUN_ID,
};
