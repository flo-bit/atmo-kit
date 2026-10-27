<script lang="ts">
	import type { Snippet } from 'svelte';
	import { WorkspaceSidebar } from '#lib';
	let { label, children }: { label: string; children: Snippet } = $props();
	let visible = $state(false);
	export function open() {
		visible = true;
	}
	export function close() {
		visible = false;
	}
</script>

<WorkspaceSidebar
	{label}
	bind:open={visible}
	style="--atmo-nav-top:47px;"
	class="[&>header]:absolute [&>header]:top-4 [&>header]:right-4 [&>header]:z-10 [&>header]:m-0 [&>header]:p-0 [&>header>div]:sr-only"
>
	<div class="h-full min-h-full">
		{@render children()}
	</div>
</WorkspaceSidebar>
