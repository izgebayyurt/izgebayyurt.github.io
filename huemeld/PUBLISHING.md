# Huemeld Flow — publishing & monetization

Flow is a single static web game (`flow2.html` + `flow-data.js` + `sw.js` +
icons). It ships two ways from the same code:

1. **Web / PWA** — served by GitHub Pages. Installable, works offline.
2. **iOS + Android apps** — the same files wrapped with **Capacitor**, where the
   real ads and in-app purchases live.

---

## 1. Web / PWA (already wired)

- `manifest.webmanifest` + `sw.js` + `icon-192/512/180.png` make Flow
  installable and offline-capable. `flow2.html` registers the service worker and
  links the manifest.
- To publish: it's already live at `…/huemeld/flow2.html`. Optionally add a link
  to it from the Huemeld landing page.
- **Bump the cache version** in `sw.js` (`CACHE = "huemeld-flow-vN"`) whenever you
  change `flow2.html` or `flow-data.js`, so returning players get the update.

## 2. Content pipeline

Levels are **generated and proven** — every level has exactly one solution, and
each is machine-checked (solver + an end-to-end replay through the real engine).

```
node huemeld/tools/flow-app.mjs --seed 20260709   # writes flow-data.js (campaign + daily)
```

- `tools/flow-solve.mjs` — exact solution counter + one-solution extractor.
- `tools/flow-gen2.mjs` — the single-emitter generator: grows the solution's paths
  first (three arms from a junction, or one square forking to two junctions) so the
  board is a full-coverage single-emitter solution by construction, then the counter
  confirms exactly one solution. One R/Y/B square each; secondary circles (O/G/P) as
  objectives.
- `tools/flow-app.mjs` — the campaign ramp + daily pool.
- `tools/flow-gen.mjs` / `flow-build.mjs` — the earlier multi-emitter snake generator
  (kept for reference).

To add difficulty or more levels, edit the `CAMPAIGN` / `DAILY` ramps in
`flow-app.mjs` and rerun. The **Daily Puzzle** is deterministic by UTC date and
cycles through the `daily` pool, so grow that pool for a longer daily runway.

## 3. Monetization (native)

The web build shows **no ads**. The native wrapper injects a bridge that turns the
seams already in `flow2.html` into real ads/IAP:

```js
// provided by the Capacitor shell on app start:
window.HuemeldNative = {
  interstitial()    { /* show interstitial (called every 4th solve) */ },
  buyRemoveAds(cb)  { /* run IAP; cb(true) on success → ads removed forever */ },
};
```

Where each hooks in (search `flow2.html` for these):

| Seam | Trigger | Function |
|------|---------|----------|
| Interstitial | every 4th level solved | `maybeInterstitial()` |
| Remove-Ads IAP | **Remove Ads** button (shown only when the bridge exists) | `btnNoAds` handler |

The purchase persists in `localStorage` (`hm_flow2_noads`), which suppresses
interstitials. For real receipts, have `buyRemoveAds` verify with the store and
mirror the flag.

### Wrapping with Capacitor (outline)

```sh
npm i -D @capacitor/cli && npx cap init "Huemeld Flow" com.izge.huemeldflow
# point webDir at a folder containing flow2.html + flow-data.js + sw.js + icons
npm i @capacitor/android @capacitor/ios
npx cap add android && npx cap add ios
```

Then add an ads plugin (e.g. **AdMob**: `@capacitor-community/admob`) and IAP
(**RevenueCat** `@revenuecat/purchases-capacitor`, or `@capacitor-community/in-app-purchases`),
and implement `window.HuemeldNative` in a small bootstrap that runs before
`flow2.html` (or inject it via `cap`'s `appLaunchUrl`/a preload script). Set the
app's start page to `flow2.html`.

**Accounts you'll need:** Apple Developer ($99/yr), Google Play ($25 once), and an
AdMob account (+ a RevenueCat account if you use it). Store review expects a
privacy policy and, for ads, an ATT prompt on iOS.

### Recommended model
Free with a light **interstitial** every few solves and a one-time **Remove Ads**
IAP. This matches the genre and keeps the core game fully playable for free.
