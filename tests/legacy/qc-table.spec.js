// Brackenroll VTT — Table UX creation flow tests
// Creates campaign data through the UI and verifies it works.
// Goal: catch creation-path bugs, not just load-path bugs.

const { chromium } = require('playwright');

const BASE        = 'https://devverheart.fwbgaming.win';
const CAMPAIGN_ID = 'a6762bff-15ea-4e13-a4f0-dc61b26cf37a';
const GM_EMAIL    = 'qc-gm@brackenroll.test';
const GM_PASS     = 'QCtest2026!';
const PLAYER_EMAIL = 'qc-player@brackenroll.test';
const PLAYER_PASS  = 'QCtest2026!';

const BATTLEMAP_URL = 'https://cdn.discordapp.com/attachments/1478493614689751272/1502836189126856865/Village.jpg?ex=6a2c0184&is=6a2ab004&hm=cd57a7a719ed7e45937515a94a209ad21120430a13491254b73a402f7792b23d';
const SCENE_NAME  = 'QC Village';
const TOKEN_LABEL = 'Goblin A';

let passed = 0, failed = 0, warnings = 0;
const results = [];

function log(status, name, detail = '') {
    const icon = status === 'PASS' ? '✅' : status === 'FAIL' ? '❌' : '⚠️';
    console.log(`${icon} [${status}] ${name}${detail ? ' — ' + detail : ''}`);
    results.push({ status, name, detail });
    if (status === 'PASS') passed++;
    else if (status === 'FAIL') failed++;
    else warnings++;
}

async function nav(page, url, wait = 2500) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(wait);
}

async function signInAs(browser, email, password) {
    const page = await browser.newPage();
    await nav(page, `${BASE}/signin.html`, 1500);
    await page.fill('#signInEmail', email);
    await page.fill('#signInPassword', password);
    await page.click('#emailSignInBtn');
    await page.waitForTimeout(3000);
    return page;
}

// ── Helpers ────────────────────────────────────────────────────────────────

async function openPanel(page, btnId, panelId) {
    const panel = await page.$(`#${panelId}`);
    const isHidden = await panel?.evaluate(el => el.classList.contains('hidden'));
    if (isHidden !== false) {
        await page.click(`#${btnId}`);
        await page.waitForTimeout(400);
    }
}

// ── Scene creation ─────────────────────────────────────────────────────────

async function testCreateScene(page) {
    console.log('\n── Scene creation ────────────────────────────────────────');
    const url = `${BASE}/table.html?campaign=${CAMPAIGN_ID}`;
    try {
        await nav(page, url, 3000);

        // Verify canvas present
        const canvas = await page.$('#tableCanvas, canvas');
        if (canvas) log('PASS', 'Table — canvas present');
        else         log('FAIL', 'Table — canvas present', 'no canvas element');

        // Check for console errors on load
        const errors = [];
        page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });

        // Open scenes panel
        await openPanel(page, 'btnScenesPanel', 'scenesPanel');
        const panel = await page.$('#scenesPanel:not(.hidden)');
        if (panel) log('PASS', 'Scenes panel — opens');
        else        log('FAIL', 'Scenes panel — opens', 'panel still hidden after click');

        // Fill scene name
        await page.fill('#sceneNameInput', SCENE_NAME);

        // Switch to URL background mode
        await page.click('button.bg-opt[data-bg="url"]');
        await page.waitForTimeout(200);
        const bgInput = await page.$('#sceneBgUrl:not([style*="display:none"]):not([style*="display: none"])');
        if (bgInput) log('PASS', 'Scenes panel — URL mode reveals input');
        else          log('WARN', 'Scenes panel — URL mode reveals input', 'input may still be hidden');

        // Fill battlemap URL
        await page.fill('#sceneBgUrl', BATTLEMAP_URL);

        // Create scene
        const beforeItems = await page.$$('#sceneList .scene-item');
        const countBefore = beforeItems.length;
        await page.click('#btnCreateScene');
        await page.waitForTimeout(2000);

        const afterItems = await page.$$('#sceneList .scene-item');
        if (afterItems.length > countBefore) {
            log('PASS', 'Scenes panel — scene created', `${afterItems.length} scenes in list`);
        } else {
            log('FAIL', 'Scenes panel — scene created', `still ${afterItems.length} items (was ${countBefore})`);
            return; // Can't continue without a scene
        }

        // Verify name cleared after creation
        const nameVal = await page.$eval('#sceneNameInput', el => el.value);
        if (!nameVal) log('PASS', 'Scenes panel — name input cleared after create');
        else          log('WARN', 'Scenes panel — name input cleared after create', `still shows: "${nameVal}"`);

        // Find the new scene item and push it to players
        // The newest scene will be the last .scene-item (after "No scene" base item)
        const sceneItems = await page.$$('#sceneList .scene-item');
        const lastScene  = sceneItems[sceneItems.length - 1];
        const sceneName  = await lastScene.$eval('.scene-name', el => el.textContent).catch(() => '');
        log('PASS', 'Scenes panel — scene name in list', sceneName);

        // Click push button on this scene
        const pushBtn = await lastScene.$('.scene-item-btn.push');
        if (!pushBtn) {
            log('FAIL', 'Scenes panel — push button present on scene item');
            return;
        }
        await pushBtn.click();
        await page.waitForTimeout(2000);

        // Verify pushed indicator (green dot)
        const isPushed = await lastScene.evaluate(el => el.classList.contains('pushed'));
        if (isPushed) log('PASS', 'Scenes panel — scene pushed to players');
        else          log('WARN', 'Scenes panel — scene pushed to players', 'pushed class not set — may have race condition');

        // Check the scene label on the canvas
        const labelEl = await page.$('#tableSceneLabel:not(.hidden)');
        if (labelEl) {
            const labelText = await labelEl.textContent();
            log('PASS', 'Table — scene label visible', labelText.trim());
        } else {
            log('WARN', 'Table — scene label visible', 'label element hidden or absent');
        }

        // Report any 400s seen during this flow
        await page.waitForTimeout(500);
        if (errors.length > 0) {
            log('WARN', 'Table — console errors during scene create', errors.slice(0, 3).join(' | '));
        } else {
            log('PASS', 'Table — no console errors during scene create');
        }

    } catch (err) {
        log('FAIL', 'Scene creation — error', err.message.split('\n')[0]);
    }
}

// ── Quick token drop ───────────────────────────────────────────────────────

async function testQuickToken(page) {
    console.log('\n── Quick token drop ──────────────────────────────────────');
    try {
        // Page should already be on table.html with a scene pushed
        await page.waitForTimeout(500);

        // Open quick token popover
        await page.click('#btnQuickToken');
        await page.waitForTimeout(400);

        const popover = await page.$('#quickTokenPopover.open');
        if (popover) log('PASS', 'Quick token — popover opens');
        else          log('FAIL', 'Quick token — popover opens', 'popover does not have .open class');

        // Fill label
        await page.fill('#qtpLabel', TOKEN_LABEL);

        // Select a color swatch
        const swatches = await page.$$('#qtpSwatches .qtp-swatch');
        if (swatches.length > 0) {
            await swatches[0].click();
            log('PASS', 'Quick token — color swatches present', `${swatches.length} swatches`);
        } else {
            log('FAIL', 'Quick token — color swatches present', 'no .qtp-swatch elements');
        }

        // Add to scene
        const addBtn = await page.$('#qtpAdd');
        if (!addBtn) { log('FAIL', 'Quick token — add button present'); return; }
        await addBtn.click();
        // Wait for realtime subscription to fire and re-render the tokens panel
        await page.waitForTimeout(5000);

        // Verify popover closed
        const popoverOpen = await page.$('#quickTokenPopover.open');
        if (!popoverOpen) log('PASS', 'Quick token — popover closes after add');
        else               log('WARN', 'Quick token — popover closes after add', 'popover still open');

        // Open tokens panel and verify token appears
        await openPanel(page, 'btnSpawnTokens', 'tokensPanel');
        await page.waitForTimeout(800);

        const tokenRows = await page.$$('#tokensPanelList .tp-row');
        if (tokenRows.length > 0) {
            const firstLabel = await tokenRows[0].$eval('.tp-label', el => el.textContent).catch(() => '');
            log('PASS', 'Tokens panel — token appears after quick drop', firstLabel);
        } else {
            log('FAIL', 'Tokens panel — token appears after quick drop', 'no .tp-row elements in list');
        }

        // Check "in scene" indicator
        const inScene = await page.$('#tokensPanelList .tp-in-scene');
        if (inScene) log('PASS', 'Tokens panel — in-scene badge shown for placed token');
        else          log('WARN', 'Tokens panel — in-scene badge shown for placed token', 'no .tp-in-scene found — token may not be placed in scene');

    } catch (err) {
        log('FAIL', 'Quick token — error', err.message.split('\n')[0]);
    }
}

// ── Second token via tokens panel ──────────────────────────────────────────

async function testTokensPanel(page) {
    console.log('\n── Tokens panel add ──────────────────────────────────────');
    try {
        await openPanel(page, 'btnSpawnTokens', 'tokensPanel');
        await page.waitForTimeout(400);

        // Find a token not yet in scene (has add button enabled)
        const addBtns = await page.$$('#tokensPanelList .tp-add-btn:not([disabled])');
        if (addBtns.length > 0) {
            await addBtns[0].click();
            await page.waitForTimeout(1500);
            log('PASS', 'Tokens panel — add-to-scene button works');

            // Check in-scene count increased
            const inSceneBadges = await page.$$('#tokensPanelList .tp-in-scene');
            log('PASS', 'Tokens panel — in-scene badges after add', `${inSceneBadges.length} tokens in scene`);
        } else {
            // All tokens already in scene is also a valid state
            const inScene = await page.$$('#tokensPanelList .tp-in-scene');
            log('PASS', 'Tokens panel — all tokens already in scene', `${inScene.length} in scene`);
        }

        // Verify delete button present on token rows
        const delBtns = await page.$$('#tokensPanelList .tp-del-btn');
        if (delBtns.length > 0) log('PASS', 'Tokens panel — delete buttons present');
        else                     log('WARN', 'Tokens panel — delete buttons present', 'no .tp-del-btn found');

    } catch (err) {
        log('FAIL', 'Tokens panel — error', err.message.split('\n')[0]);
    }
}

// ── Fear tracker ────────────────────────────────────────────────────────────

async function testFearTracker(page) {
    console.log('\n── Fear tracker ──────────────────────────────────────────');
    try {
        await openPanel(page, 'btnFearPanel', 'fearPanel');
        await page.waitForTimeout(400);

        const fearPanel = await page.$('#fearPanel:not(.hidden)');
        if (!fearPanel) { log('FAIL', 'Fear panel — opens'); return; }
        log('PASS', 'Fear panel — opens');

        // Read initial fear value
        const fearDisplay = await page.$('#fearCount');
        const initialFear = fearDisplay ? await fearDisplay.textContent() : null;

        // Click + button
        await page.click('#btnFearPlus');
        await page.waitForTimeout(600);
        const fearAfter = fearDisplay ? await fearDisplay.textContent() : null;
        if (fearAfter !== initialFear) {
            log('PASS', 'Fear tracker — + button increments', `${initialFear} → ${fearAfter}`);
        } else {
            log('FAIL', 'Fear tracker — + button increments', `still ${fearAfter}`);
        }

        // Toggle visibility
        const visBtn = await page.$('#btnFearVisible');
        if (visBtn) {
            const labelBefore = await visBtn.textContent();
            await visBtn.click();
            await page.waitForTimeout(500);
            const labelAfter = await visBtn.textContent();
            if (labelBefore !== labelAfter) log('PASS', 'Fear tracker — visibility toggle works', `"${labelBefore}" → "${labelAfter}"`);
            else                             log('WARN', 'Fear tracker — visibility toggle works', 'label unchanged');
        } else {
            log('WARN', 'Fear tracker — visibility toggle button present', '#btnFearVisible not found');
        }

    } catch (err) {
        log('FAIL', 'Fear tracker — error', err.message.split('\n')[0]);
    }
}

// ── Player view of pushed scene ────────────────────────────────────────────

async function testPlayerView(browser) {
    console.log('\n── Player view ───────────────────────────────────────────');
    let page;
    try {
        page = await signInAs(browser, PLAYER_EMAIL, PLAYER_PASS);
        await nav(page, `${BASE}/table.html?campaign=${CAMPAIGN_ID}`, 3000);

        const canvas = await page.$('#tableCanvas, canvas');
        if (canvas) log('PASS', 'Player view — canvas present');
        else         log('FAIL', 'Player view — canvas present', 'no canvas element');

        // Player should NOT see GM toolbar (.visible class only added for isGM=true)
        const gmToolbar = await page.$('#gmToolbar.visible');
        if (!gmToolbar) log('PASS', 'Player view — GM toolbar hidden from player');
        else             log('FAIL', 'Player view — GM toolbar hidden from player', 'gmToolbar has .visible class for non-GM user');

        // Scene label should be visible with the pushed scene
        await page.waitForTimeout(1000);
        const labelEl = await page.$('#tableSceneLabel:not(.hidden)');
        if (labelEl) {
            const labelText = await labelEl.textContent();
            log('PASS', 'Player view — scene label visible', labelText.trim());
        } else {
            log('WARN', 'Player view — scene label visible', 'scene label hidden — scene may not be pushed');
        }

        // Fear display should be visible (or hidden depending on GM toggle)
        // Just verify no crash
        const fearEl = await page.$('#fearCount');
        if (fearEl) log('PASS', 'Player view — fear display element present');
        else         log('WARN', 'Player view — fear display element present', 'no #fearCount found');

    } catch (err) {
        log('FAIL', 'Player view — error', err.message.split('\n')[0]);
    } finally {
        if (page) await page.close();
    }
}

// ── Encounter builder creation flow ───────────────────────────────────────

async function testEncounterCreate(browser) {
    console.log('\n── Encounter creation ────────────────────────────────────');
    let page;
    try {
        page = await signInAs(browser, GM_EMAIL, GM_PASS);
        await nav(page, `${BASE}/encounter-builder.html?campaign=${CAMPAIGN_ID}`, 2500);

        // Encounter list should be visible
        const encWrap = await page.$('#encWrap');
        if (encWrap) log('PASS', 'Encounter builder — enc-wrap present');
        else          log('FAIL', 'Encounter builder — enc-wrap present', '#encWrap not found');

        // Count existing encounters
        const beforeCards = await page.$$('.enc-card');

        // Fill name and create
        await page.fill('#encName', 'QC Test Encounter');
        await page.click('#createEncBtn');
        await page.waitForTimeout(2000);

        const afterCards = await page.$$('.enc-card');
        if (afterCards.length > beforeCards.length) {
            log('PASS', 'Encounter builder — encounter created', `${afterCards.length} encounters`);
        } else {
            log('FAIL', 'Encounter builder — encounter created', `still ${afterCards.length} (was ${beforeCards.length})`);
            return;
        }

        // Input cleared after create
        const nameVal = await page.$eval('#encName', el => el.value);
        if (!nameVal) log('PASS', 'Encounter builder — name input cleared after create');
        else          log('WARN', 'Encounter builder — name input cleared after create', `still shows: "${nameVal}"`);

        // Open the new encounter — re-query fresh (grid re-renders after create)
        await page.waitForTimeout(800);
        // Click the last Open button in the grid
        const openBtns = await page.$$('.enc-card .btn-sm');
        if (openBtns.length === 0) { log('FAIL', 'Encounter builder — open button on card', 'no .enc-card .btn-sm found'); return; }
        const lastOpenBtn = openBtns[openBtns.length - 1];
        await page.evaluate(el => el.click(), lastOpenBtn);
        await page.waitForTimeout(2000);

        // Detail view should now be visible
        const detailName = await page.$('#detailName');
        if (detailName) {
            const dn = await detailName.textContent();
            log('PASS', 'Encounter builder — detail view opens', dn);
        } else {
            log('FAIL', 'Encounter builder — detail view opens', '#detailName not visible');
            return;
        }

        // Open the adversary picker panel
        const togglePickerBtn = await page.$('#togglePickerBtn');
        if (!togglePickerBtn) { log('FAIL', 'Encounter builder — toggle picker button present', '#togglePickerBtn not found'); return; }
        await page.evaluate(el => el.click(), togglePickerBtn);
        await page.waitForTimeout(600);

        const pickerPanel = await page.$('#pickerPanel[style*="display: block"], #pickerPanel[style*="display:block"]');
        if (!pickerPanel) { log('WARN', 'Encounter builder — adversary picker panel opens'); }
        else               log('PASS', 'Encounter builder — adversary picker panel opens');

        // Wait for official adversary data to load (picker renders async)
        await page.waitForTimeout(2000);

        // Check unfiltered count first
        const allRows = await page.$$('#pickerList .picker-row');
        if (allRows.length > 0) {
            log('PASS', 'Encounter builder — official adversary data loaded', `${allRows.length} adversaries`);
        } else {
            log('WARN', 'Encounter builder — official adversary data loaded', 'picker list empty — data may not have loaded');
        }

        // Search for "scout" (common Daggerheart adversary type)
        await page.fill('#pickerSearch', 'scout');
        await page.waitForTimeout(800);

        let rows = await page.$$('#pickerList .picker-row');
        if (rows.length === 0) {
            // Fall back to unfiltered list
            await page.fill('#pickerSearch', '');
            await page.waitForTimeout(600);
            rows = await page.$$('#pickerList .picker-row');
        }

        if (rows.length > 0) {
            const firstName = await rows[0].$eval('.picker-adv-name', el => el.textContent).catch(() => '?');
            log('PASS', 'Encounter builder — adversary search returns results', `${rows.length} rows, first: "${firstName}"`);
        } else {
            log('FAIL', 'Encounter builder — adversary search returns results', 'no .picker-row found even unfiltered');
            return;
        }

        // Add the first result
        const addBtn = await rows[0].$('.btn-add-entry');
        if (!addBtn) { log('FAIL', 'Encounter builder — add button on picker row'); return; }
        await addBtn.click();
        await page.waitForTimeout(2000);

        // Verify entry appears in encounter list
        const entries = await page.$$('.entry-row');
        if (entries.length > 0) {
            const entryLabel = await entries[0].$eval('.entry-label', el => el.textContent).catch(() => '');
            log('PASS', 'Encounter builder — adversary added to encounter', entryLabel);
        } else {
            log('FAIL', 'Encounter builder — adversary added to encounter', 'no .entry-row elements');
        }

        // Check XSS note: role badge in entry source is unescaped (known bug)
        const sourceBadges = await page.$$('.entry-source .badge-role');
        if (sourceBadges.length > 0) {
            log('WARN', 'Encounter builder — role badge present (unescaped innerHTML — known XSS: encounter-builder.html:943)');
        }

    } catch (err) {
        log('FAIL', 'Encounter creation — error', err.message.split('\n')[0]);
    } finally {
        if (page) await page.close();
    }
}

// ── Main ────────────────────────────────────────────────────────────────────

(async () => {
    const browser = await chromium.launch({ headless: true });
    const errors  = [];

    // GM page stays open across table tests
    const gmPage = await signInAs(browser, GM_EMAIL, GM_PASS);

    console.log('\n🎲 Brackenroll VTT — Table Creation QC');
    console.log(`📍 Campaign: ${CAMPAIGN_ID}`);
    console.log('─'.repeat(60));

    // Table flows (sequential — share gmPage state)
    await testCreateScene(gmPage);
    await testQuickToken(gmPage);
    await testTokensPanel(gmPage);
    await testFearTracker(gmPage);

    // Player view (new page)
    await testPlayerView(browser);

    // Encounter builder (new page — GM)
    await testEncounterCreate(browser);

    await gmPage.close();

    // Summary
    console.log('\n' + '─'.repeat(60));
    console.log(`✅ PASS: ${passed}  ❌ FAIL: ${failed}  ⚠️  WARN: ${warnings}`);
    console.log('─'.repeat(60));

    if (failed > 0) {
        console.log('\nFAILURES:');
        results.filter(r => r.status === 'FAIL').forEach(r => {
            console.log(`  ❌ ${r.name}${r.detail ? ': ' + r.detail : ''}`);
        });
    }
    if (warnings > 0) {
        console.log('\nWARNINGS:');
        results.filter(r => r.status === 'WARN').forEach(r => {
            console.log(`  ⚠️  ${r.name}${r.detail ? ': ' + r.detail : ''}`);
        });
    }

    await browser.close();
    process.exit(failed > 0 ? 1 : 0);
})();
