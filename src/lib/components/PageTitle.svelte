<script lang="ts">
	let {
		title,
		siteName,
		separator = ' — '
	}: {
		title?: string | null;
		siteName: string;
		separator?: string;
	} = $props();

	let normalizedTitle = $derived(title?.trim());
	let pageTitle = $derived(
		!normalizedTitle || normalizedTitle === siteName
			? siteName
			: `${normalizedTitle}${separator}${siteName}`
	);
</script>

<svelte:head>
	<title>{pageTitle}</title>
</svelte:head>
