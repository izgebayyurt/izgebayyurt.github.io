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
- `carom/` — 1v1 slingshot duel. Drag to pull your circle back and release to fire
  it; time crawls while you aim but the hold is on a leash, and every launch costs
  a cooldown. Neither side may cross halfway, so nobody chases. Single
  self-contained `index.html`.
- `burnbridge/` — graph-theory puzzler for two to four travellers. They share one
  pool of bridges and every crossing burns the bridge behind it, so each span one
  spends is denied to the others forever. Formally: edge-disjoint trails, one per
  traveller, that jointly reach every island — with claimed islands only their own
  traveller can settle, so nobody can idle. No distances anywhere; par is the fewest
  crossings that settle the board. Bridges read in three states — standing, crossable
  now by the picked traveller, or burnt (dashed in the colour of whoever crossed,
  arrowed the way they went). Levels are generated and certified, never authored:
  each is solvable, needs every traveller, and strands the obvious greedy line. The
  same solver runs after every move, so a lost board says so immediately. 26 levels
  across three acts plus endless Drift, and Königsberg as an interlude that shows why
  it cannot be done. Single self-contained `index.html`.
- `prismnets/` — standalone Three.js net-folding app (ESM + importmap, no build).
- `Izge Bayyurt - CV.pdf` — linked from the nav.

## Local preview

Any static file server works, e.g.:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.
