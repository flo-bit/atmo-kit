import { defineConfig } from '@playwright/test';

// CI serves a production build: every test opens a fresh browser context, and the
// dev server would make each one re-request hundreds of unbundled modules.
const server = process.env.CI
	? 'pnpm exec vite build && pnpm exec vite preview'
	: 'pnpm exec vite dev';

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
		command: `${server} --host 127.0.0.1 --port 5190 --strictPort`,
		url: 'http://127.0.0.1:5190',
		reuseExistingServer: !process.env.CI,
		timeout: 120_000
	}
});
