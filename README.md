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
- `cushion/` — Cushion, pocket billiards on paper: Tapa's ink-on-paper ground and
  floating chrome, wearing Huemeld's outlined, hard-shadowed objects. Three modes off
  one engine. **Studies** are trick shots — two to four balls, clear the table inside
  par — and par is not an author's opinion: the generator beam-searches candidate
  shots, simulates every one of them to rest, and par is however many the shortest
  line it could actually shoot took. It proves them *centre-ball*, so spin is always
  yours to use and never the answer, and a study whose every ball already hangs over
  a pocket is thrown away before it is offered. Books are by ball count and endless,
  numbered like Tapa's: №47 is the same table on every device forever, because the
  number is the seed. **Nine-ball** is against a machine reading the table through the
  same candidate list, at three strengths that differ in what they will attempt and in
  how much they miss by — and it picks by shooting each shot again a standard deviation
  either side and counting what still drops, so it declines thin cuts it has no
  business taking, plays position, and ducks a coin-flip when it is good enough to
  know. **The run** is endless: eight shots, every ball down buys another, two in a
  stroke buys three, the ringed pocket pays double. The physics is one function the
  screen and the prover both call, so the table you shoot on is the table par was
  measured on. Slip — the contact patch against the cloth — is tracked separately from
  velocity, which is where draw, follow, stun and swerve come from rather than being
  special-cased; an impulse moves slip by exactly the vector it moves velocity by,
  which is why a drawn cue ball comes back *after* it has hit something. Cushions are
  capsules, so their ends are real jaws a ball can rattle in; a corner takes anything
  that gets close, but a side pocket wants the ball past the nose, so a ball rolling
  the length of the long rail sails by it. Aiming is honest about which half is which:
  the dashed line and the ghost ring are geometry and hold at any speed, the solid line
  is this stroke at this speed run through the real physics and stops where the ball
  stops, and a contact the stroke cannot reach draws a ring where the cue ball actually
  dies instead. Generation runs in a Worker — a second one, so a hint asked for while
  the next study is building does not queue behind it — 0.2–3 s a board, prefetched
  while you shoot. Paper and slate themes, pinch zoom, times and bests kept locally,
  synthesised clicks, installable and playable offline. The launcher mark is drawn by
  the same routine that draws a ball on the table, at the instant of contact: the two
  centres are exactly two radii apart because the arithmetic says so. Single
  self-contained `index.html` with `manifest.webmanifest`, `sw.js` and the icons
  beside it. (`carom/` took the other billiards word first; it is a different game.)
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
- `rill/` — Rill, an original puzzle genre that found its final shape by
  measuring five designs to death. THE SPRINGS ARE GIVEN; FIND THE RIVER:
  wellheads are printed on the sand, and you draw the one stream that
  ends exactly there — one connected vein, never looping (water joins,
  it never circles), never running alongside itself (two diagonally
  touching water cells share a wet corner: an honest bend, never a bare
  squeeze), whose dead ends are precisely the printed springs. Numbers
  are STONES the river must flow around — water never touches a
  numbered cell — and each counts the water in the EIGHT squares
  around it, minesweeper's own question asked about a stream. The
  stone's cell being forbidden is itself a clue: a rock parts the
  current. A river with L springs forks exactly L−2 times, so every
  fork found is one off the ledger. A zero is never printed, anywhere. The road here: exact
  distance readings fell to triangulation (thin questions — circles
  intersect to a point); earshot counts fixed ambiguity but measured
  22% of cells clued with the dry numbers tracing the river in negative
  space, because a nonzero count must stand near a spring — intrinsic,
  untunable; bank gauges moved the course off the board but the solve
  measured half row-arithmetic, and the springs game contributed
  nothing; making the clues individually rich enough to act on — the
  brainstorm's turn — meant giving the anchors away and hiding the
  geometry instead, the move Tents and Masyu make. What sealed it: with
  springs given, the dead-end rule (Delve's load-bearing idea,
  transplanted) does the global pinning — any stray branch is illegal
  the moment it strands a tip — and reduction then stripped EVERY bank
  gauge on EVERY board as dead weight, so gauges retired, wet numbers
  followed (numbers riding the water handed their cells away free),
  and the ruleset shrank to four teachable lines. The solver's ledger says the
  solve is finally made of nameable moves: walking a spring out of its
  pocket, a corridor with two dry sides dying, minesweeper arithmetic
  on a stone, fork budgeting, one-way-out flow arguments — probing
  (the unfair, invisible kind of progress) is capped at 30% by a hard
  generation gate and measures 19–24%. Boards stay sparse: 3–11
  stones (6–7% of cells), springs 4–8 by book, counts spread across
  the whole 1–6 range. Every printed set is IRREDUNDANT — each survivor is offered to
  the full solver once, and monotonicity makes that a proof that
  nothing on the board can be crossed out. Certified, not sampled:
  №1–30 of the 7×7 book and №1–4 of the 9×9 brute-force verified
  unique by an independent counter, №1–12 of every book valid and
  solver-matched; generation 0.3–2.4 s. Tapping a number lights the
  eight squares it counts; a loop, a bare squeeze, or a buried
  wellhead is striped; a stream ending where no spring rises is said
  in words.
  Same sand and well-water shell: times with hint-exclusion, pinch
  zoom, the dissolve-and-sheen solve moment, installable and playable
  offline. The launcher mark is a legal rill under every rule — its
  three springs ringed, its one stone counting three wet squares,
  verified rather than eyeballed. Single self-contained `index.html` with
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
- `goopslide/` — sliding-puzzle experiments; `escape2.html` ("Goop Out") is the
  finished one. Swipe and *every* droplet slides at once; same colours merge on
  contact, different colours block; each family escapes through its own gap in
  the wall, and you win when the board is empty. 202 levels in five packs, with
  sticky pads, wall goo, bumpers, deflecting wedges, pressure plates and doors,
  portals, and exits that demand an exact size.
  `tools/` is a certifier for the thing that actually goes wrong in a puzzle
  like this: not solvability — every level was solvable and every `par` already
  exact — but **elegance**, elements printed on the board that the player never
  has to use. It calls an element *dodgeable* when some par-length solution
  never engages it, and *inert* when deleting it changes neither the shortest
  solution nor the number of shortest solutions. It found 43 such faults across
  21 levels, worst in the packs named after their own mechanic: all ten Plates
  levels carried a second plate that was pure clutter, and L126 could be beaten
  at par touching neither plate nor door. All 21 are repaired — by the smallest
  edit that makes the mechanic unavoidable, since a generated level is correct
  but anonymous and these were composed by someone. `certify.js` exits non-zero
  on any fault, so the standard holds for new levels too.
  Two mistakes shaped the tool and are worth knowing. Testing dodgeability by
  watching droplet trails is wrong exactly where wedges live — a bounce
  reverses a droplet *before* it enters the deflecting cell, so the cell shows
  up in no trail while doing the whole job — and it wrongly cleared five
  wedges; the fix runs the board against a gadget-neutralised copy in lockstep
  and demands identical droplets throughout. And walls are not gadgets: judged
  by par alone 265 look inert, but removing them turns corridor puzzles into
  empty boxes, so they are held to an unchanged-state-space test and reported
  as notes, never faults. Nobody feels cheated by a wall that happens not to
  matter; a plate you are taught to use and never need is a broken promise.
  The rules are not reimplemented — `engine.js` slices `parse()` and
  `simulate()` verbatim out of `escape2.html`, and the slice is cross-checked
  by replaying its solutions through the real game in a browser (31/31 agreed).
  Editing any map changes the FNV hash that keys a player's best, so `apply.js`
  writes a `REKEY` table into the page to carry recorded times across.
- `prismnets/` — standalone Three.js net-folding app (ESM + importmap, no build).
- `Izge Bayyurt - CV.pdf` — linked from the nav.

## Local preview

Any static file server works, e.g.:

```sh
python3 -m http.server 8000
```

Then open http://localhost:8000.
