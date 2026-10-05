<script lang="ts">
	import { onMount } from 'svelte';
	import {
		motionNeedsPermission,
		motionAvailable,
		requestMotionPermission,
		startShakeDetection,
		type MotionSample
	} from '#lib/shakeDetector';
	import { makePool, createShuffleBag, type RevealStage } from '#lib/reveal';
	import contentPool from '#lib/contentPool.json';
	import PermissionGate from '#lib/PermissionGate.svelte';
	import Reveal from '#lib/Reveal.svelte';

	type PermissionState = 'starting' | 'gate' | 'ready' | 'denied' | 'unavailable';
	let screen = $state<PermissionState>('starting');

	// --- shake detection wiring ---
	let shakeCount = $state(0);
	let lastMagnitude = $state<number | null>(null);
	let lastSample = $state<MotionSample | null>(null);
	let sampleCount = $state(0);

	// the phone visibly "knows" it was shaken: ambient background responds
	let hue = $state(0);

	// --- reveal engine ---
	const bag = createShuffleBag(makePool(contentPool.items));
	let currentItem = $state<string | null>(null);

	// shake-driven "developing" ritual: shakes deposit impulse as progress
	// (energy-scaled: harder shakes advance more); a slow passive drift acts as
	// a rescue path so a lone shake eventually resolves instead of freezing
	let stage = $state<RevealStage>('idle');
	let progress = $state(0);
	let impulseBase = $state(0.25); // progress a standard shake deposits
	let driftPerSecond = $state(0.05); // passive rescue drift while developing
	let driftTimer: ReturnType<typeof setInterval> | null = null;

	// --- dev harness (?dev=true + ?t=<threshold>) ---
	let devMode = $state(false);
	let threshold = $state(12);

	let stopDetection: (() => void) | null = null;

	function handleShake(magnitude: number) {
		shakeCount++;
		lastMagnitude = magnitude;
		hue = (hue + 47) % 360; // rotate background hue on every detected shake

		if (stage === 'revealed' || stage === 'idle') {
			currentItem = bag.drawNext().text;
			progress = 0;
			stage = 'developing';
		}
		const energy = Math.min(1, Math.max(0, (magnitude - threshold) / threshold));
		progress = Math.min(1, progress + impulseBase + energy * 0.35);
		if (progress >= 1) stage = 'revealed';
	}

	function restartDetection() {
		stopDetection?.();
		stopDetection = startShakeDetection(handleShake, {
			threshold,
			onSample: (sample) => {
				sampleCount++;
				lastSample = sample;
			}
		});
	}

	async function enableMotion() {
		if (screen === 'ready') return;
		const outcome = await requestMotionPermission();
		if (outcome === 'granted') {
			screen = 'ready';
			restartDetection();
		} else {
			screen = outcome === 'denied' ? 'denied' : 'unavailable';
		}
	}

	function simulateShake() {
		// dev-harness only: fires the shake handler directly, so the reveal UI can
		// be built locally without a phone (context guide §8)
		handleShake(99);
	}

	onMount(() => {
		devMode = new URLSearchParams(window.location.search).get('dev') === 'true';
		const paramThreshold = Number(new URLSearchParams(window.location.search).get('t'));
		if (paramThreshold > 0) threshold = paramThreshold;

		if (!motionAvailable()) {
			screen = 'unavailable';
		} else if (motionNeedsPermission()) {
			screen = 'gate'; // iOS: wait for the "Enable Motion" tap
		} else {
			screen = 'ready';
			restartDetection();
		}

		// passive rescue drift: development creeps forward even without shakes
		driftTimer = setInterval(() => {
			if (stage === 'developing') {
				progress = Math.min(1, progress + (driftPerSecond * 200) / 1000);
				if (progress >= 1) stage = 'revealed';
			}
		}, 200);
	});

	// restart listener when the threshold is changed in the dev harness
	$effect(() => {
		void threshold;
		if (screen === 'ready') restartDetection();
	});

	$effect(() => {
		return () => {
			if (driftTimer) clearInterval(driftTimer);
			stopDetection?.();
			stopDetection = null;
		};
	});
</script>

<main
	class="flex min-h-screen flex-col items-center bg-neutral-950 text-neutral-100 transition-colors duration-700"
	style="background-color: hsl({hue}, 35%, 12%)"
>
	{#if screen === 'gate' || screen === 'denied'}
		<div class="flex flex-1 items-center w-full max-w-md">
			<PermissionGate
				busy={false}
				denied={screen === 'denied'}
				onclick={enableMotion}
			/>
		</div>
	{:else if screen === 'unavailable'}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
			<p class="text-lg text-neutral-300">Motion sensing isn't available here</p>
			<p class="text-sm text-neutral-500">Open Shakeroid on a phone instead.</p>
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 w-full max-w-md">
			<h1 class="text-xl font-semibold tracking-tight">Shakeroid</h1>
			<Reveal item={currentItem} {stage} {progress} />
		</div>
	{/if}

	{#if devMode}
		<!-- dev harness: threshold tuning instrument (notes go to spec §6.3) -->
		<aside class="fixed bottom-0 left-0 w-full rounded-t-xl bg-black/90 p-3 text-xs text-neutral-300 backdrop-blur">
			<div class="mb-2 flex items-center justify-between">
				<span class="font-semibold uppercase tracking-wider text-neutral-500">dev harness</span>
				<button type="button" class="rounded bg-neutral-700 px-3 py-1 text-xs" onclick={simulateShake}>
					simulate shake
				</button>
			</div>
			<div class="grid grid-cols-2 gap-x-4 gap-y-1 font-mono">
				<span>screen: {screen}</span>
				<span>samples: {sampleCount}</span>
				<span>xyz: {lastSample ? `${lastSample.x.toFixed(1)} / ${lastSample.y.toFixed(1)} / ${lastSample.z.toFixed(1)}` : '—'}</span>
				<span>magnitude: {lastSample ? lastSample.magnitude.toFixed(1) : '—'}</span>
				<span>last shake: {lastMagnitude ?? '—'}</span>
				<span>shakes: {shakeCount}</span>
				<span class="col-span-2">pool left: {bag.remaining()} / {contentPool.items.length} · progress: {Math.round(progress * 100)}% · {stage}</span>
			</div>
			<label class="mt-2 flex items-center gap-2">
				threshold: <span class="font-mono">{threshold}</span> m/s²
				<input class="w-40 accent-neutral-100" type="range" min="5" max="30" step="1" bind:value={threshold} />
			</label>
			<label class="mt-1 flex items-center gap-2">
				shake impulse: <span class="font-mono">{impulseBase.toFixed(2)}</span>
				<input class="w-40 accent-neutral-100" type="range" min="0.1" max="1" step="0.05" bind:value={impulseBase} />
			</label>
			<label class="mt-1 flex items-center gap-2">
				rescue drift: <span class="font-mono">{driftPerSecond.toFixed(2)}</span>/s
				<input class="w-40 accent-neutral-100" type="range" min="0" max="0.2" step="0.01" bind:value={driftPerSecond} />
			</label>
		</aside>
	{/if}
</main>