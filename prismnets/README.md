# PrismNets — Web (Three.js)

A native-JavaScript port of PrismNets, played in the browser with mouse + keyboard (no
headset). Unfold any of 120 polyhedra by clicking edges, and explore four modes:

- **Sandbox** — fold the shape freely.
- **Net Hunt** — find every distinct net of a small solid (the 11 cube nets, etc.). The
  target count is precomputed per solid (`npm run precompute:nets`) and detected live with
  a congruence-invariant fingerprint.
- **Puzzle** — practise one challenge (seams, will-it-close, adjacency, fold-to-match).
- **Gauntlet** — a timed, rising-difficulty run of those challenges.

It reuses the exact unfolding/connectivity/net-detection logic from the Unity project,
reimplemented on the Three.js scene graph.

## Run

```bash
cd web
npm install
npm run dev             # http://localhost:5173
npm run build           # production bundle in dist/  (base:'./', works at any subpath)
npm test                # headless logic tests (incl. discovering all 11 cube nets)
npm run precompute:nets # recompute per-solid net counts → public/solids/catalog.json
npm run deploy          # build + stage dist/ into the Pages site (see Deployment)
```

## Deployment

The build is a self-contained static bundle (`dist/`) with `base:'./'`, so it runs from a
domain root **or any subpath** with no config changes — solid data is fetched relative to
the page.

It's wired to publish into a sibling GitHub Pages clone as a subpath app:

```bash
npm run deploy          # builds, then copies dist/ → ../../izgebayyurt.github.io/prismnets/
# review the diff, then in that repo:
#   git add prismnets && git commit -m "Update PrismNets web app" && git push
# → served at https://izgebayyurt.github.io/prismnets/
```

Publish elsewhere by passing a target folder (`npm run deploy -- /path/to/site/app`) or by
uploading `dist/` to any static host. The site is a single page (no client-side routing;
the only URL state is `?solid=<id>`), so no SPA rewrite rules are needed. The Jekyll site
copies the folder verbatim — Vite's `index.html` has no front matter, so Liquid never
touches it.

## Controls

- **Move the cursor near a foldable edge** → a glowing tendril streams from that edge to
  your cursor (no buttons; the face stays put). **Click** → fold / unfold that face.
- **Drag** → orbit · **scroll** → zoom.
- **Reset cube** → refold to the assembled cube (keeps the found-net gallery).
- **Export log** → download the session's behavioural event log as JSON.

## How it maps to the Unity source

The mechanic is built on a parent/child transform hierarchy, so it ports 1:1:

| Unity (`Assets/Scripts/...`) | Web (`src/...`) |
|---|---|
| `PolyhedronStructure/Polyhedron.cs` | `core/Polyhedron.js` |
| `PolyhedronStructure/Face.cs` | `core/Face.js` |
| `PolyhedronStructure/Edge.cs` | `core/Edge.js` |
| `StateMachine/*` (unfold/fold/hover) | `core/StateMachine.js` |
| `NetEnumerationManager.cs` | `core/NetEnumeration.js` |
| `Johnson/PolyhedronBuilder.cs` | `geometry/build.js` + `geometry/cube.js` |
| `Logging/SessionLogger.cs` (local-JSON path) | `SessionLogger.js` |
| `Transform.RotateAround` | `mathutil.js → rotateAroundWorldAxis` |
| `transform.parent = x` (BFS fold tree) | `parent.attach(child)` |

### Notable porting decisions
- **The base face is the fixed anchor** — its edge buttons are locked off. You unfold the
  other five faces *around* the base, which is what `NetEnumeration` assumes (it measures
  every face relative to the root and lets the root stay folded). Without this the base
  could be rotated, breaking the net reference.
- **Reset uses a transform snapshot** taken at build time rather than replaying the move
  stack in reverse — avoids floating-point drift over long sessions.
- **Logging is local-only** (in-memory → JSON download), matching the C# `WriteLocal`
  fallback. For remote research collection, swap `SessionLogger.export()` for a
  `fetch()` POST to your endpoint.

## Extending to other solids

`geometry/build.js` is generic (a direct port of `PolyhedronBuilder.BuildFromData`): pass
any `{ name, vertices, faces }` data with consistent outward winding and it builds the
foldable model. `cube.js` is just the cube's data.
