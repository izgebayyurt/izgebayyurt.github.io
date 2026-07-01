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

const NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
function neighborsOf(r, c) { return NB.map(([dr, dc]) => ({ r: r + dr, c: c + dc })); }

/* Simulates one full chain-drag gesture directly on the real state (this is
   what one "move" now buys): greedily eats same-colour neighbours to extend
   the running combo for free; when none exists, diverts into a mix ONLY if
   the blend is still needed (mirrors a player who wouldn't bother mixing
   toward a colour they don't need); otherwise stops and banks whatever's
   accumulated. Mirrors the exact engine primitives the browser uses
   (applyEat / applyMix / bankVirtualClear), so a single simulated move can
   legitimately bank far more than the old mix-or-clear economy allowed. */
export function simulateChain(s, seed, rng) {
  const need = needMap(s);
  let anchor = { r: seed.r, c: seed.c };
  let comboColor = s.grid[anchor.r][anchor.c];
  let comboCount = 1;
  let guard = 0;
  while (guard++ < 60) {
    const nbs = neighborsOf(anchor.r, anchor.c);
    let ate = false;
    for (const d of nbs) {
      if (HM.playable(s, d.r, d.c) && s.grid[d.r][d.c] === comboColor) {
        HM.applyEat(s, anchor, d); HM.gravity(s, rng);
        anchor = d; comboCount++; ate = true; break;
      }
    }
    if (ate) continue;
    if (HM.isPrim(comboColor)) {
      let divert = null;
      for (const d of nbs) {
        if (HM.playable(s, d.r, d.c) && HM.isPrim(s.grid[d.r][d.c]) && s.grid[d.r][d.c] !== comboColor) {
          if (need[HM.mix(comboColor, s.grid[d.r][d.c])]) { divert = d; break; }
        }
      }
      if (divert) {
        const bankCount = comboCount - 1;
        if (bankCount > 0) s.score += HM.bankVirtualClear(s, comboColor, bankCount).gain;
        const blend = HM.applyMix(s, anchor, divert);
        HM.gravity(s, rng);
        anchor = divert; comboColor = blend; comboCount = 1;
        continue;
      }
    }
    break;
  }
  if (comboCount > 1) s.score += HM.bankVirtualClear(s, comboColor, comboCount).gain;
}

/* Every turn, weighs the best CHAIN-drag start against the best DOUBLE-TAP
   clear (any connected group, any size >=1 — mirroring the game's other
   input) and commits whichever is more valuable. This matters because a
   primary objective (e.g. "collect red") can only ever be replenished by
   fresh random draws from gravity, and an isolated needed tile with no
   same-colour neighbour can't be chained at all — a real player would just
   double-tap it rather than wander off chaining something unrelated. */
const EPSILON = 0.06;   // fraction of moves that are pure random exploration — realism, not stall-avoidance (every action here changes the board)

function pickChainSeed(s, need, rng) {
  let best = null, bestScore = -1;
  for (let r = 0; r < s.H; r++) for (let c = 0; c < s.W; c++) {
    if (!HM.playable(s, r, c) || !s.grid[r][c]) continue;
    const col = s.grid[r][c];
    const clusterSize = HM.groupAt(s, r, c).length;   // >=2 guarantees a same-colour neighbour actually exists (a real eat, not a no-op)
    let hasNeededDivert = false;
    if (HM.isPrim(col)) {
      for (const d of neighborsOf(r, c)) {
        if (HM.playable(s, d.r, d.c) && HM.isPrim(s.grid[d.r][d.c]) && s.grid[d.r][d.c] !== col && need[HM.mix(col, s.grid[d.r][d.c])]) { hasNeededDivert = true; break; }
      }
    }
    if (clusterSize < 2 && !hasNeededDivert) continue;   // a dead-end seed — chaining from here would do nothing at all, don't even consider it
    let score;
    if (clusterSize >= 2 && need[col]) score = clusterSize * 10;          // a real chain that directly banks a needed colour
    else if (hasNeededDivert) score = 5 + (need[col] ? 2 : 0);            // can manufacture a needed blend
    else score = clusterSize * 0.5;                                      // a real chain, just not toward a current need — still useful decluttering
    score += rng() * 0.01;
    if (score > bestScore) { bestScore = score; best = { r, c }; }
  }
  return { seed: best, score: bestScore };
}

function pickClearComp(s, need, rng) {
  const comps = HM.allComponents(s);
  let best = null, bestScore = -1;
  for (const comp of comps) {
    const [r, c] = comp[0].split(",").map(Number);
    const col = s.grid[r][c];
    const rem = need[col] || 0;
    const creditable = Math.min(rem, comp.length);
    let score = creditable > 0 ? creditable * 3 + (comp.length - creditable) * 0.08 : comp.length * 0.05;
    score += rng() * 0.01;
    if (score > bestScore) { bestScore = score; best = { r, c }; }
  }
  return { seed: best, score: bestScore };
}

export function playChainMove(s, rng) {
  const r = rng || Math.random;
  if (r() < EPSILON) {
    const cands = [];
    for (let rr = 0; rr < s.H; rr++) for (let cc = 0; cc < s.W; cc++) if (HM.playable(s, rr, cc) && s.grid[rr][cc]) cands.push({ r: rr, c: cc });
    if (!cands.length) return false;
    const seed = cands[(r() * cands.length) | 0];
    if (r() < 0.5 && HM.groupAt(s, seed.r, seed.c).length >= 2) simulateChain(s, seed, rng);
    else { HM.clearGroup(s, seed.r, seed.c); HM.gravity(s, rng); }
    return true;
  }
  const need = needMap(s);
  const chain = pickChainSeed(s, need, r);
  const clear = pickClearComp(s, need, r);
  if (!chain.seed && !clear.seed) return false;
  if (chain.seed && chain.score >= clear.score) simulateChain(s, chain.seed, rng);
  else { HM.clearGroup(s, clear.seed.r, clear.seed.c); HM.gravity(s, rng); }
  return true;
}

/* one playthrough. movesCap guards infinite loops. Returns moves used + win. */
export function playout(level, rng, movesCap) {
  const s = HM.newState(level);
  s.movesLeft = movesCap == null ? 9999 : movesCap;
  HM.fill(s, rng);
  let used = 0;
  while (!s.won && !s.lost && used < 9999) {
    const did = playChainMove(s, rng);
    if (!did) break;
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
