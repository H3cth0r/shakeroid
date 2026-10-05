<script lang="ts">
	// The Polaroid frame: white border, wider bottom caption band, dark
	// "undeveloped" inner surface in the empty state. The reveal renders inside
	// the inner area, so the animation pass and content-type expansion later
	// change nothing about the layout.
	interface Props {
		item: string | null; // null = empty state (nothing revealed yet)
	}
	let { item }: Props = $props();
</script>

<div
	class="flex aspect-[4/5] w-full flex-col rounded-lg bg-white p-3 pb-0 shadow-2xl shadow-black/50"
>
	<!-- inner surface -->
	<div
		class="flex flex-1 items-center justify-center rounded-sm bg-neutral-900 p-6 text-center"
	>
		{#if item === null}
			<p class="text-sm text-neutral-600 select-none">shake to reveal</p>
		{:else}
			<p class="font-serif text-lg leading-snug text-neutral-100 italic">
				{item}
			</p>
		{/if}
	</div>
	<!-- caption band (empty for now) -->
	<div class="h-14"></div>
</div>