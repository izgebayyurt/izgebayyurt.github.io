# Huemeld — Design & Build Notes

A field guide written after building **Huemeld**, a color‑mixing pipe puzzle
(single‑file HTML/canvas game, shipped to the web via GitHub Pages and to
iOS/Android through a Capacitor wrapper). It records *how* the game was built,
the problems that actually bit us, and the principles worth carrying into the
next game. It is deliberately specific — real function names, real bugs — because
the transferable lesson usually lives in the detail.

---

## 1. What the game is (so the lessons have context)

You draw pipes from colored **emitters** across a grid. Primary colors (R/Y/B)
**mix** where lines meet — red + blue = purple, and a third primary deepens a
secondary to **brown**. Each **goal** square wants a specific color delivered to
it, and you must **cover the whole board** to win. Layered on top: forks,
one‑way arrows, gates, ice, portals, bridges (overpasses), prisms (split a
secondary back into primaries), and number tiles (exact neighbor counts).
"Medley" levels combine 3–5 mechanics on one board.

Two structural facts shaped everything:

- **The win condition is coverage + delivery**, not just delivery. That single
  choice is the source of both the game's character *and* its nastiest bugs
  (see §4).
- **It is one HTML file** with an inline canvas renderer and engine. Fast to
  iterate, trivial to ship, but it makes discipline (state model, test hooks)
  more important, not less.

---

## 2. The engine: one source of truth beats scattered mutation

The mixing model is the heart of the game and was the hardest thing to get
right. Lines are `ems[].legs[]` (cell paths); mixes are `junctions[]` with
*feeders* (the lines flowing in) and a *blend leg* (the mixed color flowing out).
Gestures mutate raw cell paths; **structure is re‑derived, never hand‑patched.**

The keystone is `reconcile()` — run after *any* structural change (retreat,
truncate, merge, portal jump). It deterministically rebuilds the valid set of
legs and junctions from the raw paths:

- drop orphaned branch legs whose root no longer sits on a sibling,
- drop any junction unless **all** its feeders still end exactly on the junction
  cell,
- retract prism rays that lost their feed,
- recompute every goal's done‑state from the *current* pipe heads.

**Why this mattered.** The first version mutated done‑state and junction lists
inline at each gesture site. That produced a long tail of "impossible" states:
goals stuck `done` forever, phantom legs occupying a fork slot, junctions that
outlived their feeders. Every fix spawned a new edge case. Collapsing all of it
into one function that *derives* truth from the raw paths killed the entire bug
class at once.

> **Principle.** For any system where user gestures edit a structure with
> invariants, write **one deterministic reconciler** that rebuilds the valid
> structure from the rawest representation you have, and call it after every
> mutation. Don't spread invariant‑maintenance across the gesture handlers.

A corollary that paid off repeatedly: **model a gesture by its end‑state, not its
motion.** "Retreat this mixed‑in red without disturbing the blue" became
`separateFeeder()` — hand the blend tail back to the surviving feeder, detach,
let `reconcile()` drop the orphan. Trying to animate the reverse of the original
draw would have been hopeless.

---

## 3. Evolve mechanics with additive flags, not rewrites

Twice the mixing rules had to grow: **feeder‑merge deepening** (drop a third
primary onto a line that already feeds a mix → brown at the tip) and
**triple‑junction** (three colors meeting at *one* point). Both were shipped as
*additive* changes:

- The triple case is gated entirely behind a new `triple` flag on the junction.
  Every existing 2‑feeder junction is byte‑for‑byte unaffected; `reconcile()`
  just checks `need = J.triple ? 3 : 2`.
- Before the change, a primary stepping onto a junction cell was already a silent
  no‑op (no branch matched). The new behavior only fires when the mix is brown
  *and* an open brown goal exists — otherwise it stays the same no‑op.

Because the change couldn't alter any pre‑existing path, the 700 baked solutions
still replayed and won. **Additive, flag‑gated changes are regression‑safe by
construction** — you can reason about "this cannot touch the old behavior"
instead of re‑testing the world (though we re‑tested anyway; see §6).

> **Principle.** When a mechanic needs to grow, find the additive seam. A new
> flag that defaults to the old behavior lets you argue safety statically and
> keeps your regression suite green.

---

## 4. Coverage wins invite degenerate solutions — constrain "meaning"

Requiring the whole board to be painted makes for satisfying puzzles, but it
tempts players into **junk mixes**: pointless merges that fill cells without
serving any goal, letting you brute‑force coverage. Players correctly felt these
were "solutions that shouldn't be solutions."

The fix is `noDangling()`, part of the win check: every drawn ray must end at a
junction or a delivered goal, **and every mix must pay off** — its blend has to
feed a deeper mix or deliver to a matching goal. A blend that just wanders around
filling cells and dead‑ends is rejected.

> **Principle.** Any "fill / cover everything" win condition needs a companion
> rule that every element be *meaningfully connected*, or players will find the
> degenerate fill. Decide what "meaningful" means and enforce it in the win
> check, not the generator.

The mirror‑image lesson came from a player argument we initially resisted:
*"if I can retreat one step, mix, and re‑merge to get the same result, why can't
I just mix directly?"* They were right. **When a player's mental model
contradicts a rule, the rule is usually the thing that's wrong** — the mixing
model was made more permissive (feeder‑merge, triple), not less.

> **Principle.** Prefer **general rules over special cases.** "Every passage
> through a bridge cell must be perpendicular" cleanly enabled a line to cross
> *itself* (self‑overpass); the earlier special‑case ban ("can't cross same
> color") was both more code and less intuitive.

---

## 5. The content pipeline: build the verifier before the content

None of the 700 levels are hand‑checked by eye. The backbone is a **headless
solution oracle**: drive the *real* game in headless Chromium (Playwright),
replay a candidate solution as mouse strokes, and read back `window.__flow.state()`
to confirm it wins. The generators (`tools/flow-packs.mjs`) propose levels; the
oracle certifies them; only certified levels ship, with their solutions baked
into `flow-data.js` for the hint system.

This one decision — **use the shipping engine as the correctness oracle, via a
tiny test‑hook surface (`window.__flow`)** — is what made everything else
possible:

- Content is trustworthy by construction (unique/valid solutions).
- The engine can be refactored fearlessly: replay all baked solutions, and if
  69/69 samples (or 50/50 per pack, 100/100 new medley) still win, the change is
  safe. This is how brown/portal/self‑overpass/triple all landed without fear.
- Bugs get reproduced as headless scripts, not described in prose.

> **Principle.** For any game with generated or authored content, the first tool
> you build is the one that *plays* the game headlessly and reports state. Expose
> a minimal hook object on `window` (load a level, read state, get cell centers).
> It is your generator's judge, your regression suite, and your bug repro harness
> — all three.

---

## 6. Testing methodology: replay everything, every time

Every non‑trivial change to `flow2.html` was verified by replaying baked
solutions end‑to‑end in a browser *before* committing. Concretely:

- a fast **sample** run (~69 levels across campaign/daily/all packs/medley),
- full per‑pack runs when the change could touch mix logic (brown 50/50, medley
  100/100, etc.),
- targeted scripts for the specific gesture (e.g. draw R+B, then Y onto the
  junction → assert `sec:"N"`, `triple:true`, solved, no page errors),
- **screenshot** checks for anything visual, viewed and judged, not just diffed.

The discipline that made this cheap: keep a scratchpad of ~100 small,
single‑purpose verification scripts, each reusable. "Does the ribbon hide on
delivery?" is a 30‑line script you keep forever.

> **Principle.** "It typechecks" is not "it works." Drive the actual affected
> flow and observe behavior. For visuals, *look* at a rendered frame — capture
> several phases of an animation and judge them. Cheap, reusable repro scripts
> compound.

---

## 7. Interaction & onboarding: the small stuff is the game

A puzzle game lives or dies on the feel of the core gesture and the first two
minutes. Things that turned out to matter more than expected:

- **Toast/intro timing.** "The text covers the board and disappears too fast"
  was a real complaint. Fix: scale a toast's on‑screen duration to its length
  (`~52ms/char`, clamped), wrap text, and stop it from blanketing the board.
  Reading speed is not a constant; short‑fixed timeouts always feel wrong.
- **Grab semantics are full of edge cases.** Grabbing a portal *entrance* let
  you slide out as if you hadn't teleported; re‑grabbing a mix had to sever the
  right child. Every "pick up a pipe mid‑path" interaction hides a state bug.
  Enumerate the grab sites and handle each explicitly.
- **Guide, don't gate, the eye.** Unsolved goals needed to read as "fill me"
  without nagging. (The journey there is §8.)
- **Audio is UX.** Two independent sliders (music vs. SFX), *no* music during
  tutorials, quieter default music, and resume‑on‑app‑return. A single volume
  knob and music that dies when you background the app both read as bugs.

> **Principle.** Budget real design time for toasts, first‑run cards, grab/undo
> semantics, and audio controls. They are not polish‑at‑the‑end; they are where
> players form their opinion.

---

## 8. Juice is taste‑driven and iterative — ship, react, tune, expose knobs

The game was already well‑fed (draw‑pitch ticks, junction blooms, delivery
bells, a win cascade with confetti + spin + arpeggio, a reject thud). Adding more
was refinement, and refinement is *taste*, which means iteration with the person
who has the taste:

1. Added a breathing **halo** on unsolved goals. Verified, tasteful in
   isolation — and the user hated it. ("Too busy.")
2. Replaced it with their idea: a static 45° **ribbon** drawn as its two edges.
   Better.
3. Then three tuning passes from direct feedback: *make it drift, soften the
   edges, bring the two lines closer.* Each was a one‑line knob.

Two things made this loop fast and low‑friction:

- **Every juice effect ended up as a single tunable expression** — shake
  amplitude `min(cs()*0.09, 11)`, blur `blur(1.4px)`, gap `gg=9`, drift period
  `5.5s`. When feedback is "a bit less," you change one number.
- The seamless drift is worth stealing: **three copies of the band spaced exactly
  one animation period apart, translated by one period, looping.** That
  guarantees continuous motion with no empty frame — the general trick for "make
  this thing flow forever" without a visible reset.
- We respected `prefers-reduced-motion` for the animated version. Cheap; correct.

> **Principle.** Don't argue about juice — *ship a version, get the reaction,
> tune.* Build each effect as one knob so "less/more/slower/softer" is a
> one‑character edit. Assume your first idea will be rejected; make rejection
> cheap.

---

## 9. Shipping & platform: persistence and store‑readiness are features

- **Saves are a first‑class feature.** Progress reset on delete/update was a
  serious bug. The fix: a save mirror that dynamically captures *every*
  `hm_flow2_*` key (progress, settings, language, rewarded unlocks) and writes it
  durably per platform (iCloud KV on iOS, native Preferences on Android),
  restoring only on a fresh install. Don't hand‑list keys to persist — you will
  forget one. Enumerate by prefix.
- **Single‑file JS footguns are real.** Two boot crashes came from exactly the
  classic traps: a `var` used before its later assignment (hoisted to
  `undefined`, `.indexOf` threw, script aborted, Play button never wired), and a
  local `var T` shadowing the i18n `T()` helper across a whole function.
  Function‑scoped `var` hoisting + one giant file = order and shadowing bugs.
  Declare shared globals up top; don't reuse the name of a global helper as a
  local.
- **Monetization should match how you play.** The scheme evolved from forced
  interstitials (which the owner, correctly, hated) to **opt‑in only**: rewarded
  hints, "watch to unlock N levels," one‑time **Pro** at a modest price, and a
  totally free web build with a tip link. Respecting the player is also good
  business for a calm puzzle game.
- **Check licensing before you lean on a system.** A colorblind‑symbol scheme
  (ColorADD) was integrated, then reverted on learning it's licensed — fell back
  to plain letters. Verify license terms *before* building on someone's IP.
- **i18n and accessibility from the start**, not bolted on: a translation table,
  `data-t` attributes, a colorblind mode. Retrofitting either is far more
  expensive.

---

## 10. The distilled checklist for the next game

1. **Build the headless play‑and‑report harness first.** Minimal `window`
   hook: load a level, replay input, read state. It is oracle + regression suite
   + bug repro.
2. **One deterministic reconciler** owns all invariants; gestures only edit the
   raw representation and call it.
3. **Model gestures by end‑state**, not by reversing motion.
4. **Grow mechanics via additive, default‑off flags** so old behavior is provably
   untouched.
5. **Coverage/fill wins need a "meaningfully connected" rule** or players find the
   degenerate fill.
6. **General rules > special cases.** They're less code and match intuition.
7. **When player intuition fights a rule, suspect the rule.**
8. **Replay every baked solution before every commit;** *look* at visual frames.
9. **Persistence is a feature:** capture state by prefix, restore on fresh install,
   test delete+reinstall.
10. **Juice is one‑knob‑per‑effect;** ship, get the reaction, tune. Assume v1 is
    rejected.
11. **Watch single‑file JS hoisting/shadowing;** declare shared globals early.
12. **Opt‑in monetization, licensing checks, i18n, and a11y from day one.**

---

*This document is intentionally engine‑ and process‑oriented rather than a
feature list. The specific bugs will differ next time; the shape of the
solutions probably won't.*
