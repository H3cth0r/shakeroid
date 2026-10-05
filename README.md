# Shakeroid

Shake your phone and a random little moment develops — like waiting for a Polaroid to appear. The picture isn't chosen and it isn't instant: you shake it into existence, and what surfaces is never quite what you expected.

*A course prototype built for the individual project of the Creative Design course (University of Oulu, School of Engineering) — it deliberately targets **surprise** as the primary emotion: a ritual builds the suspense, and a random reveal violates the expectation.*

## The interaction

1. **Cold start** — open the link on a phone; the app asks once for motion-sensor access (required by iOS Safari)
2. **Initiate** — take a shake: a Polaroid frame appears with an undeveloped ghost image
3. **Earn the development** — keep shaking: the emulsion clears progressively with your effort (each shake deposits an energy-scaled impulse)
4. **Reveal** — a quiet human moment (text) or a generated ink image (seeded SVG) surfaces — the intensity of your shakes shapes how a generated image looks
5. **Rest** — the reveal *stays*: extra shakes don't discard it; a deliberate "next photograph" button starts the next one
6. **No sensor? No problem** — if motion access is denied or unavailable (e.g. on a laptop), a tap drives the same ritual

No accounts, no backend, nothing recorded — each draw is a random moment from a small, quiet pool.

## What's under the hood

| Piece | Where | Role |
|---|---|---|
| Shake detector | `src/lib/shakeDetector.ts` | iOS motion-permission handling + hysteresis shake detection (fires at threshold, re-arms in the valley between shakes) |
| Reveal engine | `src/lib/reveal.ts` | shuffle-bag text pool (no repeats until exhaustion) + weighted text/visual mix |
| Generative visuals | `src/lib/generative.ts` | seeded PRNG → SVG families: ink blots, colour washes, broken rule-lines; shake energy encoded in the seed |
| Polaroid frame | `src/lib/Reveal.svelte` | progressive develop: blur, saturation and emulsion all track your shake progress |
| Content pool | `src/lib/contentPool.json` | 30 one-sentence quiet moments |
| UI screens | `src/routes/+page.svelte` | permission gate, reveal screen, tap-fallback mode, dev harness |

**Stack:** SvelteKit (Kit 3) + Svelte 5 runes + TypeScript + Tailwind 4 + Vite. Static build, no runtime dependencies.

## Developing locally

```sh
npm install
npm run dev          # dev server on http://localhost:5173
```

Motion sensors need a real phone — iOS requires HTTPS for the device-motion API, so either open a deployed branch preview URL or tunnel the dev server (`cloudflared tunnel --url http://localhost:5173`).

## Dev harness

Append `?dev=true&threshold=<n>` to the URL for an on-screen instrument panel:

- live accelerometer readout and shake magnitude
- threshold, shake impulse, energy bonus and rescue-drift sliders (used to tune the ritual — see the tuning notes in the project spec)
- force content type (text / visual / weighted mix) and a seed readout
- "simulate shake" button to build the reveal UI without a phone

## Building

```sh
npm run build        # production build to ./build (static adapter)
npm run preview      # serve the build locally
```

## Repository layout

Work happens one branch per phase (`p1-shake-detection`, `p2-static-reveal`, …): a phase branch is device-tested before its pull request is squashed into `staging`, which is promoted to `main` when a batch of phases is validated. `main` is always deployable. Milestones are tagged `p1-done`, `p2-done`, …

The project spec (requirements alignment, ideation story, design decisions, testing protocol) lives in `planning/latent-product-spec.md` (working notes, not tracked).