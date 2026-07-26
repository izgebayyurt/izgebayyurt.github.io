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
- `tapa/` — Tapa, the Turkish grid puzzle (the name is short for *Turkish art paint*):
  fill one connected region of cells so every numbered cell describes the runs of
  filled cells in the eight around it, with no 2×2 block ever filled entirely.
  Four books by board size, 6×6 to 12×12, each numbered and endless — the number
  seeds the generator, so №47 is the same board on every device, forever, with
  nothing stored on a server. Boards are generated wall-first and then stripped
  clue by clue for exactly as long as a deduction-only solver can still finish, so
  no puzzle here needs a guess; uniqueness comes free, since a guess-free complete
  solve admits no alternative. Correct is not the same as good, though, so the
  generator builds many candidates and keeps the best: it scores the *shape of the
  solve* — how few cells fall out of the opening sweep, how long the deduction
  chain runs afterwards — and rejects outright any board containing a clue that
  gives itself away. A clue is a giveaway by position as much as by value: `2 2`
  reads as rich, but on an edge cell with five neighbours it admits exactly one
  arrangement, so clues are ranked for removal by how many arrangements they
  allow unaided rather than by the numbers printed in them. Board size is the
  difficulty axis; restricting the solver to weaker logic to make an easy book
  does not work, because a Tapa nearly always needs the one-region rule to close.
  Filled cells merge into a single shape — convex corners rounded,
  concave corners filleted — so a solved board reads as a painted form rather than
  forty black squares, and on the last correct cell the clues fade and then the
  grid itself dissolves, leaving the ink alone on the paper. Ink-on-paper palette
  taken from the site's own dusk colours, with a night theme derived from it rather
  than inverted. No check button and no visible clock: a clue whose neighbourhood is
  fully decided falls quiet, and an outright rule break outlines in accent. State is
  written on every move, so leaving mid-puzzle is not a decision anyone has to make.
  Generation runs in a Web Worker, 4–35 ms a board. Single self-contained
  `index.html`.
- `prismnets/` — standalone Three.js net-folding app (ESM + importmap, no build).
- `Izge Bayyurt - CV.pdf` — linked from the nav.

## Local preview

Any static file server works, e.g.:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.
