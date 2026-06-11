const { defineConfig, devices } = require('@playwright/test');

module.exports = defineConfig({
    testDir: './specs',
    timeout: 40000,
    retries: 1,
    workers: 1, // VTT has shared DB state — run serially

    globalSetup: './global-setup.js',

    use: {
        baseURL: 'https://devverheart.fwbgaming.win',
        headless: true,
        viewport: { width: 1280, height: 720 },
        // Default: GM auth. Tests that need player or no auth override per-file.
        storageState: '.auth/gm.json',
        // Give Supabase realtime subscriptions time to fire
        actionTimeout: 15000,
        navigationTimeout: 30000,
    },

    reporter: [
        ['list'],
        ['html', { outputFolder: 'playwright-report', open: 'never' }],
        ['json', { outputFile: 'test-results.json' }],
    ],

    projects: [
        {
            name: 'gm',
            use: { storageState: '.auth/gm.json' },
        },
        {
            name: 'player',
            use: { storageState: '.auth/player.json' },
            testMatch: '**/auth.spec.js',
        },
        {
            name: 'unauthed',
            use: { storageState: { cookies: [], origins: [] } },
            testMatch: '**/auth.spec.js',
        },
    ],
});
