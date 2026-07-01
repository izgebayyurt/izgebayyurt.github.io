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

/* Walks one full chain-drag gesture, mirroring the real (frozen-board)
   mechanic exactly: eats same-colour neighbours (or, once a different
   primary is touched, either of the two locked "recipe" ingredients — the
   third primary is never a valid direction); NO gravity happens mid-walk,
   matching the real game's frozen board. `preferRecipeWith`, if set, makes
   the walk lock toward that specific blend the first chance it gets (used
   to evaluate "what if I aimed this chain at colour X" candidates); left
   unset, the walk only auto-locks into a blend that's still needed. Once
   stuck, banks min(ingredient tallies) of the blend (or the raw tally if no
   recipe was ever locked) exactly as bankVirtualClear + the real UI does,
   discarding any unpaired leftovers. Fully deterministic (no rng at all —
   nothing random happens without gravity), so evaluating many candidate
   seeds via clone-and-replay is safe and reproducible, unlike a design where
   mid-chain gravity draws would make preview and commit diverge. */
function walkChain(s, seedR, seedC, preferRecipeWith, need) {
  const seedColor = s.grid[seedR][seedC];
  let anchor = { r: seedR, c: seedC };
  let recipeColor = null;
  const tally = {}; tally[seedColor] = 1;
  let guard = 0;
  while (guard++ < 300) {
    const nbs = neighborsOf(anchor.r, anchor.c).filter(d => HM.playable(s, d.r, d.c) && s.grid[d.r][d.c]);
    const candidates = nbs.filter(d => {
      const col = s.grid[d.r][d.c];
      if (col === seedColor) return true;
      if (recipeColor) return col === recipeColor;
      if (!HM.isPrim(seedColor) || !HM.isPrim(col) || col === seedColor) return false;
      return preferRecipeWith ? col === preferRecipeWith : !!need[HM.mix(seedColor, col)];
    });
    if (!candidates.length) break;
    let pick;
    if (recipeColor) {
      const scarce = (tally[seedColor] || 0) <= (tally[recipeColor] || 0) ? seedColor : recipeColor;   // keep the pair balanced, minimise waste
      pick = candidates.find(d => s.grid[d.r][d.c] === scarce) || candidates[0];
    } else if (preferRecipeWith) {
      pick = candidates.find(d => s.grid[d.r][d.c] === preferRecipeWith) || candidates.find(d => s.grid[d.r][d.c] === seedColor) || candidates[0];
    } else {
      pick = candidates.find(d => s.grid[d.r][d.c] === seedColor) || candidates[0];
    }
    const col = s.grid[pick.r][pick.c];
    if (!recipeColor && col !== seedColor) { recipeColor = col; tally[col] = 0; }
    HM.applyEat(s, anchor, pick);
    tally[col] = (tally[col] || 0) + 1;
    anchor = pick;
  }
  let bankColor, bankCount;
  if (recipeColor) { bankColor = HM.mix(seedColor, recipeColor); bankCount = Math.min(tally[seedColor] || 0, tally[recipeColor] || 0); }
  else { bankColor = seedColor; bankCount = tally[seedColor] || 0; }
  s.grid[anchor.r][anchor.c] = null;   // the final anchor tile is also consumed, matching the real release
  const gain = bankCount > 0 ? HM.bankVirtualClear(s, bankColor, bankCount).gain : 0;
  s.score += gain;
  const needCredit = bankCount > 0 ? Math.min(bankCount, need[bankColor] || 0) : 0;
  return { bankColor, bankCount, gain, needCredit };
}

/* Every turn, weighs the best CHAIN-drag start (tried across every plausible
   seed+target combination via clone-and-replay, safe since walkChain is
   deterministic) against the best DOUBLE-TAP clear (any connected group, any
   size >=1) and commits whichever is more valuable. An isolated needed tile
   with no same-colour neighbour can't be chained at all — a real player
   would just double-tap it rather than wander off chaining something
   unrelated — so the clear option always stays in the running. */
const EPSILON = 0.06;   // fraction of moves that are pure random exploration — realism, not stall-avoidance (every action here changes the board)

function enumerateChainCandidates(s, need) {
  const cands = [];
  for (let r = 0; r < s.H; r++) for (let c = 0; c < s.W; c++) {
    if (!HM.playable(s, r, c) || !s.grid[r][c]) continue;
    const col = s.grid[r][c];
    if (HM.groupAt(s, r, c).length >= 2) cands.push({ r, c, preferRecipeWith: null });   // a real same-colour chain start (opportunistic — may still auto-lock if useful)
    if (HM.isPrim(col)) {
      for (const d of neighborsOf(r, c)) {
        if (HM.playable(s, d.r, d.c) && HM.isPrim(s.grid[d.r][d.c]) && s.grid[d.r][d.c] !== col && need[HM.mix(col, s.grid[d.r][d.c])]) {
          cands.push({ r, c, preferRecipeWith: s.grid[d.r][d.c] });   // explicitly aim this chain at a still-needed blend
        }
      }
    }
  }
  return cands;
}

function pickBestChain(s, need, rng) {
  const cands = enumerateChainCandidates(s, need);
  let best = null, bestScore = -1;
  for (const cand of cands) {
    const clone = HM.clone(s);
    const res = walkChain(clone, cand.r, cand.c, cand.preferRecipeWith, need);
    const score = res.needCredit * 3 + res.gain * 0.01 + rng() * 0.001;
    if (score > bestScore) { bestScore = score; best = cand; }
  }
  return { cand: best, score: bestScore };
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
  const need = needMap(s);
  if (r() < EPSILON) {
    const cands = [];
    for (let rr = 0; rr < s.H; rr++) for (let cc = 0; cc < s.W; cc++) if (HM.playable(s, rr, cc) && s.grid[rr][cc]) cands.push({ r: rr, c: cc });
    if (!cands.length) return false;
    const seed = cands[(r() * cands.length) | 0];
    if (r() < 0.5 && HM.groupAt(s, seed.r, seed.c).length >= 2) walkChain(s, seed.r, seed.c, null, need);
    else HM.clearGroup(s, seed.r, seed.c);
    HM.gravity(s, r);   // one resolve for the whole simulated move, exactly like a real release
    return true;
  }
  const chain = pickBestChain(s, need, r);
  const clear = pickClearComp(s, need, r);
  if (!chain.cand && !clear.seed) return false;
  if (chain.cand && chain.score >= clear.score) walkChain(s, chain.cand.r, chain.cand.c, chain.cand.preferRecipeWith, need);
  else HM.clearGroup(s, clear.seed.r, clear.seed.c);
  HM.gravity(s, r);
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
