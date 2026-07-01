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

/* greedy 1-ply policy over the merge-only action space (mix or manual clear):
   value a clear by how many needed-colour tiles it banks (capped at what's
   still owed; overflow past the cap is just low-value decluttering); value a
   mix by whether it manufactures a still-needed secondary, weighted by how
   big the resulting cluster becomes (a mix that lands next to a matching
   secondary is worth more than one that creates an isolated tile). Every
   legal action changes the board, so — unlike the old swap-based policy —
   there's no risk of a non-progressing cycle; epsilon here is purely to
   avoid an unrealistically optimal "solve", not to escape stalls. */
const EPSILON = 0.06;

export function pickMove(s, rng) {
  const r = rng || Math.random;
  const legal = HM.legalActions(s);
  if (!legal.length) return null;
  if (r() < EPSILON) return legal[(r() * legal.length) | 0];
  const need = needMap(s);
  const g = s.grid;
  let best = null, bestScore = -Infinity;
  for (const act of legal) {
    let score;
    if (act.type === "clear") {
      const col = g[act.r][act.c];
      const rem = need[col] || 0;
      const creditable = Math.min(rem, act.size);
      score = creditable > 0 ? creditable * 3 + (act.size - creditable) * 0.08 : act.size * 0.05;
    } else {
      const a = g[act.from.r][act.from.c], b = g[act.to.r][act.to.c];
      const blend = HM.mix(a, b);
      if (need[blend]) {
        g[act.to.r][act.to.c] = blend; g[act.from.r][act.from.c] = null;   // simulate the placement
        const resultSize = HM.groupAt(s, act.to.r, act.to.c).length;
        g[act.from.r][act.from.c] = a; g[act.to.r][act.to.c] = b;          // undo
        score = 0.6 + resultSize * 0.35;
      } else {
        score = 0.05;
      }
    }
    score += r() * 0.01;   // tie-break jitter
    if (score > bestScore) { bestScore = score; best = act; }
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
    const act = pickMove(s, rng);
    if (!act) break;
    HM.applyAction(s, act, rng);
    used++; s.movesLeft--;
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
