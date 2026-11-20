import type { Editor } from '@tiptap/core';
import { mount, unmount } from 'svelte';
import MentionOptions from './MentionOptions.svelte';
import type { ActorSearch, ActorSummary } from '../components/login/types.js';

/** Rows are rendered by Svelte, so profile data never becomes HTML. */
export function mentionSuggestions(search: ActorSearch, host: () => HTMLElement) {
	let controller: AbortController | undefined;
	let menu: HTMLDivElement | undefined;
	let options: Record<string, unknown> | undefined;
	let current: {
		items: ActorSummary[];
		command: (actor: { id: string; label: string }) => void;
		clientRect?: (() => DOMRect | null) | null;
		editor: Editor;
	};
	const state = $state({
		id: '',
		items: [] as ActorSummary[],
		selected: 0,
		choose: (index: number) => {
			const actor = current.items[index];
			if (actor) current.command({ id: actor.did, label: actor.handle });
		}
	});
	const close = () => {
		removeEventListener('scroll', draw, true);
		removeEventListener('resize', draw);
		if (options) void unmount(options);
		options = undefined;
		menu?.remove();
		menu = undefined;
		current?.editor.view.dom.removeAttribute('aria-controls');
		current?.editor.view.dom.removeAttribute('aria-activedescendant');
		current?.editor.view.dom.setAttribute('aria-expanded', 'false');
	};
	function draw() {
		if (!menu) return;
		state.items = current.items;
		// Nothing to choose from: stay out of the way instead of saying so.
		menu.hidden = !current.items.length;
		const rect = current.clientRect?.();
		if (rect && !menu.hidden) {
			// In the top layer, so a dialog's clipping cannot cut it off. Below the text, or above
			// it when there is more room there than the tallest list needs below.
			const room = innerHeight - rect.bottom;
			const up = room < 360 && rect.top > room;
			menu.style.top = up ? 'auto' : `${rect.bottom + 6}px`;
			menu.style.bottom = up ? `${innerHeight - rect.top + 6}px` : 'auto';
			menu.style.left = `${Math.max(8, Math.min(rect.left, innerWidth - Math.min(288, innerWidth - 16) - 8))}px`;
		}
		if (!current.items.length) {
			current.editor.view.dom.removeAttribute('aria-controls');
			current.editor.view.dom.removeAttribute('aria-activedescendant');
			current.editor.view.dom.setAttribute('aria-expanded', 'false');
			return;
		}
		current.editor.view.dom.setAttribute('aria-controls', menu.id);
		current.editor.view.dom.setAttribute('aria-expanded', 'true');
		current.editor.view.dom.setAttribute('aria-activedescendant', `${menu.id}-${state.selected}`);
	}
	return {
		char: '@',
		debounce: 200,
		// One letter matches almost anyone; wait for a second one.
		minQueryLength: 2,
		items: async ({ query }: { query: string }) => {
			controller?.abort();
			controller = new AbortController();
			try {
				return [...(await search(query, controller.signal))].slice(0, 6);
			} catch {
				return [];
			}
		},
		render: () => ({
			onStart: (props: typeof current) => {
				current = props;
				state.selected = 0;
				menu = document.createElement('div');
				menu.id = `${props.editor.view.dom.id}-mentions`;
				menu.role = 'listbox';
				menu.setAttribute('aria-label', 'Mention suggestions');
				menu.className =
					'fixed inset-auto z-60 m-0 w-72 max-w-[calc(100vw-1rem)] overflow-hidden rounded-ui border border-base-300 bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] p-1.5 font-sans text-base-950 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-975 dark:text-base-50';
				state.id = menu.id;
				// Kept inside the editor, so a dialog around it still counts clicks on it as its own.
				menu.popover = 'manual';
				host().append(menu);
				menu.showPopover();
				options = mount(MentionOptions, { target: menu, props: { state } });
				addEventListener('scroll', draw, true);
				addEventListener('resize', draw);
				draw();
			},
			onUpdate: (props: typeof current) => {
				current = props;
				state.selected = 0;
				draw();
			},
			onKeyDown: ({ event }: { event: KeyboardEvent }) => {
				if (event.key === 'Escape') {
					close();
					return true;
				}
				if (!current.items.length) return false;
				if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
					state.selected =
						(state.selected + (event.key === 'ArrowDown' ? 1 : -1) + current.items.length) %
						current.items.length;
					draw();
					return true;
				}
				if (event.key === 'Enter' || event.key === 'Tab') {
					state.choose(state.selected);
					return true;
				}
				return false;
			},
			onExit: () => {
				controller?.abort();
				close();
			}
		})
	};
}
