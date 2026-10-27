import type { Editor } from '@tiptap/core';
import type { ActorSearch, ActorSummary } from '../components/login/types.js';

/** DOM is constructed with textContent: profile data never becomes HTML. */
export function mentionSuggestions(search: ActorSearch, host: () => HTMLElement) {
	let controller: AbortController | undefined;
	let menu: HTMLDivElement | undefined;
	let selected = 0;
	let current: {
		items: ActorSummary[];
		command: (actor: { id: string; label: string }) => void;
		clientRect?: (() => DOMRect | null) | null;
		editor: Editor;
	};
	const close = () => {
		menu?.remove();
		menu = undefined;
		current?.editor.view.dom.removeAttribute('aria-controls');
		current?.editor.view.dom.removeAttribute('aria-activedescendant');
		current?.editor.view.dom.setAttribute('aria-expanded', 'false');
	};
	const choose = (index: number) => {
		const actor = current.items[index];
		if (actor) current.command({ id: actor.did, label: actor.handle });
	};
	function draw() {
		if (!menu) return;
		menu.replaceChildren();
		const rect = current.clientRect?.();
		const bounds = host().getBoundingClientRect();
		if (rect) {
			menu.style.top = `${rect.bottom - bounds.top + host().scrollTop + 6}px`;
			menu.style.left = `${Math.max(0, Math.min(rect.left - bounds.left, bounds.width - 280))}px`;
		}
		if (!current.items.length) {
			const empty = document.createElement('p');
			empty.role = 'option';
			empty.setAttribute('aria-disabled', 'true');
			empty.setAttribute('aria-selected', 'false');
			empty.className = 'p-3 text-xs text-muted';
			empty.textContent = 'No accounts found';
			menu.append(empty);
		}
		current.items.forEach((actor, index) => {
			const option = document.createElement('button');
			option.type = 'button';
			option.role = 'option';
			option.id = `${menu!.id}-${index}`;
			option.setAttribute('aria-selected', String(index === selected));
			option.className =
				'block w-full rounded-ui px-3 py-2 text-left text-xs text-ink hover:bg-recess aria-selected:bg-recess';
			const name = document.createElement('strong');
			name.className = 'block truncate font-medium';
			name.textContent = actor.displayName || actor.handle;
			const handle = document.createElement('span');
			handle.className = 'block truncate text-muted';
			handle.textContent = `@${actor.handle}`;
			option.append(name, handle);
			option.onmousedown = (event) => event.preventDefault();
			option.onclick = () => choose(index);
			menu!.append(option);
		});
		current.editor.view.dom.setAttribute('aria-controls', menu.id);
		current.editor.view.dom.setAttribute('aria-expanded', 'true');
		if (current.items.length)
			current.editor.view.dom.setAttribute('aria-activedescendant', `${menu.id}-${selected}`);
		else current.editor.view.dom.removeAttribute('aria-activedescendant');
	}
	return {
		char: '@',
		debounce: 200,
		minQueryLength: 1,
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
				selected = 0;
				menu = document.createElement('div');
				menu.id = `${props.editor.view.dom.id}-mentions`;
				menu.role = 'listbox';
				menu.setAttribute('aria-label', 'Mention suggestions');
				menu.className =
					'absolute z-60 w-70 max-w-full overflow-hidden rounded-ui border border-line bg-page p-1 font-sans text-ink';
				host().append(menu);
				draw();
			},
			onUpdate: (props: typeof current) => {
				current = props;
				selected = 0;
				draw();
			},
			onKeyDown: ({ event }: { event: KeyboardEvent }) => {
				if (event.key === 'Escape') {
					close();
					return true;
				}
				if (!current.items.length) return false;
				if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
					selected =
						(selected + (event.key === 'ArrowDown' ? 1 : -1) + current.items.length) %
						current.items.length;
					draw();
					return true;
				}
				if (event.key === 'Enter' || event.key === 'Tab') {
					choose(selected);
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
