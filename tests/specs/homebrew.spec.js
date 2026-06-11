// Homebrew browser and editor — browse, create, save for each type

const { test, expect } = require('@playwright/test');
const { nav, waitForCount } = require('../lib/helpers');
const SEL = require('../lib/selectors');
const { CAMPAIGN_ID, RUN_ID } = require('../lib/config');

const HB_BASE = `/homebrew.html?campaign=${CAMPAIGN_ID}`;
const ED_BASE = `/homebrew-editor.html?campaign=${CAMPAIGN_ID}`;

// Helper: create a homebrew item of given type and verify save
async function createHomebrew(page, type, name) {
    await nav(page, `${ED_BASE}&type=${type}&new=1`, 2500);
    const outer = await page.$(SEL.HB_EDITOR.outer);
    expect(outer, `Homebrew editor did not load for type=${type}`).not.toBeNull();

    await page.fill(SEL.HB_EDITOR.nameInput, name);
    await page.fill(SEL.HB_EDITOR.descInput, `QC test ${type} — safe to delete`);

    const saveBtn = await page.$(SEL.HB_EDITOR.saveBtn);
    expect(saveBtn).not.toBeNull();
    await page.evaluate(el => el.click(), saveBtn);
    await page.waitForTimeout(2500);

    const status = await page.$(SEL.HB_EDITOR.statusMsg);
    const statusText = await status?.textContent();
    // Success: status shows saved, or URL changes to ?id=...
    const urlHasId = page.url().includes('id=');
    const savedOk  = urlHasId || (statusText && !statusText.toLowerCase().includes('error'));
    expect(savedOk, `Save failed for type=${type}: status="${statusText}" url=${page.url()}`).toBeTruthy();
}

test.describe('Homebrew Browser', () => {

    test('loads with type filter tabs', async ({ page }) => {
        await nav(page, HB_BASE, 2500);
        const tabs = await page.$$(SEL.HB_BROWSER.typeTabs);
        expect(tabs.length, 'Expected at least 7 type filter tabs').toBeGreaterThanOrEqual(7);
    });

    test('new item button is present', async ({ page }) => {
        await nav(page, HB_BASE, 2500);
        const newBtn = await page.$(SEL.HB_BROWSER.newBtn);
        expect(newBtn).not.toBeNull();
    });

    test('search input is present', async ({ page }) => {
        await nav(page, HB_BASE, 2500);
        const search = await page.$(SEL.HB_BROWSER.searchInput);
        expect(search).not.toBeNull();
    });
});

test.describe('Homebrew Editor — create each type', () => {

    test('create weapon', async ({ page }) => {
        await createHomebrew(page, 'weapon', `QC Sword ${RUN_ID}`);
    });

    test('create armor', async ({ page }) => {
        await createHomebrew(page, 'armor', `QC Armor ${RUN_ID}`);
    });

    test('create loot_item', async ({ page }) => {
        await createHomebrew(page, 'loot_item', `QC Loot Item ${RUN_ID}`);
    });

    test('create domain_card', async ({ page }) => {
        await createHomebrew(page, 'domain_card', `QC Domain Card ${RUN_ID}`);
    });

    test('create ancestry', async ({ page }) => {
        await createHomebrew(page, 'ancestry', `QC Ancestry ${RUN_ID}`);
    });

    test('create community', async ({ page }) => {
        await createHomebrew(page, 'community', `QC Community ${RUN_ID}`);
    });

    test('create class', async ({ page }) => {
        await createHomebrew(page, 'class', `QC Class ${RUN_ID}`);
    });
});

test.describe('Homebrew Editor — identity fields', () => {

    test('name input accepts text', async ({ page }) => {
        await nav(page, `${ED_BASE}&type=weapon&new=1`, 2500);
        await page.fill(SEL.HB_EDITOR.nameInput, 'Test Name');
        const val = await page.$eval(SEL.HB_EDITOR.nameInput, el => el.value);
        expect(val).toBe('Test Name');
    });

    test('type badge shows correct type', async ({ page }) => {
        await nav(page, `${ED_BASE}&type=armor&new=1`, 2500);
        const badge = await page.$(SEL.HB_EDITOR.typeBadge);
        const text  = await badge?.textContent();
        expect(text?.toLowerCase()).toContain('armor');
    });

    test('template picker button opens template list', async ({ page }) => {
        await nav(page, `${ED_BASE}&type=weapon&new=1`, 2500);
        const tplBtn = await page.$(SEL.HB_EDITOR.templateBtn);
        if (!tplBtn) { test.skip(); return; } // Feature may not exist for all types
        await page.evaluate(el => el.click(), tplBtn);
        await page.waitForTimeout(600);
        const search = await page.$(SEL.HB_EDITOR.templateSearch);
        expect(search).not.toBeNull();
    });
});
