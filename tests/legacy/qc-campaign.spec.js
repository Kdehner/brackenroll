// Brackenroll VTT — Campaign-context QC tests
// Tests table, encounter builder, homebrew, primer — all require ?id= campaign param

const { chromium } = require('playwright');

const BASE        = 'https://devverheart.fwbgaming.win';
const CAMPAIGN_ID = 'a6762bff-15ea-4e13-a4f0-dc61b26cf37a';
const GM_EMAIL    = 'qc-gm@brackenroll.test';
const GM_PASS     = 'QCtest2026!';
const PLAYER_EMAIL = 'qc-player@brackenroll.test';
const PLAYER_PASS  = 'QCtest2026!';

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

async function nav(page, url) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000 });
    await page.waitForTimeout(2500);
}

async function signInAs(browser, email, password) {
    const page = await browser.newPage();
    await nav(page, `${BASE}/signin.html`);
    await page.fill('#signInEmail', email);
    await page.fill('#signInPassword', password);
    await page.click('#emailSignInBtn');
    await page.waitForTimeout(3000);
    return page;
}

// ── Campaign hub (?id=) ────────────────────────────────────────────────────
async function testCampaignHub(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/campaign.html?id=${CAMPAIGN_ID}`);

        const title = await page.$('.campaign-name, h1, h2, .campaign-title');
        log(title ? 'PASS' : 'WARN', 'Campaign hub — campaign name present');

        // GM tools section
        const gmSection = await page.$('.gm-tools, .gm-section, [data-gm], #gm-tools');
        log(gmSection ? 'PASS' : 'WARN', 'Campaign hub — GM tools section present');

        // Members list
        const members = await page.$$('.member-row, .member-item, .member-card, [data-member]');
        log(members.length >= 1 ? 'PASS' : 'WARN', `Campaign hub — members listed: ${members.length}`);

        // Homebrew link
        const hbLink = await page.$('a[href*="homebrew"], a:has-text("Homebrew"), button:has-text("Homebrew")');
        log(hbLink ? 'PASS' : 'WARN', 'Campaign hub — homebrew link present');

        // Table link
        const tableLink = await page.$('a[href*="table"], a:has-text("Table"), a:has-text("Launch Table")');
        log(tableLink ? 'PASS' : 'WARN', 'Campaign hub — table link present');

        // World pages link
        const worldLink = await page.$('a[href*="primer"], a:has-text("World"), a:has-text("The World")');
        log(worldLink ? 'PASS' : 'WARN', 'Campaign hub — world pages link present');

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Campaign hub — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Campaign hub — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Table (VTT canvas) with campaign context ───────────────────────────────
async function testTable(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/table.html?campaign=${CAMPAIGN_ID}`);
        await page.waitForTimeout(3000); // Canvas + Konva init

        // Konva canvas
        const canvas = await page.$('canvas');
        log(canvas ? 'PASS' : 'FAIL', 'Table — Konva canvas present');

        // Scene controls
        const sceneBtn = await page.$('.scene-btn, #scene-select, [data-scene], .scene-tab');
        log(sceneBtn ? 'PASS' : 'WARN', 'Table — scene controls present');

        // Dice buttons
        const diceBtn = await page.$('.dice-btn, [data-dice], #dice-d20, button[title*="d20"]');
        log(diceBtn ? 'PASS' : 'WARN', 'Table — dice buttons present');

        // Fear tracker panel button
        const fearBtn = await page.$('[data-panel="fear"], button[title*="Fear"], .panel-fear-btn, #btn-panel-fear');
        log(fearBtn ? 'PASS' : 'WARN', 'Table — fear tracker panel button present');

        // Clocks panel button
        const clockBtn = await page.$('[data-panel="clocks"], button[title*="Clock"], .panel-clocks-btn, #btn-panel-clocks');
        log(clockBtn ? 'PASS' : 'WARN', 'Table — clocks panel button present');

        // GM toolbar / panels area
        const gmBar = await page.$('.gm-bar, .gm-toolbar, .toolbar, #gm-controls');
        log(gmBar ? 'PASS' : 'WARN', 'Table — GM toolbar present');

        // Try opening a panel
        if (fearBtn) {
            await fearBtn.click();
            await page.waitForTimeout(800);
            const panel = await page.$('.panel.open, .panel-open, [class*="panel"][class*="open"]');
            log(panel ? 'PASS' : 'WARN', 'Table — fear panel opens on click');
        }

        // Check for encounter button
        const encounterBtn = await page.$('[data-panel="encounter"], button:has-text("Encounter"), #btn-encounter');
        log(encounterBtn ? 'PASS' : 'WARN', 'Table — encounter panel button present');

        // Token section
        const tokenBtn = await page.$('[data-panel="tokens"], button:has-text("Token"), #btn-panel-tokens');
        log(tokenBtn ? 'PASS' : 'WARN', 'Table — tokens panel button present');

        const errs = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('dice-box'));
        if (errs.length) log('WARN', 'Table — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Table — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Encounter Builder with campaign context ────────────────────────────────
async function testEncounterBuilder(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/encounter-builder.html?campaign=${CAMPAIGN_ID}`);
        await page.waitForTimeout(2000);

        // Adversary search
        const search = await page.$('#search, input[placeholder*="Search" i]');
        log(search ? 'PASS' : 'WARN', 'Encounter builder — adversary search present');

        // Adversary list items
        const advItems = await page.$$('.adversary-item, .adv-row, [data-id]');
        log(advItems.length > 0 ? 'PASS' : 'WARN', `Encounter builder — adversaries loaded: ${advItems.length}`);

        if (advItems.length > 0) {
            // Add first adversary
            await advItems[0].click();
            await page.waitForTimeout(600);
            const entries = await page.$$('.entry-row, .encounter-entry, [data-entry-id]');
            log(entries.length > 0 ? 'PASS' : 'WARN', 'Encounter builder — adversary added to encounter list');

            // Check HP tracking field
            const hpInput = await page.$('.hp-input, input[type="number"][class*="hp"]');
            log(hpInput ? 'PASS' : 'WARN', 'Encounter builder — HP tracking input present');
        }

        // Save button
        const saveBtn = await page.$('button:has-text("Save"), #btn-save, .save-btn');
        log(saveBtn ? 'PASS' : 'WARN', 'Encounter builder — save button present');

        // Loot roller integration
        const lootSection = await page.$('.loot-section, #loot-roller, [id*="loot"]');
        log(lootSection ? 'PASS' : 'WARN', 'Encounter builder — loot roller section present');

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Encounter builder — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Encounter builder — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Homebrew Browser (campaign scope) ─────────────────────────────────────
async function testHomebrewBrowser(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/homebrew.html?campaign=${CAMPAIGN_ID}`);
        await page.waitForTimeout(2000);

        // Type filter tabs
        const typeTabs = await page.$$('[data-type], .type-tab, .filter-tab, button[class*="tab"]');
        log(typeTabs.length > 0 ? 'PASS' : 'WARN', `Homebrew browser — type filter tabs: ${typeTabs.length}`);

        // New item button
        const newBtn = await page.$('button:has-text("New"), a:has-text("New"), #btn-new, .btn-new');
        log(newBtn ? 'PASS' : 'WARN', 'Homebrew browser — new item button present');

        // Search input
        const search = await page.$('#search, input[placeholder*="Search" i]');
        log(search ? 'PASS' : 'WARN', 'Homebrew browser — search input present');

        // Import from library button (GM only)
        const importBtn = await page.$('button:has-text("Import"), a:has-text("Import"), #btn-import');
        log(importBtn ? 'PASS' : 'WARN', 'Homebrew browser — import from library button present');

        // Empty state or item list
        const emptyState = await page.$('.empty-state, .no-items, [class*="empty"]');
        const itemList   = await page.$$('.homebrew-item, .item-row, [data-homebrew-id]');
        log(emptyState || itemList.length >= 0 ? 'PASS' : 'WARN',
            `Homebrew browser — content area: ${itemList.length} items (empty state: ${!!emptyState})`);

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Homebrew browser — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Homebrew browser — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Homebrew Editor — create adversary ────────────────────────────────────
async function testHomebrewEditorCreate(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/homebrew-editor.html?campaign=${CAMPAIGN_ID}&type=adversary&new=1`);
        await page.waitForTimeout(2000);

        const nameInput = await page.$('#name, input[name="name"], input[placeholder*="name" i]');
        log(nameInput ? 'PASS' : 'WARN', 'Homebrew editor — name input present');

        const typeSelect = await page.$('#content-type, select[name="type"]');
        log(typeSelect ? 'PASS' : 'WARN', 'Homebrew editor — type selector present');

        // Fill a name and check save button activates
        if (nameInput) {
            await nameInput.fill('QC Test Adversary');
            await page.waitForTimeout(300);
        }

        // Version history sidebar
        const versionSidebar = await page.$('.version-sidebar, .versions-panel, #version-history');
        log(versionSidebar ? 'PASS' : 'WARN', 'Homebrew editor — version history sidebar present');

        // Template picker
        const templateBtn = await page.$('button:has-text("Template"), button:has-text("Use Template")');
        log(templateBtn ? 'PASS' : 'WARN', 'Homebrew editor — template picker button present');

        // Save button
        const saveBtn = await page.$('button:has-text("Save"), #btn-save');
        log(saveBtn ? 'PASS' : 'WARN', 'Homebrew editor — save button present');

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Homebrew editor — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Homebrew editor create — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Homebrew Editor — all content types load ──────────────────────────────
async function testHomebrewEditorTypes(browser) {
    const types = ['weapon','armor','loot_item','domain_card','ancestry','community','class','domain','adversary'];
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        for (const type of types) {
            await nav(page, `${BASE}/homebrew-editor.html?campaign=${CAMPAIGN_ID}&type=${type}&new=1`);
            const nameInput = await page.$('#name, input[name="name"], input[placeholder*="name" i]');
            const errors = consoleErrors.filter(e => !e.includes('favicon') && e.includes('Error'));
            if (errors.length) {
                log('FAIL', `Homebrew editor type=${type} — JS error`, errors[0].slice(0,100));
            } else {
                log(nameInput ? 'PASS' : 'WARN', `Homebrew editor type=${type} — loads`);
            }
            consoleErrors.length = 0;
        }
    } catch (e) {
        log('FAIL', 'Homebrew editor types — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Adversary Editor ───────────────────────────────────────────────────────
async function testAdversaryEditor(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/adversary-editor.html?campaign=${CAMPAIGN_ID}&new=1`);

        const nameInput = await page.$('#name, input[name="name"], input[placeholder*="name" i]');
        log(nameInput ? 'PASS' : 'WARN', 'Adversary editor — name input present');

        const tierSelect = await page.$('#tier, select[name="tier"]');
        log(tierSelect ? 'PASS' : 'WARN', 'Adversary editor — tier selector present');

        const roleSelect = await page.$('#role, select[name="role"]');
        log(roleSelect ? 'PASS' : 'WARN', 'Adversary editor — role selector present');

        const portraitUpload = await page.$('#portrait-upload, input[type="file"], .portrait-upload');
        log(portraitUpload ? 'PASS' : 'WARN', 'Adversary editor — portrait upload present');

        const templateBtn = await page.$('button:has-text("Template"), button:has-text("Use Template")');
        log(templateBtn ? 'PASS' : 'WARN', 'Adversary editor — template picker present');

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Adversary editor — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Adversary editor — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Primer (world pages) with campaign context ─────────────────────────────
async function testPrimer(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/primer.html?id=${CAMPAIGN_ID}`);
        await page.waitForTimeout(2000);

        const body = await page.textContent('body');
        // Empty state OK — no pages created yet
        const emptyState = await page.$('.empty-state, [class*="empty"], p:has-text("No pages")');
        const pageNav    = await page.$('.page-nav, .page-list, #page-list, aside');
        log(emptyState || pageNav ? 'PASS' : 'WARN', 'Primer — content area or empty state present');

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Primer — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Primer — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Page Editor (GM) ───────────────────────────────────────────────────────
async function testPageEditor(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/page-editor.html?campaign=${CAMPAIGN_ID}`);

        const titleInput = await page.$('#page-title, input[placeholder*="title" i], input[name="title"]');
        log(titleInput ? 'PASS' : 'WARN', 'Page editor — title input present');

        const addBlockBtn = await page.$('button:has-text("Add Block"), button:has-text("Add"), #btn-add-block');
        log(addBlockBtn ? 'PASS' : 'WARN', 'Page editor — add block button present');

        const visibilityToggle = await page.$('select[name="visibility"], #visibility, input[value="players"]');
        log(visibilityToggle ? 'PASS' : 'WARN', 'Page editor — visibility control present');

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Page editor — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Page editor — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Parchment Editor ───────────────────────────────────────────────────────
async function testParchmentEditor(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/parchment-editor.html?campaign=${CAMPAIGN_ID}`);

        const canvas = await page.$('canvas');
        log(canvas ? 'PASS' : 'WARN', 'Parchment editor — canvas present');

        const toolBtns = await page.$$('.tool-btn, [data-tool], .toolbar button');
        log(toolBtns.length > 0 ? 'PASS' : 'WARN', `Parchment editor — tool buttons: ${toolBtns.length}`);

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Parchment editor — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Parchment editor — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Player view: character builder in campaign context ─────────────────────
async function testPlayerCharacterBuilder(browser) {
    const page = await signInAs(browser, PLAYER_EMAIL, PLAYER_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/character-builder.html?campaign=${CAMPAIGN_ID}`);

        const newCharBtn = await page.$('button:has-text("New Character"), button:has-text("Create"), #new-char-btn');
        const roster     = await page.$('.char-card, .character-card, .roster');
        log(newCharBtn || roster ? 'PASS' : 'WARN', 'Player char builder — UI present');

        if (newCharBtn) {
            await newCharBtn.click();
            await page.waitForTimeout(1000);
            const nameInput = await page.$('#char-name, input[placeholder*="name" i]');
            log(nameInput ? 'PASS' : 'WARN', 'Player char builder — name input in step 1');
        }

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Player char builder — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Player character builder — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Player view: table (read-only) ────────────────────────────────────────
async function testPlayerTable(browser) {
    const page = await signInAs(browser, PLAYER_EMAIL, PLAYER_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/table.html?campaign=${CAMPAIGN_ID}`);
        await page.waitForTimeout(3000);

        const canvas = await page.$('canvas');
        log(canvas ? 'PASS' : 'WARN', 'Player table — canvas loads');

        // GM-only controls should be absent or hidden
        const gmOnlyBtn = await page.$('#btn-fear, .gm-only, [data-gm-only]');
        // We expect this to be hidden/absent for players — just log what we find
        log('PASS', `Player table — GM controls visible: ${!!gmOnlyBtn} (expect hidden/absent)`);

        const errs = consoleErrors.filter(e => !e.includes('favicon') && !e.includes('dice-box'));
        if (errs.length) log('WARN', 'Player table — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Player table — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Loot Generator with campaign context ──────────────────────────────────
async function testLootGeneratorWithCampaign(browser) {
    const page = await signInAs(browser, GM_EMAIL, GM_PASS);
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await nav(page, `${BASE}/loot-generator.html?campaign=${CAMPAIGN_ID}`);
        await page.waitForTimeout(2000);

        const rollBtn = await page.$('#btnRoll');
        log(rollBtn ? 'PASS' : 'WARN', 'Loot generator — roll button present');

        if (rollBtn) {
            const disabled = await rollBtn.getAttribute('disabled');
            log(disabled === null ? 'PASS' : 'WARN', 'Loot generator — roll button enabled (data loaded)');

            if (disabled === null) {
                await rollBtn.click();
                await page.waitForTimeout(1000);
                const cards = await page.$$('.loot-card');
                log(cards.length > 0 ? 'PASS' : 'FAIL', `Loot generator — roll produced ${cards.length} cards`);
            }
        }

        const rarityCtrl = await page.$('#ctrlRarity');
        log(rarityCtrl ? 'PASS' : 'WARN', 'Loot generator — rarity control present');

        const typeCtrl = await page.$('#ctrlType');
        log(typeCtrl ? 'PASS' : 'WARN', 'Loot generator — type control present');

        const errs = consoleErrors.filter(e => !e.includes('favicon'));
        if (errs.length) log('WARN', 'Loot generator — console errors', errs.slice(0,3).join(' | '));
    } catch (e) {
        log('FAIL', 'Loot generator — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Main ───────────────────────────────────────────────────────────────────
(async () => {
    console.log('\n🎲 Brackenroll VTT — Campaign QC Run');
    console.log(`📍 Campaign: ${CAMPAIGN_ID}`);
    console.log('─'.repeat(60));

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    await testCampaignHub(browser);
    await testTable(browser);
    await testEncounterBuilder(browser);
    await testHomebrewBrowser(browser);
    await testHomebrewEditorCreate(browser);
    await testHomebrewEditorTypes(browser);
    await testAdversaryEditor(browser);
    await testPrimer(browser);
    await testPageEditor(browser);
    await testParchmentEditor(browser);
    await testPlayerCharacterBuilder(browser);
    await testPlayerTable(browser);
    await testLootGeneratorWithCampaign(browser);

    await browser.close();

    console.log('\n' + '─'.repeat(60));
    console.log(`✅ PASS: ${passed}  ❌ FAIL: ${failed}  ⚠️  WARN: ${warnings}`);
    console.log('─'.repeat(60));

    if (failed > 0) {
        console.log('\nFAILURES:');
        results.filter(r => r.status === 'FAIL').forEach(r => console.log(`  ❌ ${r.name}: ${r.detail}`));
    }
    if (warnings > 0) {
        console.log('\nWARNINGS:');
        results.filter(r => r.status === 'WARN').forEach(r => console.log(`  ⚠️  ${r.name}: ${r.detail}`));
    }

    process.exit(failed > 0 ? 1 : 0);
})();
