// Handbook — tabs, class cards, modals, domain cards

const { test, expect } = require('@playwright/test');
const { nav, waitForCount } = require('../lib/helpers');
const SEL = require('../lib/selectors');

test.describe('Handbook', () => {

    test('loads with 7 tabs', async ({ page }) => {
        await nav(page, '/handbook.html', 2500);
        const tabs = await page.$$(SEL.HANDBOOK.tabBtns);
        expect(tabs.length).toBe(7);
    });

    test('"How to Play" tab active by default', async ({ page }) => {
        await nav(page, '/handbook.html', 1500);
        const active = await page.$eval(SEL.HANDBOOK.activeTab, el => el.textContent.trim());
        expect(active).toBe('How to Play');
    });

    test('switching to Classes tab shows class grid', async ({ page }) => {
        await nav(page, '/handbook.html', 1500);
        await page.evaluate(() => switchTab('classes', document.querySelector('.tab-btn:nth-child(2)')));
        await page.waitForTimeout(2000);
        const cards = await waitForCount(page, SEL.HANDBOOK.classCards, 9);
        expect(cards.length).toBeGreaterThanOrEqual(9);
    });

    test('clicking a class card opens modal', async ({ page }) => {
        await nav(page, '/handbook.html', 1500);
        await page.evaluate(() => switchTab('classes', document.querySelector('.tab-btn:nth-child(2)')));
        await waitForCount(page, SEL.HANDBOOK.classCards, 1);
        await page.waitForTimeout(500);
        const firstCard = await page.$(SEL.HANDBOOK.classCards);
        await firstCard.click();
        await page.waitForTimeout(600);
        const modal = await page.$(SEL.HANDBOOK.modal);
        expect(modal).not.toBeNull();
        const content = await page.$(SEL.HANDBOOK.modalContent);
        const text = await content?.textContent();
        expect(text?.length).toBeGreaterThan(50);
    });

    test('Domains tab shows 9 domain cards', async ({ page }) => {
        await nav(page, '/handbook.html', 1500);
        await page.evaluate(() => switchTab('domains', document.querySelector('.tab-btn:nth-child(5)')));
        await page.waitForTimeout(500);
        const domains = await page.$$(SEL.HANDBOOK.domainCards);
        expect(domains.length).toBe(9);
    });

    test('Ancestries tab loads content', async ({ page }) => {
        await nav(page, '/handbook.html', 1500);
        await page.evaluate(() => switchTab('ancestries', document.querySelector('.tab-btn:nth-child(3)')));
        await page.waitForTimeout(2000);
        const panel = await page.$('#tab-ancestries.active');
        expect(panel).not.toBeNull();
        const text = await panel?.textContent();
        expect(text?.length).toBeGreaterThan(100);
    });

    test('Equipment tab shows weapon and armor tables', async ({ page }) => {
        await nav(page, '/handbook.html', 1500);
        await page.evaluate(() => switchTab('equipment', document.querySelector('.tab-btn:nth-child(6)')));
        await page.waitForTimeout(500);
        const tables = await page.$$('#tab-equipment .equip-table');
        expect(tables.length).toBeGreaterThanOrEqual(2);
    });

    test('no HTTP errors on load', async ({ page }) => {
        const errors = [];
        page.on('response', r => { if (r.status() >= 400) errors.push(`${r.status()} ${r.url()}`); });
        await nav(page, '/handbook.html', 2500);
        await page.evaluate(() => switchTab('classes', document.querySelector('.tab-btn:nth-child(2)')));
        await page.waitForTimeout(2000);
        const bad = errors.filter(e => !e.includes('favicon'));
        expect(bad, `HTTP errors: ${bad.join(', ')}`).toHaveLength(0);
    });
});
