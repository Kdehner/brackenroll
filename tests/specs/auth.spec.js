// Auth flows — sign in, redirect, onboarding gate
// Runs in all three projects: gm, player, unauthed

const { test, expect } = require('@playwright/test');
const { nav } = require('../lib/helpers');
const SEL = require('../lib/selectors');
const { GM_EMAIL, GM_PASS, PLAYER_EMAIL, PLAYER_PASS } = require('../lib/config');

test.describe('Unauthenticated', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('index shows sign-in prompt, not hub content', async ({ page }) => {
        await nav(page, '/index.html', 2500);
        // Both divs are always in DOM; auth JS shows/hides via inline style
        const promptVisible = await page.$eval(SEL.INDEX.signinPrompt, el => el.style.display !== 'none');
        expect(promptVisible, 'Sign-in prompt not visible for unauthenticated user').toBe(true);
    });

    test('handbook visible without auth (public reference content)', async ({ page }) => {
        // Handbook is intentionally public — verify it loads, not that it redirects
        await nav(page, '/handbook.html', 2000);
        expect(page.url()).toContain('handbook.html');
        const tabs = await page.$$('.tab-btn');
        expect(tabs.length).toBeGreaterThan(0);
    });
});

test.describe('GM sign-in', () => {
    test.use({ storageState: { cookies: [], origins: [] } });

    test('signs in via email form and lands on index', async ({ page }) => {
        await nav(page, '/signin.html', 1500);
        await expect(page.locator(SEL.AUTH.emailInput)).toBeVisible();
        await expect(page.locator(SEL.AUTH.passwordInput)).toBeVisible();
        await expect(page.locator(SEL.AUTH.signInBtn)).toBeVisible();

        await page.fill(SEL.AUTH.emailInput, GM_EMAIL);
        await page.fill(SEL.AUTH.passwordInput, GM_PASS);
        await page.click(SEL.AUTH.signInBtn);
        await page.waitForURL(url => !url.href.includes('signin'), { timeout: 20000 });
        expect(page.url()).toContain('index.html');
    });
});

test.describe('Authenticated session', () => {
    test.use({ storageState: '.auth/gm.json' });

    test('index shows hub content, not sign-in prompt', async ({ page }) => {
        await nav(page, '/index.html', 2500);
        const hubVisible = await page.$eval(SEL.INDEX.hubContent, el => el.style.display === 'block');
        expect(hubVisible, 'Hub content not visible for authenticated user').toBe(true);
    });

    test('nav injected on handbook page', async ({ page }) => {
        await nav(page, '/handbook.html');
        const navEl = await page.$(SEL.NAV.root);
        expect(navEl).not.toBeNull();
    });

    test('nav injected on character-builder page', async ({ page }) => {
        await nav(page, '/character-builder.html');
        const navEl = await page.$(SEL.NAV.root);
        expect(navEl).not.toBeNull();
    });

    test('nav injected on profile page', async ({ page }) => {
        await nav(page, '/profile.html');
        const navEl = await page.$(SEL.NAV.root);
        expect(navEl).not.toBeNull();
    });
});
