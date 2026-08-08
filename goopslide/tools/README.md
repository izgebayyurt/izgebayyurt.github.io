# Goop Out · level certifier

Offline tools that check whether every element printed on a Goop Out board is
actually load-bearing, and repair the ones that are not.

Node only, no dependencies. Run from this directory.

```sh
node certify.js            # certify all 202 levels (mechanics only, ~12s)
node certify.js --walls    # ...and report provably inert walls too (~2.5min)
node certify.js 126 148    # certify named levels
node repair.js             # repair every faulty level -> out/repair.json
node apply.js              # write out/repair.json back into escape2.html
```

`certify.js` exits non-zero when any level has a mechanic fault, so it works
as a pre-commit gate.

## What counts as a fault

A level is elegant when nothing on it is decoration. An element fails that in
two independent ways:

- **dodgeable** — some par-length solution never engages it. The level teaches
  a mechanic and then does not ask for it.
- **inert** — delete it and the level still solves in the same number of moves
  by the same number of routes. It was never a constraint.

## Two things that were got wrong first, and matter

**Trail-watching cannot detect a bounce.** The obvious dodgeability test asks
whether any droplet's path crosses the gadget's cell. That is wrong precisely
where wedges and bumpers live: a bounce reverses a droplet *before* it enters
the deflecting cell, so the cell appears in no trail even though it just
redirected the entire move. That test reported five wedges as unused that were
in fact doing the work of the level.

The replacement runs the board and a gadget-neutralised copy side by side,
feeds both the same swipes, and requires the droplets to stay in identical
configurations throughout. If a par-length win survives that, the gadget
provably influenced nothing — whatever mechanism it might have used. See
`lockstepParSolution` in `solver.js`.

**Walls are not gadgets.** Judged by "does par change?", 265 walls across the
game look inert — but deleting them turns corridor puzzles into empty boxes,
because a wall's job is to shape the space the player reasons through and
almost all of that work happens off the optimal line. Walls are therefore held
to a stricter test (the whole reachable state space must be unchanged) and are
reported as notes rather than faults. Nobody feels cheated by a wall that
happens not to matter; a plate you are taught to use and never need is a
broken promise. They are different faults and the certifier keeps them apart.

## How the rules are obtained

`engine.js` slices `parse()` and `simulate()` **verbatim out of
`escape2.html`** rather than reimplementing them, so the certifier cannot
drift from the shipped game. It depends on two anchors in that file — the
`const LEVELS=[` literal and the run from `let gw,gh,grid,spikes` down to
`const isWinS=` — and throws if either moves.

That protects against reimplementation drift but not against a bad slice, so
the slice is also cross-checked against the live page: solutions computed here
are replayed through the real game's own `applyMove()` in a browser, and the
game must agree it won. Last run: 31/31 levels agreed.

## Repair policy

Repair is preferred over regeneration — these boards were composed by someone,
and the smallest edit that makes the mechanic unavoidable keeps their shape and
difficulty. Par is preserved where possible (the search escalates its tolerance
only when nothing else works).

Deletion is deliberately restricted. Removing a wedge from a level in the
Wedges pack silences the certifier by deleting the mechanic, which is the
complaint rather than the fix, so wedges and portals are never deletable. A
duplicate plate, or a sticky pad the certifier has already proved does nothing,
is clutter and may go.

## Editing levels by hand

Saved bests are keyed by an FNV hash of the map string, so **any** change to a
map makes that level read as never-played. `apply.js` maintains a `REKEY` table
in the page mapping old hash to new; extend it the same way if you edit a map
directly.
