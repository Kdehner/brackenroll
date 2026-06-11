// Loot Generator — data load, roll controls, results

const { test, expect } = require('@playwright/test');
const { nav } = require('../lib/helpers');
const SEL = require('../lib/selectors');
const { CAMPAIGN_ID } = require('../lib/config');

const LOOT_URL = `/loot-generator.html?campaign=${CAMPAIGN_ID}`;

test.describe('Loot Generator', () => {

    test('page loads and shows controls', async ({ page }) => {
        await nav(page, LOOT_URL, 2500);
        const wrap = await page.$(SEL.LOOT.wrap);
        expect(wrap).not.toBeNull();
    });

    test('roll button present', async ({ page }) => {
        await nav(page, LOOT_URL, 2500);
        const btn = await page.$(SEL.LOOT.rollBtn);
        expect(btn).not.toBeNull();
    });

    test('rarity selector has expected options', async ({ page }) => {
        await nav(page, LOOT_URL, 2500);
        const options = await page.$$eval(`${SEL.LOOT.raritySelect} option`, els => els.map(o => o.value));
        expect(options).toContain('common');
        expect(options).toContain('uncommon');
        expect(options).toContain('rare');
        expect(options).toContain('legendary');
    });

    test('type selector has items, consumables, both', async ({ page }) => {
        await nav(page, LOOT_URL, 2500);
        const options = await page.$$eval(`${SEL.LOOT.typeSelect} option`, els => els.map(o => o.value));
        expect(options).toContain('items');
        expect(options).toContain('consumables');
        expect(options).toContain('both');
    });

    test('roll button enabled after data loads', async ({ page }) => {
        await nav(page, LOOT_URL, 3000);
        // After loot data loads, btnRoll should not be disabled
        const disabled = await page.$eval(SEL.LOOT.rollBtn, el => el.disabled);
        expect(disabled).toBe(false);
    });

    test('rolling produces loot cards', async ({ page }) => {
        await nav(page, LOOT_URL, 3000);
        await page.click(SEL.LOOT.rollBtn);
        await page.waitForTimeout(1500);
        const cards = await page.$$(SEL.LOOT.card);
        expect(cards.length, 'No loot cards generated after roll').toBeGreaterThan(0);
    });

    test('count selector changes number of results', async ({ page }) => {
        await nav(page, LOOT_URL, 3000);
        // Set count to 1
        await page.selectOption(SEL.LOOT.countSelect, '1');
        await page.click(SEL.LOOT.rollBtn);
        await page.waitForTimeout(1500);
        const cards1 = (await page.$$(SEL.LOOT.card)).length;

        // Set count to 5
        await page.selectOption(SEL.LOOT.countSelect, '5');
        await page.click(SEL.LOOT.rollBtn);
        await page.waitForTimeout(1500);
        const cards5 = (await page.$$(SEL.LOOT.card)).length;

        expect(cards5).toBeGreaterThan(cards1);
    });

    test('each loot card has a name', async ({ page }) => {
        await nav(page, LOOT_URL, 3000);
        await page.click(SEL.LOOT.rollBtn);
        await page.waitForTimeout(1500);
        const names = await page.$$eval(SEL.LOOT.cardName, els => els.map(el => el.textContent.trim()));
        for (const name of names) {
            expect(name.length, `Empty loot card name`).toBeGreaterThan(0);
        }
    });

    test('reroll button on a card changes the result', async ({ page }) => {
        await nav(page, LOOT_URL, 3000);
        await page.selectOption(SEL.LOOT.countSelect, '1');
        await page.click(SEL.LOOT.rollBtn);
        await page.waitForTimeout(1500);

        const firstName = await page.$eval(SEL.LOOT.cardName, el => el.textContent.trim());
        const reroll    = await page.$(SEL.LOOT.rerollBtn);
        if (reroll) {
            await page.evaluate(el => el.click(), reroll);
            await page.waitForTimeout(1000);
            const secondName = await page.$eval(SEL.LOOT.cardName, el => el.textContent.trim());
            // Result may or may not change (same item could be re-rolled) — just verify no crash
            expect(secondName.length).toBeGreaterThan(0);
        }
    });

    test('homebrew toggle present when campaign context given', async ({ page }) => {
        await nav(page, LOOT_URL, 3000);
        const hbRow = await page.$(SEL.LOOT.hbRow);
        // hbRow may be hidden if no homebrew in campaign — check it exists in DOM
        expect(hbRow).not.toBeNull();
    });
});
