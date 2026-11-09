<script lang="ts">
	// Playground state only. Real apps own their saved preference and system mode.
	let { dark }: { dark: boolean } = $props();
	$effect(() => {
		const root = document.documentElement;
		const previous = {
			light: root.classList.contains('light'),
			dark: root.classList.contains('dark')
		};
		root.classList.toggle('light', !dark);
		root.classList.toggle('dark', dark);
		return () => {
			root.classList.toggle('light', previous.light);
			root.classList.toggle('dark', previous.dark);
		};
	});
</script>
