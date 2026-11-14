import { defineConfig } from '@playwright/test';

export default defineConfig({
	testDir: './src/tests',
	testMatch: '**/*.e2e.ts',
	// Each test owns its page; avoid leaving a worker idle behind a large file.
	fullyParallel: true,
	workers: 2,
	reporter: 'list',
	use: {
		baseURL: 'http://127.0.0.1:5190',
		viewport: { width: 1280, height: 1000 },
		reducedMotion: 'reduce'
	},
	webServer: {
		command: 'pnpm dev --host 127.0.0.1 --port 5190 --strictPort',
		url: 'http://127.0.0.1:5190',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
