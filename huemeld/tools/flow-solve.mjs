/* Huemeld Flow 2 — exact solution counter.

   Ruleset (matches flow2.html):
   - Board is an N×N grid; some cells are walls (impassable, need not be painted).
   - SQUARES are primary paint sources, colour ∈ {R,Y,B}. A square sends out
     1..4 legs (simple pipe paths). All legs of a square share only the square
     cell (fork-at-source only — no branching mid-pipe), so a square's pipes form
     a tree rooted at the square.
   - A leg of colour p ends either at a same-colour primary CIRCLE, or at a
     JUNCTION cell where it meets one leg of a DIFFERENT primary q. The junction
     mixes p+q into a secondary sec, and a single blend leg of colour sec runs
     from the junction to a matching secondary CIRCLE.
   - CIRCLES (targets) are receivers, colour ∈ {R,Y,B,O,G,P}. Each is the single
     endpoint of exactly one pipe of its colour.
   - WIN: every circle fed, no loose ends, and EVERY non-wall cell painted.

   We model a solved board as a set of coloured edges between orthogonally
   adjacent non-wall cells and count distinct edge-layouts (two solutions differ
   iff their coloured-edge sets differ). Local per-cell rules + a global
   per-colour component check capture exactly the valid solved states.  */

const PRIMS = ["R", "Y", "B"];
const SECS = ["O", "G", "P"];
const ALL = ["R", "Y", "B", "O", "G", "P"];
// mix(a,b): sort then map (matches flow2 MIXMAP + mixOf)
const MIX = { BR: "P", BY: "G", RY: "O" };
function mix(a, b) { return MIX[[a, b].sort().join("")] || null; }
// constituent primaries of a secondary
const COMP = { O: ["R", "Y"], G: ["B", "Y"], P: ["B", "R"] };

/* Build an internal model from a level {n, sq, ci, walls}. */
function buildModel(L) {
  const n = L.n;
  const wall = Array.from({ length: n }, () => new Array(n).fill(false));
  (L.walls || []).forEach(([r, c]) => { wall[r][c] = true; });
  // cell type: {kind:'S'|'C'|'F', col?}
  const type = Array.from({ length: n }, () => new Array(n).fill(null));
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!wall[r][c]) type[r][c] = { kind: "F" };
  (L.sq || []).forEach(([col, r, c]) => { type[r][c] = { kind: "S", col }; });
  (L.ci || []).forEach(([col, r, c]) => { type[r][c] = { kind: "C", col }; });

  // allowed colours an ON edge incident to a cell may carry
  function allowed(r, c) {
    const t = type[r][c];
    if (!t) return new Set();
    if (t.kind === "S") return new Set([t.col]);       // source emits only its primary
    if (t.kind === "C") return new Set([t.col]);       // circle receives only its own colour
    return new Set(ALL);                               // field: any colour
  }
  const allow = Array.from({ length: n }, (_, r) => new Array(n).fill(null).map((_, c) => allowed(r, c)));
  // GATES: a gate cell is a field pipe forced to carry one colour (it can't be an
  // emitter/circle). Restricting its allowed edge-colours makes it a degree-2 pipe
  // of that colour — the junction pattern (3 different colours) can't apply.
  (L.gates || []).forEach(([col, r, c]) => { if (type[r][c] && type[r][c].kind === "F") allow[r][c] = new Set([col]); });
  return { n, wall, type, allow };
}

/* Count solutions of a level, stopping once `cap` is reached (default 2 — enough
   to decide uniqueness). Returns {count, nodes, capped, aborted}. `budget` caps
   search nodes; if exceeded we abort (caller treats as "reject / too hard"). */
export function countSolutions(L, cap = 2, budget = 4_000_000) {
  const { n, wall, type, allow } = buildModel(L);

  // edge storage: horizontal H[r][c] = edge between (r,c)-(r,c+1); vertical V[r][c] = (r,c)-(r+1,c).
  // value: null = OFF, else a colour char.
  const H = Array.from({ length: n }, () => new Array(n).fill(null));
  const V = Array.from({ length: n }, () => new Array(n).fill(null));

  function passable(r, c) { return r >= 0 && c >= 0 && r < n && c < n && !wall[r][c]; }

  // incident ON edges of a cell (after assignment) → array of colours
  function incident(r, c) {
    const out = [];
    if (c > 0 && H[r][c - 1]) out.push(H[r][c - 1]);         // left
    if (c < n - 1 && H[r][c]) out.push(H[r][c]);             // right
    if (r > 0 && V[r - 1][c]) out.push(V[r - 1][c]);         // up
    if (r < n - 1 && V[r][c]) out.push(V[r][c]);             // down
    return out;
  }

  // validate a cell once all four of its incident edges are decided
  function cellOK(r, c) {
    const t = type[r][c];
    const cols = incident(r, c);
    const deg = cols.length;
    if (t.kind === "S") {
      // 0..4 legs, all the source colour (edge-colour rule already guarantees colour)
      return deg <= 4;
    }
    if (t.kind === "C") {
      return deg === 1 && cols[0] === t.col;                // exactly one pipe of its colour
    }
    // field: degree 2 (a pipe, both edges same colour) or degree 3 (a junction)
    if (deg === 2) return cols[0] === cols[1];
    if (deg === 3) {
      // a junction: colours must be {p1,p2,sec} with sec = mix(p1,p2)
      const secOnes = cols.filter((x) => SECS.includes(x));
      if (secOnes.length !== 1) return false;
      const sec = secOnes[0];
      const prims = cols.filter((x) => PRIMS.includes(x)).sort();
      const want = COMP[sec].slice().sort();
      return prims.length === 2 && prims[0] === want[0] && prims[1] === want[1];
    }
    return false;   // degree 0 (uncovered field), 1 (loose end) or 4 (crossing) — invalid
  }

  // final global check: per-colour components must be valid trees/paths with proper terminals
  function globalOK() {
    // adjacency limited to a single colour
    const idx = (r, c) => r * n + c;
    for (const col of ALL) {
      const isSec = SECS.includes(col);
      // collect cells that touch a col-edge, and build union of col-edges
      const seen = new Array(n * n).fill(false);
      const colDeg = new Array(n * n).fill(0);
      const nodes = [];
      function addEdge(a, b) { colDeg[a]++; colDeg[b]++; }
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (c < n - 1 && H[r][c] === col) addEdge(idx(r, c), idx(r, c + 1));
        if (r < n - 1 && V[r][c] === col) addEdge(idx(r, c), idx(r + 1, c));
      }
      // components via BFS over col-edges
      const comp = new Array(n * n).fill(-1);
      let anyEdge = false;
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const id = idx(r, c);
        if (colDeg[id] === 0 || comp[id] !== -1) continue;
        // BFS this component
        let stack = [id]; comp[id] = id;
        const members = [];
        let edgeCount = 0;
        while (stack.length) {
          const u = stack.pop(); members.push(u);
          const ur = (u / n) | 0, uc = u % n;
          const nb = [];
          if (uc > 0 && H[ur][uc - 1] === col) nb.push(idx(ur, uc - 1));
          if (uc < n - 1 && H[ur][uc] === col) nb.push(idx(ur, uc + 1));
          if (ur > 0 && V[ur - 1][uc] === col) nb.push(idx(ur - 1, uc));
          if (ur < n - 1 && V[ur][uc] === col) nb.push(idx(ur + 1, uc));
          for (const v of nb) { edgeCount++; if (comp[v] === -1) { comp[v] = id; stack.push(v); } }
        }
        edgeCount /= 2; anyEdge = true;
        // TREE test: a valid component is a tree → edges === members-1
        if (edgeCount !== members.length - 1) return false;   // has a monochromatic cycle
        // classify endpoints (degree-1 members)
        let sources = 0, priCircles = 0, junctions = 0, secCircles = 0, fieldLeaves = 0, otherLeaves = 0;
        let interiorSources = 0;
        for (const u of members) {
          const ur = (u / n) | 0, uc = u % n, t = type[ur][uc], d = colDeg[u];
          if (t.kind === "S") { if (d !== 1) { if (isSec) return false; interiorSources++; } sources++; }
          if (d !== 1) continue; // only inspect leaves for terminal typing below
          if (t.kind === "S") { /* source leaf, counted above */ }
          else if (t.kind === "C") { if (isSec) secCircles++; else priCircles++; }
          else { // field leaf — must be a junction cell (which is a leaf in every colour it carries)
            const inc = incident(ur, uc);
            if (inc.length === 3) junctions++; else fieldLeaves++;
          }
        }
        if (fieldLeaves > 0) return false;                    // a dangling pipe end
        if (isSec) {
          // blend path: exactly one junction end + one secondary-circle end, simple path
          if (junctions !== 1 || secCircles !== 1) return false;
          if (interiorSources) return false;
        } else {
          // primary tree: exactly one source, every other leaf a matching circle or junction
          if (sources !== 1) return false;
          // leaves that aren't the source must be prim-circle or junction; fieldLeaves already 0
        }
      }
      void anyEdge; void seen; void nodes;
    }
    return true;
  }

  // COUNTERS (tally tiles): exactly nv cells of the 3×3 block around (and
  // including) the counter wear colour col. Matches the engine's rule: a cell
  // "wears" its emitter/circle colour, a junction wears its blend, a pipe its
  // paint. Checked on complete assignments.
  const counters = L.counts || [];
  function wornColour(r, c) {
    if (!passable(r, c)) return null;
    const t = type[r][c];
    if (t.kind === "S" || t.kind === "C") return t.col;
    const cols = incident(r, c);
    if (cols.length === 2) return cols[0];
    if (cols.length === 3) return cols.find((x) => SECS.includes(x)) || null;   // a junction wears its blend
    return null;
  }
  function countersOK() {
    for (const [col, nv, r, c] of counters) {
      let k = 0;
      for (let dr = -1; dr <= 1; dr++) for (let dc = -1; dc <= 1; dc++) {
        if (wornColour(r + dr, c + dc) === col) k++;
      }
      if (k !== nv) return false;
    }
    return true;
  }

  // Order of decisions: for each cell row-major, decide its right edge then its
  // down edge, then (its up/left already decided) validate the cell.
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!wall[r][c]) cells.push([r, c]);

  let count = 0, nodes = 0, aborted = false;

  // colour options for an edge between two passable cells
  function edgeColours(r1, c1, r2, c2) {
    const a = allow[r1][c1], b = allow[r2][c2];
    const out = [];
    for (const x of a) if (b.has(x)) out.push(x);
    return out;
  }

  // per-colour union-find over cells (colour c owns ids c*NN.. ) with a rollback
  // log — turning an edge ON that joins two cells already connected in that colour
  // means a monochromatic cycle, which is always illegal. Prune it immediately
  // instead of only catching it at the end.
  const NN = n * n, CI = { R: 0, Y: 1, B: 2, O: 3, G: 4, P: 5 };
  const parent = new Int32Array(6 * NN);
  for (let i = 0; i < parent.length; i++) parent[i] = i;
  const ufLog = [];
  function find(x) { while (parent[x] !== x) x = parent[x]; return x; }
  // returns false on cycle; else unions and logs
  function join(col, a, b) {
    const base = CI[col] * NN, ra = find(base + a), rb = find(base + b);
    if (ra === rb) return false;
    parent[rb] = ra; ufLog.push(rb);
    return true;
  }
  function rollback(mark) { while (ufLog.length > mark) { const x = ufLog.pop(); parent[x] = x; } }

  // forward feasibility prune: each non-wall cell has a fixed number of possible
  // edges (maxDeg). Track how many are committed ON/OFF; if a cell can no longer
  // reach its minimum degree (2 for a field cell, 1 for a circle) or already has
  // too many ON, this whole branch is dead. This is what makes open (wall-free)
  // boards tractable to verify.
  const maxDeg = new Int8Array(NN), minReach = new Int8Array(NN), maxOn = new Int8Array(NN);
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
    if (wall[r][c]) continue; const id = r * n + c, t = type[r][c];
    let d = 0; if (passable(r - 1, c)) d++; if (passable(r + 1, c)) d++; if (passable(r, c - 1)) d++; if (passable(r, c + 1)) d++;
    maxDeg[id] = d;
    if (t.kind === "S") { minReach[id] = 0; maxOn[id] = 4; }
    else if (t.kind === "C") { minReach[id] = 1; maxOn[id] = 1; }
    else { minReach[id] = 2; maxOn[id] = 3; }
  }
  const onCnt = new Int8Array(NN), offCnt = new Int8Array(NN), cntLog = [];
  function edgeCount(a, b, on) { if (on) { onCnt[a]++; onCnt[b]++; } else { offCnt[a]++; offCnt[b]++; } cntLog.push(a, b, on ? 1 : 0); }
  function cntRollback(mark) { while (cntLog.length > mark) { const on = cntLog.pop(), b = cntLog.pop(), a = cntLog.pop(); if (on) { onCnt[a]--; onCnt[b]--; } else { offCnt[a]--; offCnt[b]--; } } }
  function feasible(id) { return (maxDeg[id] - offCnt[id]) >= minReach[id] && onCnt[id] <= maxOn[id]; }

  function recurse(ci) {
    if (aborted) return;
    if (count >= cap) return;
    if (++nodes > budget) { aborted = true; return; }
    if (ci === cells.length) {
      if (countersOK() && globalOK()) count++;
      return;
    }
    const [r, c] = cells[ci];
    const rid = r * n + c;
    const hasRight = c < n - 1 && passable(r, c + 1);
    const hasDown = r < n - 1 && passable(r + 1, c);
    const rightOpts = hasRight ? [null, ...edgeColours(r, c, r, c + 1)] : [null];
    for (const rc of rightOpts) {
      H[r][c] = rc;
      const ufR = ufLog.length, cntR = cntLog.length;
      if (hasRight) edgeCount(rid, rid + 1, !!rc);
      if (rc && !join(rc, rid, rid + 1)) { rollback(ufR); cntRollback(cntR); H[r][c] = null; continue; }
      if (hasRight && !feasible(rid + 1)) { rollback(ufR); cntRollback(cntR); H[r][c] = null; continue; }
      const downOpts = hasDown ? [null, ...edgeColours(r, c, r + 1, c)] : [null];
      for (const dc of downOpts) {
        V[r][c] = dc;
        const ufD = ufLog.length, cntD = cntLog.length;
        if (hasDown) edgeCount(rid, rid + n, !!dc);
        if (dc && !join(dc, rid, rid + n)) { rollback(ufD); cntRollback(cntD); V[r][c] = null; continue; }
        // rid is now fully decided; check its rule + feasibility, and the down neighbour's feasibility
        if (feasible(rid) && (!hasDown || feasible(rid + n)) && cellOK(r, c)) recurse(ci + 1);
        rollback(ufD); cntRollback(cntD); V[r][c] = null;
        if (count >= cap || aborted) { rollback(ufR); cntRollback(cntR); H[r][c] = null; return; }
      }
      rollback(ufR); cntRollback(cntR);
      H[r][c] = null;
    }
  }

  recurse(0);
  return { count, nodes, capped: count >= cap, aborted };
}

/* Convenience: is this level uniquely solvable? */
export function isUnique(L, budget) {
  const r = countSolutions(L, 2, budget);
  return { unique: !r.aborted && r.count === 1, ...r };
}

/* Find ONE solution and return its coloured edges as a list of
   {r1,c1,r2,c2,col}. Returns null if none found within budget. Used to replay a
   solution through the real game engine for end-to-end verification. */
export function findOneSolution(L, budget = 2_000_000) {
  const { n, wall, type, allow } = buildModel(L);
  const H = Array.from({ length: n }, () => new Array(n).fill(null));
  const V = Array.from({ length: n }, () => new Array(n).fill(null));
  const passable = (r, c) => r >= 0 && c >= 0 && r < n && c < n && !wall[r][c];
  const cells = [];
  for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (!wall[r][c]) cells.push([r, c]);

  // reuse the same local + global validators via a fresh countSolutions-style walk,
  // but capture edges on first full acceptance.
  const PRIMSL = ["R", "Y", "B"], SECSL = ["O", "G", "P"];
  function incident(r, c) {
    const out = [];
    if (c > 0 && H[r][c - 1]) out.push(H[r][c - 1]);
    if (c < n - 1 && H[r][c]) out.push(H[r][c]);
    if (r > 0 && V[r - 1][c]) out.push(V[r - 1][c]);
    if (r < n - 1 && V[r][c]) out.push(V[r][c]);
    return out;
  }
  function cellOK(r, c) {
    const t = type[r][c], cols = incident(r, c), deg = cols.length;
    if (t.kind === "S") return deg <= 4;
    if (t.kind === "C") return deg === 1 && cols[0] === t.col;
    if (deg === 2) return cols[0] === cols[1];
    if (deg === 3) {
      const sec = cols.filter((x) => SECSL.includes(x));
      if (sec.length !== 1) return false;
      const want = COMP[sec[0]].slice().sort();
      const prims = cols.filter((x) => PRIMSL.includes(x)).sort();
      return prims.length === 2 && prims[0] === want[0] && prims[1] === want[1];
    }
    return false;
  }
  // reuse the exported counter's global validator by re-counting on a snapshot is
  // overkill; instead accept the first full assignment that countSolutions would.
  // We piggyback on countSolutions by re-deriving: simplest is a local DFS mirroring it.
  const NN = n * n, CIx = { R: 0, Y: 1, B: 2, O: 3, G: 4, P: 5 };
  const parent = new Int32Array(6 * NN); for (let i = 0; i < parent.length; i++) parent[i] = i;
  const ufLog = [];
  const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
  const join = (col, a, b) => { const base = CIx[col] * NN, ra = find(base + a), rb = find(base + b); if (ra === rb) return false; parent[rb] = ra; ufLog.push(rb); return true; };
  const rollback = (m) => { while (ufLog.length > m) { const x = ufLog.pop(); parent[x] = x; } };
  function edgeColours(r1, c1, r2, c2) { const a = allow[r1][c1], b = allow[r2][c2]; const o = []; for (const x of a) if (b.has(x)) o.push(x); return o; }

  let found = null, nodes = 0;
  // reuse the global validity check from countSolutions by calling it on a rebuilt level? No —
  // replicate the same globalOK by leveraging countSolutions on the completed grid would loop.
  // Instead, when a full assignment passes cellOK for all cells and has no monochromatic cycle
  // (guaranteed by union-find), verify terminals with a direct check identical to countSolutions.
  const sol012 = (Lx) => countSolutions(Lx, 1, budget); // not used; placeholder to keep imports tidy
  void sol012;

  function globalOK() {
    // identical to countSolutions.globalOK
    const idx = (r, c) => r * n + c;
    for (const col of ["R", "Y", "B", "O", "G", "P"]) {
      const isSec = SECSL.includes(col);
      const colDeg = new Array(NN).fill(0);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        if (c < n - 1 && H[r][c] === col) { colDeg[idx(r, c)]++; colDeg[idx(r, c + 1)]++; }
        if (r < n - 1 && V[r][c] === col) { colDeg[idx(r, c)]++; colDeg[idx(r + 1, c)]++; }
      }
      const comp = new Array(NN).fill(-1);
      for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
        const id = idx(r, c); if (colDeg[id] === 0 || comp[id] !== -1) continue;
        let stack = [id]; comp[id] = id; const members = []; let ec = 0;
        while (stack.length) { const u = stack.pop(); members.push(u); const ur = (u / n) | 0, uc = u % n;
          const nb = [];
          if (uc > 0 && H[ur][uc - 1] === col) nb.push(idx(ur, uc - 1));
          if (uc < n - 1 && H[ur][uc] === col) nb.push(idx(ur, uc + 1));
          if (ur > 0 && V[ur - 1][uc] === col) nb.push(idx(ur - 1, uc));
          if (ur < n - 1 && V[ur][uc] === col) nb.push(idx(ur + 1, uc));
          for (const v of nb) { ec++; if (comp[v] === -1) { comp[v] = id; stack.push(v); } } }
        ec /= 2; if (ec !== members.length - 1) return false;
        let sources = 0, junctions = 0, secCircles = 0, fieldLeaves = 0, interiorSources = 0;
        for (const u of members) { const ur = (u / n) | 0, uc = u % n, t = type[ur][uc], d = colDeg[u];
          if (t.kind === "S") { if (d !== 1) { if (isSec) return false; interiorSources++; } sources++; }
          if (d !== 1) continue;
          if (t.kind === "C") { if (isSec) secCircles++; }
          else if (t.kind !== "S") { const inc = incident(ur, uc); if (inc.length === 3) junctions++; else fieldLeaves++; } }
        if (fieldLeaves > 0) return false;
        if (isSec) { if (junctions !== 1 || secCircles !== 1 || interiorSources) return false; }
        else { if (sources !== 1) return false; }
      }
    }
    return true;
  }

  function recurse(ci) {
    if (found || nodes++ > budget) return;
    if (ci === cells.length) { if (globalOK()) { found = snapshot(); } return; }
    const [r, c] = cells[ci], rid = r * n + c;
    const rightOpts = (c < n - 1 && passable(r, c + 1)) ? [null, ...edgeColours(r, c, r, c + 1)] : [null];
    for (const rc of rightOpts) {
      H[r][c] = rc; const mR = ufLog.length;
      if (rc && !join(rc, rid, r * n + c + 1)) { rollback(mR); H[r][c] = null; continue; }
      const downOpts = (r < n - 1 && passable(r + 1, c)) ? [null, ...edgeColours(r, c, r + 1, c)] : [null];
      for (const dc of downOpts) {
        V[r][c] = dc; const mD = ufLog.length;
        if (dc && !join(dc, rid, (r + 1) * n + c)) { rollback(mD); V[r][c] = null; continue; }
        if (cellOK(r, c)) recurse(ci + 1);
        rollback(mD); V[r][c] = null;
        if (found) { rollback(mR); H[r][c] = null; return; }
      }
      rollback(mR); H[r][c] = null;
    }
  }
  function snapshot() {
    const edges = [];
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) {
      if (c < n - 1 && H[r][c]) edges.push({ r1: r, c1: c, r2: r, c2: c + 1, col: H[r][c] });
      if (r < n - 1 && V[r][c]) edges.push({ r1: r, c1: c, r2: r + 1, c2: c, col: V[r][c] });
    }
    return edges;
  }
  recurse(0);
  return found;
}
