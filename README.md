# izgebayyurt.github.io

Personal portfolio for İzge Bayyurt — a single-page site built from a Claude Design
mock-up. Pure static (no build step); served by GitHub Pages with `.nojekyll`.

## Structure

- `index.html` — the landing page. Loads React + Babel from a CDN and renders the
  components in `v3/` in the browser. The look is locked to the dusk palette,
  Newsreader display font, and the 3D wireframe background.
- `v3/` — page components (`v3-shell.jsx`, `v3-sections.jsx`), interactive widgets
  (`geodesic`, `places-globe`, `rubiks`, `lichess`), the wireframe background, and
  the baked-in image data (`portrait-data.js`, `img-data.js`).
- `directions/asteroidz.jsx` — the playable Asteroids port embedded on the homepage.
- `games/` — game write-up pages (`asteroids`, `marblz`, `soviet-scoot`) and assets.
- `swerve/` — mobile-first arcade free kicks. One swipe is the whole game: direction
  aims, length powers, and the hook in your swipe becomes the ball's curve. Every set
  piece is verified solvable before you see it. Single self-contained `index.html`.
- `worldie/` — arcade soccer score attack. 45 seconds on the clock, one striker
  against a keeper and waves of defenders; every goal buys +4s and quick goals
  chain a combo multiplier. Single self-contained `index.html`.
- `gegenpress/` — turn-based soccer tactics on a 7×9 grid. Perfect information: the
  opposition telegraphs every run, pass, shot and tackle before you commit, and
  resolution is fully deterministic. Single self-contained `index.html`.
- `burnbridge/` — graph-theory puzzler for two travellers. They share one pool of
  bridges and every crossing burns the bridge behind it, so each span one spends is
  denied to the other forever. Formally: two edge-disjoint trails, one per traveller,
  that jointly reach every island — with claimed islands that only their own
  traveller can settle, so neither can idle. No distances and no numbers on the
  board; par is the fewest crossings that can settle it. Starts and claims are not
  hand-placed: a search certified every board against the solver (solvable, both
  travellers required, and the obvious greedy line strands). The same solver runs
  after each move, so the game says so the moment a board can no longer be finished.
  14 certified crossings, endless generated ones, and Königsberg itself as an
  interlude that shows you why it cannot be done. Single self-contained `index.html`.
- `prismnets/` — standalone Three.js net-folding app (ESM + importmap, no build).
- `Izge Bayyurt - CV.pdf` — linked from the nav.

## Local preview

Any static file server works, e.g.:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.
