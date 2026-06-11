// Profile — display name update, avatar preview, dice prefs

const { test, expect } = require('@playwright/test');
const { nav } = require('../lib/helpers');
const SEL = require('../lib/selectors');
const { RUN_ID } = require('../lib/config');

const DISPLAY_NAME = `QC User ${RUN_ID}`;

test.describe('Profile', () => {

    test('page loads with display name input', async ({ page }) => {
        await nav(page, '/profile.html', 2000);
        const input = await page.$(SEL.PROFILE.displayName);
        expect(input).not.toBeNull();
    });

    test('display name input accepts text', async ({ page }) => {
        await nav(page, '/profile.html', 2000);
        await page.fill(SEL.PROFILE.displayName, DISPLAY_NAME);
        const val = await page.$eval(SEL.PROFILE.displayName, el => el.value);
        expect(val).toBe(DISPLAY_NAME);
    });

    test('avatar preview updates as name is typed', async ({ page }) => {
        await nav(page, '/profile.html', 2000);
        await page.fill(SEL.PROFILE.displayName, DISPLAY_NAME);
        await page.waitForTimeout(300);
        const avatarText = await page.$(SEL.PROFILE.avatarName);
        const text = await avatarText?.textContent();
        // Avatar name should reflect the typed value
        expect(text).toBe(DISPLAY_NAME);
    });

    test('save button present', async ({ page }) => {
        await nav(page, '/profile.html', 2000);
        const btn = await page.$(SEL.PROFILE.saveBtn);
        expect(btn).not.toBeNull();
    });

    test('saving shows success message', async ({ page }) => {
        await nav(page, '/profile.html', 2000);
        // Read current name and save it back (no actual change needed)
        const currentName = await page.$eval(SEL.PROFILE.displayName, el => el.value);
        await page.fill(SEL.PROFILE.displayName, currentName || 'QC GM');
        await page.click(SEL.PROFILE.saveBtn);
        await page.waitForTimeout(2500);
        const success = await page.$(SEL.PROFILE.success);
        const text    = await success?.textContent();
        expect(text?.length, 'No success message after save').toBeGreaterThan(0);
    });
});
