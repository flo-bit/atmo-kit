<script lang="ts">
	import { Button, Checkbox, Label, LegalDocument, LegalFooter, ReportDialog } from '#lib';
	import { pause } from './fixtures.js';
	let { name, compact = false }: { name: string; compact?: boolean } = $props();
	let open = $state(false),
		signedIn = $state(true),
		fail = $state(false);
</script>

<div class="w-full space-y-5">
	{#if name === 'LegalDocument'}
		<LegalDocument
			document={{
				title: 'Community guidelines',
				status: 'draft',
				sections: [
					{
						id: 'kindness',
						title: 'Be considerate',
						paragraphs: ['Make room for different perspectives. Treat people with care.']
					},
					{
						id: 'reporting',
						title: 'Something wrong?',
						paragraphs: ['Let the organizers know if something needs attention.']
					}
				].slice(0, compact ? 1 : 2)
			}}
			class="px-0 py-0"
		/>
	{:else if name === 'LegalFooter'}
		<LegalFooter
			links={{
				terms: '/legal?document=terms',
				privacy: '/legal?document=privacy',
				report: 'mailto:hello@example.com',
				source: { label: 'Source code', href: 'https://github.com/flo-bit/atmo-kit' }
			}}
		/>
	{:else if name === 'ReportDialog'}
		<Button variant="secondary" onclick={() => (open = true)}>Report content</Button>
		<ReportDialog
			bind:open
			isLoggedIn={signedIn}
			email="reports@example.com"
			subjectUrl="https://example.com/events/demo"
			onsignin={() => (signedIn = true)}
			submit={async () => {
				await pause();
				if (fail) return { message: 'Reporting is unavailable. Please report by email.' };
			}}
		/>
		{#if !compact}<div class="flex flex-wrap gap-5">
				<Label><Checkbox bind:checked={signedIn} />Signed in</Label><Label
					><Checkbox bind:checked={fail} />Simulate an error</Label
				>
			</div>{/if}
	{/if}
</div>
