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
- `rill/` — Rill, an original puzzle genre that earned its rules the hard
  way, through four designs, each killed by measurement. It began as Dowse:
  numbers reading the exact distance to the nearest water — too generous, an
  8 empties a whole diamond mechanically. Pointing exactness at springs
  instead didn't save it: an exact reading is a thin question, a circle the
  spring must sit on, and circles intersect to a point, so the dead ends
  could be triangulated arithmetically. So the number stopped measuring and
  started COUNTING — springs within earshot, how many, never where — and
  when zeros turned out to say too much (twelve cells of certified silence
  for free), silence was banned from print. That ban exposed the real
  disease: a counting number must stand within two cells of a spring to
  have anything to say, springs sit on the water, and counting says nothing
  about the corridors' routes — so the only way the generator could pin the
  course was to keep MORE numbers. Measured: 22% of cells carried numbers
  and two-thirds of the dry ones were pressed against the water, tracing
  the river in negative space. A blanket of clues that forces the line, and
  no tuning of that clue system escapes it — the geometry is intrinsic.
  The cure was structural, two rules that carry what the blanket used to:
  the rill never runs ALONGSIDE itself (two diagonally touching water
  cells must share an orthogonally wet corner — an honest bend, never a
  bare squeeze), which tidies the routes and makes the veins read as
  actual meanders; and GAUGES ON THE BANKS — numbers outside the grid,
  each counting the water cells in its row or column, the trees-and-tents
  device turned into river gauges. A gauge cannot trace the line, because
  it does not stand on the board; yet it pins the course globally, exactly
  the work no earshot count could do, and any branch grown anywhere
  disturbs some tally, which is what makes sparse boards unique again.
  Gauges keep the same vow of silence: a tally of zero is never printed.
  What remains in the field is the springs game, distilled: a HANDFUL of
  counts — 4–6% of cells at every size, two numbers on a 7×7 — almost all
  of them WET, riding the stream as part of the picture rather than
  outlining it (dry numbers are offered up for removal first, so what
  survives floats). Counting alone is still provably insufficient by
  construction: every board must admit at least two spring-layouts
  consistent with its counts, and shipped boards run 8 to 50+. The board
  keeps a one-cell gutter for the gauges; tapping a number washes its
  earshot, tapping a gauge lights its line; a bare diagonal squeeze is
  striped like a loop — the two shapes the rill may never make. Springs
  wear wellhead rings, numbers sit wet or dry as shown, a number is never
  a spring. What is printed is also provably IRREDUNDANT: reduction
  offers every survivor — field number and gauge alike — to the full
  solver once, and since removability is monotone that one pass proves
  no single printed thing can be crossed out. Against a randomized-
  search estimate of the true minimum (independent greedy descents from
  the full candidate set), shipped counts sit at or below the best
  descent found on the mid and large boards and within a clue or two on
  the small — about eleven printed things on a 7×7, twenty-six on a
  13×13, most of them tallies in the margin. All four books, 7×7 to
  13×13, generate in about a third of a second to two. The generator
  also reads the solve's CHARACTER before keeping a board: the solver
  keeps a ledger of which rule family placed every deduced cell, a
  board that falls mostly to gauge row-arithmetic is rejected as
  battleship in disguise, and springs-game work earns score — on the
  shipped tuning roughly a quarter to two-fifths of a solve is
  one-step supposition work and row arithmetic stays under two-fifths.
  The opening levels are certified, not sampled — the 7×7 book's first
  fifteen and the 9×9's opening boards brute-force verified unique by
  an independent counter, №1–12 of the 9×9, 11×11 and 13×13 books
  verified valid and solver-matched. Same sand and
  well-water shell: times with hint-exclusion, pinch zoom, the
  dissolve-and-sheen solve moment (the gauges stay through it — they are
  part of the finished thing), installable and playable offline. The
  launcher mark is a legal rill under every rule — loop-free, never
  alongside itself, springs ringed, its one count verified rather than
  eyeballed. Single self-contained `index.html` with
  `manifest.webmanifest`, `sw.js` and the icons beside it.
- `delve/` — Delve, an original puzzle genre and the second of the underground
  pair (Rill traces the water to its springs; Delve digs). Dig tunnels from a door on the
  edge: all tunnels connect to the door and never loop — between any two
  tunnel cells there is exactly one way through — every number sits in a
  tunnel and is the exact number of steps from the door walking the tunnels,
  and every dead end is numbered, so a passage only ever stops at a chamber.
  Where Rill is metric geometry (readings heard across open ground),
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
