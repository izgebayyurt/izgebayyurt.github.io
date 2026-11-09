# Publishing Huemeld

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

Levels are **generated from a known solution** — every level is solvable by
construction, and each baked solution is replayed end-to-end through the real game
(headless) before shipping. Uniqueness is NOT guaranteed: the exact solution counter
(`flow-solve.mjs`) only understands walls, gates, ice and counters (not portals,
bridges, prisms or arrows), and the shipped ramps don't run it.

```
node huemeld/tools/flow-app.mjs   # writes flow-data.js (campaign + daily + packs)
# NOTE: no --seed! The shipped data uses the tool's default seed (20260712);
# passing a different seed regenerates EVERY level and invalidates verification.
```

- `tools/flow-solve.mjs` — exact solution counter + one-solution extractor.
- `tools/flow-gen2.mjs` — the single-emitter generator: grows the solution's paths
  first (three arms from a junction, or one square forking to two junctions) so the
  board is a full-coverage single-emitter solution by construction (the counter only
  runs for specs that ask for it via `tactical`/`measure`). One R/Y/B square each; secondary circles (O/G/P) as
  objectives.
- `tools/flow-app.mjs` — the campaign ramp + daily pool.

To add difficulty or more levels, edit the `CAMPAIGN` / `DAILY` ramps in
`flow-app.mjs` and rerun. The **Daily Puzzle** is deterministic by UTC date and
cycles through the `daily` pool, so grow that pool for a longer daily runway.

## 3. Monetization (native)

The web build shows **no ads** and has everything unlocked. The native wrapper
(`huemeld-app/native.js`) injects a bridge that turns the seams in `flow2.html`
into real ads/IAP:

```js
window.HuemeldNative = {
  rewarded(cb)        // cb(got, reason) — opt-in video; reason "unavailable"/"closed"/"busy"
  buyFull(cb)         // Huemeld Pro; cb(true) once RevenueCat reports the entitlement
  restore(cb)         // cb({noads, full}) from RevenueCat, or null on error
  privacyChoices(cb)  // reopen Google's GDPR consent form (EEA/UK/CH)
  haptic(kind)
};
```

| Seam | Trigger | Where in `flow2.html` |
|------|---------|----------|
| Rewarded hint | **Hint** button (free native players) | `btnHint` handler |
| Rewarded unlock | tapping a locked pack level past the teaser | `btnUpNoAds` handler |
| Huemeld Pro IAP | menu **Go Pro**, upsell, Settings | `btnUpBuy` / `btnFull` |
| Restore / Privacy choices | Settings | `btnRestore` / `btnPrivacy` |

Entitlements land in `localStorage` (`hm_flow2_ent_full`, legacy `hm_flow2_ent_noads`)
via `window.__applyEnt(e, authoritative)`; RevenueCat is the source of truth, so a
refund clears them on the next launch. There are **no interstitials**.

### Wrapping with Capacitor — BUILT, see `huemeld-app/`

The wrapper now exists at the repo root: **`huemeld-app/`** contains the Capacitor
project (AdMob rewarded videos + RevenueCat purchases, `native.js` bridge,
`sync.mjs` build step) and **`huemeld-app/APPSTORE.md`** is the complete
step-by-step App Store Connect checklist — accounts, ad units, IAP setup,
Info.plist/ATT snippets, paste-ready store metadata, and the 8 ready-made
screenshots + IAP promo images in `huemeld-app/store-assets/`.
The privacy policy Apple requires is live at `huemeld/privacy.html`.

### The model (final — fully wired in the shell)
- **Free**: the whole 250-level campaign (chapters gate by progress: solve 2/3 to
  open the next), today's daily, and the first 5 levels of every pack. **No forced
  ads.** Optional rewarded videos: one reveals a hint pipe, one unlocks the next 8
  levels of a pack.
- **$2.99 — Huemeld Pro** → flips `hm_flow2_ent_full` (bridge: `buyFull(cb)`):
  all 7 packs + the 250-level Medley (600 levels) + the daily archive (last 3
  weeks replayable, streak-repairing) + instant chapter unlock + free hints.
- Remove Ads (`hm_flow2_ent_noads`) is retired but still honoured for past buyers.
The purchase buttons appear only when the native bridge exists. Test any state on web via `__flow.entNoAds(true)` / `__flow.entFull(true)`.
