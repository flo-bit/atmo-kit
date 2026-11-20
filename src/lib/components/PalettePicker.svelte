<script lang="ts">
	import { accentColors, baseColors, type AccentColor, type BaseColor } from '../palettes.js';
	import { cn } from '../utils.js';

	// Choosing an accent and a base color from the kit's palettes.
	let {
		accent = $bindable('pink'),
		base = $bindable('zinc'),
		onchange,
		class: className
	}: {
		accent?: AccentColor;
		base?: BaseColor;
		onchange?: (palette: { accent: AccentColor; base: BaseColor }) => void;
		class?: string;
	} = $props();

	// Written out in full so that Tailwind finds them.
	const accentClass: Record<AccentColor, string> = {
		red: 'bg-red-500',
		orange: 'bg-orange-500',
		amber: 'bg-amber-500',
		yellow: 'bg-yellow-500',
		lime: 'bg-lime-500',
		green: 'bg-green-500',
		emerald: 'bg-emerald-500',
		teal: 'bg-teal-500',
		cyan: 'bg-cyan-500',
		sky: 'bg-sky-500',
		blue: 'bg-blue-500',
		indigo: 'bg-indigo-500',
		violet: 'bg-violet-500',
		purple: 'bg-purple-500',
		fuchsia: 'bg-fuchsia-500',
		pink: 'bg-pink-500',
		rose: 'bg-rose-500'
	};
	const baseClass: Record<BaseColor, string> = {
		gray: 'bg-gray-500',
		zinc: 'bg-zinc-500',
		neutral: 'bg-neutral-500',
		stone: 'bg-stone-500',
		slate: 'bg-slate-500',
		mist: 'bg-mist-500',
		mauve: 'bg-mauve-500',
		olive: 'bg-olive-500',
		taupe: 'bg-taupe-500'
	};
	const swatch =
		'size-7 cursor-pointer rounded-full outline-none transition-shadow duration-(--atmo-duration) motion-reduce:transition-none hover:ring-2 hover:ring-base-400 hover:ring-offset-2 hover:ring-offset-base-50 focus-visible:ring-2 focus-visible:ring-accent-700 focus-visible:ring-offset-2 focus-visible:ring-offset-base-50 aria-pressed:ring-2 aria-pressed:ring-base-950 aria-pressed:ring-offset-2 aria-pressed:ring-offset-base-50 dark:hover:ring-base-600 dark:hover:ring-offset-base-925 dark:focus-visible:ring-accent-300 dark:focus-visible:ring-offset-base-925 dark:aria-pressed:ring-base-50 dark:aria-pressed:ring-offset-base-925';
	const legend = 'mb-2.5 text-sm font-medium text-base-950 dark:text-base-50';
	const name = (color: string) => color[0].toUpperCase() + color.slice(1);
</script>

<div class={cn('grid gap-5', className)} data-slot="palette-picker">
	<fieldset>
		<legend class={legend}>Accent color</legend>
		<div class="flex flex-wrap gap-2.5">
			{#each accentColors as color (color)}
				<button
					type="button"
					aria-label={name(color)}
					title={name(color)}
					aria-pressed={accent === color}
					class={[swatch, accentClass[color]]}
					onclick={() => {
						accent = color;
						onchange?.({ accent, base });
					}}
				></button>
			{/each}
		</div>
	</fieldset>
	<fieldset>
		<legend class={legend}>Base color</legend>
		<div class="flex flex-wrap gap-2.5">
			{#each baseColors as color (color)}
				<button
					type="button"
					aria-label={name(color)}
					title={name(color)}
					aria-pressed={base === color}
					class={[swatch, baseClass[color]]}
					onclick={() => {
						base = color;
						onchange?.({ accent, base });
					}}
				></button>
			{/each}
		</div>
	</fieldset>
</div>
