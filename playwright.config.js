// @ts-check
'use strict';

const { defineConfig, devices } = require( '@playwright/test' );

const PORT = Number( process.env.PORT || 8099 );
// Optionally use a preinstalled Chromium, e.g. CHROMIUM_PATH=/usr/bin/chromium
const chromiumLaunchOptions = process.env.CHROMIUM_PATH ?
	{ executablePath: process.env.CHROMIUM_PATH } :
	{};

module.exports = defineConfig( {
	testDir: 'test/browser',
	timeout: 180000,
	fullyParallel: true,
	forbidOnly: !!process.env.CI,
	retries: 0,
	reporter: process.env.CI ? [ [ 'list' ], [ 'html', { open: 'never' } ] ] : 'list',
	use: {
		baseURL: `http://127.0.0.1:${ PORT }`,
		trace: 'retain-on-failure'
	},
	webServer: {
		command: `node test/browser/server.js ${ PORT }`,
		url: `http://127.0.0.1:${ PORT }/iframe.html`,
		reuseExistingServer: !process.env.CI
	},
	projects: [
		{
			name: 'chromium',
			use: { ...devices[ 'Desktop Chrome' ], launchOptions: chromiumLaunchOptions }
		},
		{
			name: 'firefox',
			use: { ...devices[ 'Desktop Firefox' ] }
		},
		{
			name: 'webkit',
			use: { ...devices[ 'Desktop Safari' ] }
		}
	]
} );
