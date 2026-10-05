// Seeded generative-content generator: the second content type, alongside text.
// Every visual is derived from a seed, so every reveal is unique in principle,
// but reproducible (the report can cite "reveal #N was seed S"). The shake
// energy that developed the visual weights its composition — a violent ritual
// grows a more violent image.

/** Small, fast, well-distributed PRNG — good enough for art, fully deterministic. */
export function mulberry32(seed: number): () => number {
	let t = seed >>> 0;
	return () => {
		t += 0x6d2b79f5;
		let r = Math.imul(t ^ (t >>> 15), 1 | t);
		r ^= r + Math.imul(r ^ (r >>> 7), 61 | r);
		return ((r ^ (r >>> 14)) >>> 0) / 4294967296;
	};
}

/** Encode the developing shake energy into the seed's high digits. */
export function makeVisualSeed(energy: number): number {
	return (Math.floor(energy * 999) * 1_000_000 + Math.floor(Math.random() * 999_999)) % 1e9;
}

/** Smooth closed blob path: points around a circle with radius jitter. */
function blobPath(R: () => number, cx: number, cy: number, radius: number): string {
	const spikes = 8 + Math.floor(R() * 4);
	const pts: [number, number][] = [];
	for (let i = 0; i < spikes; i++) {
		const ang = (i / spikes) * Math.PI * 2 + (R() - 0.5) * 0.5;
		const rr = radius * (0.6 + R() * 0.45);
		pts.push([cx + Math.cos(ang) * rr, cy + Math.sin(ang) * rr]);
	}
	// quadratic-through-midpoints keeps the blob organically smooth
	let d = `M ${(pts[pts.length - 1][0] + pts[0][0]) / 2} ${(pts[pts.length - 1][1] + pts[0][1]) / 2}`;
	for (let i = 0; i < spikes; i++) {
		const p = pts[i];
		const q = pts[(i + 1) % spikes];
		d += ` Q ${p[0].toFixed(1)} ${p[1].toFixed(1)} ${((p[0] + q[0]) / 2).toFixed(1)} ${((p[1] + q[1]) / 2).toFixed(1)}`;
	}
	return d + ' Z';
}

export function makeVisual(seed: number, energy: number): string {
	const R = mulberry32(seed);
	const W = 200;
	const H = 250;
	const paper = '#161616'; // the photo's "emulsion" keeps the dark inner look

	let defs = '';
	let body = '';

	const family = ['blot', 'wash', 'lines'][Math.floor(R() * 3)];

	if (family === 'blot') {
		// layered ink blots; energy scales their reach and darkens the ink
		const n = 4 + Math.floor(R() * 4);
		for (let i = 0; i < n; i++) {
			const radius = (26 + R() * 34) * (0.7 + energy * 0.9);
			const hue = 215 + (R() - 0.5) * 60; // ink drifts around a cold blue-black
			const light = Math.max(10, 24 - energy * 10 - R() * 8);
			body += `<path d="${blobPath(R, W * (0.22 + R() * 0.56), H * (0.18 + R() * 0.6), radius)}" fill="hsl(${hue.toFixed(0)} ${(10 + R() * 18).toFixed(0)}% ${light.toFixed(0)}%)" opacity="${(0.45 + R() * 0.4).toFixed(2)}"/>`;
		}
		if (energy > 0.45 && R() < 0.7 + energy * 0.3) {
			// violent rituals earn a raw accent
			body += `<path d="${blobPath(R, W * (0.3 + R() * 0.4), H * (0.25 + R() * 0.45), (9 + R() * 14) * (0.6 + energy * 0.7))}" fill="hsl(${(352 + R() * 16).toFixed(0)} 62% 42%)" opacity="${(0.45 + energy * 0.35).toFixed(2)}"/>`;
		}
	} else if (family === 'wash') {
		// soft colour fields bleeding into each other
		const n = 3 + Math.floor(R() * 3);
		defs += `<filter id="w${seed % 9973}" x="-40%" y="-40%" width="180%" height="180%"><feGaussianBlur stdDeviation="${(14 + R() * 16).toFixed(0)}"/></filter>`;
		for (let i = 0; i < n; i++) {
			const hue = Math.floor(R() * 360);
			body += `<ellipse cx="${(W * (0.2 + R() * 0.6)).toFixed(0)}" cy="${(H * (0.18 + R() * 0.6)).toFixed(0)}" rx="${(30 + R() * 46).toFixed(0)}" ry="${(24 + R() * 40).toFixed(0)}" fill="hsl(${hue} ${(28 + R() * 20).toFixed(0)}% ${(48 + R() * 22).toFixed(0)}%)" opacity="${(0.35 + R() * 0.35).toFixed(2)}" filter="url(#w${seed % 9973})"/>`;
		}
	} else {
		// ruled lines, broken: the calm family for low-energy rituals
		const n = 6 + Math.floor(R() * 5);
		for (let i = 0; i < n; i++) {
			const y = (H / n) * (i + 0.5) + (R() - 0.5) * 14;
			const sway = (R() - 0.5) * 34;
			const width = (1.2 + R() * (1.2 + energy * 2.4)).toFixed(2);
			body += `<path d="M ${(-10 + R() * 24).toFixed(0)} ${y.toFixed(0)} C ${(W * 0.33).toFixed(0)} ${(y + sway).toFixed(0)} ${(W * 0.66).toFixed(0)} ${(y - sway).toFixed(0)} ${(W + 10).toFixed(0)} ${(y + (R() - 0.5) * 22).toFixed(0)}" stroke="hsl(${(210 + R() * 40).toFixed(0)} ${(8 + R() * 14).toFixed(0)}% ${(46 + R() * 26).toFixed(0)}%)" stroke-width="${width}" fill="none" stroke-linecap="round" opacity="${(0.3 + R() * 0.5).toFixed(2)}"/>`;
		}
	}

	return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}" preserveAspectRatio="xMidYMid slice" width="100%" height="100%" role="img" aria-label="generated visual">${body ? `<defs>${defs}</defs><rect width="${W}" height="${H}" fill="${paper}"/>` : ''}${body}</svg>`;
}