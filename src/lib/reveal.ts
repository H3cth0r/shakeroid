// Reveal engine (v0): draws items from a shuffled "bag" so no item repeats
// until every other item has been drawn — repeated shakes always feel varied.
// Single choke point: page code calls drawNext(); the animation phase and the
// content-type expansion both wrap here.

export type TextItem = { type: 'text'; text: string };
export type RevealItem = TextItem; // future: { type: 'visual' | 'image', ... }

export interface ContentPool {
	items: RevealItem[];
}

/** Wrap a raw JSON pool (v0: strings) into the internal item model. */
export function makePool(texts: string[]): ContentPool {
	return { items: texts.map((text) => ({ type: 'text', text }) as TextItem) };
}

export function createShuffleBag(pool: ContentPool) {
	let bag: RevealItem[] = [];

	function refill() {
		bag = [...pool.items];
		// Fisher–Yates
		for (let i = bag.length - 1; i > 0; i--) {
			const j = Math.floor(Math.random() * (i + 1));
			[bag[i], bag[j]] = [bag[j], bag[i]];
		}
	}

	refill();

	return {
		/** Draw the next item, reshuffling only when the bag is exhausted. */
		drawNext(): RevealItem {
			if (bag.length === 0) refill();
			return bag.pop()!;
		},
		/** Diagnostics (dev harness): items drawn since last full reshuffle. */
		remaining(): number {
			return bag.length;
		}
	};
}