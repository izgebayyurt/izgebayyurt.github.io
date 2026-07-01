/* Monte-Carlo move-budget solver for the merge -> combo -> min-2-clear mechanic.
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

/* Walks one full merge-then-combo gesture, frozen board (matches the real UI —
   no gravity() mid-gesture, one resolve at release). If the seed is a
   primary, it merges with the given (or best) adjacent different primary —
   caller decides whether that merge is worth taking. From the merged (or
   already-secondary) colour, the walk then advances the anchor through
   adjacent same-colour neighbours one step at a time — exactly the real
   drag's limitation: once a cell is eaten it's a hole, so a branching
   cluster can strand tiles the same way a human dragging through it would.
   Returns bankCount 0 if the final size never reaches 2 — a merge with no
   combo partner, exactly like the real "doesn't clear" rule. */
function walkMergeCombo(s, seedR, seedC, preferBlendWith, need) {
  let anchor = { r: seedR, c: seedC };
  let color = s.grid[seedR][seedC];
  if (HM.isPrim(color)) {
    const mixCands = neighborsOf(anchor.r, anchor.c).filter(d =>
      HM.playable(s, d.r, d.c) && HM.isPrim(s.grid[d.r][d.c]) && s.grid[d.r][d.c] !== color);
    if (!mixCands.length) return { bankColor: null, bankCount: 0, gain: 0, needCredit: 0 };
    let pick = preferBlendWith ? mixCands.find(d => s.grid[d.r][d.c] === preferBlendWith) : null;
    if (!pick) pick = mixCands.find(d => need[HM.mix(color, s.grid[d.r][d.c])]) || mixCands[0];
    const blend = HM.mix(color, s.grid[pick.r][pick.c]);
    HM.applyMix(s, anchor, pick);
    anchor = pick; color = blend;
  }
  let count = 1, guard = 0;
  while (guard++ < 300) {
    const nb = neighborsOf(anchor.r, anchor.c).find(d => HM.playable(s, d.r, d.c) && s.grid[d.r][d.c] === color);
    if (!nb) break;
    HM.applyEat(s, anchor, nb);
    anchor = nb; count++;
  }
  if (count < 2) return { bankColor: null, bankCount: 0, gain: 0, needCredit: 0 };
  s.grid[anchor.r][anchor.c] = null;
  const gain = HM.bankVirtualClear(s, color, count).gain;
  s.score += gain;
  const needCredit = Math.min(count, need[color] || 0);
  return { bankColor: color, bankCount: count, gain, needCredit };
}

/* Enumerates only WORTHWHILE gesture starts: an existing secondary cluster of
   size >=2 (walked, may strand branch tiles — see above), or a primary next
   to a different primary whose blend would land next to an existing same
   -colour tile, guaranteeing the merge banks something. Because secondaries
   are rare, this list is very often empty — see the tiered fallback in
   playMergeMove below for what a real player does when no sure thing exists. */
function enumerateCandidates(s, need) {
  const cands = [];
  for (let r = 0; r < s.H; r++) for (let c = 0; c < s.W; c++) {
    if (!HM.playable(s, r, c) || !s.grid[r][c]) continue;
    const col = s.grid[r][c];
    if (!HM.isPrim(col)) {
      if (HM.groupAt(s, r, c).length >= 2) cands.push({ r, c, preferBlendWith: null });
      continue;
    }
    for (const d of neighborsOf(r, c)) {
      if (!HM.playable(s, d.r, d.c) || !s.grid[d.r][d.c] || !HM.isPrim(s.grid[d.r][d.c]) || s.grid[d.r][d.c] === col) continue;
      const blend = HM.mix(col, s.grid[d.r][d.c]);
      const hasCombo = neighborsOf(d.r, d.c).some(e => !(e.r === r && e.c === c) && HM.playable(s, e.r, e.c) && s.grid[e.r][e.c] === blend);
      if (hasCombo) cands.push({ r, c, preferBlendWith: s.grid[d.r][d.c] });
    }
  }
  return cands;
}

function pickBestCombo(s, need, rng) {
  const cands = enumerateCandidates(s, need);
  let best = null, bestScore = -1;
  for (const cand of cands) {
    const clone = HM.clone(s);
    const res = walkMergeCombo(clone, cand.r, cand.c, cand.preferBlendWith, need);
    const score = res.needCredit * 3 + res.gain * 0.01 + rng() * 0.001;
    if (score > bestScore) { bestScore = score; best = cand; }
  }
  return { cand: best, score: bestScore };
}

function pickClearComp(s, need, rng) {
  const comps = HM.allComponents(s);
  let best = null, bestScore = -1;
  for (const comp of comps) {
    if (comp.length < 2) continue;   // a lone tile can't be cleared either, under the new min-2 rule
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

/* Tier-3 fallback: no guaranteed-payoff action exists anywhere (common, since
   secondaries are rare) — a real player still has to spend the move, so they
   merge toward whichever still-needed blend is available, accepting it may
   not combo yet. This banks nothing itself but changes the board (and odds)
   for the next move, same as a real "setup" merge. */
function pickFallbackMerge(s, need, rng) {
  const cands = [];
  for (let r = 0; r < s.H; r++) for (let c = 0; c < s.W; c++) {
    if (!HM.playable(s, r, c) || !s.grid[r][c] || !HM.isPrim(s.grid[r][c])) continue;
    for (const d of neighborsOf(r, c)) {
      if (!HM.playable(s, d.r, d.c) || !s.grid[d.r][d.c] || !HM.isPrim(s.grid[d.r][d.c]) || s.grid[d.r][d.c] === s.grid[r][c]) continue;
      const needed = !!need[HM.mix(s.grid[r][c], s.grid[d.r][d.c])];
      cands.push({ r, c, preferBlendWith: s.grid[d.r][d.c], needed });
    }
  }
  if (!cands.length) return null;
  const needed = cands.filter(x => x.needed);
  const pool = needed.length ? needed : cands;
  return pool[(rng() * pool.length) | 0];
}

const EPSILON = 0.08;   // a slightly-imperfect player occasionally wastes a move outright (pokes at an isolated tile) — realism, matched to the higher stakes of this mechanic's all-or-nothing releases

export function playMergeMove(s, rng) {
  const r = rng || Math.random;
  const need = needMap(s);
  if (r() < EPSILON) {
    const cands = [];
    for (let rr = 0; rr < s.H; rr++) for (let cc = 0; cc < s.W; cc++) if (HM.playable(s, rr, cc) && s.grid[rr][cc]) cands.push({ r: rr, c: cc });
    if (!cands.length) return false;
    const seed = cands[(r() * cands.length) | 0];
    walkMergeCombo(s, seed.r, seed.c, null, need);   // may legitimately waste the move — that's the point
    HM.gravity(s, r);
    return true;
  }
  const combo = pickBestCombo(s, need, r);
  const clear = pickClearComp(s, need, r);
  if (combo.cand && combo.score >= clear.score) { walkMergeCombo(s, combo.cand.r, combo.cand.c, combo.cand.preferBlendWith, need); HM.gravity(s, r); return true; }
  if (clear.seed) { HM.clearGroup(s, clear.seed.r, clear.seed.c); HM.gravity(s, r); return true; }
  const fallback = pickFallbackMerge(s, need, r);
  if (fallback) { walkMergeCombo(s, fallback.r, fallback.c, fallback.preferBlendWith, need); HM.gravity(s, r); return true; }
  return false;
}

/* one playthrough. movesCap guards infinite loops. Returns moves used + win. */
export function playout(level, rng, movesCap) {
  const s = HM.newState(level);
  s.movesLeft = movesCap == null ? 9999 : movesCap;
  HM.fill(s, rng);
  let used = 0;
  while (!s.won && !s.lost && used < 9999) {
    const did = playMergeMove(s, rng);
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
