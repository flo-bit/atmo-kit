<script lang="ts">
	import PostComments from '../components/PostComments.svelte';
	import type { PreferredSocialClient } from '../social.js';

	// An event's comments are the replies to the post announcing it.
	let {
		postUri,
		socialClient
	}: {
		postUri: string;
		socialClient?: PreferredSocialClient | null;
	} = $props();
</script>

<PostComments {postUri} {socialClient} />
