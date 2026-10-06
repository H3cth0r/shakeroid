// Reveal engine (v2): three content types ride the same ritual.
//  - text items: a shuffled "bag" (no repeats until exhausted)
//  - visual items: generated on the spot from a seed that encodes the
//    developing shake's energy (see generative.ts)
//  - image items: linked pictures/gifs from a fixed URL pool
// drawNext() stays the single choke point and owns the weighted mix.

import { makeVisualSeed } from '#lib/generative';

export type TextItem = { type: 'text'; text: string };
export type VisualItem = { type: 'visual'; seed: number; energy: number };
export type ImageItem = { type: 'image'; url: string; alt: string };
export type RevealItem = TextItem | VisualItem | ImageItem;

/**
 * Stages of the "developing" ritual. Development is *shake-driven* (see
 * Reveal.svelte): shakes deposit impulse as `progress` (0→1) and the ghost
 * image clears as the user keeps shaking — the animation moves with the
 * shakes, it is not a timer.
 *  idle       → no reveal in flight
 *  developing → 0 < progress < 1; shakes advance it
 *  revealed   → progress = 1; a *resting state*: only the next button leaves it
 */
export type RevealStage = 'idle' | 'developing' | 'revealed';

export interface ContentPool {
	items: RevealItem[];
}

/** Wrap a raw JSON pool (plain strings) into the internal text-item model. */
export function makePool(texts: string[]): ContentPool {
	return { items: texts.map((text) => ({ type: 'text', text }) as TextItem) };
}

/** Wrap a linked-picture pool ({url, alt}) into internal image items. */
export function makeImagePool(entries: { url: string; alt: string }[]): ImageItem[] {
	return entries.map((entry) => ({ type: 'image', url: entry.url, alt: entry.alt }));
}

export interface DrawOptions {
	/** Dev-harness override: forces the next draw's type. */
	forceType?: 'text' | 'visual' | 'image';
	/** Odds of a generated-vis draw when no override is set (tuned: 0.3). */
	visualRatio?: number;
	/** Odds of a linked-picture draw when pictures are available (tuned: 0.2). */
	imageRatio?: number;
	/** Energy of the triggering shake — seeds a generated visual's composition. */
	energy?: number;
}

export function createShuffleBag(pool: ContentPool, pictures: ImageItem[] = []) {
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
		/**
		 * Draw the next reveal, mixing types with `options`.
		 * Weights (no override): pictures 0.2, generated visuals 0.3, text the rest.
		 * Falls through to text if a pool is empty.
		 */
		drawNext(options: DrawOptions = {}): RevealItem {
			const forced = options.forceType;
			// one uniform roll partitions the odds: [0,image) | [i,i+v) | rest
			const imageOdds = pictures.length > 0 ? (options.imageRatio ?? 0.2) : 0;
			const visualOdds = imageOdds + (options.visualRatio ?? 0.3);
			const roll = Math.random();
			const wantImage = forced ? forced === 'image' : roll < imageOdds;
			if (wantImage && pictures.length > 0) {
				return pictures[Math.floor(Math.random() * pictures.length)];
			}
			const wantVisual = forced ? forced === 'visual' : roll < visualOdds;
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