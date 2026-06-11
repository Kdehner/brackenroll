// Shared test helpers. Import in any spec file.

const { expect } = require('@playwright/test');
const SEL = require('./selectors');

// Navigate and wait for JS to settle
async function nav(page, path, wait = 2000) {
    await page.goto(path, { waitUntil: 'domcontentloaded', timeout: 30000 });
    await page.waitForTimeout(wait);
}

// Open a GM panel if not already open (.hidden check)
async function openPanel(page, btnSel, panelSel) {
    const panel    = await page.$(panelSel);
    const isHidden = await panel?.evaluate(el => el.classList.contains('hidden'));
    if (isHidden !== false) {
        await page.click(btnSel);
        await page.waitForTimeout(400);
    }
}

// Sign in programmatically (for tests that manage their own context)
async function signIn(page, email, password) {
    await nav(page, '/signin.html', 1500);
    await page.fill(SEL.AUTH.emailInput, email);
    await page.fill(SEL.AUTH.passwordInput, password);
    await page.click(SEL.AUTH.signInBtn);
    await page.waitForURL(url => !url.href.includes('signin'), { timeout: 20000 });
    await page.waitForTimeout(2000);
}

// Get campaign URL helper
function campaignUrl(page, campaignId) {
    const { CAMPAIGN_ID } = require('./config');
    return `?campaign=${campaignId || CAMPAIGN_ID}`;
}

// Click the first visible matching element
async function clickFirst(page, selector) {
    const el = await page.$(selector);
    if (!el) throw new Error(`No element matching: ${selector}`);
    await page.evaluate(el => el.click(), el);
}

// Assert element visible with helpful error
async function assertVisible(page, selector, label) {
    const el = await page.$(selector);
    expect(el, `Expected "${label || selector}" to be present`).not.toBeNull();
    return el;
}

// Wait for at least N elements matching selector
async function waitForCount(page, selector, minCount, timeout = 10000) {
    const start = Date.now();
    while (Date.now() - start < timeout) {
        const els = await page.$$(selector);
        if (els.length >= minCount) return els;
        await page.waitForTimeout(300);
    }
    const els = await page.$$(selector);
    expect(els.length, `Expected >= ${minCount} elements matching "${selector}"`).toBeGreaterThanOrEqual(minCount);
    return els;
}

// Check console errors on a page and return them
function captureErrors(page) {
    const errors = [];
    page.on('console', msg => {
        if (msg.type() === 'error') errors.push(msg.text());
    });
    return errors;
}

module.exports = { nav, openPanel, signIn, campaignUrl, clickFirst, assertVisible, waitForCount, captureErrors };
