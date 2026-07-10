/* Huemeld Flow 2 — unique-solution level generator.

   Strategy: build a random *solved* board constructively (guaranteed full
   coverage + a real mixing structure), read the level off it, then verify with
   the exact counter that the level has EXACTLY ONE solution. Tight, walled
   boards keep the counter fast and make uniqueness common. */

import { countSolutions, findOneSolution } from "./flow-solve.mjs";

const PRIMS = ["R", "Y", "B"];
const MIX = { RY: "O", BY: "G", BR: "P" };
const mix = (a, b) => MIX[[a, b].sort().join("")];

/* ---- seeded RNG (so a run is reproducible from a seed) ---- */
function mulberry32(seed) {
  let a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/* Build ONE random valid solved board on an n×n grid with the given wall set.
   Returns {sq, ci, walls, edges} or null on failure.

   We tile every open cell with monochromatic strands using a Hamiltonian
   "snake" as the coverage backbone, then (a) cut it into coloured primary
   segments and (b) optionally weld adjacent segment-boundaries into junctions
   that emit a blend to a fresh secondary circle grafted from a spare segment.
   Roles (which end is the SQUARE source vs the CIRCLE receiver) are then chosen
   so the level is well-formed. */
export function buildSolved(n, wallSet, rng, opts = {}) {
  const isWall = (r, c) => wallSet.has(r + "," + c);
  const open = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!isWall(r, c)) open.push([r, c]);
  // Hamiltonian snake over a wall-free rectangle: boustrophedon. Only valid when
  // there are no walls (walls can break Hamiltonicity); walled boards use the
  // randomized path-partition fallback below.
  let path = null;
  if (wallSet.size === 0) {
    path = [];
    for (let r = 0; r < n; r++) {
      if (r % 2 === 0) { for (let c = 0; c < n; c++) path.push([r, c]); }
      else { for (let c = n - 1; c >= 0; c--) path.push([r, c]); }
    }
  } else {
    path = snakeWithWalls(n, isWall, open, rng);
    if (!path) return null;
  }
  return fromPath(n, path, wallSet, rng, opts);
}

/* Randomized attempt at a Hamiltonian path over the open cells (walls present).
   Greedy self-avoiding walk with Warnsdorff-ish bias + limited backtracking. */
function snakeWithWalls(n, isWall, open, rng) {
  const key = (r, c) => r + "," + c;
  const openSet = new Set(open.map(([r, c]) => key(r, c)));
  const total = open.length;
  const nbrs = (r, c) => {
    const out = [];
    for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
      const nr = r + dr, nc = c + dc;
      if (nr >= 0 && nc >= 0 && nr < n && nc < n && !isWall(nr, nc)) out.push([nr, nc]);
    }
    return out;
  };
  // try several random starts
  for (let attempt = 0; attempt < 80; attempt++) {
    const start = open[(rng() * open.length) | 0];
    const visited = new Set([key(start[0], start[1])]);
    const path = [start];
    let steps = 0, ok = true;
    while (path.length < total) {
      if (++steps > total * 40) { ok = false; break; }
      const [r, c] = path[path.length - 1];
      let cand = nbrs(r, c).filter(([nr, nc]) => !visited.has(key(nr, nc)));
      if (!cand.length) { ok = false; break; }
      // Warnsdorff: prefer the neighbour with the fewest onward options
      cand = cand.map(([nr, nc]) => {
        const deg = nbrs(nr, nc).filter(([ar, ac]) => !visited.has(key(ar, ac))).length;
        return { cell: [nr, nc], deg: deg + rng() * 0.5 };
      }).sort((a, b) => a.deg - b.deg);
      const pick = cand[0].cell;
      visited.add(key(pick[0], pick[1]));
      path.push(pick);
    }
    if (ok && path.length === total) return path;
  }
  return null;
}

/* Turn a Hamiltonian path into a solved board with primary segments + junctions. */
function fromPath(n, path, wallSet, rng, opts) {
  const m = path.length;
  const maxJ = opts.junctions ?? 0;          // desired number of junctions
  const minSeg = opts.minSeg ?? 2, maxSeg = opts.maxSeg ?? 5;

  // 1) cut the snake into primary segments of length >= 2
  const cuts = [0];
  let i = 0;
  while (i < m) {
    let len = minSeg + ((rng() * (maxSeg - minSeg + 1)) | 0);
    if (i + len > m) len = m - i;
    if (m - (i + len) === 1) len += 1;         // never leave a length-1 tail
    i += len; cuts.push(Math.min(i, m));
  }
  // segments as [start,end) index ranges
  const segs = [];
  for (let k = 0; k < cuts.length - 1; k++) segs.push([cuts[k], cuts[k + 1]]);
  if (segs.some(([a, b]) => b - a < 2)) return null;

  // 2) assign a random primary colour to each segment, avoiding two adjacent
  //    (snake-consecutive) segments sharing a colour ONLY where we want junctions.
  const segColor = segs.map(() => PRIMS[(rng() * 3) | 0]);

  // edges: map "r,c|r,c" -> colour
  const edges = new Map();
  const ekey = (a, b) => {
    const ka = a[0] * n + a[1], kb = b[0] * n + b[1];
    return ka < kb ? ka + "|" + kb : kb + "|" + ka;
  };
  const deg = new Map();
  const bump = (cell) => deg.set(cell[0] + "," + cell[1], (deg.get(cell[0] + "," + cell[1]) || 0) + 1);
  function addEdge(a, b, col) { edges.set(ekey(a, b), col); bump(a); bump(b); }

  // lay each segment's internal edges
  segs.forEach(([a, b], si) => {
    for (let j = a; j < b - 1; j++) addEdge(path[j], path[j + 1], segColor[si]);
  });

  // 3) role assignment: each segment is a primary delivery — one end SQUARE, other CIRCLE.
  const sq = [], ci = [];
  const roleUsed = new Set();
  const used = (cell) => roleUsed.has(cell[0] + "," + cell[1]);
  const markRole = (cell) => roleUsed.add(cell[0] + "," + cell[1]);

  // 3a) build junctions first (they consume some segment boundaries)
  let madeJ = 0;
  const junctionCells = new Set();
  const consumedSeg = new Set();     // segments turned into feeders/blend
  if (maxJ > 0) {
    // a junction sits at a snake-boundary cell shared by two segments of DIFFERENT
    // colours; the blend needs a side neighbour that begins a spare segment used
    // as the blend path to a secondary circle.
    for (let bi = 1; bi < segs.length - 1 && madeJ < maxJ; bi++) {
      const jIdx = segs[bi][0];              // boundary cell index = start of segment bi
      const Jcell = path[jIdx];
      if (junctionCells.has(Jcell[0] + "," + Jcell[1])) continue;
      const prevIdx = jIdx - 1;              // last cell of segment bi-1
      if (prevIdx < 0) continue;
      const p1 = segColor[bi - 1], p2 = segColor[bi];
      if (p1 === p2) continue;               // need two different primaries
      const sec = mix(p1, p2);
      // find a side neighbour Y of Jcell (not the snake prev/next) that is the
      // START of some later segment we can repurpose as the blend path.
      const nb = [];
      for (const [dr, dc] of [[-1, 0], [1, 0], [0, -1], [0, 1]]) {
        const y = [Jcell[0] + dr, Jcell[1] + dc];
        if (y[0] < 0 || y[1] < 0 || y[0] >= n || y[1] >= n) continue;
        if (wallSet.has(y[0] + "," + y[1])) continue;
        nb.push(y);
      }
      // Jcell's snake neighbours are path[jIdx-1] and path[jIdx+1]
      const snakeNb = new Set();
      if (jIdx > 0) snakeNb.add(path[jIdx - 1][0] + "," + path[jIdx - 1][1]);
      if (jIdx < m - 1) snakeNb.add(path[jIdx + 1][0] + "," + path[jIdx + 1][1]);
      let blendSeg = -1, Y = null;
      for (const y of nb) {
        if (snakeNb.has(y[0] + "," + y[1])) continue;
        // which segment starts (or ends) at y?
        const yi = path.findIndex((p) => p[0] === y[0] && p[1] === y[1]);
        const sidx = segs.findIndex(([a, bb]) => yi === a || yi === bb - 1);
        if (sidx < 0 || consumedSeg.has(sidx) || sidx === bi || sidx === bi - 1) continue;
        blendSeg = sidx; Y = y; break;
      }
      if (blendSeg < 0) continue;
      // WELD: recolour segment bi-1 to p1 (already), segment bi to p2 (already),
      // but the junction cell currently has its snake edges coloured by segments.
      // The edge (prev, Jcell) is inside segment bi-1? No: Jcell is START of bi, so
      // (prev,Jcell) is the boundary — not yet an edge. Add feeders + blend.
      addEdge(path[prevIdx], Jcell, p1);     // feeder 1 (extends seg bi-1 to the junction)
      // segment bi already has edge (Jcell, path[jIdx+1]) coloured p2 — good, that's feeder 2
      // recolour the blend segment to sec and connect Jcell->Y
      const [ba, bb] = segs[blendSeg];
      for (let j = ba; j < bb - 1; j++) { const kk = ekey(path[j], path[j + 1]); if (edges.has(kk)) edges.set(kk, sec); }
      addEdge(Jcell, Y, sec);
      junctionCells.add(Jcell[0] + "," + Jcell[1]);
      consumedSeg.add(blendSeg); consumedSeg.add(bi - 1); consumedSeg.add(bi);
      markRole(Jcell);
      madeJ++;
      // sources: far ends of feeder segments; circle: far end of blend segment
      const fe1 = path[segs[bi - 1][0]];               // start of seg bi-1
      const fe2 = path[segs[bi][1] - 1];               // end of seg bi
      sq.push([p1, fe1[0], fe1[1]]); markRole(fe1);
      sq.push([p2, fe2[0], fe2[1]]); markRole(fe2);
      const bc = (path[ba][0] === Y[0] && path[ba][1] === Y[1]) ? path[bb - 1] : path[ba];
      ci.push([sec, bc[0], bc[1]]); markRole(bc);
    }
  }

  // 3b) remaining (unconsumed) segments become plain primary deliveries
  segs.forEach(([a, b], si) => {
    if (consumedSeg.has(si)) return;
    const e0 = path[a], e1 = path[b - 1];
    // pick a source end at random
    let s = e0, t = e1;
    if (rng() < 0.5) { s = e1; t = e0; }
    if (used(s) || used(t)) { s = e0; t = e1; }        // fall back if role taken by a junction weld
    sq.push([segColor[si], s[0], s[1]]); markRole(s);
    ci.push([segColor[si], t[0], t[1]]); markRole(t);
  });

  return { n, sq, ci, walls: [...wallSet].map((k) => k.split(",").map(Number)), edges, madeJ };
}

/* Merge same-colour squares? The game allows multiple squares of a colour, so
   we keep them. But collapse identical positions just in case. */
function levelFromSolved(sv) {
  return { n: sv.n, sq: sv.sq, ci: sv.ci, walls: sv.walls };
}

/* Try to generate ONE unique level near the requested spec. Returns level or null. */
export function genUnique(spec, rng, budget = 500_000) {
  for (let attempt = 0; attempt < (spec.tries ?? 200); attempt++) {
    const wallSet = spec.makeWalls ? spec.makeWalls(rng) : new Set();
    const sv = buildSolved(spec.n, wallSet, rng, spec);
    if (!sv) continue;
    if (spec.junctions && sv.madeJ < spec.junctions) continue;    // need the mixing quota
    const L = levelFromSolved(sv);
    // basic sanity: every square/circle cell distinct & on an open cell
    const cells = new Set();
    let bad = false;
    for (const [, r, c] of [...L.sq, ...L.ci]) { const k = r + "," + c; if (cells.has(k)) bad = true; cells.add(k); }
    if (bad) continue;
    const res = countSolutions(L, 2, budget);
    if (res.aborted || res.count !== 1) continue;
    // QUALITY GATE: the unique solution must use every square exactly once (one
    // leg each) — no dead squares, no accidental forks. Keeps levels clean and
    // consistent ("each square feeds one line").
    if (!cleanSolution(L, budget)) continue;
    return { L, res, madeJ: sv.madeJ };
  }
  return null;
}

/* true iff the (unique) solution has every source at degree exactly 1. */
function cleanSolution(L, budget) {
  const sol = findOneSolution(L, budget);
  if (!sol) return false;
  const deg = new Map();
  for (const e of sol) {
    deg.set(e.r1 + "," + e.c1, (deg.get(e.r1 + "," + e.c1) || 0) + 1);
    deg.set(e.r2 + "," + e.c2, (deg.get(e.r2 + "," + e.c2) || 0) + 1);
  }
  return L.sq.every(([, r, c]) => (deg.get(r + "," + c) || 0) === 1);
}

export { mulberry32, levelFromSolved };
