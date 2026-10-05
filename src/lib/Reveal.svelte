<script lang="ts">
	// The Polaroid frame. Renders the item through the "developing" ritual:
	// flash (pale blank) → emerge (ghost image clears up) → revealed. The item is
	// fully drawn from the moment the shake fires — what plays is suspense, not
	// loading. Layout never changes across stages, so the animation pass and
	// content-type expansion later change nothing structural.
	import type { RevealStage } from './reveal';

	interface Props {
		item: string | null; // null = nothing revealed yet
		stage: RevealStage;
		emergeMs: number; // ghost → clear transition length (the chemistry)
	}
	let { item, stage, emergeMs }: Props = $props();

	// Surface: pale, overexposed emulsion during flash; from emerge it drifts
	// back to dark across emergeMs — the image and the surface "settle" together.
	// (Binding different target + duration per stage lets CSS transitions carry
	// the whole develop without keyframes.)
	const surfaceColor = $derived(stage === 'flash' ? '#ddd8d0' : '#171717');
	const surfaceDrift = $derived(stage === 'emerge' ? emergeMs : 200);

	// The item's look per stage: flash = static ghost, emerge = animating to clear
	// (from-look of flash → to-look of emerge is what the transition animates)
	const itemStyle = $derived.by(() => {
		if (stage === 'flash') {
			return 'transition: none; opacity: 0.12; filter: blur(8px) saturate(0.25);';
		}
		if (stage === 'emerge') {
			return `transition: opacity ${emergeMs}ms ease-out, filter ${emergeMs}ms ease-out; opacity: 1; filter: blur(0px) saturate(1);`;
		}
		return ''; // revealed — item sits at natural look (or idle, item is null)
	});
</script>

<div class="flex aspect-[4/5] w-full flex-col rounded-lg bg-white p-3 pb-0 shadow-2xl shadow-black/50">
	<!-- inner surface: pale during flash, chemistry-drifts back to dark across emerge -->
	<div
		class="flex flex-1 items-center justify-center rounded-sm p-6 text-center"
		style="background-color: {surfaceColor}; transition: background-color {surfaceDrift}ms ease-in-out;"
	>
		{#if item !== null}
			<p class="font-serif text-lg leading-snug text-neutral-100 italic" style={itemStyle}>
				{item}
			</p>
		{:else}
			<p class="text-sm text-neutral-600 select-none">shake to reveal</p>
		{/if}
	</div>
	<!-- caption band (empty for now) -->
	<div class="h-14"></div>
</div>