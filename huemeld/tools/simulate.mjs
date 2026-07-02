/* Monte-Carlo move-budget solver for the SUSPENDED-COMBO mechanic.

   Each MOVE is one gesture. A gesture either:
   - MERGE: fuse two adjacent different primaries into their blend secondary,
     then free-sweep the connected same-blend secondaries reachable from it
     (freshly made + any pre-existing treasure). Objective progress ~1 blend
     per gesture, plus whatever treasure the sweep gathers for free.
   - CHAIN: collect a connected same-colour group (>=2). Secondary chains
     credit + score gently; primary chains credit + charge a powerup bar.

   Bundling several gestures into one suspended session before cash-out changes
   only the SCORE (steep combo curve), never moves-to-win, so for budget tuning
   we resolve each gesture immediately — objective math is identical and it
   keeps the policy deterministic and clone-replayable. Powerups are not modeled
   (they only ever make a level easier, so budgets tuned without them are a safe
   floor). */
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

/* Play one gesture in place, resolving it immediately (one gravity draw).
   A merge gesture: fuse from->to, sweep connected same-blend cells, resolve.
   A chain gesture: collect the whole group, resolve. Returns needCredit. */
function playMerge(s, from, to, rng) {
  const sess = HM.newSession("merge", null);
  const sweep = HM.fusePreview(s, from, to);          // same-blend cells connected to `to` (pre-existing treasure)
  HM.sessionMerge(s, sess, from, to);
  for (const k of sweep) { const p = k.split(","); HM.sessionCollect(s, sess, +p[0], +p[1]); }
  return HM.resolveSession(s, sess, rng);
}
function playChain(s, seed, rng) {
  const sess = HM.newSession("chain", null);
  const comp = HM.groupAt(s, seed.r, seed.c);
  for (const k of comp) { const p = k.split(","); HM.sessionCollect(s, sess, +p[0], +p[1]); }
  return HM.resolveSession(s, sess, rng);
}

const EPSILON = 0.06;   // fraction of gestures taken carelessly — a slightly-imperfect player

/* Greedy: value each candidate gesture by objective progress first, then a
   little by score, and pick the best. Merges are evaluated on a clone so the
   sweep count is real. */
export function pickGesture(s, rng) {
  const need = needMap(s);
  const r = rng || Math.random;
  const merges = HM.legalFuses(s);
  const chains = HM.legalChains(s, 2);
  if (!merges.length && !chains.length) return null;

  if (r() < EPSILON) {
    if (merges.length && (r() < 0.7 || !chains.length)) { const m = merges[(r() * merges.length) | 0]; return { type: "merge", from: m.from, to: m.to }; }
    const ch = chains[(r() * chains.length) | 0]; return { type: "chain", seed: { r: ch.r, c: ch.c } };
  }

  let best = null, bestScore = -1;
  for (const m of merges) {
    const clone = HM.clone(s);
    const res = playMerge(clone, m.from, m.to, function () { return 0.5; });   // fixed rng: evaluate deterministically, not the real draw
    const credit = res.color && need[res.color] ? Math.min(res.popped, need[res.color]) : 0;
    const score = credit * 5 + res.popped * 0.2 + res.gain * 0.005 + r() * 0.01;
    if (score > bestScore) { bestScore = score; best = { type: "merge", from: m.from, to: m.to }; }
  }
  for (const ch of chains) {
    const rem = need[ch.color] || 0;
    if (!rem) continue;                                  // only chain a colour an objective still wants
    const credit = Math.min(rem, ch.comp.length);
    const score = credit * 5 + ch.comp.length * 0.1 + r() * 0.01;
    if (score > bestScore) { bestScore = score; best = { type: "chain", seed: { r: ch.r, c: ch.c } }; }
  }
  return best;
}

function playGesture(s, g, rng) {
  if (g.type === "merge") playMerge(s, g.from, g.to, rng);
  else playChain(s, g.seed, rng);
  if (!HM.hasFusePair(s)) HM.reshufflePrimaries(s, rng);
}

/* one playthrough. movesCap guards infinite loops. Returns moves used + win. */
export function playout(level, rng, movesCap) {
  const s = HM.newState(level);
  s.movesLeft = movesCap == null ? 9999 : movesCap;
  HM.fill(s, rng);
  if (!HM.hasFusePair(s)) HM.reshufflePrimaries(s, rng);
  let used = 0;
  while (!s.won && !s.lost && used < 9999) {
    const g = pickGesture(s, rng);
    if (!g) break;
    playGesture(s, g, rng);
    used++; s.movesLeft--;
    HM.checkEnd(s);
    if (movesCap != null && used >= movesCap) break;
  }
  return { won: s.won, used: used, score: s.score };
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
