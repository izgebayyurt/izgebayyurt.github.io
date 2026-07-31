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
  The same solver drives hints: it hands back the next cell a person could
  legitimately work out, or points at the mistake already on the board if there
  is one. Boards are deterministic but not precomputed — each is searched from
  scratch on the device, so what you have opened is cached and the next number
  is built in the background while you solve, which takes moving on from about a
  second to instant. The board is the screen: the canvas runs edge to edge and
  every control floats over it on its own disc of paper, so nothing takes layout
  space away from the puzzle. It opens at the largest size that still shows the
  whole board — a square board cannot cover a 19.5:9 phone without cropping, and
  cropping a Tapa crops the deduction — and from there pinch zooms to 4×, two
  fingers pan, and a Fit pill appears while there is somewhere to come back
  from; one finger always paints. Times are kept per puzzle, with per-book bests
  and averages and a ten fastest list; a puzzle finished with a hint or a reveal
  keeps its picture but is left out of the times.
  Filled cells merge into a single shape — convex corners rounded,
  concave corners filleted — so a solved board reads as a painted form rather than
  forty black squares, and on the last correct cell the clues fade and then the
  grid itself dissolves, leaving the ink alone on the paper. Ink-on-paper palette
  taken from the site's own dusk colours, with a night theme derived from it rather
  than inverted. No check button and no visible clock: a clue whose neighbourhood is
  fully decided falls quiet, and an outright rule break outlines in accent. State is
  written on every move, so leaving mid-puzzle is not a decision anyone has to make.
  Generation runs in a Web Worker, 4–35 ms a board. The mark is a Tapa rather than
  a letter: a three-step wall drawn by the same code that draws a solved board,
  with the two clues that are actually true of it. The staircase is not styling —
  the ban on a filled 2×2 is what forces a wall to step — and the position is
  legal, connected and 2×2-free, checked rather than eyeballed. Installable, and
  playable with the radio off: nothing is fetched while you play, so `sw.js` only
  has to keep the one file it starts from — network-first for the page so a deploy
  is never a launch late, cache-first for the icons, which never change.
  The game itself is still a single self-contained
  `index.html`; `manifest.webmanifest`, `sw.js` and the launcher icons sit beside it
  because a service worker cannot be registered from a blob and a launcher cannot
  read an inline icon.
- `dowse/` — Dowse, an original puzzle genre designed as a sibling to Tapa. Shade
  underground water: every number is a dowser standing on dry ground, and the
  reading is the exact taxicab distance to the nearest water cell — not a count
  of neighbours (Minesweeper, Tapa) and not a line of sight (Kuromasu), but a
  nearest-distance promise, which no established genre clues. Each reading
  therefore does two things at once: it dries out the whole diamond of cells
  nearer than its number, and it demands water somewhere on the diamond's rim.
  All water is one connected vein, no 2×2 is ever all water, and that is the
  entire rule set — the depth comes from rims colliding with the one-vein rule,
  which has to thread water through the dry diamonds. Generation mirrors Tapa's:
  vein first, every dry cell seeded as a reading, then stripped for as long as a
  deduction-only solver (diamond dryness, last-candidate rims, the pool rule,
  reachability and cut cells) can still finish, so no board needs a guess and
  uniqueness comes free; candidates are scored on the shape of the solve and a
  reading that gives itself away is rejected outright. Puzzle number seeds the
  generator, so №12 is the same board everywhere, built in a Web Worker with the
  next number prefetched while you solve. The board answers as you work: a
  reading that has come exactly true falls quiet, a drowned one turns accent, a
  pooled 2×2 gets hazard stripes, and when the only thing left wrong is water in
  two pieces it says so in words, since no single cell can show it. Tap a number
  to see how far its reading reaches — the diamond it dries and the rim where
  its water must lie. The app is Tapa's shell wearing Dowse's colours: the
  board is the screen with every control floating over it, pinch zooms to 4×
  and two fingers pan while one finger always paints, hints follow the
  solver's own path (and point at a mistake first if there is one), a reveal
  sits behind the ⋯, and the solve moment withdraws the scaffolding — grid,
  marks, tones — leaving the vein alone in the sand with its readings. Times
  are kept per puzzle with per-book bests, averages and a ten fastest list;
  a puzzle finished with a hint or a reveal keeps its picture but is left out
  of the times. Four books, 7×7 to 13×13. The launcher mark is a Dowse rather
  than a letter: a five-wide vein with the one reading that is actually true
  of it — connected, pool-free, distance checked rather than eyeballed.
  Installable and playable with the radio off; the game itself is still a
  single self-contained `index.html`, with `manifest.webmanifest`, `sw.js`
  and the launcher icons beside it because a service worker cannot be
  registered from a blob and a launcher cannot read an inline icon.
- `delve/` — Delve, an original puzzle genre and the second of the underground
  pair (Dowse finds the water; Delve digs). Dig tunnels from a door on the
  edge: all tunnels connect to the door and never loop — between any two
  tunnel cells there is exactly one way through — every number sits in a
  tunnel and is the exact number of steps from the door walking the tunnels,
  and every dead end is numbered, so a passage only ever stops at a chamber.
  Where Dowse is metric geometry (a reading dries a diamond of open ground),
  Delve is path topology: distances live inside the thing being drawn, so a
  number three cells from the door promising nine steps is promising a
  six-step detour. The dead-end rule is the quiet load-bearing one — any
  digging beyond the true burrow must create a new dead end, and an
  unnumbered dead end is illegal, so a deduction closure that produces a
  valid burrow has produced THE burrow: uniqueness comes free. The solver
  works in three registers — lacing (a cell that would close a ring is rock,
  a corridor down to its last two openings digs both), spanning (ground that
  cannot reach the door or whose pocket holds no chamber is rock, choke
  points every walk squeezes through are dug, a chamber at its shortest
  possible walk pins every step), and probing (suppose one cell, run the
  cheap rules, keep whichever answer does not collapse — one step deep,
  never nested). Burrows are grown to prefer long galleries over stubs,
  numbers are seeded everywhere and stripped in two passes (cheap rules
  first, the probing solver only asked about the survivors), and boards were
  additionally brute-force verified unique during development. It is a
  denser genre than Dowse — mid-corridor numbers survive stripping exactly
  when removing them would let the tunnel reroute, so every number on the
  board is load-bearing. Tapa's app shell wearing peat and lantern-gold:
  same floating chrome, pinch zoom, times with hint-exclusion, dissolve-
  and-sheen solve moment; tapping a number lights the walk it has so far,
  gold along the dug cells from the door. Four books, 6×6 to 12×12.
  Installable and offline like its siblings; the launcher mark is a legal
  five-wide burrow — connected, ring-free, its one chamber's walk verified
  rather than eyeballed. Single self-contained `index.html` with
  `manifest.webmanifest`, `sw.js` and the icons beside it.
- `prismnets/` — standalone Three.js net-folding app (ESM + importmap, no build).
- `Izge Bayyurt - CV.pdf` — linked from the nav.

## Local preview

Any static file server works, e.g.:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.
