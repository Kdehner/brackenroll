// Brackenroll VTT — QC test suite
// Run via: docker run --rm -v $(pwd)/tests:/tests mcr.microsoft.com/playwright:v1.52.0-jammy node /tests/qc.spec.js
// Covers: auth, campaign creation, character builder, handbook, encounter builder,
//         homebrew editor, loot generator, table load, profile, primer

const { chromium } = require('playwright');

const BASE = 'https://devverheart.fwbgaming.win';
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

async function waitForNav(page, url, opts = {}) {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 20000, ...opts });
    // Extra settle time for JS-heavy pages
    await page.waitForTimeout(1500);
}

async function signIn(page, email, password) {
    await waitForNav(page, `${BASE}/signin.html`);
    await page.fill('#signInEmail', email);
    await page.fill('#signInPassword', password);
    await page.click('#emailSignInBtn');
    // Wait for redirect away from signin
    await page.waitForURL(url => !url.href.includes('signin'), { timeout: 15000 });
}

async function checkConsoleErrors(page, testName) {
    const errors = [];
    page.on('console', msg => { if (msg.type() === 'error') errors.push(msg.text()); });
    return errors;
}

// ── Test: Sign-in page loads ───────────────────────────────────────────────
async function testSigninPage(browser) {
    const page = await browser.newPage();
    try {
        await waitForNav(page, `${BASE}/signin.html`);
        const title = await page.title();
        const emailInput = await page.$('#signInEmail');
        const passInput  = await page.$('#signInPassword');
        const submitBtn  = await page.$('#emailSignInBtn');
        if (emailInput && passInput && submitBtn) {
            log('PASS', 'Signin page — form elements present');
        } else {
            log('FAIL', 'Signin page — missing form elements', `email:${!!emailInput} pass:${!!passInput} submit:${!!submitBtn}`);
        }
    } catch (e) {
        log('FAIL', 'Signin page — load error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: GM auth + redirect to index ─────────────────────────────────────
async function testGMAuth(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        const url = page.url();
        if (url.includes('index') || url === `${BASE}/` || url === `${BASE}`) {
            log('PASS', 'GM auth — signed in, redirected to index');
        } else {
            log('WARN', 'GM auth — signed in but redirected to unexpected URL', url);
        }
        if (consoleErrors.length > 0) {
            log('WARN', 'GM auth — console errors', consoleErrors.slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'GM auth — sign-in failed', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Index / Campaign Hub ─────────────────────────────────────────────
async function testIndexPage(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/index.html`);
        await page.waitForTimeout(2000);

        // Check nav is injected
        const nav = await page.$('nav, #nav, .nav');
        if (nav) log('PASS', 'Index — nav injected');
        else log('WARN', 'Index — nav element not found');

        // Check for campaign creation button or existing campaigns
        const createBtn = await page.$('[data-action="create-campaign"], button:has-text("Create"), .create-campaign');
        const campaignList = await page.$('.campaign-card, .campaign-list, [data-campaign-id]');
        if (createBtn || campaignList) {
            log('PASS', 'Index — campaign UI present');
        } else {
            log('WARN', 'Index — no campaign create button or list found');
        }

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Index — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Index page — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Create campaign as GM ────────────────────────────────────────────
async function testCreateCampaign(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/index.html`);
        await page.waitForTimeout(2000);

        // Look for create campaign button
        const createBtn = await page.$('button:has-text("Create"), [data-action="create-campaign"], #create-campaign-btn');
        if (!createBtn) {
            log('WARN', 'Create campaign — create button not found, skipping');
            return null;
        }
        await createBtn.click();
        await page.waitForTimeout(1000);

        // Fill campaign name
        const nameInput = await page.$('input[placeholder*="Campaign"], input[name="name"], #campaign-name');
        if (nameInput) {
            await nameInput.fill('QC Test Campaign');
        } else {
            log('WARN', 'Create campaign — name input not found');
            return null;
        }

        // Submit
        const submitBtn = await page.$('button[type=submit], button:has-text("Create")');
        if (submitBtn) await submitBtn.click();
        await page.waitForTimeout(2000);

        // Check for campaign ID in URL or campaign appearing
        const url = page.url();
        const campaignId = url.match(/[?&]id=([a-f0-9-]{36})/)?.[1];
        if (campaignId) {
            log('PASS', 'Create campaign — created, campaign ID in URL', campaignId);
            return campaignId;
        }

        const campaignCard = await page.$('.campaign-card:has-text("QC Test Campaign")');
        if (campaignCard) {
            log('PASS', 'Create campaign — campaign card visible');
        } else {
            log('WARN', 'Create campaign — campaign created but ID not found in URL');
        }
        return null;
    } catch (e) {
        log('FAIL', 'Create campaign — error', e.message);
        return null;
    } finally {
        await page.close();
    }
}

// ── Test: Handbook loads + tabs work ──────────────────────────────────────
async function testHandbook(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/handbook.html`);
        await page.waitForTimeout(3000);

        // Check tabs exist
        const tabs = await page.$$('[data-tab], .tab-btn, .tab-link, button[role=tab]');
        log(tabs.length >= 3 ? 'PASS' : 'WARN', `Handbook — tabs found: ${tabs.length}`);

        // Check classes grid loaded
        const classCards = await page.$$('.click-card, .class-card, [onclick*="openClassModal"]');
        log(classCards.length >= 9 ? 'PASS' : 'WARN', `Handbook — class cards: ${classCards.length} (expect 9)`);

        // Click first class card and check modal
        if (classCards.length > 0) {
            await classCards[0].click();
            await page.waitForTimeout(800);
            const modal = await page.$('.modal, #modal-shared, [class*="modal"].active');
            log(modal ? 'PASS' : 'FAIL', 'Handbook — class modal opens');
            if (modal) {
                const modalTitle = await page.$('.modal-title');
                const text = modalTitle ? await modalTitle.textContent() : '';
                log(text.trim().length > 0 ? 'PASS' : 'WARN', 'Handbook — modal has class name', text.trim());

                // Check rich text rendered (not raw plain text with bullets)
                const modalDesc = await page.$('.modal-desc');
                if (modalDesc) {
                    const innerHTML = await modalDesc.innerHTML();
                    const hasTags = innerHTML.includes('<p>') || innerHTML.includes('<ul>');
                    log(hasTags ? 'PASS' : 'WARN', 'Handbook — modal description rendered as richText (not plain text)');
                }
                // Close modal
                const closeBtn = await page.$('.modal-close');
                if (closeBtn) await closeBtn.click();
            }
        }

        // Click domain cards tab and check domain card grid
        const dcTab = await page.$('[data-tab="domain-cards"], button:has-text("Domain Cards"), button:has-text("Domains")');
        if (dcTab) {
            await dcTab.click();
            await page.waitForTimeout(1000);
            const dcCards = await page.$$('.dc-card, .domain-card');
            log(dcCards.length > 0 ? 'PASS' : 'WARN', `Handbook — domain cards tab: ${dcCards.length} cards`);
        } else {
            log('WARN', 'Handbook — domain cards tab not found');
        }

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Handbook — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Handbook — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Character Builder ────────────────────────────────────────────────
async function testCharacterBuilder(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/character-builder.html`);
        await page.waitForTimeout(2000);

        // Check roster or start button
        const startBtn = await page.$('button:has-text("New Character"), button:has-text("Create"), #new-char-btn');
        const roster = await page.$('.char-card, .character-card, .roster');
        if (startBtn || roster) {
            log('PASS', 'Character builder — page loaded with UI');
        } else {
            log('WARN', 'Character builder — no start button or roster found');
        }

        if (startBtn) {
            await startBtn.click();
            await page.waitForTimeout(1000);

            // Step 1: should be character name
            const nameInput = await page.$('#char-name, input[placeholder*="name" i]');
            log(nameInput ? 'PASS' : 'WARN', 'Character builder — step 1 name input present');

            // Step 2: class selection
            const nextBtn = await page.$('button:has-text("Next"), .step-next, #btn-next');
            if (nextBtn && nameInput) {
                await nameInput.fill('QC Testchar');
                await nextBtn.click();
                await page.waitForTimeout(1000);
                const classCards = await page.$$('.pick-card[data-class]');
                log(classCards.length >= 9 ? 'PASS' : 'WARN', `Character builder — step 2 class cards: ${classCards.length}`);

                if (classCards.length > 0) {
                    await classCards[0].click();
                    await page.waitForTimeout(500);
                    // Check domains rendered
                    const pickedCard = await page.$('.pick-card.selected');
                    const descText = pickedCard ? await pickedCard.$eval('.pick-desc', el => el.textContent) : '';
                    log(descText.includes('&') || descText.trim().length > 0 ? 'PASS' : 'WARN',
                        'Character builder — class card shows domains', descText.trim().slice(0,50));
                }
            }
        }

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Character builder — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Character builder — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Encounter Builder ────────────────────────────────────────────────
async function testEncounterBuilder(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/encounter-builder.html`);
        await page.waitForTimeout(2000);

        // Check adversary picker loaded
        const searchInput = await page.$('#search, input[placeholder*="Search" i], input[placeholder*="adversary" i]');
        log(searchInput ? 'PASS' : 'WARN', 'Encounter builder — adversary search input present');

        // Check adversary list
        const adversaryItems = await page.$$('.adversary-item, .adv-row, [data-adversary-id]');
        log(adversaryItems.length > 0 ? 'PASS' : 'WARN', `Encounter builder — adversary list: ${adversaryItems.length} items`);

        // Try adding one
        if (adversaryItems.length > 0) {
            await adversaryItems[0].click();
            await page.waitForTimeout(500);
            const entryList = await page.$$('.entry-row, .encounter-entry, [data-entry-id]');
            log(entryList.length > 0 ? 'PASS' : 'WARN', 'Encounter builder — adversary added to encounter');
        }

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Encounter builder — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Encounter builder — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Loot Generator ──────────────────────────────────────────────────
async function testLootGenerator(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/loot-generator.html`);
        await page.waitForTimeout(2000);

        const rollBtn = await page.$('button:has-text("Roll"), #roll-btn, .roll-btn');
        log(rollBtn ? 'PASS' : 'WARN', 'Loot generator — roll button present');

        if (rollBtn) {
            await rollBtn.click();
            await page.waitForTimeout(1500);
            const results = await page.$$('.loot-result, .loot-result-name, [class*="loot-result"]');
            log(results.length > 0 ? 'PASS' : 'WARN', `Loot generator — results after roll: ${results.length}`);
        }

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Loot generator — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Loot generator — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Homebrew Editor (adversary type) ─────────────────────────────────
async function testHomebrewEditor(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/homebrew-editor.html`);
        await page.waitForTimeout(2000);

        // Type selector
        const typeSelect = await page.$('#content-type, select[name="type"], #type-select');
        log(typeSelect ? 'PASS' : 'WARN', 'Homebrew editor — type selector present');

        // Check "Use Template" button
        const templateBtn = await page.$('button:has-text("Template"), button:has-text("Use Template"), #template-btn');
        log(templateBtn ? 'PASS' : 'WARN', 'Homebrew editor — template picker button present');

        // Check name field
        const nameInput = await page.$('#name, input[name="name"], input[placeholder*="name" i]');
        log(nameInput ? 'PASS' : 'WARN', 'Homebrew editor — name input present');

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Homebrew editor — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Homebrew editor — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Homebrew browser ─────────────────────────────────────────────────
async function testHomebrewBrowser(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        // Need a campaign context — try with no campaign param first
        await waitForNav(page, `${BASE}/homebrew.html`);
        await page.waitForTimeout(2000);

        const body = await page.textContent('body');
        if (body.includes('sign in') || body.includes('Sign In')) {
            log('WARN', 'Homebrew browser — requires campaign context, redirected to signin');
        } else {
            const typeFilter = await page.$('#type-filter, select[name="type"], .filter-tabs');
            log(typeFilter ? 'PASS' : 'WARN', 'Homebrew browser — type filter present');
        }

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Homebrew browser — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Homebrew browser — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Library (global homebrew) ───────────────────────────────────────
async function testLibrary(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/library.html`);
        await page.waitForTimeout(2000);

        const body = await page.textContent('body');
        if (body.includes('sign in') || body.includes('Sign In')) {
            log('WARN', 'Library — redirected to signin (unexpected)');
        } else {
            const content = await page.$('.library-grid, .homebrew-list, .item-list, main');
            log(content ? 'PASS' : 'WARN', 'Library — page has content area');
        }

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Library — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Library — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Profile page ─────────────────────────────────────────────────────
async function testProfile(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/profile.html`);
        await page.waitForTimeout(2000);

        const displayNameInput = await page.$('#display-name, input[name="display_name"], input[placeholder*="name" i]');
        log(displayNameInput ? 'PASS' : 'WARN', 'Profile — display name input present');

        const avatarSection = await page.$('.avatar, .avatar-color, #avatar-color');
        log(avatarSection ? 'PASS' : 'WARN', 'Profile — avatar color section present');

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Profile — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Profile — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Table (VTT canvas) ───────────────────────────────────────────────
async function testTable(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/table.html`);
        await page.waitForTimeout(4000);

        const body = await page.textContent('body');
        if (body.includes('sign in') || body.includes('select a campaign') || body.includes('No campaign')) {
            log('WARN', 'Table — requires campaign context, showing prompt');
        } else {
            // Canvas present
            const canvas = await page.$('canvas');
            log(canvas ? 'PASS' : 'WARN', 'Table — Konva canvas present');

            // GM panels
            const panelBtn = await page.$('.panel-btn, .panel-toggle, [data-panel]');
            log(panelBtn ? 'PASS' : 'WARN', 'Table — panel buttons present');

            // Dice buttons
            const diceBtn = await page.$('.dice-btn, button[data-dice], #dice-d20');
            log(diceBtn ? 'PASS' : 'WARN', 'Table — dice buttons present');
        }

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Table — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Table — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Primer (world pages) ─────────────────────────────────────────────
async function testPrimer(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/primer.html`);
        await page.waitForTimeout(2000);

        const body = await page.textContent('body');
        if (body.includes('sign in') || body.includes('select a campaign')) {
            log('WARN', 'Primer — requires campaign context');
        } else {
            const content = await page.$('.page-content, .world-page, main, #page-area');
            log(content ? 'PASS' : 'WARN', 'Primer — content area present');
        }

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Primer — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Primer — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Campaign page ────────────────────────────────────────────────────
async function testCampaignPage(browser) {
    const page = await browser.newPage();
    const consoleErrors = [];
    page.on('console', msg => { if (msg.type() === 'error') consoleErrors.push(msg.text()); });
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        await waitForNav(page, `${BASE}/campaign.html`);
        await page.waitForTimeout(2000);

        // Without ?id= it should show promo / campaign list
        const body = await page.textContent('body');
        const hasContent = body.trim().length > 100;
        log(hasContent ? 'PASS' : 'WARN', 'Campaign page — content present (no ?id=)');

        // Look for "Create Campaign" CTA on promo view
        const createBtn = await page.$('button:has-text("Create"), a:has-text("Create Campaign"), .cta');
        log(createBtn ? 'PASS' : 'WARN', 'Campaign page — create CTA present');

        if (consoleErrors.filter(e => !e.includes('favicon')).length > 0) {
            log('WARN', 'Campaign page — console errors', consoleErrors.filter(e => !e.includes('favicon')).slice(0,3).join(' | '));
        }
    } catch (e) {
        log('FAIL', 'Campaign page — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Player sign-in ───────────────────────────────────────────────────
async function testPlayerAuth(browser) {
    const page = await browser.newPage();
    try {
        await signIn(page, PLAYER_EMAIL, PLAYER_PASS);
        const url = page.url();
        if (url.includes('index') || url === `${BASE}/` || url === `${BASE}`) {
            log('PASS', 'Player auth — signed in successfully');
        } else {
            log('WARN', 'Player auth — unexpected redirect', url);
        }
    } catch (e) {
        log('FAIL', 'Player auth — sign-in failed', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Nav present on all main pages ────────────────────────────────────
async function testNavPresence(browser) {
    const pages = [
        'handbook.html', 'character-builder.html', 'loot-generator.html',
        'profile.html', 'library.html'
    ];
    const page = await browser.newPage();
    try {
        await signIn(page, GM_EMAIL, GM_PASS);
        for (const p of pages) {
            await waitForNav(page, `${BASE}/${p}`);
            await page.waitForTimeout(1500);
            const nav = await page.$('nav, #nav, .nav, .top-nav');
            log(nav ? 'PASS' : 'FAIL', `Nav present — ${p}`);
        }
    } catch (e) {
        log('FAIL', 'Nav presence check — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Test: Unauthed redirect ────────────────────────────────────────────────
async function testUnauthedRedirect(browser) {
    const page = await browser.newPage();
    try {
        await page.goto(`${BASE}/index.html`, { waitUntil: 'networkidle', timeout: 15000 });
        // JS redirect may take a moment
        await page.waitForTimeout(4000);
        const url = page.url();
        log(url.includes('signin') ? 'PASS' : 'WARN', 'Unauthed redirect — unauthenticated user sent to signin', url);
    } catch (e) {
        log('FAIL', 'Unauthed redirect — error', e.message);
    } finally {
        await page.close();
    }
}

// ── Main ───────────────────────────────────────────────────────────────────
(async () => {
    console.log('\n🎲 Brackenroll VTT — QC Test Run');
    console.log(`📍 Target: ${BASE}`);
    console.log('─'.repeat(60));

    const browser = await chromium.launch({ headless: true, args: ['--no-sandbox', '--disable-setuid-sandbox'] });

    await testUnauthedRedirect(browser);
    await testSigninPage(browser);
    await testGMAuth(browser);
    await testPlayerAuth(browser);
    await testIndexPage(browser);
    await testCampaignPage(browser);
    await testCreateCampaign(browser);
    await testHandbook(browser);
    await testCharacterBuilder(browser);
    await testEncounterBuilder(browser);
    await testLootGenerator(browser);
    await testHomebrewEditor(browser);
    await testHomebrewBrowser(browser);
    await testLibrary(browser);
    await testProfile(browser);
    await testTable(browser);
    await testPrimer(browser);
    await testNavPresence(browser);

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
