/* Monte-Carlo move-budget solver.
   Plays a level many times with a greedy "competent player" policy and measures
   how many moves it takes to satisfy the objectives, so the factory can set a
   fair, winnable move budget. */
import { createRequire } from "module";
const require = createRequire(import.meta.url);
const HM = require("../engine.js");

/* seeded PRNG so every trial is reproducible */
export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function needMap(s) {
  const m = {};
  for (const o of s.obj) if (o.have < o.need) m[o.color] = o.need - o.have;
  return m;
}

/* size of the connected same-colour group containing (r,c) — how close to a pop */
function groupSize(s, r, c) {
  const v = s.grid[r][c]; if (!v) return 0;
  const seen = {}, st = [[r, c]]; seen[r + "," + c] = 1; let n = 0;
  while (st.length) {
    const cur = st.pop(), y = cur[0], x = cur[1]; n++;
    const nb = [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]];
    for (const [ny, nx] of nb) {
      const k = ny + "," + nx;
      if (!HM.playable(s, ny, nx) || seen[k] || s.grid[ny][nx] !== v) continue;
      seen[k] = 1; st.push([ny, nx]);
    }
  }
  return n;
}

/* greedy 1-ply policy: prefer moves whose immediate pops clear needed colours;
   otherwise value mixes that manufacture a needed secondary and moves that
   cluster same colours. Approximates a decent (not perfect) human. */
const EPSILON = 0.05;   // exploration rate — enough to avoid stalls, low enough to play competently

export function pickMove(s, rng) {
  const r = rng || Math.random;
  const legal = HM.legalMoves(s);
  if (!legal.length) return null;
  if (r() < EPSILON) return legal[(r() * legal.length) | 0];   // ε-greedy: perturb out of any stuck pattern
  const need = needMap(s);
  const g = s.grid;
  let best = null, bestScore = -Infinity;
  for (const mv of legal) {
    const fr = mv.from, to = mv.to;
    const a = g[fr.r][fr.c], b = g[to.r][to.c];
    let blend = null;
    if (mv.type === "mix") { blend = HM.mix(a, b); g[to.r][to.c] = blend; g[fr.r][fr.c] = null; }
    else { g[fr.r][fr.c] = b; g[to.r][to.c] = a; }        // swap in place
    const comps = HM.findPops(s);
    let score = 0, popped = 0;
    for (const comp of comps) for (const k of comp) {
      const [rr, cc] = k.split(",").map(Number);
      popped++;
      score += need[g[rr][cc]] ? 3 : 0.2;                 // clearing a needed colour is the goal
    }
    if (popped === 0) {
      const col = g[to.r][to.c];                          // colour now on the target cell
      if (col && need[col]) score += groupSize(s, to.r, to.c) * 0.5;  // grow needed groups toward 4
      if (mv.type === "mix") score += need[blend] ? 0.4 : 0.05;       // manufacture owed secondaries
    }
    g[fr.r][fr.c] = a; g[to.r][to.c] = b;                 // undo
    score += r() * 0.01;                                  // tie-break jitter
    if (score > bestScore) { bestScore = score; best = mv; }
  }
  return best;
}

/* one playthrough. movesCap guards infinite loops. Returns moves used + win. */
export function playout(level, rng, movesCap) {
  const s = HM.newState(level);
  s.movesLeft = movesCap == null ? 9999 : movesCap;
  HM.fill(s, rng);
  let used = 0;
  while (!s.won && !s.lost && used < 9999) {
    const mv = pickMove(s, rng);
    if (!mv) break;
    HM.doMove(s, mv.from, mv.to);
    used++; s.movesLeft--;
    HM.cascade(s, rng);
    HM.checkEnd(s);
    if (movesCap != null && used >= movesCap) break;
  }
  return { won: s.won, used: used };
}

function pct(sorted, p) {
  if (!sorted.length) return Infinity;
  const i = Math.min(sorted.length - 1, Math.floor(p * (sorted.length - 1) + 0.5));
  return sorted[i];
}

/* Estimate moves-to-win with unlimited budget, over N trials. */
export function estimate(level, trials = 240, seed = 1) {
  const wins = [];
  let finished = 0;
  for (let t = 0; t < trials; t++) {
    const r = playout(level, mulberry32(seed + t * 2654435761), null);
    if (r.won) { wins.push(r.used); finished++; }
  }
  wins.sort((a, b) => a - b);
  return {
    finishRate: finished / trials,
    mean: wins.length ? Math.round(wins.reduce((a, b) => a + b, 0) / wins.length) : Infinity,
    p50: pct(wins, 0.5), p80: pct(wins, 0.8), p90: pct(wins, 0.9), max: wins.length ? wins[wins.length - 1] : Infinity
  };
}

/* Win rate of the greedy policy under a fixed move budget. */
export function winRate(level, budget, trials = 240, seed = 7000) {
  let w = 0;
  for (let t = 0; t < trials; t++) if (playout(level, mulberry32(seed + t * 40503), budget).won) w++;
  return w / trials;
}
