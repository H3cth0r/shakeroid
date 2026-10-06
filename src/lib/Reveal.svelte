<script lang="ts">
	// The Polaroid frame. Development is *progressive and shake-driven*: `progress`
	// (0→1) is deposited by shakes as impulses and the item's look is a pure
	// function of it — opacity, focus and colour saturation all track the
	// physical effort. A pale emulsion layer fades out with the same progress, so
	// the image appears to surface from beneath the undeveloped emulsion. A short
	// CSS transition smooths each impulse into continuous motion.
	import { makeVisual } from '#lib/generative';
	import type { RevealItem, RevealStage } from '#lib/reveal';

	interface Props {
		item: RevealItem | null; // null = nothing revealed yet
		progress: number; // 0 → 1, driven by shakes
		stage?: RevealStage; // caption microcopy follows the ritual stage
		onNext?: () => void; // shown in the caption band once revealed (motion mode)
	}
	let { item, progress, stage = 'idle', onNext }: Props = $props();

	const caption = $derived(stage === 'developing' ? 'keep shaking…' : '');

	const itemStyle = $derived(
		`transition: opacity 350ms ease-out, filter 350ms ease-out; opacity: ${(0.1 + 0.9 * progress).toFixed(3)}; filter: blur(${(8 * (1 - progress)).toFixed(2)}px) saturate(${(0.25 + 0.75 * progress).toFixed(2)});`
	);

	const paleOpacity = $derived((1 - progress).toFixed(3));
</script>

<div class="flex aspect-[4/5] w-full flex-col rounded-lg bg-white p-3 pb-0 shadow-2xl shadow-black/50">
	<!-- inner surface: dark beneath, pale emulsion on top; the image surfaces
	     from underneath as the emulsion clears -->
	<div class="relative flex flex-1 items-center justify-center rounded-sm bg-neutral-900 p-6 text-center">
		<div
			class="pointer-events-none absolute inset-0 rounded-sm bg-[#ddd8d0]"
			style="opacity: {paleOpacity}; transition: opacity 350ms ease-out"
		></div>
		<div class="absolute inset-0 flex items-center justify-center p-6">
			{#if item !== null}
				{#if item.type === 'visual'}
					<!-- generated visual: the SVG fills the inner surface; @html is safe
					     here — makeVisual() output is built entirely in code, never from
					     user input -->
					<div class="absolute inset-0" style={itemStyle}>
						<!-- no-at-html-tags is disabled for this file in eslint.config.js:
						     makeVisual output is built entirely in code (never from user
						     input), so the injected markup is trusted by construction -->
						{@html makeVisual(item.seed, item.energy)}
					</div>
				{:else}
					<p class="font-serif text-lg leading-snug text-neutral-100 italic" style={itemStyle}>
						{item.text}
					</p>
				{/if}
			{:else}
				<p class="text-sm text-neutral-600 select-none">shake to reveal</p>
			{/if}
		</div>
	</div>
	<!-- caption band: like the handwritten note on a Polaroid, it tells the
	     stranger what the ritual expects of them at each moment. Once revealed,
	     the resting state can only be left on purpose — the next-shake button -->
	<div class="h-14 flex items-center justify-center">
		{#if stage === 'revealed' && onNext}
			<button
				type="button"
				class="rounded-full bg-neutral-200 px-4 py-1 text-xs font-medium text-neutral-700 active:scale-95 active:bg-neutral-300"
				onclick={onNext}
			>
				next photograph
			</button>
		{:else}
			<p class="text-xs text-neutral-400 italic select-none">{caption}</p>
		{/if}
	</div>
</div>