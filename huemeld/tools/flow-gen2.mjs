/* Huemeld Flow — single-emitter generator.

   Builds solutions in the "one emitter per colour" style the design wants:
   at most one R/Y/B SQUARE, each free to FORK into several legs that meet other
   primaries at junctions (mixing into a secondary) or reach a same-colour circle.
   Secondary circles (O/G/P) are the objective; primary circles are optional and
   capped at one per colour.

   Method: fix the emitter cells, then randomly search for ONE full-coverage
   solution (roles for every other cell are discovered, not pre-placed), read the
   circles off the leaves, and hand the finished level to the exact counter to
   confirm it has exactly one solution. The shipped engine already forbids
   branching anywhere but a square, so that solution space matches the game. */

import { countSolutions } from "./flow-solve.mjs";

const PRIMS = ["R", "Y", "B"];
const SECS = ["O", "G", "P"];
const MIX = { BR: "P", BY: "G", RY: "O" };
const mix = (a, b) => MIX[[a, b].sort().join("")] || null;
const COMP = { O: ["R", "Y"], G: ["B", "Y"], P: ["B", "R"] };

export function mulberry32(seed) {
  let a = seed >>> 0;
  return function () { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296; };
}
function shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

/* Find ONE random full-coverage solution, with emitters DERIVED (not fixed) so
   the search has many solutions to hit. Each primary colour must form a single
   connected spider with at most one branch cell (its emitter); secondaries are
   junction→circle paths. Returns {edges, sq, ci} or null. */
export function findFreeSolution(n, wallSet, rng, opts = {}, budget = 500000) {
  const isWall = (r, c) => wallSet.has(r + "," + c);
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!isWall(r, c)) cells.push([r, c]);
  const H = Array.from({ length: n }, () => new Array(n).fill(null));
  const V = Array.from({ length: n }, () => new Array(n).fill(null));
  const passable = (r, c) => r >= 0 && c >= 0 && r < n && c < n && !isWall(r, c);

  function incident(r, c) {
    const o = [];
    if (c > 0 && H[r][c - 1]) o.push(H[r][c - 1]);
    if (c < n - 1 && H[r][c]) o.push(H[r][c]);
    if (r > 0 && V[r - 1][c]) o.push(V[r - 1][c]);
    if (r < n - 1 && V[r][c]) o.push(V[r][c]);
    return o;
  }
  function cellOK(r, c) {
    const cols = incident(r, c), deg = cols.length;
    if (deg === 0) return false;                 // uncovered
    if (deg === 1) return true;                  // leaf: emitter or receiver
    if (deg === 2) return cols[0] === cols[1];   // pipe / blend / 2-leg emitter
    if (deg === 3) {                             // same-colour emitter branch, or a junction
      if (cols[0] === cols[1] && cols[1] === cols[2]) return PRIMS.includes(cols[0]);
      const sec = cols.filter((x) => SECS.includes(x));
      if (sec.length !== 1) return false;
      const prims = cols.filter((x) => PRIMS.includes(x)).sort();
      const want = COMP[sec[0]].slice().sort();
      return prims.length === 2 && prims[0] === want[0] && prims[1] === want[1];
    }
    if (deg === 4) return cols.every((x) => x === cols[0]) && PRIMS.includes(cols[0]); // 4-leg emitter
    return false;
  }
  function allowed() { return ["R", "Y", "B", "O", "G", "P"]; }

  // per-colour union-find (rollback) to forbid monochromatic cycles
  const NN = n * n, CI = { R: 0, Y: 1, B: 2, O: 3, G: 4, P: 5 };
  const parent = new Int32Array(6 * NN); for (let i = 0; i < parent.length; i++) parent[i] = i;
  const log = [];
  const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
  const join = (col, a, b) => { const base = CI[col] * NN, ra = find(base + a), rb = find(base + b); if (ra === rb) return false; parent[rb] = ra; log.push(rb); return true; };
  const rollback = (m) => { while (log.length > m) { const x = log.pop(); parent[x] = x; } };

  let found = null, nodes = 0;
  function derive() {
    // global validity + read receivers
    const idx = (r, c) => r * n + c;
    const ci = [], sq = [], recCount = {};
    for (const col of ["R", "Y", "B", "O", "G", "P"]) {
      const isSec = SECS.includes(col);
      const colDeg = new Array(NN).fill(0);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (c < n - 1 && H[r][c] === col) { colDeg[idx(r, c)]++; colDeg[idx(r, c + 1)]++; }
        if (r < n - 1 && V[r][c] === col) { colDeg[idx(r, c)]++; colDeg[idx(r + 1, c)]++; }
      }
      const comp = new Array(NN).fill(-1);
      let ncomp = 0;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const id = idx(r, c); if (colDeg[id] === 0 || comp[id] !== -1) continue;
        ncomp++; const stack = [id]; comp[id] = id; const members = []; let ec = 0;
        while (stack.length) { const u = stack.pop(); members.push(u); const ur = (u / n) | 0, uc = u % n;
          const nb = [];
          if (uc > 0 && H[ur][uc - 1] === col) nb.push(idx(ur, uc - 1));
          if (uc < n - 1 && H[ur][uc] === col) nb.push(idx(ur, uc + 1));
          if (ur > 0 && V[ur - 1][uc] === col) nb.push(idx(ur - 1, uc));
          if (ur < n - 1 && V[ur][uc] === col) nb.push(idx(ur + 1, uc));
          for (const v of nb) { ec++; if (comp[v] === -1) { comp[v] = id; stack.push(v); } } }
        ec /= 2; if (ec !== members.length - 1) return null;            // monochromatic cycle
        if (isSec) {
          // blend: a simple path with one junction end + one secondary-circle end
          let junc = 0, rec = 0, recCell = null;
          for (const u of members) { if (colDeg[u] !== 1) continue; const ur = (u / n) | 0, uc = u % n;
            if (incident(ur, uc).length === 3) junc++; else { rec++; recCell = [ur, uc]; } }
          if (junc !== 1 || rec !== 1) return null;
          ci.push([col, recCell[0], recCell[1]]); recCount[col] = (recCount[col] || 0) + 1;
        } else {
          // primary spider: one branch cell max (= emitter). leaves = junctions or ≤1 prim circle.
          const branch = members.filter((u) => colDeg[u] >= 3);
          if (branch.length > 1) return null;                          // two branch points -> two emitters
          const leaves = members.filter((u) => colDeg[u] === 1)
            .filter((u) => incident((u / n) | 0, u % n).length !== 3);  // drop junction leaves
          let emCell;
          if (branch.length === 1) { emCell = branch[0]; }
          else if (leaves.length) { emCell = leaves[0]; }              // 1-leg emitter at a free end
          else { emCell = members[(members.length / 2) | 0]; }         // 2-leg emitter mid-path
          sq.push([col, (emCell / n) | 0, emCell % n]);
          // remaining free leaves (not the emitter) become primary circles
          for (const u of leaves) { if (u === emCell) continue; const ur = (u / n) | 0, uc = u % n;
            ci.push([col, ur, uc]); recCount[col] = (recCount[col] || 0) + 1; }
        }
      }
      if (!isSec && ncomp > 1) return null;                            // one emitter per colour
    }
    if (Object.values(recCount).some((k) => k > 1)) return null;       // ≤1 circle per colour
    if (!SECS.some((s) => recCount[s])) return null;                   // must feature mixing
    if (sq.length < (opts.minEmitters || 2)) return null;
    if (opts.maxPrimCircles != null && PRIMS.reduce((a, s) => a + (recCount[s] || 0), 0) > opts.maxPrimCircles) return null;
    return { sq, ci };
  }
  function snapshot() {
    const edges = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (c < n - 1 && H[r][c]) edges.push({ r1: r, c1: c, r2: r, c2: c + 1, col: H[r][c] });
      if (r < n - 1 && V[r][c]) edges.push({ r1: r, c1: c, r2: r + 1, c2: c, col: V[r][c] });
    }
    return edges;
  }
  function recurse(k) {
    if (found || nodes++ > budget) return;
    if (k === cells.length) { const d = derive(); if (d) found = { edges: snapshot(), sq: d.sq, ci: d.ci }; return; }
    const [r, c] = cells[k], rid = r * n + c;
    const rightCols = (c < n - 1 && passable(r, c + 1)) ? shuffle(allowed().slice(), rng) : [];
    const rOpts = shuffle([null, ...rightCols], rng);
    for (const rc of rOpts) {
      H[r][c] = rc; const mR = log.length;
      if (rc && !join(rc, rid, r * n + c + 1)) { rollback(mR); H[r][c] = null; continue; }
      const downCols = (r < n - 1 && passable(r + 1, c)) ? shuffle(allowed().slice(), rng) : [];
      const dOpts = shuffle([null, ...downCols], rng);
      for (const dc of dOpts) {
        V[r][c] = dc; const mD = log.length;
        if (dc && !join(dc, rid, (r + 1) * n + c)) { rollback(mD); V[r][c] = null; continue; }
        if (cellOK(r, c)) recurse(k + 1);
        rollback(mD); V[r][c] = null;
        if (found) { rollback(mR); H[r][c] = null; return; }
      }
      rollback(mR); H[r][c] = null;
    }
  }
  recurse(0);
  return found ? { ...found, nodes } : null;
}

/* ---------- CONSTRUCTIVE generation ----------
   Grow the solution's paths first; the board (walls) is whatever they cover, so
   every build is a valid single-emitter full-coverage solution by construction.
   Then the exact counter confirms uniqueness. */

const NB4 = [[-1, 0], [1, 0], [0, -1], [0, 1]];
const inb = (n, r, c) => r >= 0 && c >= 0 && r < n && c < n;

/* Grow `k` induced arms simultaneously from `center` into the shared `visited`
   set. A candidate cell must have NO visited neighbour except its arm's own head,
   so the covered region never gains a shortcut adjacency → the routing is forced
   (unique). `forbidAdj` cells may not be touched by new cells either. Returns the
   arms (arrays of cells, not including center). */
function growArms(n, rng, center, k, visited, share, maxCells, looseness) {
  const forbid = share || new Set();
  const loose = looseness || 0;
  const starts = shuffle(NB4.map(([dr, dc]) => [center[0] + dr, center[1] + dc])
    .filter(([r, c]) => inb(n, r, c) && !visited.has(r + "," + c) && freeAround(n, r, c, center, visited, forbid)), rng);
  const arms = [];
  for (let i = 0; i < k && i < starts.length; i++) { const s = starts[i]; visited.add(s[0] + "," + s[1]); arms.push([s]); }
  if (arms.length < k) return null;
  let added = arms.length, guard = 0;
  const cap = maxCells || (n * n * 4);
  while (guard++ < n * n * 4 && added < cap) {
    const opts = [];
    arms.forEach((arm, ai) => {
      const h = arm[arm.length - 1];
      for (const [dr, dc] of NB4) { const nr = h[0] + dr, nc = h[1] + dc;
        if (!inb(n, nr, nc) || visited.has(nr + "," + nc)) continue;
        if (adjToForbidCenter(n, nr, nc, center, forbid)) continue;
        // a shortcut adjacency (touching another visited cell) opens the board up
        // and makes the puzzle harder — allow it sometimes; the counter culls
        // any board that ends up with more than one solution.
        if (vnbr(n, nr, nc, h[0], h[1], visited) > 0 && rng() >= loose) continue;
        opts.push([ai, [nr, nc]]);
      }
    });
    if (!opts.length) break;
    const [ai, cell] = opts[(rng() * opts.length) | 0];
    arms[ai].push(cell); visited.add(cell[0] + "," + cell[1]); added++;
  }
  return arms;
}
function vnbr(n, r, c, exR, exC, visited) {
  return NB4.reduce((a, [dr, dc]) => { const nr = r + dr, nc = c + dc; if (nr === exR && nc === exC) return a; return a + (inb(n, nr, nc) && visited.has(nr + "," + nc) ? 1 : 0); }, 0);
}
function freeAround(n, r, c, center, visited, forbid) {
  // a start cell of an arm may only touch its center among visited cells
  return NB4.every(([dr, dc]) => { const nr = r + dr, nc = c + dc; if (nr === center[0] && nc === center[1]) return true; if (!inb(n, nr, nc)) return true; return !visited.has(nr + "," + nc) && !forbid.has(nr + "," + nc); });
}
function adjToForbidCenter(n, r, c, center, forbid) {
  // new cells must never sit next to another junction/emitter centre we protect
  return NB4.some(([dr, dc]) => { const nr = r + dr, nc = c + dc; return forbid.has(nr + "," + nc); });
}
const cellsOfArms = (arms) => arms.flat();
const armEnd = (arm) => arm[arm.length - 1];
function levelWalls(n, visited) { const w = []; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!visited.has(r + "," + c)) w.push([r, c]); return w; }

/* Build a single-junction level (2 emitters + 1 secondary circle). */
export function buildJunctionLevel(n, rng, spec = {}) {
  const J = [1 + ((rng() * (n - 2)) | 0), 1 + ((rng() * (n - 2)) | 0)];
  const visited = new Set([J[0] + "," + J[1]]);
  const arms = growArms(n, rng, J, 3, visited, null, null, spec.looseness);
  if (!arms || arms.length < 3) return null;
  if (visited.size < (spec.minCells || 10)) return null;
  const sec = SECS[(rng() * 3) | 0], [p1, p2] = COMP[sec];
  const o = shuffle([0, 1, 2], rng);
  const sq = [[p1, ...armEnd(arms[o[0]])], [p2, ...armEnd(arms[o[1]])]];
  const ci = [[sec, ...armEnd(arms[o[2]])]];
  const paint = new Map([[J[0] + "," + J[1], sec]]);
  arms[o[0]].forEach((c) => paint.set(c[0] + "," + c[1], p1));
  arms[o[1]].forEach((c) => paint.set(c[0] + "," + c[1], p2));
  arms[o[2]].forEach((c) => paint.set(c[0] + "," + c[1], sec));
  return { n, sq, ci, walls: levelWalls(n, visited), paint, junctions: [J] };
}

/* Build a fork level: one emitter (p) forks into two junctions, each mixing with
   another primary into a secondary. 3 emitters, 2 secondary circles. */
export function buildForkLevel(n, rng, spec = {}) {
  const E = [1 + ((rng() * (n - 2)) | 0), 1 + ((rng() * (n - 2)) | 0)];
  const visited = new Set([E[0] + "," + E[1]]);
  const lo = spec.looseness || 0;
  const legMax = 2 + ((rng() * Math.max(2, (n - 3))) | 0);   // keep E's legs short so the junctions have room
  const legs = growArms(n, rng, E, 2, visited, null, legMax, lo);
  if (!legs || legs.length < 2 || legs.some((l) => l.length < 2)) return null;
  const J1 = armEnd(legs[0]), J2 = armEnd(legs[1]);
  if (Math.abs(J1[0] - J2[0]) + Math.abs(J1[1] - J2[1]) <= 1) return null;   // junctions must not touch
  const forbid = new Set([E[0] + "," + E[1]]);           // protect the emitter cell from stray adjacency
  const a1 = growArms(n, rng, J1, 2, visited, forbid, null, lo);   // J1: q1 feeder + blend
  if (!a1 || a1.length < 2) return null;
  const a2 = growArms(n, rng, J2, 2, visited, forbid, null, lo);   // J2: q2 feeder + blend
  if (!a2 || a2.length < 2) return null;
  if (visited.size < (spec.minCells || 12)) return null;
  const p = PRIMS[(rng() * 3) | 0];
  const others = shuffle(PRIMS.filter((x) => x !== p), rng);
  const q1 = others[0], q2 = others[1];
  const sec1 = mix(p, q1), sec2 = mix(p, q2);
  const [f1, b1] = shuffle(a1.slice(), rng);             // which J1 arm is the feeder vs the blend
  const [f2, b2] = shuffle(a2.slice(), rng);
  const sq = [[p, E[0], E[1]], [q1, ...armEnd(f1)], [q2, ...armEnd(f2)]];
  const ci = [[sec1, ...armEnd(b1)], [sec2, ...armEnd(b2)]];
  const paint = new Map([[E[0] + "," + E[1], p], [J1[0] + "," + J1[1], sec1], [J2[0] + "," + J2[1], sec2]]);
  legs[0].forEach((c) => paint.set(c[0] + "," + c[1], p));
  legs[1].forEach((c) => paint.set(c[0] + "," + c[1], p));
  f1.forEach((c) => paint.set(c[0] + "," + c[1], q1));
  b1.forEach((c) => paint.set(c[0] + "," + c[1], sec1));
  f2.forEach((c) => paint.set(c[0] + "," + c[1], q2));
  b2.forEach((c) => paint.set(c[0] + "," + c[1], sec2));
  return { n, sq, ci, walls: levelWalls(n, visited), paint, junctions: [J1, J2] };
}

/* Generate a clean single-emitter level with COLOUR GATES for challenge.
   The board is (near-)full — no maze of walls. Gates pin a colour onto some
   pipe cells, which the player must satisfy while filling the board. Uniqueness
   is not required; we report the solution count so difficulty can be tuned.
   spec: {n, type:"junction"|"fork", looseness, minOpen, gates|gateFrac, gateBudget} */
export function genGate(spec, rng) {
  const build = spec.type === "fork" ? buildForkLevel : buildJunctionLevel;
  const lo = spec.looseness == null ? 0.85 : spec.looseness;
  for (let attempt = 0; attempt < (spec.tries || 800); attempt++) {
    const L = build(spec.n, rng, { ...spec, looseness: lo });
    if (!L) continue;
    const open = spec.n * spec.n - L.walls.length;
    if (spec.minOpen && open < spec.minOpen) continue;    // prefer near-full boards
    // gate candidates: painted FIELD cells (not emitter / circle / junction)
    const skip = new Set();
    L.sq.forEach(([, r, c]) => skip.add(r + "," + c));
    L.ci.forEach(([, r, c]) => skip.add(r + "," + c));
    (L.junctions || []).forEach(([r, c]) => skip.add(r + "," + c));
    const prim = [], sec = [];
    for (const [k, col] of L.paint) { if (skip.has(k)) continue; const [r, c] = k.split(",").map(Number);
      (SECS.includes(col) ? sec : prim).push([col, r, c]); }
    if (!sec.length && !prim.length) continue;
    // FEW gates, SPREAD OUT (no two adjacent), secondary-first so mixing is the puzzle.
    const want = spec.gates != null ? spec.gates : 3;
    const cand = [...shuffle(sec, rng), ...shuffle(prim, rng)];
    const gates = [], gkey = new Set();
    for (const g of cand) {
      if (gates.length >= want) break;
      let adj = false; for (const h of gates) if (Math.abs(h[1] - g[1]) + Math.abs(h[2] - g[2]) === 1) { adj = true; break; }
      if (adj) continue;
      gates.push(g); gkey.add(g[1] + "," + g[2]);
    }
    if (gates.length < want) continue;                  // couldn't place enough spread-out gates
    const out = { n: L.n, sq: L.sq, ci: L.ci, walls: L.walls, gates };
    // uniqueness isn't required, so counting is OFF by default (it's the slow part on
    // open boards). Only measure when asked, and only reject if a cap is set.
    let solutions = null, capped = false;
    if (spec.measure) { const res = countSolutions(out, spec.solCap || 4, spec.gateBudget || 200000);
      solutions = res.aborted ? null : res.count; capped = res.capped;
      if (spec.maxSolutions && (res.aborted || res.count > spec.maxSolutions)) continue; }
    return { L: out, open, solutions, capped };
  }
  return null;
}

/* Generate ONE unique single-emitter level for a spec.
   spec.type: "junction" (2 emitters, 1 secondary) | "fork" (3 emitters, 2 secondaries). */
export function genSpider(spec, rng, budget = 150000) {
  const build = spec.type === "fork" ? buildForkLevel : buildJunctionLevel;
  for (let attempt = 0; attempt < (spec.tries || 500); attempt++) {
    const L = build(spec.n, rng, spec);
    if (!L) continue;
    const open = spec.n * spec.n - L.walls.length;
    if (spec.minOpen && open < spec.minOpen) continue;
    if (spec.maxOpen && open > spec.maxOpen) continue;
    const res = countSolutions(L, 2, budget);
    if (!res.aborted && res.count === 1) return { L, res, open };
  }
  return null;
}
