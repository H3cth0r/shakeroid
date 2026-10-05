<script lang="ts">
	// The Polaroid frame. Development is *progressive and shake-driven*: `progress`
	// (0→1) is deposited by shakes as impulses and the item's look is a pure
	// function of it — opacity, focus and colour saturation all track the
	// physical effort. A pale emulsion layer fades out with the same progress, so
	// the image appears to surface from beneath the undeveloped emulsion. A short
	// CSS transition smooths each impulse into continuous motion.
	import type { RevealStage } from './reveal';

	interface Props {
		item: string | null; // null = nothing revealed yet
		stage: RevealStage; // reported for completeness; visuals derive from progress
		progress: number; // 0 → 1, driven by shakes
	}
	let { item, progress }: Props = $props();

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
		<div class="relative">
			{#if item !== null}
				<p class="font-serif text-lg leading-snug text-neutral-100 italic" style={itemStyle}>
					{item}
				</p>
			{:else}
				<p class="text-sm text-neutral-600 select-none">shake to reveal</p>
			{/if}
		</div>
	</div>
	<!-- caption band (empty for now) -->
	<div class="h-14"></div>
</div>