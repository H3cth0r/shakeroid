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

	// the "developing" ritual: flash → emerge → revealed; shakes are locked while
	// a reveal is in flight (one ritual at a time — deliberate tunable)
	let stage = $state<RevealStage>('idle');
	let blankMs = $state(800);
	let emergeMs = $state(2000);
	let stageTimers: ReturnType<typeof setTimeout>[] = [];

	function clearStageTimers() {
		for (const t of stageTimers) clearTimeout(t);
		stageTimers = [];
	}

	// --- dev harness (?dev=true + ?t=<threshold>) ---
	let devMode = $state(false);
	let threshold = $state(12);

	let stopDetection: (() => void) | null = null;

	function handleShake(magnitude: number) {
		if (stage === 'flash' || stage === 'emerge') return; // ritual locked
		shakeCount++;
		lastMagnitude = magnitude;
		hue = (hue + 47) % 360; // rotate background hue on every detected shake

		currentItem = bag.drawNext().text;
		stage = 'flash';
		clearStageTimers();
		stageTimers.push(
			setTimeout(() => (stage = 'emerge'), blankMs),
			setTimeout(() => (stage = 'revealed'), blankMs + emergeMs)
		);
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
	});

	// restart listener when the threshold is changed in the dev harness
	$effect(() => {
		void threshold;
		if (screen === 'ready') restartDetection();
	});

	$effect(() => {
		return () => {
			clearStageTimers();
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
			<Reveal item={currentItem} {stage} {emergeMs} />
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
				<span class="col-span-2">pool left: {bag.remaining()} / {contentPool.items.length} · stage: {stage}</span>
			</div>
			<label class="mt-2 flex items-center gap-2">
				threshold: <span class="font-mono">{threshold}</span> m/s²
				<input class="w-40 accent-neutral-100" type="range" min="5" max="30" step="1" bind:value={threshold} />
			</label>
			<label class="mt-1 flex items-center gap-2">
				blank hold: <span class="font-mono">{blankMs}</span> ms
				<input class="w-40 accent-neutral-100" type="range" min="300" max="1200" step="100" bind:value={blankMs} />
			</label>
			<label class="mt-1 flex items-center gap-2">
				emerge length: <span class="font-mono">{emergeMs}</span> ms
				<input class="w-40 accent-neutral-100" type="range" min="600" max="4000" step="200" bind:value={emergeMs} />
			</label>
		</aside>
	{/if}
</main>