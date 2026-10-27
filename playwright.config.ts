import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './src/tests',
	testMatch: '**/*.e2e.ts',
	workers: 2,
	use: {
		baseURL: 'http://127.0.0.1:5190',
		viewport: { width: 1280, height: 1000 },
		trace: 'retain-on-failure',
		reducedMotion: 'reduce'
	},
	webServer: {
		command: 'pnpm dev --host 127.0.0.1 --port 5190 --strictPort',
		url: 'http://127.0.0.1:5190',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
