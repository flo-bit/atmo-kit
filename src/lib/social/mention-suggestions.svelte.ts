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
		const rect = current.clientRect?.();
		const bounds = host().getBoundingClientRect();
		if (rect) {
			menu.style.top = `${rect.bottom - bounds.top + host().scrollTop + 6}px`;
			menu.style.left = `${Math.max(0, Math.min(rect.left - bounds.left, bounds.width - 288))}px`;
		}
		// Nothing to choose from: stay out of the way instead of saying so.
		menu.hidden = !current.items.length;
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
					'absolute z-60 w-72 max-w-full overflow-hidden rounded-ui border border-base-300 bg-[color-mix(in_srgb,var(--base-100)_75%,var(--base-200))] p-1.5 font-sans text-base-950 dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-975 dark:text-base-50';
				state.id = menu.id;
				host().append(menu);
				options = mount(MentionOptions, { target: menu, props: { state } });
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
