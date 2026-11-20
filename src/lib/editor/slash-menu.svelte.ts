import { Extension } from '@tiptap/core';
import { PluginKey } from '@tiptap/pm/state';
import { flip, shift } from '@floating-ui/dom';
import Suggestion, { type SuggestionProps } from '@tiptap/suggestion';
import { mount, unmount } from 'svelte';
import {
	findCommands,
	runCommand,
	type ArticleCommand,
	type ArticleCommandContext
} from './article-commands.js';
import SlashOptions from './SlashOptions.svelte';

export type SlashMenuOptions = {
	/** The element the menu is put in; positioned ancestors place it. */
	layer: HTMLElement;
	context: ArticleCommandContext;
};

/** Typing `/` lists the blocks and insertions; typing on filters them. */
export function slashMenu(options: SlashMenuOptions) {
	return Extension.create({
		name: 'slashMenu',
		addProseMirrorPlugins() {
			const editor = this.editor;
			return [
				Suggestion<ArticleCommand, ArticleCommand>({
					editor,
					pluginKey: new PluginKey('atmoSlashMenu'),
					char: '/',
					allowSpaces: true,
					container: options.layer,
					offset: { mainAxis: 8 },
					// On a touch screen the toolbar lies along the bottom.
					flip: false,
					floatingUi: {
						middleware: [
							flip({
								padding: {
									top: 8,
									bottom: window.matchMedia('(pointer: coarse)').matches ? 64 : 8
								}
							}),
							shift({ padding: 8 })
						]
					},
					// Not in code, where a slash is a slash.
					allow: ({ state, range }) => {
						const parent = state.doc.resolve(range.from).parent;
						return editor.isEditable && parent.isTextblock && !parent.type.spec.code;
					},
					items: ({ query }) => findCommands(query, editor, options.context),
					command: ({ range, props }) => {
						editor.chain().focus().deleteRange(range).run();
						runCommand(editor, props, options.context);
					},
					render: () => {
						let menu: HTMLDivElement | undefined;
						let rows: Record<string, unknown> | undefined;
						let release: (() => void) | undefined;
						let current: SuggestionProps<ArticleCommand, ArticleCommand>;
						const state = $state({
							id: '',
							items: [] as ArticleCommand[],
							selected: 0,
							choose: (index: number) => {
								const item = current.items[index];
								if (item) current.command(item);
							}
						});
						const dom = () => current.editor.view.dom;
						const close = () => {
							release?.();
							release = undefined;
							if (rows) void unmount(rows);
							rows = undefined;
							menu?.remove();
							menu = undefined;
							dom().removeAttribute('aria-controls');
							dom().removeAttribute('aria-activedescendant');
						};
						const draw = () => {
							if (!menu) return;
							state.items = current.items;
							// Nothing matches: stay out of the way instead of saying so.
							menu.hidden = !current.items.length;
							if (menu.hidden) {
								dom().removeAttribute('aria-controls');
								dom().removeAttribute('aria-activedescendant');
								return;
							}
							dom().setAttribute('aria-controls', menu.id);
							dom().setAttribute('aria-activedescendant', `${menu.id}-${state.selected}`);
						};
						const open = (props: typeof current) => {
							current = props;
							state.selected = 0;
							if (!menu) {
								const element = document.createElement('div');
								element.id = `${dom().id}-commands`;
								element.role = 'listbox';
								element.setAttribute('aria-label', 'Commands');
								element.className =
									'absolute top-0 left-0 z-60 max-h-80 w-64 max-w-[calc(100vw-1rem)] overflow-y-auto overscroll-contain rounded-ui border border-base-300 bg-base-50 p-1.5 font-sans text-sm leading-normal text-base-950 transition-opacity duration-100 motion-reduce:transition-none dark:border-[color-mix(in_srgb,var(--base-800)_80%,var(--base-950))] dark:bg-base-900 dark:text-base-50 starting:opacity-0';
								state.id = element.id;
								menu = element;
								rows = mount(SlashOptions, { target: element, props: { state } });
								release = props.mount(element, {
									onPosition: ({ x, y }) => {
										element.style.left = `${x}px`;
										element.style.top = `${y}px`;
									}
								});
							}
							draw();
						};
						return {
							onStart: open,
							onUpdate: open,
							onKeyDown: ({ event }) => {
								if (!menu || menu.hidden || event.isComposing) return false;
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
							onExit: close
						};
					}
				})
			];
		}
	});
}
