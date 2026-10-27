<script lang="ts">
	import Icon from './SketchIcon.svelte';
	let { variant = 0, compact = false }: { variant?: number; compact?: boolean } = $props();
	const titles = [
		['small', 'hours'],
		['view', 'source'],
		['field', 'notes']
	];
</script>

<div
	class="podcast-cover"
	class:compact
	class:code={variant === 1}
	class:field={variant === 2}
	aria-hidden="true"
>
	<span class="cover-meta"
		>{variant === 0
			? 'with Lena & Sam'
			: variant === 1
				? 'people who make things'
				: 'on foot, with Ana'}</span
	><span class="cover-title">{titles[variant][0]}<br />{titles[variant][1]}<span>.</span></span
	><span class="cover-symbol"
		><Icon
			name={variant === 0 ? 'Sun' : variant === 1 ? 'AtSign' : 'Leaf'}
			size={24}
			style="width: 100%; height: 100%;"
		/></span
	><span class="cover-bottom"
		>{variant === 0
			? 'take your time'
			: variant === 1
				? 'a podcast about the web'
				: 'a little further afield'}</span
	>
</div>

<style>
	.podcast-cover {
		position: relative;
		container-type: inline-size;
		aspect-ratio: 1;
		overflow: hidden;
		width: 100%;
		border-radius: 15px 18px 13px 16px;
		background: #e8a4bf;
		color: #341b27;
	}
	.podcast-cover.code {
		background: #e7e4df;
		color: #302b29;
	}
	.podcast-cover.field {
		background: #2a2527;
		color: #f0e9e4;
	}
	.cover-meta {
		position: absolute;
		top: 8%;
		left: 10%;
		font-size: 4.5cqw;
		letter-spacing: 0.1cqw;
	}
	.cover-title {
		position: absolute;
		top: 24%;
		left: 10%;
		font-size: 22cqw;
		font-weight: 550;
		letter-spacing: -1.3cqw;
		line-height: 0.94;
	}
	.cover-title > span {
		color: #963357;
	}
	.field .cover-title > span {
		color: #ed9abe;
	}
	.cover-symbol {
		position: absolute;
		width: 25%;
		right: 8%;
		bottom: 13%;
		transform: rotate(-12deg);
		color: #963357;
	}
	.field .cover-symbol {
		color: #ed9abe;
	}
	.cover-bottom {
		position: absolute;
		left: 10%;
		bottom: 8%;
		font-size: 4cqw;
	}
	.compact .cover-meta,
	.compact .cover-bottom {
		display: none;
	}
	.compact .cover-title {
		top: 22%;
	}
	.compact .cover-symbol {
		bottom: 9%;
		width: 22%;
	}
</style>
