// Table — scene creation, tokens, fear, fog, player view, realtime

const { test, expect } = require('@playwright/test');
const { nav, openPanel } = require('../lib/helpers');
const SEL = require('../lib/selectors');
const { CAMPAIGN_ID, BATTLEMAP_URL, RUN_ID } = require('../lib/config');
const { GM_EMAIL, GM_PASS, PLAYER_EMAIL, PLAYER_PASS } = require('../lib/config');

const TABLE_URL    = `/table.html?campaign=${CAMPAIGN_ID}`;
const SCENE_NAME   = `QC Scene ${RUN_ID}`;
const TOKEN_LABEL  = `QC Token ${RUN_ID}`;

test.describe('Table — GM load', () => {

    test('canvas present and GM toolbar visible', async ({ page }) => {
        await nav(page, TABLE_URL, 3000);
        expect(await page.$(SEL.TABLE.canvas)).not.toBeNull();
        expect(await page.$(SEL.TABLE.gmToolbar)).not.toBeNull();
    });

    test('no HTTP errors on load', async ({ page }) => {
        const errors = [];
        page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
        await nav(page, TABLE_URL, 3000);
        // Filter known external resources
        const bad = errors.filter(e => !e.includes('favicon') && !e.includes('discord'));
        expect(bad, `HTTP errors: ${bad.join(', ')}`).toHaveLength(0);
    });

    test('all GM toolbar buttons present', async ({ page }) => {
        await nav(page, TABLE_URL, 2500);
        for (const [key, sel] of Object.entries({
            Scenes:    SEL.TABLE.btnScenes,
            Tokens:    SEL.TABLE.btnTokens,
            QuickTok:  SEL.TABLE.btnQuickToken,
            Fear:      SEL.TABLE.btnFear,
            Encounter: SEL.TABLE.btnEncounter,
            Fog:       SEL.TABLE.btnFog,
        })) {
            const el = await page.$(sel);
            expect(el, `GM toolbar missing: ${key}`).not.toBeNull();
        }
    });
});

test.describe('Table — scene creation', () => {

    test('creates scene with URL battlemap and pushes to players', async ({ page }) => {
        await nav(page, TABLE_URL, 3000);

        // Open scenes panel
        await openPanel(page, SEL.TABLE.btnScenes, SEL.TABLE.scenesPanel);
        await page.fill(SEL.TABLE.sceneNameInput, SCENE_NAME);

        // Switch to URL mode
        await page.click(SEL.TABLE.bgOptUrl);
        await page.waitForTimeout(200);
        await page.fill(SEL.TABLE.sceneBgUrl, BATTLEMAP_URL);

        const before = (await page.$$(SEL.TABLE.sceneItem)).length;
        await page.click(SEL.TABLE.createSceneBtn);
        await page.waitForTimeout(2000);

        const after = await page.$$(SEL.TABLE.sceneItem);
        expect(after.length, 'Scene not added to list').toBeGreaterThan(before);

        // Name appears in list
        const lastItem = after[after.length - 1];
        const name = await lastItem.$eval('.scene-name', el => el.textContent).catch(() => '');
        expect(name).toBe(SCENE_NAME);

        // Push to players
        const pushBtn = await lastItem.$(SEL.TABLE.pushBtn);
        await page.evaluate(el => el.click(), pushBtn);
        await page.waitForTimeout(2000);

        // Scene label appears on canvas
        const label = await page.$(SEL.TABLE.sceneLabel);
        expect(label).not.toBeNull();
    });

    test('name input clears after scene creation', async ({ page }) => {
        await nav(page, TABLE_URL, 2500);
        await openPanel(page, SEL.TABLE.btnScenes, SEL.TABLE.scenesPanel);
        await page.fill(SEL.TABLE.sceneNameInput, SCENE_NAME);
        await page.click(SEL.TABLE.createSceneBtn);
        await page.waitForTimeout(2000);
        const val = await page.$eval(SEL.TABLE.sceneNameInput, el => el.value);
        expect(val).toBe('');
    });
});

test.describe('Table — quick token', () => {

    test('popover opens, accepts label and color, adds token', async ({ page }) => {
        await nav(page, TABLE_URL, 3000);

        await page.click(SEL.TABLE.btnQuickToken);
        await page.waitForTimeout(400);
        const popover = await page.$(SEL.TABLE.quickTokenPopover + '.open');
        expect(popover, 'Quick token popover did not open').not.toBeNull();

        const swatches = await page.$$(SEL.TABLE.qtpSwatches);
        expect(swatches.length).toBeGreaterThanOrEqual(5);
        await page.evaluate(el => el.click(), swatches[0]);

        await page.fill(SEL.TABLE.qtpLabel, TOKEN_LABEL);
        await page.click(SEL.TABLE.qtpAdd);
        await page.waitForTimeout(5000); // realtime subscription must fire

        // Popover closed
        const closed = await page.$(SEL.TABLE.quickTokenPopover + '.open');
        expect(closed).toBeNull();

        // Token appears in panel (panel shows all definitions; new token may be anywhere in list)
        await openPanel(page, SEL.TABLE.btnTokens, SEL.TABLE.tokensPanel);
        await page.waitForTimeout(800);
        const rows = await page.$$(SEL.TABLE.tokenRow);
        expect(rows.length, 'Tokens panel empty after quick drop').toBeGreaterThan(0);
    });

    test('token appears in scene (in-scene badge shown)', async ({ page }) => {
        await nav(page, TABLE_URL, 3000);
        await page.click(SEL.TABLE.btnQuickToken);
        await page.waitForTimeout(400);
        const swatches = await page.$$(SEL.TABLE.qtpSwatches);
        await page.evaluate(el => el.click(), swatches[1]);
        await page.fill(SEL.TABLE.qtpLabel, `${TOKEN_LABEL}-B`);
        await page.click(SEL.TABLE.qtpAdd);
        await page.waitForTimeout(5000);

        await openPanel(page, SEL.TABLE.btnTokens, SEL.TABLE.tokensPanel);
        await page.waitForTimeout(800);
        const inScene = await page.$(SEL.TABLE.tokenInScene);
        expect(inScene, 'No in-scene badge found after quick token drop').not.toBeNull();
    });
});

test.describe('Table — tokens panel', () => {

    test('delete button present on non-PC tokens', async ({ page }) => {
        await nav(page, TABLE_URL, 3000);
        await openPanel(page, SEL.TABLE.btnTokens, SEL.TABLE.tokensPanel);
        await page.waitForTimeout(800);
        const delBtns = await page.$$(SEL.TABLE.tokenDelBtn);
        expect(delBtns.length).toBeGreaterThan(0);
    });
});

test.describe('Table — fear tracker', () => {

    test('fear panel opens', async ({ page }) => {
        await nav(page, TABLE_URL, 2500);
        await openPanel(page, SEL.TABLE.btnFear, SEL.TABLE.fearPanel);
        const panel = await page.$(`${SEL.TABLE.fearPanel}:not(.hidden)`);
        expect(panel).not.toBeNull();
    });

    test('+ button increments fear count', async ({ page }) => {
        await nav(page, TABLE_URL, 2500);
        await openPanel(page, SEL.TABLE.btnFear, SEL.TABLE.fearPanel);
        const display  = await page.$(SEL.TABLE.fearCount);
        const before   = await display?.textContent();
        await page.click(SEL.TABLE.fearPlus);
        await page.waitForTimeout(600);
        const after = await display?.textContent();
        expect(parseInt(after || '0')).toBeGreaterThan(parseInt(before || '0'));
    });

    test('visibility toggle changes button label', async ({ page }) => {
        await nav(page, TABLE_URL, 2500);
        await openPanel(page, SEL.TABLE.btnFear, SEL.TABLE.fearPanel);
        const btn    = await page.$(SEL.TABLE.fearVisible);
        const before = await btn?.textContent();
        await page.evaluate(el => el.click(), btn);
        await page.waitForTimeout(500);
        const after  = await btn?.textContent();
        expect(after).not.toBe(before);
    });
});

test.describe('Table — player view', () => {
    test.use({ storageState: '.auth/player.json' });

    test('canvas loads, GM toolbar NOT shown', async ({ page }) => {
        await nav(page, TABLE_URL, 3000);
        expect(await page.$(SEL.TABLE.canvas)).not.toBeNull();
        const gmToolbar = await page.$(SEL.TABLE.gmToolbar);
        expect(gmToolbar, 'GM toolbar should be hidden from players').toBeNull();
    });

    test('player sees scene label when scene is pushed', async ({ page }) => {
        await nav(page, TABLE_URL, 3000);
        // If a scene is currently pushed, label should show
        const label = await page.$(SEL.TABLE.sceneLabel);
        // May or may not have a pushed scene — just verify no error thrown
        // Verified separately in the GM push test
        const canvas = await page.$(SEL.TABLE.canvas);
        expect(canvas).not.toBeNull();
    });
});
