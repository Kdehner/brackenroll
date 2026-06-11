// Character Builder — step navigation, full creation flow, save to DB

const { test, expect } = require('@playwright/test');
const { nav, waitForCount } = require('../lib/helpers');
const SEL = require('../lib/selectors');
const { RUN_ID } = require('../lib/config');

const CHAR_NAME = `QC Hero ${RUN_ID}`;

test.describe('Character Builder — page load', () => {

    test('loads roster view with new-character button', async ({ page }) => {
        await nav(page, '/character-builder.html', 2000);
        const rosterView = await page.$(SEL.CHAR_BUILDER.rosterView);
        expect(rosterView, 'Roster view not present').not.toBeNull();
        const newBtn = await page.$(SEL.CHAR_BUILDER.newCharBtn);
        expect(newBtn, '#btn-new-char not found').not.toBeNull();
    });

    test('clicking new-character reveals step 1 form fields', async ({ page }) => {
        await nav(page, '/character-builder.html', 2000);
        await page.click(SEL.CHAR_BUILDER.newCharBtn);
        await page.waitForTimeout(500);
        await expect(page.locator(SEL.CHAR_BUILDER.nameInput)).toBeVisible();
        await expect(page.locator(SEL.CHAR_BUILDER.pronounsInput)).toBeVisible();
        await expect(page.locator(SEL.CHAR_BUILDER.conceptInput)).toBeVisible();
        const step1 = await page.$('#step-1.active');
        expect(step1).not.toBeNull();
    });

    test('next button blocked without a name', async ({ page }) => {
        await nav(page, '/character-builder.html', 1500);
        await page.click(SEL.CHAR_BUILDER.newCharBtn);
        await page.waitForTimeout(400);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(300);
        // Should still be on step 1 (error shown or no navigation)
        const step1 = await page.$('#step-1.active');
        expect(step1).not.toBeNull();
    });
});

test.describe('Character Builder — step navigation', () => {

    test('step 1 → 2: entering name and clicking next shows class grid', async ({ page }) => {
        await nav(page, '/character-builder.html', 2000);
        await page.click(SEL.CHAR_BUILDER.newCharBtn);
        await page.waitForTimeout(400);
        await page.fill(SEL.CHAR_BUILDER.nameInput, CHAR_NAME);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(2000);
        const step2 = await page.$('#step-2.active');
        expect(step2).not.toBeNull();
        // Class grid should have cards
        const cards = await waitForCount(page, SEL.CHAR_BUILDER.classCard, 9);
        expect(cards.length).toBeGreaterThanOrEqual(9);
    });

    test('back button returns to step 1', async ({ page }) => {
        await nav(page, '/character-builder.html', 2000);
        await page.click(SEL.CHAR_BUILDER.newCharBtn);
        await page.waitForTimeout(400);
        await page.fill(SEL.CHAR_BUILDER.nameInput, CHAR_NAME);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1500);
        await page.click(SEL.CHAR_BUILDER.backBtn);
        await page.waitForTimeout(500);
        const step1 = await page.$('#step-1.active');
        expect(step1).not.toBeNull();
        // Name preserved
        const name = await page.$eval(SEL.CHAR_BUILDER.nameInput, el => el.value);
        expect(name).toBe(CHAR_NAME);
    });

    test('step 2 → 3: selecting a class shows subclass grid', async ({ page }) => {
        await nav(page, '/character-builder.html', 2000);
        await page.click(SEL.CHAR_BUILDER.newCharBtn);
        await page.waitForTimeout(400);
        await page.fill(SEL.CHAR_BUILDER.nameInput, CHAR_NAME);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await waitForCount(page, SEL.CHAR_BUILDER.classCard, 9, 20000); // Supabase fetch may be slow
        // Click first class
        const firstClass = await page.$(SEL.CHAR_BUILDER.classCard);
        await page.evaluate(el => el.click(), firstClass);
        await page.waitForTimeout(300);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1500);
        const step3 = await page.$('#step-3.active');
        expect(step3).not.toBeNull();
        const subCards = await waitForCount(page, SEL.CHAR_BUILDER.subclassCard, 1);
        expect(subCards.length).toBeGreaterThanOrEqual(1);
    });
});

test.describe('Character Builder — full creation flow', () => {

    test('creates character end-to-end and saves', async ({ page }) => {
        await nav(page, '/character-builder.html', 2500);
        await page.click(SEL.CHAR_BUILDER.newCharBtn);
        await page.waitForTimeout(500);

        // Step 1: Identity
        await page.fill(SEL.CHAR_BUILDER.nameInput, CHAR_NAME);
        await page.fill(SEL.CHAR_BUILDER.pronounsInput, 'they/them');
        await page.fill(SEL.CHAR_BUILDER.conceptInput, 'QC test character — safe to delete');
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await waitForCount(page, SEL.CHAR_BUILDER.classCard, 9, 20000);

        // Step 2: Class — pick first
        const classCard = await page.$(SEL.CHAR_BUILDER.classCard);
        await page.evaluate(el => el.click(), classCard);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1500);

        // Step 3: Subclass — pick first
        await waitForCount(page, SEL.CHAR_BUILDER.subclassCard, 1);
        const subCard = await page.$(SEL.CHAR_BUILDER.subclassCard);
        await page.evaluate(el => el.click(), subCard);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1500);

        // Step 4: Ancestry — pick first
        await waitForCount(page, SEL.CHAR_BUILDER.ancestryCard, 1);
        const ancestryCard = await page.$(SEL.CHAR_BUILDER.ancestryCard);
        await page.evaluate(el => el.click(), ancestryCard);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1500);

        // Step 5: Community — pick first
        await waitForCount(page, SEL.CHAR_BUILDER.communityCard, 1);
        const communityCard = await page.$(SEL.CHAR_BUILDER.communityCard);
        await page.evaluate(el => el.click(), communityCard);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1000);

        // Step 6: Traits — assign all chips to slots
        // Click each chip then the first unassigned slot
        const chips = await page.$$(SEL.CHAR_BUILDER.traitChip);
        for (const chip of chips) {
            await page.evaluate(el => el.click(), chip);
            await page.waitForTimeout(100);
            const slot = await page.$('[data-trait]:not(.assigned)');
            if (slot) {
                await page.evaluate(el => el.click(), slot);
                await page.waitForTimeout(100);
            }
        }
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1000);

        // Step 7: Domain cards — pick first available
        await page.waitForTimeout(1000);
        const domainCards = await page.$$(SEL.CHAR_BUILDER.domainCard);
        if (domainCards.length > 0) {
            await page.evaluate(el => el.click(), domainCards[0]);
            await page.waitForTimeout(200);
            if (domainCards.length > 1) {
                await page.evaluate(el => el.click(), domainCards[1]);
            }
        }
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1000);

        // Step 8: Experiences
        await page.fill(SEL.CHAR_BUILDER.exp1, 'Former Cartographer');
        await page.fill(SEL.CHAR_BUILDER.exp2, 'Survived the Collapse');
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1000);

        // Step 9: Equipment — pick weapon and armor
        const weaponCards = await page.$$(SEL.CHAR_BUILDER.weaponCard);
        if (weaponCards.length > 0) await page.evaluate(el => el.click(), weaponCards[0]);
        const armorCards = await page.$$('[data-key="armor"]');
        if (armorCards.length > 0) await page.evaluate(el => el.click(), armorCards[0]);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1000);

        // Step 10: Inventory — pick potion
        const potion = await page.$(SEL.CHAR_BUILDER.potionHealth);
        if (potion) await page.evaluate(el => el.click(), potion);
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1000);

        // Step 11: Background — skip (optional text)
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1000);

        // Step 12: Connections — skip (optional text)
        await page.click(SEL.CHAR_BUILDER.nextBtn);
        await page.waitForTimeout(1000);

        // Step 13: Review & Save
        const saveBtn = await page.$(SEL.CHAR_BUILDER.saveBtn);
        expect(saveBtn, 'Save button not present on step 13').not.toBeNull();
        await page.evaluate(el => el.click(), saveBtn);

        // Should redirect to character-sheet.html after save
        await page.waitForURL(url => url.href.includes('character-sheet'), { timeout: 20000 });
        expect(page.url()).toContain('character-sheet');
    });
});
