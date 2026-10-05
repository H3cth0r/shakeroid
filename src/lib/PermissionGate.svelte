<script lang="ts">
	// The iOS permission gate: shown until motion permission is granted; the
	// actual permission call lives in the parent (page) via `onclick` so this
	// stays purely presentational. `onFallback` (Phase 5) offers the tap-to-reveal
	// path — the permission-denied / accessibility fallback per spec §2.1.
	interface Props {
		busy?: boolean;
		denied?: boolean;
		onclick?: () => void;
		onFallback?: () => void;
	}
	let { busy = false, denied = false, onclick, onFallback }: Props = $props();
</script>

<div
	class="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
>
	<p class="text-lg font-medium text-neutral-300">
		{denied
			? 'Motion access was denied'
			: 'Shakeroid needs access to detect shakes'}
	</p>

	<button
		type="button"
		class="rounded-full bg-neutral-100 px-8 py-4 text-base font-semibold text-neutral-900 active:scale-95 disabled:opacity-50"
		class:cursor-wait={busy}
		disabled={busy}
		onclick={onclick}
	>
		{busy ? 'Please grant motion access…' : 'Enable Motion'}
	</button>

	{#if denied}
		<p class="text-sm text-amber-300">
			You can allow it again via
			<br />
			Safari → aA → Website Settings → Motion &amp; Orientation
		</p>
	{/if}

	{#if onFallback}
		<button
			type="button"
			class="text-sm text-neutral-500 underline underline-offset-4 active:text-neutral-300"
			onclick={onFallback}
		>
			or tap to reveal instead
		</button>
	{/if}

	<p class="text-xs text-neutral-500">
		{denied
			? 'Tapping works just as well'
			: 'Required once — your phone detects the shakes'}
	</p>
</div>