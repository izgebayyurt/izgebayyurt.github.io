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

---
---

# Part II — Addenda from Glass Fold

Written after shipping **Glass Fold**, a coloured‑glass folding puzzle (React +
TypeScript + Vite, Capacitor to iOS/Android, ~589 generated campaign levels,
ads + IAP monetization, Firebase community levels). Glass Fold *confirmed*
nearly everything in Part I — it had its own `window.__game` harness (§5), its
own one‑knob juice loop (§8), its own additive mechanic flags (§3). What
follows is only what was **new**: the lessons Huemeld couldn't teach because it
never had real money paths, a second storage backend, or an App Store reviewer
saying no.

---

## 11. Persistence has two axes: where it lives, and *when it loads*

Part I said "enumerate saved keys by prefix" (§9). Glass Fold found the
much nastier cousin of that bug, twice:

- **The hydrate whitelist.** Native storage was Capacitor Preferences (async)
  mirrored into a sync in‑memory cache, filled once at boot by
  `hydrate([...4 keys])`. Every key *not* on that list — all campaign progress,
  the 2000‑coin Fold Buffer, the $2.99 Coin Doubler, every purchased theme —
  read as `null` after a cold launch. Worse: the next read‑modify‑write
  (`unlockBoost` reads the empty set, appends, writes back) **permanently
  erased the real data on disk**. And it was invisible in every dev session,
  because writes populate the cache — only a force‑quit + relaunch shows it.
- **The half‑migration.** `progress.ts` still wrote raw WKWebView localStorage
  while the coin wallet lived in Preferences. Two stores die independently: iOS
  evicts localStorage under pressure → stars and the star‑coin payout *ledger*
  vanish while the wallet survives → replaying levels re‑pays every coin.
  Asymmetric survival of related state is its own bug class.

> **Principle.** One storage service; every module goes through it. Load
> **everything** at boot by enumerating the backend (`Preferences.keys()`),
> never a whitelist — per‑level flags are dynamic and a list will always drift.
> Treat *force‑quit + relaunch* and *delete + reinstall* as first‑class test
> cases; a single session proves nothing about persistence. And distrust every
> read‑modify‑write over a cached view: if the read can be wrong, the write is
> destruction.

---

## 12. Boot is a protocol: permission prompts, SDK order, and the true first launch

Apple rejected the build (Guideline 2.1) because the ATT prompt "did not
appear." It genuinely didn't — twice, for two different reasons:

1. **Lazy gating.** ATT fired on *first ad use*; interstitials had a 20‑level
   grace period and rewarded ads are opt‑in — so a short review session never
   triggered it at all. OS permission prompts must fire **unconditionally at
   cold launch**, in the platform's required order (UMP consent → ATT → ad SDK
   init), never behind gameplay gates.
2. **Chained inits.** The fix then failed *on the first launch only*:
   `IAP.init().then(() => Ads.init()).catch(...)` meant a slow first‑launch
   RevenueCat handshake (real network calls, nothing cached yet) fell into the
   shared catch and silently skipped `Ads.init()` — which is what fires ATT.
   Second launch had warm caches and worked. Unrelated SDKs must init
   **independently**, each with its own catch; and every *network* call on the
   boot path gets a timeout (user‑paced modals never do — you'd be racing a
   human's decision).

> **Principle.** The first launch is a different code path from every launch
> after it: cold caches, unenabled APIs, empty keychains. Test it explicitly —
> fresh install, airplane‑mode variant, slow‑network variant — because that is
> exactly the launch the reviewer performs.

---

## 13. Money paths: assume the network dies and the player double‑taps

An adversarial audit of the monetization code found a bug in nearly every
money path, all the same shape — trusting the happy path:

- Rewarded ads **granted the reward on every failure path** ("don't punish the
  player") → airplane mode farmed unlimited rewards. Grant only on the
  positive `Rewarded` event; every failure resolves "no".
- Hint **charged 50 coins before running the solver**; on an unsolvable board
  the player paid and got nothing. Compute the good *first*, charge only when
  it exists.
- Coin packs are consumables: a crash between the App Store charge and
  `addCoins()` lost the purchase forever (consumables are invisible to
  Restore). Fix: a **delivered‑transaction ledger reconciled against the
  store's transaction history on every launch** — scoped to this install, or
  reinstalls farm the replay.
- A truthy placeholder (`'goog_REPLACE_ME'`) defeated the "no key → purchases
  disabled" safety. Safety checks must fail on placeholders, not just absence.
- The Coin Doubler's copy said "every coin you earn, doubled" but ad‑reward
  coins skipped the multiplier. **Store copy is a contract** — route every
  grant through the same path the copy describes.

> **Principle.** For each money path ask exactly two questions: *what happens
> if the network fails right here?* and *what happens if the player taps twice,
> fast?* Then make the answer boring: positive‑confirmation grants, an
> in‑flight guard on every rewarded button, idempotent ledgers.

---

## 14. Bound every search the UI can trigger

Glass Fold's hint solver (`solveShortest`) had a node guard but no depth
bound. Folds spread panes across an unbounded plane, so an **unsolvable**
position has an effectively infinite reachable space: measured 35 s and 580 MB
on a four‑pane board — a certain freeze and a likely jetsam kill, synchronously
inside a React reducer. The cruel part: players tap Hint precisely when stuck,
i.e. when the position is most likely unsolvable. **The worst case was the
common case.**

The fix was three layers, each cheap:

1. an O(cells) **impossibility proof** first (colour parity: with no
   transmuting mechanics on board, fuses remove panes in same‑colour pairs, so
   any odd count is unsolvable) — answers the common case in 0 ms;
2. a depth bound (no real hint needs >14 folds);
3. a node guard **calibrated from shipped content** — the level generator had
   validated every campaign level within ~2,500 explored states, so a 20,000
   guard is provably generous (hardest par‑7 level: 182 ms) while capping the
   residual unsolvable case at ~2 s.

> **Principle.** Any search a tap can trigger needs: a cheap impossibility
> shortcut, a depth bound justified by design ("no useful answer is deeper than
> X"), and a state guard calibrated against your own shipped content — you
> already know how big real solutions are, because you generated them.

---

## 15. Generated content wants an independent re‑validator (and a fast pipeline)

Glass Fold's engine exists twice: the runtime TypeScript and the level
generator's copy. When the portal semantics changed (teleport only into an
*empty* gate), both had to change — and the independent validator
(`validate.mjs`, which **re‑solves every shipped level with the real rules**)
caught what nothing else would have: 7 levels whose stored par silently
changed. Rules drift; a validator that replays all content turns drift into a
list of line numbers. This is Part I §5's oracle principle with a twist: the
oracle must re‑run after *rule* changes, not just content changes.

The pipeline itself also produced the project's most expensive mistake: a
**6.5‑hour generation run**. Root causes, in order of importance: board sizes
too large (generation cost is superlinear in cell count — each candidate runs
multiple solves), solver guards set for correctness rather than throughput, no
per‑stage timing logs (so the slow pool was discovered hours in), and an
orphaned process from a killed run still eating a core. After capping boards to
7–8 cells and adding per‑pool timings, the same pipeline ran in ~1 hour.

> **Principle.** Instrument per‑stage timings in any content pipeline from day
> one. When a stage is slow, shrink the *input* (board size) before tuning the
> *search* (guards) — the former is superlinear leverage. And `ps aux` before
> blaming the code: zombie processes from killed runs are real.

---

## 16. The device is the truth: a standing boundary‑condition matrix

Every one of these shipped past web testing and typechecking, and every one is
an iOS‑device‑only failure:

- `ctx.filter = 'blur(...)'` is a **silent no‑op** on iOS ≤ 17 canvas — five
  themes rendered hard‑edged raw polygons. Detect with a *pixel probe* (draw,
  read back), never a property check: the property exists, it just does
  nothing. Fallback: quarter‑resolution offscreen layer, bilinear upscale.
- WebKit parks the AudioContext in a non‑standard `'interrupted'` state after
  a full‑screen ad or phone call. Code that only resumes from `'suspended'`
  (the only state TypeScript knows about) goes **silent forever**. Recover
  from any non‑running state; recreate when closed.
- `yesterday = now - 86,400,000 ms` breaks streaks on the DST fall‑back day.
  Calendar math uses calendar arithmetic (`setDate(getDate() - 1)`).
- Daily claims hooked only to a React screen transition never fire for players
  who resume the suspended app. Hook `visibilitychange`/app‑resume too, and
  make the claim idempotent per day.
- Fonts loaded from Google's CDN at runtime = broken typography offline and a
  network dependency in a native app. Self‑host (`@fontsource`, static
  packages so family names match your CSS exactly).
- Canvas `shadowBlur` per particle per frame is the single most expensive
  thing you can do casually. Pre‑render glow sprites once; stamp them.

> **Principle.** Keep a standing test matrix and run it before every
> submission: **fresh install · force‑quit + relaunch · offline · oldest
> supported OS · DST boundary · resume from background · during/after an ad**.
> None of these appear in a dev-server session; all of them appear in week one
> of real players.

---

## 17. Overlays over live gameplay: hide, never unmount

Opening the Store mid‑level (the out‑of‑folds "Get coins" flow!) swapped
screens and unmounted the game — so buying a continue returned the player to a
**reset board**. The purchase flow's entire premise destroyed the thing being
purchased for. Keep the game mounted and hidden (`display:none`) under any
overlay; React state lives in the component you just unmounted.

Notably: play‑testing never caught this, because developers navigate fast and
never buy. The audit caught it by reading the unmount. Money flows deserve
walkthroughs *as a paying stranger*, slowly.

---

## 18. UGC is hostile input, and moderation needs memory

Community levels arrive as share codes — attacker‑controlled strings:

- The decoder accepted truncated tokens (NaN cells → silently unwinnable
  boards), colours with no palette entry (invisible panes), and had **no grid
  size cap** — a crafted `?lvl=` link froze the app at boot. Strict validation
  with hard caps (400 chars, 32×32), throwing into the existing catch.
- Firestore rules validated some fields but not `par` or `createdAt`, letting a
  client pin itself atop date‑sorted feeds; fixed with full field validation +
  `keys().hasOnly([...])` + `createdAt == request.time`.
- The subtlest one: the Cloud Function hid profane titles by setting
  `hidden: true` — and the vote/report **recount recomputed `hidden` from
  counters alone**, quietly re‑publishing slurs on the next upvote. Moderation
  state must record *why* (`profane: true`), or any later recomputation undoes
  it.

> **Principle.** Parse, validate, cap — then trust. And any automated
> moderation decision must persist its **reason**, because some other process
> will eventually recompute the field it wrote.

---

## 19. Audit adversarially before the store does

The single highest‑leverage pre‑submission act was a structured audit:
independent reviewers per subsystem, each finding required to cite file, line,
and a **concrete traced failure scenario** — then a separate adversarial pass
per finding whose default verdict was *refuted*. Results: 51 findings → 46
confirmed, 4 refuted, 1 launch‑blocking (the §11 persistence wipe), 8 high
(most of §13). Every confirmed finding came with the failure trace already
written, which made fixing mechanical.

Two framing rules made it work: findings without a reproducible scenario are
noise and get dropped; and verification must be *hostile* (trying to disprove),
or the audit just launders guesses into a to‑do list.

Separately: **treat the App Store review guidelines as a test suite** and run
it yourself first — orientation lock actually locked, ATT prompt on a fresh
install (record the video before they ask), one *distinct* promotional image
per promoted IAP (they reject duplicates — Guideline 2.3.2), privacy labels
matching actual SDK behavior. A review cycle costs days; the self‑run costs an
hour.

---

## 20. Taste at scale: audition rigs and data‑driven flair

Part I §8 said "ship, react, tune, one knob per effect." Glass Fold pushed it
further in two useful ways:

- **Audition rigs.** For sound design, instead of shipping one attempt and
  reacting, build a throwaway interactive page with 4–5 live variants per
  effect (Web Audio synthesis, one button each) and let the taste‑owner *pick
  and mix* ("reverse swell, longer build", "mix #3 with more sparkle"). Every
  SFX in the game came out of maybe six rounds of this. Picking between live
  options is an order of magnitude faster than describing changes to a single
  version.
- **Flair as data.** Every theme's entire ambient personality — particle
  shapes, counts, palettes, signature motion, win burst — lives in one typed
  config object (`FLAIR`), and the renderer interprets it. "Sakura petals
  should bank on gusts" or "aurora is too bright" become data edits with tiny
  interpreter additions, ten themes stay visually distinct without ten
  renderers, and the whole look of the game is reviewable in one file.

---

## 21. One repo, one remote, from day one

Glass Fold started as a folder inside an unrelated research monorepo. By the
end there were two working copies (the split‑out repo and the stale nested
one), an Xcode project that could open from either, and a "which folder are you
working on?" / "I don't see the changes in git" conversation that cost real
time — the standalone repo had **no remote at all** for its first two weeks of
commits. The split itself was painless (`git subtree split` preserved all 246
commits); the delay in doing it was the only cost.

> **Principle.** The moment a prototype becomes a product: its own repo, its
> own remote, pushed the same day. Two working copies of a codebase is one too
> many, and a repo without a remote is a single hardware failure away from not
> existing.

---

## 22. Checklist additions (continuing §10)

13. **One storage service, hydrate by enumeration, never a whitelist.** Test
    force‑quit + relaunch and delete + reinstall; distrust read‑modify‑write
    over cached state.
14. **Permission prompts fire unconditionally at cold launch,** in platform
    order; SDKs init independently; timeout boot network calls; test the true
    first launch (fresh install, cold caches, airplane variant).
15. **Money paths:** grant only on positive confirmation, compute before
    charging, ledger consumables per install, in‑flight guards on every
    rewarded button, placeholder‑proof safety checks, copy = contract.
16. **Bound every UI‑triggered search:** impossibility proof → depth bound →
    guard calibrated from shipped content.
17. **Re‑solve all shipped content with runtime rules after any mechanic
    change;** per‑stage timings in the pipeline; shrink inputs before tuning
    guards.
18. **Standing device matrix:** fresh install, cold relaunch, offline, oldest
    OS, DST boundary, resume from background, during/after an ad.
19. **Overlays hide live game state; never unmount it.** Walk money flows as a
    slow, paying stranger.
20. **UGC: parse, validate, cap; moderation records its reasons.**
21. **Adversarial audit before first submission** (traced scenarios or it
    doesn't count; verifiers try to refute); run the store's review guidelines
    as your own test suite first.
22. **Audition rigs for taste decisions; theme/juice personality as data.**
23. **Own repo + pushed remote the day a prototype becomes a product.**
