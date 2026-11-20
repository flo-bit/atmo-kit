// `==highlighted==` for micromark and mdast, modeled on micromark-extension-gfm-strikethrough.
// Bundled into the vendored parser by scripts/vendor-markdown.mjs.
import { splice } from 'micromark-util-chunked';
import { classifyCharacter } from 'micromark-util-classify-character';
import { resolveAll } from 'micromark-util-resolve-all';

const EQUALS = 61;

/** Exactly two equals signs open and close a highlight, with the flanking rules of `~~`. */
export function highlight() {
	const tokenizer = { name: 'highlight', tokenize, resolveAll: resolve };
	return {
		text: { [EQUALS]: tokenizer },
		insideSpan: { null: [tokenizer] },
		attentionMarkers: { null: [EQUALS] }
	};

	function resolve(events, context) {
		let index = -1;
		while (++index < events.length) {
			if (
				events[index][0] !== 'enter' ||
				events[index][1].type !== 'highlightSequenceTemporary' ||
				!events[index][1]._close
			)
				continue;
			let open = index;
			while (open--) {
				if (
					events[open][0] !== 'exit' ||
					events[open][1].type !== 'highlightSequenceTemporary' ||
					!events[open][1]._open
				)
					continue;
				events[index][1].type = 'highlightSequence';
				events[open][1].type = 'highlightSequence';
				const marked = {
					type: 'highlight',
					start: Object.assign({}, events[open][1].start),
					end: Object.assign({}, events[index][1].end)
				};
				const text = {
					type: 'highlightText',
					start: Object.assign({}, events[open][1].end),
					end: Object.assign({}, events[index][1].start)
				};
				const next = [
					['enter', marked, context],
					['enter', events[open][1], context],
					['exit', events[open][1], context],
					['enter', text, context]
				];
				const insideSpan = context.parser.constructs.insideSpan.null;
				if (insideSpan)
					splice(
						next,
						next.length,
						0,
						resolveAll(insideSpan, events.slice(open + 1, index), context)
					);
				splice(next, next.length, 0, [
					['exit', text, context],
					['enter', events[index][1], context],
					['exit', events[index][1], context],
					['exit', marked, context]
				]);
				splice(events, open - 1, index - open + 3, next);
				index = open + next.length - 2;
				break;
			}
		}
		index = -1;
		while (++index < events.length) {
			if (events[index][1].type === 'highlightSequenceTemporary') events[index][1].type = 'data';
		}
		return events;
	}

	function tokenize(effects, ok, nok) {
		const previous = this.previous;
		const events = this.events;
		let size = 0;
		return start;

		function start(code) {
			if (previous === EQUALS && events[events.length - 1][1].type !== 'characterEscape')
				return nok(code);
			effects.enter('highlightSequenceTemporary');
			return more(code);
		}

		function more(code) {
			const before = classifyCharacter(previous);
			if (code === EQUALS) {
				if (size > 1) return nok(code);
				effects.consume(code);
				size++;
				return more;
			}
			if (size < 2) return nok(code);
			const token = effects.exit('highlightSequenceTemporary');
			const after = classifyCharacter(code);
			token._open = !after || (after === 2 && Boolean(before));
			token._close = !before || (before === 2 && Boolean(after));
			return ok(code);
		}
	}
}

/** `highlight` nodes with phrasing children. */
export function highlightFromMarkdown() {
	return {
		canContainEols: ['highlight'],
		enter: {
			highlight(token) {
				this.enter({ type: 'highlight', children: [] }, token);
			}
		},
		exit: {
			highlight(token) {
				this.exit(token);
			}
		}
	};
}
