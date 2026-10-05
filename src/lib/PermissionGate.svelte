<script lang="ts">
	// Phase 1: the iOS permission gate. Shown until motion permission is granted;
	// the actual permission call lives in the parent (page) via `onclick` so this
	// stays purely presentational.
	interface Props {
		busy?: boolean;
		denied?: boolean;
		onclick?: () => void;
	}
	let { busy = false, denied = false, onclick }: Props = $props();
</script>

<div
	class="flex h-full flex-col items-center justify-center gap-6 px-6 text-center"
>
	<p class="text-lg font-medium text-neutral-300">
		Shakeroid needs access to detect shakes
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
			Motion access was denied. You can allow it again via
			<br />
			Safari → aA → Website Settings → Motion &amp; Orientation
		</p>
	{/if}

	<p class="text-xs text-neutral-500">Required once — your phone detects the shakes</p>
</div>