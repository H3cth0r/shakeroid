<script lang="ts">
	import { onMount } from 'svelte';
	import {
		motionNeedsPermission,
		motionAvailable,
		requestMotionPermission,
		startShakeDetection,
		type MotionSample
	} from '#lib/shakeDetector';
	import { makePool, createShuffleBag, type RevealStage, type RevealItem } from '#lib/reveal';
	import contentPool from '#lib/contentPool.json';
	import PermissionGate from '#lib/PermissionGate.svelte';
	import Reveal from '#lib/Reveal.svelte';

	type PermissionState = 'starting' | 'gate' | 'ready' | 'denied' | 'unavailable' | 'taps';
	let screen = $state<PermissionState>('starting');

	// --- shake detection wiring ---
	let shakeCount = $state(0);
	let lastMagnitude = $state<number | null>(null);
	let lastSample = $state<MotionSample | null>(null);
	let sampleCount = $state(0);

	// the phone visibly "knows" it was shaken: ambient background responds.
	// The colour is painted on the document body (see effect below) so the
	// canvas itself follows the rotation — Safari's top/bottom bands match.
	let hue = $state(0);

	// --- reveal engine ---
	const bag = createShuffleBag(makePool(contentPool.items));
	let currentItem = $state<RevealItem | null>(null);
	let visualRatio = $state(0.3); // dev-harness: odds of a visual reveal (tuned 30/70)

	// shake-driven "developing" ritual: shakes deposit impulse as progress
	// (energy-scaled: harder shakes advance more); a slow passive drift acts as
	// a rescue path so a lone shake eventually resolves instead of freezing
	let stage = $state<RevealStage>('idle');
	let progress = $state(0);
	let impulseBase = $state(0.16); // progress per shake (tuned up from 0.25: more shakes per reveal)
	let energyBonus = $state(0.2); // extra impulse for high-energy shakes
	let driftPerSecond = $state(0.05); // passive rescue drift while developing
	let driftTimer: ReturnType<typeof setInterval> | null = null;

	// --- dev harness (?dev=true + ?t=<threshold>) ---
	let devMode = $state(false);
	let threshold = $state(12);
	let typeOverride = $state<'auto' | 'text' | 'visual'>('auto');

	let stopDetection: (() => void) | null = null;

	function handleShake(magnitude: number) {
		shakeCount++;
		lastMagnitude = magnitude;
		hue = (hue + 47) % 360; // rotate background hue on every detected shake

		// revealed is a RESTING state (user decision after device testing):
		// accidental extra shakes must not destroy the revealed photograph —
		// only the "next photograph" button leaves it
		if (stage === 'revealed') return;

		// energy of THIS shake: 0 at threshold, 1 at double — it both scales the
		// impulse and seeds a visual item's composition when one is drawn
		const energy = Math.min(1, Math.max(0, (magnitude - threshold) / threshold));

		if (stage === 'idle') {
			drawItem(energy);
		}
		progress = Math.min(1, progress + impulseBase + energy * energyBonus);
		if (progress >= 1) stage = 'revealed';
	}

	function drawItem(energy: number) {
		currentItem = bag.drawNext({
			forceType: typeOverride === 'auto' ? undefined : typeOverride,
			visualRatio,
			energy
		});
		progress = 0;
		stage = 'developing';
	}

	// the "next photograph" button (shown in the caption band once revealed):
	// a deliberate act, so the resting state never ends by accident
	function nextReveal() {
		drawItem(0.5); // no shake to seed from — visual items draw at mid energy
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

	// tap fallback (spec §2.1): the granted-free path when motion permission is
	// denied or absent — a tap acts as a shake at "mid" energy (threshold × 1.5
	// keeps the same impulse/energy scaling, so the ritual feels identical)
	function startTapMode() {
		screen = 'taps';
	}

	function handleTap() {
		// in tap mode the same button follows the ritual: start → develop →
		// (as revealed) leave the resting state via next
		if (stage === 'revealed') nextReveal();
		else handleShake(threshold * 1.5);
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

	// the canvas (body) follows the dynamic hue, so Safari's bands match —
	// main itself stays transparent (layout.css comment for the full story)
	$effect(() => {
		document.body.style.backgroundColor = `hsl(${hue}, 35%, 12%)`;
		return () => {
			document.body.style.backgroundColor = '';
		};
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
	class="flex min-h-screen flex-col items-center bg-transparent text-neutral-100"
>
	{#if screen === 'gate' || screen === 'denied'}
		<div class="flex flex-1 items-center w-full max-w-md">
			<PermissionGate
				busy={false}
				denied={screen === 'denied'}
				onclick={enableMotion}
				onFallback={startTapMode}
			/>
		</div>
	{:else if screen === 'unavailable'}
		<div class="flex flex-1 flex-col items-center justify-center gap-3 text-center">
			<p class="text-lg text-neutral-300">Motion sensing isn't available here</p>
			<p class="text-sm text-neutral-500">Open Shakeroid on a phone instead — or tap below.</p>
			<button
				type="button"
				class="mt-2 rounded-full bg-neutral-100 px-8 py-4 text-base font-semibold text-neutral-900 active:scale-95"
				onclick={startTapMode}
			>
				tap to reveal instead
			</button>
		</div>
	{:else}
		<div class="flex flex-1 flex-col items-center justify-center gap-4 w-full max-w-md">
			<h1 class="text-xl font-semibold tracking-tight">Shakeroid</h1>
			<!-- the resting exit lives in the caption band; in tap mode the bottom
			     button already plays that role, so don't show two of the same -->
			<Reveal
				item={currentItem}
				{progress}
				{stage}
				onNext={screen === 'taps' ? undefined : nextReveal}
			/>
			{#if screen === 'taps'}
				<button
					type="button"
					class="rounded-full bg-neutral-100 px-8 py-4 text-base font-semibold text-neutral-900 active:scale-95"
					onclick={handleTap}
				>
					{stage === 'idle' ? 'tap to reveal' : stage === 'developing' ? 'tap to develop' : 'next photograph'}
				</button>
			{:else if stage === 'idle'}
				<!-- onboarding: one line, self-explanatory for a stranger -->
				<p class="animate-pulse text-sm text-neutral-400">shake your phone to develop a photograph</p>
			{/if}
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
				<span class="col-span-2">pool left: {bag.remaining()} / {contentPool.items.length} · progress: {Math.round(progress * 100)}% · {stage} · item: {currentItem?.type ?? '—'}{currentItem?.type === 'visual' ? ` (seed ${currentItem.seed}, e ${currentItem.energy.toFixed(2)})` : ''}</span>
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
				energy bonus: <span class="font-mono">{energyBonus.toFixed(2)}</span>
				<input class="w-40 accent-neutral-100" type="range" min="0" max="0.5" step="0.05" bind:value={energyBonus} />
			</label>
			<label class="mt-1 flex items-center gap-2">
				rescue drift: <span class="font-mono">{driftPerSecond.toFixed(2)}</span>/s
				<input class="w-40 accent-neutral-100" type="range" min="0" max="0.2" step="0.01" bind:value={driftPerSecond} />
			</label>
			<label class="mt-1 flex items-center gap-2">
				visual ratio: <span class="font-mono">{Math.round(visualRatio * 100)}%</span>
				<input class="w-40 accent-neutral-100" type="range" min="0" max="1" step="0.05" bind:value={visualRatio} />
			</label>
			<label class="mt-1 flex items-center gap-2">
				force type:
				<select class="rounded bg-neutral-800 px-2 py-0.5" bind:value={typeOverride}>
					<option value="auto">auto (weighted mix)</option>
					<option value="text">text only</option>
					<option value="visual">visual only</option>
				</select>
			</label>
		</aside>
	{/if}
</main>