// Campaign — create, hub view, deep links

const { test, expect } = require('@playwright/test');
const { nav } = require('../lib/helpers');
const SEL = require('../lib/selectors');
const { CAMPAIGN_ID, RUN_ID } = require('../lib/config');

const CAMPAIGN_NAME = `QC Campaign ${RUN_ID}`;

test.describe('Campaign hub', () => {

    test('loads with campaign name and key links', async ({ page }) => {
        await nav(page, `/campaign.html?id=${CAMPAIGN_ID}`, 2500);
        // At minimum the page should not redirect away
        expect(page.url()).toContain('campaign.html');
    });

    test('campaign hub links to table, homebrew, world', async ({ page }) => {
        await nav(page, `/campaign.html?id=${CAMPAIGN_ID}`, 2500);
        const tableLink    = await page.$('a[href*="table"]');
        const homebrewLink = await page.$('a[href*="homebrew"]');
        expect(tableLink,    'table link missing').not.toBeNull();
        expect(homebrewLink, 'homebrew link missing').not.toBeNull();
    });
});

test.describe('Campaign creation', () => {

    test('create campaign modal opens and accepts name', async ({ page }) => {
        await nav(page, '/index.html', 2000);
        // Hub must be visible (authenticated)
        const hub = await page.$(SEL.INDEX.hubContent);
        expect(hub).not.toBeNull();

        // Open modal
        await page.click(SEL.INDEX.createCampaignBtn);
        await page.waitForTimeout(400);

        const modal = await page.$(SEL.INDEX.campaignModal + '.open');
        expect(modal, 'Campaign modal did not open').not.toBeNull();

        // Name input accepts text
        await page.fill(SEL.INDEX.campaignNameInput, CAMPAIGN_NAME);
        const val = await page.$eval(SEL.INDEX.campaignNameInput, el => el.value);
        expect(val).toBe(CAMPAIGN_NAME);
    });

    test('cancel closes modal without creating campaign', async ({ page }) => {
        await nav(page, '/index.html', 2000);
        await page.click(SEL.INDEX.createCampaignBtn);
        await page.waitForTimeout(400);
        await page.click(SEL.INDEX.campaignModalCancel);
        await page.waitForTimeout(300);
        const modal = await page.$(SEL.INDEX.campaignModal + '.open');
        expect(modal).toBeNull();
    });

    test('submitting empty name shows error', async ({ page }) => {
        await nav(page, '/index.html', 2000);
        await page.click(SEL.INDEX.createCampaignBtn);
        await page.waitForTimeout(400);
        // Submit with empty name
        await page.click(SEL.INDEX.campaignModalSubmit);
        await page.waitForTimeout(400);
        const err = await page.$(SEL.INDEX.campaignModalError);
        const errText = await err?.textContent();
        expect(errText?.length).toBeGreaterThan(0);
    });

    test('creating a campaign navigates to campaign hub', async ({ page }) => {
        await nav(page, '/index.html', 2000);
        await page.click(SEL.INDEX.createCampaignBtn);
        await page.waitForTimeout(400);
        await page.fill(SEL.INDEX.campaignNameInput, CAMPAIGN_NAME);
        await page.click(SEL.INDEX.campaignModalSubmit);
        // Should navigate to campaign.html?id=...
        await page.waitForURL(url => url.href.includes('campaign.html'), { timeout: 20000 });
        expect(page.url()).toContain('campaign.html');
    });
});
