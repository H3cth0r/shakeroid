// Reveal engine (v1): two content types now ride the same ritual.
//  - text items come from a shuffled "bag" (no repeats until exhausted)
//  - visual items are generated on the spot from a seed that encodes the
//    developing shake's energy, so they are unique in principle yet
//    reproducible (see generative.ts)
// Both are drawn through this single choke point: drawNext() owns the
// text-bag discipline and the visual/text weighted mix.

import { makeVisualSeed } from '#lib/generative';

export type TextItem = { type: 'text'; text: string };
export type VisualItem = { type: 'visual'; seed: number; energy: number };
export type RevealItem = TextItem | VisualItem;

/**
 * Stages of the "developing" ritual. Development is *shake-driven* (see
 * Reveal.svelte): shakes deposit impulse as `progress` (0→1) and the ghost
 * image clears as the user keeps shaking — the animation moves with the
 * shakes, it is not a timer.
 *  idle       → no reveal in flight
 *  developing → 0 < progress < 1; shakes advance it
 *  revealed   → progress = 1; next shake starts a fresh reveal
 */
export type RevealStage = 'idle' | 'developing' | 'revealed';

export interface ContentPool {
	items: RevealItem[];
}

/** Wrap a raw JSON pool (v0: plain strings) into the internal item model. */
export function makePool(texts: string[]): ContentPool {
	return { items: texts.map((text) => ({ type: 'text', text }) as TextItem) };
}

export interface DrawOptions {
	/** Dev-harness override: 'text' or 'visual' forces the next draw's type. */
	forceType?: 'text' | 'visual';
	/** Odds of a visual draw when no override is set (tuned: 0.3). */
	visualRatio?: number;
	/** Energy of the triggering shake — seeds the visual's composition. */
	energy?: number;
}

export function createShuffleBag(pool: ContentPool) {
	let bag: TextItem[] = [];

	function refill() {
		bag = pool.items.filter((item): item is TextItem => item.type === 'text');
		// Fisher–Yates
		for (let i = bag.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[bag[i], bag[j]] = [bag[j], bag[i]];
		}
	}

	refill();

	function drawText(): TextItem {
		if (bag.length === 0) refill();
		return bag.pop()!;
	}

	return {
		/** Draw the next reveal, mixing types with `options` (defaults: 30% visual). */
		drawNext(options: DrawOptions = {}): RevealItem {
			const ratio = options.visualRatio ?? 0.3;
			const wantVisual =
				options.forceType === 'visual' ? true : options.forceType === 'text' ? false : Math.random() < ratio;
			if (wantVisual) {
				const energy = options.energy ?? 0.5;
				return { type: 'visual', seed: makeVisualSeed(energy), energy };
			}
			return drawText();
		},
		/** Diagnostics (dev harness): text items drawn since last full reshuffle. */
		remaining(): number {
			return bag.length;
		}
	};
}