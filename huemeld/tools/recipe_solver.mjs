/* Headless difficulty solver for the recipe-chain game.
   Plays each generated level with the REAL engine.js rules and models the game's
   move economy EXACTLY: a mix/clear/trace each spends 1 move; settling the board
   ("waiting out" the 3s window) is FREE; the chain bonus refunds +2 on the 2nd+
   trace within one suspended window. It enforces movesLeft like the game (lose at
   0), so binary-searching the smallest winning budget yields the true PAR — the
   minimum budget a competent player needs, peak-deficit included.

   Run:  node huemeld/tools/recipe_solver.mjs            (current shipped generator)
         node huemeld/tools/recipe_solver.mjs tuned      (the retune candidate)
*/
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const HM = require("../engine.js");

const isPrim = HM.isPrim;
const ING = { O: ["R", "Y"], G: ["Y", "B"], P: ["R", "B"] };  // secondary -> its two primary ingredients
const secCount = (seq) => seq.filter((c) => !isPrim(c)).length;
const recipesMet = (s) => s.recipes.every((r) => r.done >= r.count);

// matches index.html's generator RNG EXACTLY (lossy float multiply, not Math.imul) so we grade the real levels
function lcg(seed) { let s = seed; return () => { s = (s * 1103515245 + 12345) & 0x7fffffff; return s / 0x7fffffff; }; }
const snap = (s) => s.grid.map((row) => row.map((v) => v || ".").join("")).join("/");

/* =========================================================================
   LEVEL GENERATORS.  `CURRENT` mirrors the shipped genRecipeLevels().
   `TUNED` is the retune candidate — port the winner into index.html.
   ========================================================================= */
const CURRENT = {
  seed: 987654321,
  nRec:  (t) => Math.max(1, Math.min(6, Math.round(1 + t * 5))),
  len:   (t, rnd) => Math.max(2, Math.min(4, 2 + Math.floor(t * 2 + rnd()))),
  primP: (t) => 0.15 + 0.25 * t,
  count: (t, rnd) => Math.max(1, Math.min(3, Math.round(1 + t * 1.4 * rnd() + rnd() * 0.7))),
  moves: (t, solves, buildCost) => 14 + solves * 3 + Math.round(t * 14),
};

// Tuned candidate: gentle L1-2, then a real ramp. Budget = buildCost + solves + shrinking slack,
// so a no-waste player clears with a small margin and chaining earns extra breathing room.
const TUNED = {
  seed: 987654321,
  nRec:  (t) => Math.max(1, Math.min(6, Math.round(1 + t * 5))),
  len:   (t, rnd) => Math.max(2, Math.min(4, 2 + Math.floor(t * 2 + rnd()))),
  primP: (t) => 0.15 + 0.25 * t,
  count: (t, rnd) => Math.max(1, Math.min(3, Math.round(1 + t * 1.4 * rnd() + rnd() * 0.7))),
  moves: (t, solves, buildCost) => buildCost + solves + Math.round(9 - 3 * t),  // SHIPPED formula: slack 9 -> 6
};

function genRecipeLevels(gen) {
  const RSHAPE = ["#######", "#######", "#######", "#######", "#######", "#######", "#######"];
  const S = ["O", "G", "P"], P = ["R", "Y", "B"];
  const rnd = lcg(gen.seed);
  const pick = (a) => a[(rnd() * a.length) | 0];
  const out = [];
  for (let L = 1; L <= 20; L++) {
    const t = (L - 1) / 19;
    const nRec = gen.nRec(t);
    const recipes = [];
    for (let i = 0; i < nRec; i++) {
      const len = gen.len(t, rnd);
      const seq = [pick(S)];
      for (let j = 1; j < len; j++) seq.push(rnd() < gen.primP(t) ? pick(P) : pick(S));
      const count = gen.count(t, rnd);
      recipes.push({ seq, count });
    }
    const solves = recipes.reduce((a, r) => a + r.count, 0);
    const buildCost = recipes.reduce((a, r) => a + r.count * secCount(r.seq), 0);
    out.push({ id: L, name: "Level " + L, shape: RSHAPE, spawn: { R: 4, Y: 4, B: 4 },
      moves: gen.moves(t, solves, buildCost), goal: "recipe", objectives: [], recipes });
  }
  return out;
}

/* =========================================================================
   SOLVER — batch-chain competent play under an enforced move budget.
   ========================================================================= */
function inb(s, r, c) { return r >= 0 && c >= 0 && r < s.H && c < s.W && s.mask[r][c] === 1; }
function nbrs(s, r, c) { const o = []; for (const [dr, dc] of [[1, 0], [-1, 0], [0, 1], [0, -1]]) if (inb(s, r + dr, c + dc)) o.push([r + dr, c + dc]); return o; }
const key = (r, c) => r + "," + c;

function findFullPath(s, seq) {
  const inPath = (p, r, c) => p.some((x) => x[0] === r && x[1] === c);
  function dfs(path, step) {
    if (step === seq.length) return path;
    const [lr, lc] = path[path.length - 1];
    for (const [nr, nc] of nbrs(s, lr, lc))
      if (s.grid[nr][nc] === seq[step] && !inPath(path, nr, nc)) { const r = dfs(path.concat([[nr, nc]]), step + 1); if (r) return r; }
    return null;
  }
  for (let r = 0; r < s.H; r++) for (let c = 0; c < s.W; c++)
    if (s.grid[r][c] === seq[0]) { const res = dfs([[r, c]], 1); if (res) return res; }
  return null;
}

function longestPrefixPath(s, seq) {
  let best = [];
  const inPath = (p, r, c) => p.some((x) => x[0] === r && x[1] === c);
  function dfs(path, step) {
    if (path.length > best.length) best = path.slice();
    if (step === seq.length) return;
    const [lr, lc] = path[path.length - 1];
    for (const [nr, nc] of nbrs(s, lr, lc))
      if (s.grid[nr][nc] === seq[step] && !inPath(path, nr, nc)) dfs(path.concat([[nr, nc]]), step + 1);
  }
  for (let r = 0; r < s.H; r++) for (let c = 0; c < s.W; c++)
    if (s.grid[r][c] === seq[0]) dfs([[r, c]], 1);
  return best;
}

function findMixAdjacent(s, sec, end, avoid) {
  const [i0, i1] = ING[sec];
  const av = new Set(avoid.map(([r, c]) => key(r, c)));
  for (const [xr, xc] of nbrs(s, end[0], end[1])) {
    if (av.has(key(xr, xc))) continue;
    const xv = s.grid[xr][xc];
    if (xv !== i0 && xv !== i1) continue;
    const other = xv === i0 ? i1 : i0;
    for (const [yr, yc] of nbrs(s, xr, xc)) {
      if (av.has(key(yr, yc)) || (yr === end[0] && yc === end[1])) continue;
      if (s.grid[yr][yc] === other) return { from: [yr, yc], to: [xr, xc] };
    }
  }
  return null;
}

function findAnyMix(s, sec, avoid) {
  const [i0, i1] = ING[sec];
  const av = new Set((avoid || []).map(([r, c]) => key(r, c)));
  for (let r = 0; r < s.H; r++) for (let c = 0; c < s.W; c++) {
    if (av.has(key(r, c))) continue;
    const v = s.grid[r][c];
    if (v !== i0 && v !== i1) continue;
    const other = v === i0 ? i1 : i0;
    for (const [nr, nc] of nbrs(s, r, c)) { if (av.has(key(nr, nc))) continue; if (s.grid[nr][nc] === other) return { from: [nr, nc], to: [r, c] }; }
  }
  return null;
}

// Play the level under an enforced budget. Returns {won, movesLeft}.
function solve(level, budget, opts) {
  opts = opts || {};
  const rng = lcg(opts.seed || (12345 + level.id * 7));
  const s = HM.newState(level);
  HM.fill(s, rng);
  let movesLeft = budget, windowN = 0, iters = 0;

  const incomplete = () => s.recipes.filter((r) => r.done < r.count);
  function anyTraceable() { for (const r of incomplete()) { const p = findFullPath(s, r.seq); if (p) return { r, path: p }; } return null; }
  function doTrace(x) { for (const [r, c] of x.path) s.grid[r][c] = null; x.r.done++; movesLeft--; windowN++; if (windowN >= 2) movesLeft += 2; }
  function build() {
    const targets = incomplete().slice().sort((a, b) => secCount(a.seq) - secCount(b.seq) || a.seq.length - b.seq.length);
    for (const rec of targets) {
      const P = longestPrefixPath(s, rec.seq);
      const k = P.length;
      if (k >= rec.seq.length) continue;
      const next = rec.seq[k];
      if (isPrim(next)) continue;                       // can't mint a specific primary; settle repositions
      let m = null;
      if (k === 0) m = findAnyMix(s, next, []);
      else m = findMixAdjacent(s, next, P[k - 1], P) || findAnyMix(s, next, P);
      if (m) { HM.applyMix(s, { r: m.from[0], c: m.from[1] }, { r: m.to[0], c: m.to[1] }); movesLeft--; return true; }
    }
    return false;
  }
  function settle() { HM.gravity(s, rng); if (!HM.hasFusePair(s)) HM.reshufflePrimaries(s, rng); windowN = 0; }  // FREE
  function tryClear() {
    const ch = HM.legalChains(s, 2).filter((g) => isPrim(g.color));
    if (!ch.length) return false;
    for (const kk of ch[0].comp) { const [r, c] = HM.split(kk); s.grid[r][c] = null; }
    movesLeft--; return true;
  }

  while (!recipesMet(s)) {
    if (++iters > 4000) return { won: false, movesLeft, reason: "cap" };
    // 1) build a batch of circles (as far as primaries/budget allow)
    let acted = false, cap = 80;
    while (movesLeft > 0 && cap-- > 0 && build()) { acted = true; if (recipesMet(s)) break; }
    // 2) burst-trace everything now traceable — one window, so 2nd+ trace refunds +2
    let x;
    while (movesLeft > 0 && (x = anyTraceable())) { doTrace(x); acted = true; if (recipesMet(s)) break; }
    if (recipesMet(s)) break;
    if (movesLeft <= 0) return { won: false, movesLeft, reason: "budget" };
    // 3) refill/reposition primaries for the next batch (free); if nothing changed, clear to churn
    const before = snap(s);
    settle();
    if (!acted && snap(s) === before) { if (!(movesLeft > 0 && tryClear())) return { won: false, movesLeft, reason: "deadlock" }; }
  }
  return { won: true, movesLeft };
}

const SEEDS = [1, 2, 3, 4, 5, 6, 7, 8];
function winRate(level, B) { return SEEDS.filter((sd) => solve(level, B, { seed: 1000 + level.id * 31 + sd * 13 }).won).length / SEEDS.length; }
// smallest budget clearing >=80% of seeded boards = a robust par
function parFor(level) {
  let lo = 1, hi = 400;
  if (winRate(level, hi) < 0.8) return Infinity;
  while (lo < hi) { const mid = (lo + hi) >> 1; if (winRate(level, mid) >= 0.8) hi = mid; else lo = mid + 1; }
  return lo;
}

/* =========================================================================
   REPORT
   ========================================================================= */
function report(name, gen) {
  const levels = genRecipeLevels(gen);
  console.log("\n=== " + name + " ===");
  console.log("  L | nRec solv build | lens   | budget  par  margin  win%  verdict");
  let prevBuild = -1, ok = 0;
  for (const lv of levels) {
    const solves = lv.recipes.reduce((a, r) => a + r.count, 0);
    const buildCost = lv.recipes.reduce((a, r) => a + r.count * secCount(r.seq), 0);
    const lens = lv.recipes.map((r) => r.seq.length).join("");
    const par = parFor(lv);
    const wr = winRate(lv, lv.moves);
    const margin = lv.moves - par;                       // spare budget over par (challenge = small positive)
    let verdict = "ok";
    if (par === Infinity) verdict = "SOLVER-FAIL";
    else if (wr < 0.8) verdict = "TOO TIGHT";
    else if (margin >= 8) verdict = "too easy";
    else if (margin <= 0) verdict = "brutal";
    if (verdict === "ok") ok++;
    console.log(
      String(lv.id).padStart(3) + " |" + String(lv.recipes.length).padStart(5) + String(solves).padStart(5) +
      String(buildCost).padStart(6) + " | " + lens.padEnd(6) + " | " +
      String(lv.moves).padStart(6) + String(par === Infinity ? "inf" : par).padStart(5) +
      String(margin).padStart(7) + "  " + wr.toFixed(2).padStart(5) + "  " + verdict);
    prevBuild = buildCost;
  }
  console.log("clean (ok) levels: " + ok + "/20");
}

const which = process.argv[2] || "current";
if (which === "current" || which === "both") report("CURRENT shipped generator", CURRENT);
if (which === "tuned" || which === "both") report("TUNED candidate", TUNED);
