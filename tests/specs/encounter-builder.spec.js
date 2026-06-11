// Encounter Builder — create, open, add adversaries, remove

const { test, expect } = require('@playwright/test');
const { nav, waitForCount } = require('../lib/helpers');
const SEL = require('../lib/selectors');
const { CAMPAIGN_ID, RUN_ID } = require('../lib/config');

const ENC_URL  = `/encounter-builder.html?campaign=${CAMPAIGN_ID}`;
const ENC_NAME = `QC Encounter ${RUN_ID}`;

test.describe('Encounter Builder — load', () => {

    test('page loads with encounter list visible', async ({ page }) => {
        await nav(page, ENC_URL, 2500);
        const wrap = await page.$(SEL.ENCOUNTER.wrap);
        expect(wrap).not.toBeNull();
    });

    test('create form has name input and button', async ({ page }) => {
        await nav(page, ENC_URL, 2000);
        await expect(page.locator(SEL.ENCOUNTER.nameInput)).toBeVisible();
        await expect(page.locator(SEL.ENCOUNTER.createBtn)).toBeVisible();
    });
});

test.describe('Encounter Builder — create flow', () => {

    test('creates encounter and appears in grid', async ({ page }) => {
        await nav(page, ENC_URL, 2500);
        const before = (await page.$$(SEL.ENCOUNTER.card)).length;
        await page.fill(SEL.ENCOUNTER.nameInput, ENC_NAME);
        await page.click(SEL.ENCOUNTER.createBtn);
        await page.waitForTimeout(2000);
        const after = await page.$$(SEL.ENCOUNTER.card);
        expect(after.length, 'Encounter not added to grid').toBeGreaterThan(before);
    });

    test('name input clears after create', async ({ page }) => {
        await nav(page, ENC_URL, 2500);
        await page.fill(SEL.ENCOUNTER.nameInput, ENC_NAME);
        await page.click(SEL.ENCOUNTER.createBtn);
        await page.waitForTimeout(2000);
        const val = await page.$eval(SEL.ENCOUNTER.nameInput, el => el.value);
        expect(val).toBe('');
    });

    test('submitting empty name does not create encounter', async ({ page }) => {
        await nav(page, ENC_URL, 2500);
        const before = (await page.$$(SEL.ENCOUNTER.card)).length;
        await page.click(SEL.ENCOUNTER.createBtn);
        await page.waitForTimeout(1000);
        const after = (await page.$$(SEL.ENCOUNTER.card)).length;
        expect(after).toBe(before);
    });
});

test.describe('Encounter Builder — encounter detail', () => {

    test('opening encounter shows detail view', async ({ page }) => {
        await nav(page, ENC_URL, 2500);
        // Create a fresh one
        await page.fill(SEL.ENCOUNTER.nameInput, ENC_NAME);
        await page.click(SEL.ENCOUNTER.createBtn);
        await page.waitForTimeout(2000);

        // Find the card that matches ENC_NAME and click its open button
        const cards = await page.$$(SEL.ENCOUNTER.card);
        let targetCard = null;
        for (const card of cards) {
            const text = await card.textContent();
            if (text.includes(ENC_NAME)) { targetCard = card; break; }
        }
        expect(targetCard, `Card with name "${ENC_NAME}" not found`).not.toBeNull();
        const openBtn = await targetCard.$('.btn-sm');
        await page.evaluate(el => el.click(), openBtn);
        await page.waitForTimeout(2000);

        const detail = await page.$(SEL.ENCOUNTER.detailName);
        expect(detail).not.toBeNull();
        const name = await detail?.textContent();
        expect(name).toBe(ENC_NAME);
    });

    test('adversary picker opens and shows official adversaries', async ({ page }) => {
        await nav(page, ENC_URL, 2500);
        await page.fill(SEL.ENCOUNTER.nameInput, ENC_NAME);
        await page.click(SEL.ENCOUNTER.createBtn);
        await page.waitForTimeout(2000);

        const openBtns = await page.$$(SEL.ENCOUNTER.cardOpenBtn);
        await page.evaluate(el => el.click(), openBtns[openBtns.length - 1]);
        await page.waitForTimeout(2000);

        // Toggle picker
        const toggleBtn = await page.$(SEL.ENCOUNTER.togglePickerBtn);
        expect(toggleBtn).not.toBeNull();
        await page.evaluate(el => el.click(), toggleBtn);
        await page.waitForTimeout(2500);

        // Official adversaries load
        const rows = await page.$$(SEL.ENCOUNTER.pickerRow);
        expect(rows.length, 'Official adversaries not loaded').toBeGreaterThan(10);
    });

    test('adding an adversary creates an entry row', async ({ page }) => {
        await nav(page, ENC_URL, 2500);
        await page.fill(SEL.ENCOUNTER.nameInput, ENC_NAME);
        await page.click(SEL.ENCOUNTER.createBtn);
        await page.waitForTimeout(2000);

        const openBtns = await page.$$(SEL.ENCOUNTER.cardOpenBtn);
        await page.evaluate(el => el.click(), openBtns[openBtns.length - 1]);
        await page.waitForTimeout(2000);

        await page.evaluate(el => el.click(), await page.$(SEL.ENCOUNTER.togglePickerBtn));
        await page.waitForTimeout(2500);

        const rows = await page.$$(SEL.ENCOUNTER.pickerRow);
        const addBtn = await rows[0].$(SEL.ENCOUNTER.addEntryBtn);
        await page.evaluate(el => el.click(), addBtn);
        await page.waitForTimeout(2500);

        const entries = await page.$$(SEL.ENCOUNTER.entryRow);
        expect(entries.length, 'No entry row after adding adversary').toBeGreaterThan(0);
    });
});
