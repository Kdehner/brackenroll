// Runs once before all tests. Signs in as GM and player, saves auth state.
// Supabase stores session in localStorage — storageState captures both.

const { chromium } = require('@playwright/test');
const fs = require('fs');
const path = require('path');
const { BASE_URL, GM_EMAIL, GM_PASS, PLAYER_EMAIL, PLAYER_PASS } = require('./lib/config');
const SEL = require('./lib/selectors');

const AUTH_DIR = path.join(__dirname, '.auth');

async function signInAndSave(browser, email, password, outPath) {
    const context = await browser.newContext({ viewport: { width: 1280, height: 720 } });
    const page    = await context.newPage();

    await page.goto(`${BASE_URL}/signin.html`, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(1500);
    await page.fill(SEL.AUTH.emailInput, email);
    await page.fill(SEL.AUTH.passwordInput, password);
    await page.click(SEL.AUTH.signInBtn);
    await page.waitForURL(url => !url.href.includes('signin'), { timeout: 20000 });
    // Wait for Supabase session to settle in localStorage
    await page.waitForTimeout(2500);

    await context.storageState({ path: outPath });
    await context.close();
    console.log(`  auth saved: ${email} → ${outPath}`);
}

module.exports = async function globalSetup() {
    if (!fs.existsSync(AUTH_DIR)) fs.mkdirSync(AUTH_DIR, { recursive: true });

    const browser = await chromium.launch({ headless: true });
    console.log('\n[global-setup] Authenticating test users…');

    await signInAndSave(browser, GM_EMAIL,     GM_PASS,     path.join(AUTH_DIR, 'gm.json'));
    await signInAndSave(browser, PLAYER_EMAIL, PLAYER_PASS, path.join(AUTH_DIR, 'player.json'));

    await browser.close();
    console.log('[global-setup] Auth ready.\n');
};
