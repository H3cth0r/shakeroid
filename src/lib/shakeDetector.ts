// Shake detection + iOS motion permission handling (Phase 1).
//
// iOS quirk (see spec §3.4): DeviceMotionEvent.requestPermission exists only on
// iOS ≥ 13 Safari and must be called from a user gesture (a tap). Android and
// desktop browsers just addEventListener directly.

export interface MotionSample {
	x: number;
	y: number;
	z: number;
	magnitude: number;
	ts: number;
}

export type MotionEventPermission = 'granted' | 'denied' | 'unavailable';

export interface ShakeDetectionOptions {
	/** Raw per-sample data — the instrument for threshold tuning (spec §6.3). */
	onSample?: (sample: MotionSample) => void;
	/** m/s² of (gravity-free) acceleration to count as a strong-enough jolt */
	threshold?: number;
	/** max gap between jolts within one shake */
	shakeWindowMs?: number;
	/** min time between two separate shakes */
	cooldownMs?: number;
}

/** True when the runtime requires the iOS permission dance. */
export function motionNeedsPermission(): boolean {
	if (typeof DeviceMotionEvent === 'undefined') return false;
	// iOS-only capability; not in standard DOM typings (see requestMotionPermission)
	const motionCtor = DeviceMotionEvent as typeof DeviceMotionEvent & {
		requestPermission?: unknown;
	};
	return typeof motionCtor.requestPermission === 'function';
}

/** True when the runtime has any devicemotion support at all. */
export function motionAvailable(): boolean {
	return (
		typeof DeviceMotionEvent !== 'undefined' && 'ondevicemotion' in window
	);
}

/**
 * Request motion access. Must be triggered from a user event handler on iOS.
 * @returns the granted/denied/unavailable outcome
 */
export async function requestMotionPermission(): Promise<MotionEventPermission> {
	if (typeof DeviceMotionEvent === 'undefined') return 'unavailable';
	// iOS-only API; not present in standard DOM typings, so the capability is
	// narrowed through this intersection instead of global augmentation.
	const motionCtor = DeviceMotionEvent as typeof DeviceMotionEvent & {
		requestPermission?: () => Promise<'granted' | 'denied' | 'default'>;
	};
	if (typeof motionCtor.requestPermission === 'function') {
		try {
			const response = await motionCtor.requestPermission();
			return response === 'granted' ? 'granted' : 'denied';
		} catch {
			// Promise rejects if called outside a gesture or the user dismisses
			return 'denied';
		}
	}
	return 'granted'; // non-iOS runtimes have nothing to request
}

/**
 * Start listening for shakes. A shake = enough acceleration crossings within a
 * short window, with a cooldown so one shake can't fire repeatedly.
 *
 * @param onShake called with the peak magnitude when a shake fires
 * @param options see {@link ShakeDetectionOptions}
 * @returns a stop function
 */
export function startShakeDetection(
	onShake: (magnitude: number) => void,
	{ onSample, threshold = 12, shakeWindowMs = 450, cooldownMs = 1100 }: ShakeDetectionOptions = {}
): () => void {
	let lastShakeAt = -Infinity;
	let lastJoltAt = -Infinity;
	let prevSample: { x: number; y: number; z: number } | null = null;

	const handleMotion = (event: DeviceMotionEvent) => {
		const a = event.acceleration;
		let x = a?.x;
		let y = a?.y;
		let z = a?.z;

		// Some runtimes fill only accelerationIncludingGravity (gravity + motion).
		// A first-order high pass (current - previous) isolates the motion part.
		if (x == null || y == null || z == null) {
			const g = event.accelerationIncludingGravity;
			const gx = g?.x;
			const gy = g?.y;
			const gz = g?.z;
			if (gx == null || gy == null || gz == null) return;
			x = prevSample ? gx - prevSample.x : 0;
			y = prevSample ? gy - prevSample.y : 0;
			z = prevSample ? gz - prevSample.z : 0;
			prevSample = { x: gx, y: gy, z: gz };
		}

		const magnitude = Math.sqrt(x * x + y * y + z * z) || 0;
		const ts = event.timeStamp;
		onSample?.({ x, y, z, magnitude, ts });

		if (magnitude >= threshold) {
			const secondJolt = ts - lastJoltAt <= shakeWindowMs;
			const cooledDown = ts - lastShakeAt >= cooldownMs;
			if (secondJolt && cooledDown) {
				lastShakeAt = ts;
				onShake(magnitude);
			}
			lastJoltAt = ts;
		}
	};

	window.addEventListener('devicemotion', handleMotion);
	return () => window.removeEventListener('devicemotion', handleMotion);
}