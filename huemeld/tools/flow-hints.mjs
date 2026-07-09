/* Derive, from a level's unique solution edge-set, the delivery structure that
   feeds each circle — used to bake per-level hints into the game. For a primary
   circle that's the source->circle path; for a secondary circle it's the two
   feeder paths + the blend path meeting at the junction. Returned as a list of
   cells per target (target listed first). */
const PRIMS = new Set(["R", "Y", "B"]);
const SECS = new Set(["O", "G", "P"]);

export function deliveriesByTarget(L, edges) {
  const key = (r, c) => r + "," + c;
  const adj = new Map();
  const push = (r, c, r2, c2, col) => { const k = key(r, c); if (!adj.has(k)) adj.set(k, []); adj.get(k).push({ to: [r2, c2], col }); };
  for (const e of edges) { push(e.r1, e.c1, e.r2, e.c2, e.col); push(e.r2, e.c2, e.r1, e.c1, e.col); }
  const type = new Map();
  for (const [col, r, c] of L.sq) type.set(key(r, c), { kind: "S", col });
  for (const [col, r, c] of L.ci) type.set(key(r, c), { kind: "C", col });
  const isJunction = (r, c) => (adj.get(key(r, c)) || []).length === 3 && !type.has(key(r, c));

  // trace a monochromatic simple path from an endpoint along `col` to the far end
  function trace(sr, sc, col) {
    const path = [[sr, sc]]; let pr = -1, pc = -1, r = sr, c = sc;
    for (let g = 0; g < 400; g++) {
      const nb = (adj.get(key(r, c)) || []).filter((x) => x.col === col && !(x.to[0] === pr && x.to[1] === pc));
      if (!nb.length) break;
      const [nr, nc] = nb[0].to; path.push([nr, nc]); pr = r; pc = c; r = nr; c = nc;
    }
    return path;
  }

  const out = [];
  for (const [col, tr, tc] of L.ci) {
    const legs = adj.get(key(tr, tc)) || [];
    if (PRIMS.has(col)) {
      // trace back to the source
      const p = trace(tr, tc, col);
      out.push({ col, r: tr, c: tc, cells: p });
    } else {
      // secondary: the single edge leads to the junction along the blend
      const blend = trace(tr, tc, col);                 // circle ... junction
      const J = blend[blend.length - 1];
      const jl = adj.get(key(J[0], J[1])) || [];
      const feeders = jl.filter((x) => PRIMS.has(x.col));
      const f1 = trace(J[0], J[1], feeders[0].col);      // J ... source1
      const f2 = trace(J[0], J[1], feeders[1].col);      // J ... source2
      // union of cells (target first), de-duped, keeping order target->J then feeders
      const seen = new Set(); const cells = [];
      for (const seg of [blend, f1.slice(1), f2.slice(1)]) for (const [r, c] of seg) { const k = key(r, c); if (!seen.has(k)) { seen.add(k); cells.push([r, c]); } }
      out.push({ col, r: tr, c: tc, cells });
    }
  }
  return out;
}
