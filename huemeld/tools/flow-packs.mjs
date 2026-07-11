/* Side puzzle packs — one new mechanic each, built on the constructive
   single-emitter generators. Every level carries `gest`, the exact replayable
   gesture paths of its constructed solution, so the engine-replay verifier can
   prove it winnable end to end.

   Packs (draft: 10 levels each, first 5 will be the free teaser in the app):
     brown   — mix ALL THREE primaries: secondary + missing primary -> browN
     arrows  — directional gates: the colour must cross the gate the arrow's way
     ice     — frozen cells a line may only pass straight through
     portals — a paired warp: a line entering one end exits the other */
import { buildJunctionLevel, buildForkLevel, buildChainLevel, buildPrismLevel, mulberry32 } from "./flow-gen2.mjs";

const SECS = ["O", "G", "P"];
const key = (r, c) => r + "," + c;
function shuffle(arr, rng) { for (let i = arr.length - 1; i > 0; i--) { const j = (rng() * (i + 1)) | 0; const t = arr[i]; arr[i] = arr[j]; arr[j] = t; } return arr; }

/* interior cells of the solution's gesture paths, with their in/out step vectors */
function pathInteriors(gest) {
  const out = [];
  for (const path of gest) for (let i = 1; i < path.length - 1; i++) {
    const [pr, pc] = path[i - 1], [r, c] = path[i], [nr, nc] = path[i + 1];
    if (Math.abs(pr - r) + Math.abs(pc - c) !== 1) continue;   // don't anchor on a portal jump
    if (Math.abs(nr - r) + Math.abs(nc - c) !== 1) continue;
    out.push({ r, c, din: [r - pr, c - pc], dout: [nr - r, nc - c] });
  }
  return out;
}
const DIRL = (v) => (v[0] === -1 ? "U" : v[0] === 1 ? "D" : v[1] === -1 ? "L" : "R");

/* cells no gate/ice may use: endpoints + junctions (and neighbours of endpoints) */
function keepOut(L, nearEnds) {
  const skip = new Set();
  L.sq.forEach(([, r, c]) => skip.add(key(r, c)));
  L.ci.forEach(([, r, c]) => skip.add(key(r, c)));
  (L.junctions || []).forEach(([r, c]) => skip.add(key(r, c)));
  if (nearEnds) [...L.sq, ...L.ci].forEach(([, r, c]) => { skip.add(key(r + 1, c)); skip.add(key(r - 1, c)); skip.add(key(r, c + 1)); skip.add(key(r, c - 1)); });
  return skip;
}
function spreadPick(cands, want, rng) {
  const picked = [];
  for (const g of shuffle(cands.slice(), rng)) {
    if (picked.length >= want) break;
    if (picked.some((h) => Math.abs(h.r - g.r) + Math.abs(h.c - g.c) === 1)) continue;
    picked.push(g);
  }
  return picked.length >= want ? picked : null;
}

/* ---- per-pack level makers (return {lv, gest} or null) ---- */

/* place `spec.gates` colour gates on the solution (first `spec.arrows` of them
   directional), keeping clear of endpoints, junctions, prisms + any `extra` cells */
function placeGates(L, spec, rng, extra) {
  const skip = keepOut(L, true);
  (L.prisms || []).forEach(([, r, c]) => { skip.add(key(r, c));
    [[1, 0], [-1, 0], [0, 1], [0, -1]].forEach(([dr, dc]) => skip.add(key(r + dr, c + dc))); });
  if (extra) extra.forEach((k2) => skip.add(k2));
  const cands = pathInteriors(L.gest).filter((x) => !skip.has(key(x.r, x.c)));
  const picked = spreadPick(cands, spec.gates, rng);
  if (!picked) return null;
  return picked.map((x, i) => {
    const col = L.paint.get(key(x.r, x.c));
    return (spec.arrows && i < spec.arrows) ? [col, x.r, x.c, DIRL(x.din)] : [col, x.r, x.c];
  });
}

const NB8 = [[-1, -1], [-1, 0], [-1, 1], [0, -1], [0, 1], [1, -1], [1, 0], [1, 1]];
/* counter tiles: EXACTLY n of the 8 neighbours wear colour col, stamped from the
   constructed solution so they're satisfiable by construction. spec.zeros allows
   the occasional "0 of this colour touches me" clue. */
function placeCounters(L, spec, rng, mech) {
  const skip = keepOut(L, false);
  if (mech) mech.forEach((k2) => skip.add(k2));
  (L.prisms || []).forEach(([, r, c]) => skip.add(key(r, c)));
  const wallSet = new Set(L.walls.map(([r, c]) => key(r, c)));
  const bridgeSet = new Set((L.bridges || []).map(([r, c]) => key(r, c)));
  const open = [];
  for (const [k2] of L.paint) { if (!skip.has(k2)) open.push(k2.split(",").map(Number)); }
  // WALL clues: a number carved into the rock — the clue costs no playable cell.
  // Preferred whenever a wall has enough painted neighbours to say something.
  const wallCand = [];
  for (const [r, c] of L.walls) {
    let touch = 0;
    for (const [dr, dc] of NB8) if (L.paint.has(key(r + dr, c + dc))) touch++;
    if (touch >= 2) wallCand.push([r, c]);
  }
  const picked = [];
  for (const [r, c] of [...shuffle(wallCand, rng), ...shuffle(open, rng)]) {
    if (picked.length >= spec.counts) break;
    if (picked.some((p) => Math.abs(p[2] - r) <= 1 && Math.abs(p[3] - c) <= 1)) continue;   // spread out
    // a bridge neighbour wears two colours at once — don't count near one
    let nearBridge = false;
    const hood = {};
    for (const [dr, dc] of NB8) {
      const rr = r + dr, cc = c + dc;
      if (rr < 0 || cc < 0 || rr >= L.n || cc >= L.n || wallSet.has(key(rr, cc))) continue;
      if (bridgeSet.has(key(rr, cc))) { nearBridge = true; break; }
      const pc = L.paint.get(key(rr, cc));
      if (pc) hood[pc] = (hood[pc] || 0) + 1;
    }
    if (nearBridge) continue;
    let col = null, nv = 0;
    if (spec.zeros && rng() < 0.25) {
      const absent = ["R", "Y", "B", "O", "G", "P"].filter((x) => !hood[x]);
      if (absent.length) { col = absent[(rng() * absent.length) | 0]; nv = 0; }
    }
    if (col == null) {
      const cols = Object.keys(hood);
      if (!cols.length) continue;
      col = cols[(rng() * cols.length) | 0]; nv = hood[col];
    }
    picked.push([col, nv, r, c]);
  }
  return picked.length >= spec.counts ? picked : null;
}

/* ONE composable maker: any builder (junction/fork/chain/prism), any growth twist
   (portals/bridges), any decoration (gates/arrows/ice/counters) — driven purely by spec. */
const BUILDS = { junction: buildJunctionLevel, fork: buildForkLevel, chain: buildChainLevel, prism: buildPrismLevel };
function makeMix(spec, rng) {
  const build = BUILDS[spec.build || "junction"];
  const L = build(spec.n, rng, { looseness: spec.looseness == null ? 1.0 : spec.looseness, minCells: 12, jump: spec.jump, bridge: spec.bridge });
  if (!L) return null;
  if (spec.n * spec.n - L.walls.length < spec.minOpen) return null;
  if (spec.jump && !(L.portals && L.portals.length >= spec.jump)) return null;
  if (spec.bridge && !(L.bridges && L.bridges.length >= spec.bridge)) return null;
  if (L.portals) {   // no cell may serve two pairs (a chained warp strands the line)
    const seen = new Set();
    for (const [a, b, c, d] of L.portals) for (const k2 of [key(a, b), key(c, d)]) { if (seen.has(k2)) return null; seen.add(k2); }
  }
  // mechanic cells are off-limits to decorations
  const mech = new Set();
  (L.portals || []).forEach(([a, b, c, d]) => { mech.add(key(a, b)); mech.add(key(c, d)); });
  (L.bridges || []).forEach(([r, c]) => mech.add(key(r, c)));
  let gates = [];
  if (spec.gates) { gates = placeGates(L, spec, rng, mech); if (!gates) return null; }
  let ice = null;
  if (spec.ice) {
    const skip = keepOut(L, false);
    mech.forEach((k2) => skip.add(k2));
    (L.prisms || []).forEach(([, r, c]) => skip.add(key(r, c)));
    gates.forEach((g) => skip.add(key(g[1], g[2])));
    const straight = pathInteriors(L.gest).filter((x) => !skip.has(key(x.r, x.c)) && x.din[0] === x.dout[0] && x.din[1] === x.dout[1]);
    const picked = spreadPick(straight, spec.ice, rng);
    if (!picked) return null;
    ice = picked.map((x) => [x.r, x.c]);
  }
  let counts = null;
  if (spec.counts) {
    const used = new Set(mech);
    gates.forEach((g) => used.add(key(g[1], g[2])));
    (ice || []).forEach((ic) => used.add(key(ic[0], ic[1])));
    counts = placeCounters(L, spec, rng, used);
    if (!counts) return null;
  }
  const lv = { n: L.n, sq: L.sq, ci: L.ci, walls: L.walls, gates };
  if (ice) lv.ice = ice;
  if (counts) lv.counts = counts;
  if (L.portals) lv.portals = L.portals;
  if (L.bridges) lv.bridges = L.bridges;
  if (L.prisms) lv.prisms = L.prisms;
  return { lv, gest: L.gest };
}

/* ---- assembly: 25 levels per mechanic pack + the 100-level Medley ---- */
const RAMPS = {
  brown: { name: "Brown", icon: "🟤", desc: "Mix all three primaries", tiers: [
    [8, { build: "chain", n: 5, minOpen: 22 }],
    [8, { build: "chain", n: 6, minOpen: 31 }],
    [4, { build: "chain", n: 7, minOpen: 42 }],
    [6, { build: "chain", n: 7, minOpen: 43 }],
    [6, { build: "chain", n: 7, minOpen: 43, gates: 2 }],
    [6, { build: "chain", n: 6, minOpen: 31, gates: 2 }],
    [6, { build: "chain", n: 7, minOpen: 43, gates: 3 }],
    [6, { build: "chain", n: 8, minOpen: 54 }],
  ] },
  arrows: { name: "Arrows", icon: "➤", desc: "Gates with a direction", tiers: [
    [6, { n: 5, minOpen: 24, gates: 2, arrows: 1, looseness: 0.95 }],
    [6, { n: 6, minOpen: 33, gates: 3, arrows: 2, looseness: 0.95 }],
    [4, { build: "fork", n: 6, minOpen: 31, gates: 3, arrows: 2, looseness: 0.95 }],
    [4, { build: "fork", n: 7, minOpen: 44, gates: 4, arrows: 3, looseness: 0.95 }],
    [6, { build: "fork", n: 7, minOpen: 44, gates: 5, arrows: 4, looseness: 0.95 }],
    [6, { build: "fork", n: 7, minOpen: 45, gates: 6, arrows: 5, looseness: 0.95 }],
    [6, { build: "fork", n: 6, minOpen: 31, gates: 4, arrows: 3 }],
    [6, { n: 8, minOpen: 55, gates: 6, arrows: 5 }],
    [6, { n: 7, minOpen: 44, gates: 5, arrows: 5 }],
  ] },
  ice: { name: "Ice", icon: "❄", desc: "Cross frozen cells straight", tiers: [
    [6, { n: 5, minOpen: 24, ice: 2, looseness: 0.95 }],
    [6, { n: 6, minOpen: 33, ice: 3, looseness: 0.95 }],
    [4, { build: "fork", n: 6, minOpen: 31, ice: 3, looseness: 0.95 }],
    [4, { build: "fork", n: 7, minOpen: 44, ice: 4, looseness: 0.95 }],
    [6, { build: "fork", n: 7, minOpen: 44, ice: 5, looseness: 0.95 }],
    [6, { n: 8, minOpen: 55, ice: 5, looseness: 0.95 }],
    [6, { build: "fork", n: 6, minOpen: 31, ice: 4 }],
    [6, { n: 7, minOpen: 44, ice: 6 }],
    [6, { n: 8, minOpen: 55, ice: 6 }],
  ] },
  portals: { name: "Portals", icon: "◎", desc: "Lines warp between twins", tiers: [
    [8, { n: 5, minOpen: 23, jump: 1, looseness: 0.95 }],
    [8, { n: 6, minOpen: 32, jump: 1, looseness: 0.95 }],
    [4, { n: 7, minOpen: 43, jump: 1, looseness: 0.95 }],
    [6, { n: 6, minOpen: 31, jump: 2, looseness: 0.95 }],
    [6, { n: 7, minOpen: 42, jump: 2, looseness: 0.95 }],
    [6, { n: 6, minOpen: 31, jump: 2, gates: 2 }],
    [6, { n: 7, minOpen: 42, jump: 2, gates: 2 }],
    [6, { n: 7, minOpen: 42, jump: 3 }],
  ] },
  bridges: { name: "Bridges", icon: "⌗", desc: "Lines cross over each other", tiers: [
    [8, { n: 5, minOpen: 23, bridge: 1 }],
    [8, { n: 6, minOpen: 32, bridge: 1 }],
    [4, { n: 7, minOpen: 43, bridge: 2 }],
    [6, { n: 6, minOpen: 31, bridge: 2 }],
    [6, { n: 7, minOpen: 42, bridge: 3 }],
    [6, { n: 6, minOpen: 31, bridge: 2, gates: 2 }],
    [6, { n: 7, minOpen: 42, bridge: 2, gates: 2 }],
    [6, { n: 8, minOpen: 54, bridge: 3 }],
  ] },
  prisms: { name: "Prisms", icon: "◈", desc: "Split a blend back apart", tiers: [
    [8, { build: "prism", n: 5, minOpen: 22 }],
    [8, { build: "prism", n: 6, minOpen: 31 }],
    [4, { build: "prism", n: 7, minOpen: 42 }],
    [6, { build: "prism", n: 6, minOpen: 30, gates: 2 }],
    [6, { build: "prism", n: 7, minOpen: 41, gates: 3 }],
    [6, { build: "prism", n: 7, minOpen: 41, ice: 2 }],
    [6, { build: "prism", n: 7, minOpen: 41, gates: 2, arrows: 2 }],
    [6, { build: "prism", n: 8, minOpen: 53 }],
  ] },
  tally: { name: "Tally", icon: "③", desc: "Exact colour counts around a tile", tiers: [
    [8, { n: 5, minOpen: 24, counts: 1 }],
    [8, { n: 6, minOpen: 32, counts: 2 }],
    [6, { n: 6, minOpen: 32, counts: 3, zeros: true }],
    [6, { build: "fork", n: 6, minOpen: 31, counts: 3 }],
    [6, { n: 7, minOpen: 43, counts: 4, zeros: true }],
    [6, { build: "fork", n: 7, minOpen: 43, counts: 4, zeros: true }],
    [6, { n: 7, minOpen: 43, counts: 5, zeros: true, gates: 2 }],
    [4, { n: 8, minOpen: 56, counts: 6, zeros: true }],
  ] },
  mix: { name: "Medley", icon: "✚", desc: "Every mechanic, mixed together", tiers: [
    // warm-up: one mechanic + a decoration
    [10, { n: 5, minOpen: 22, jump: 1, gates: 1 }],
    [10, { n: 5, minOpen: 22, bridge: 1, gates: 1 }],
    [10, { n: 6, minOpen: 31, jump: 1, ice: 2 }],
    [10, { n: 6, minOpen: 31, bridge: 1, gates: 2, arrows: 1 }],
    [10, { build: "fork", n: 6, minOpen: 31, gates: 2, ice: 2 }],
    [10, { build: "chain", n: 6, minOpen: 30, gates: 2 }],
    [10, { build: "prism", n: 6, minOpen: 30, gates: 2 }],
    // COMBOS: two or more mechanics on one board
    [10, { build: "chain", n: 6, minOpen: 30, jump: 1 }],
    [10, { build: "prism", n: 6, minOpen: 30, bridge: 1 }],
    [10, { n: 7, minOpen: 42, jump: 1, bridge: 1, gates: 2 }],
    [10, { build: "fork", n: 7, minOpen: 42, bridge: 1, gates: 2 }],
    [10, { build: "chain", n: 7, minOpen: 41, bridge: 1, ice: 2 }],
    [10, { build: "prism", n: 7, minOpen: 41, jump: 1, gates: 2 }],
    [10, { n: 7, minOpen: 41, jump: 2, bridge: 1, ice: 2 }],
    [10, { build: "chain", n: 7, minOpen: 41, jump: 1, bridge: 1 }],
  ] },
};

export function genPacks(seed) {
  const packs = [], sols = {};
  for (const id of Object.keys(RAMPS)) {
    let h = seed >>> 0;
    for (let i = 0; i < id.length; i++) h = Math.imul(h ^ id.charCodeAt(i), 2654435761) >>> 0;
    const P = RAMPS[id], rng = mulberry32(h);
    const levels = [], gestList = [], sigs = new Set();
    for (const [count, base] of P.tiers) {
      let made = 0, attempts = 0;
      while (made < count && attempts < count * 6000) {
        attempts++;
        const r = makeMix(base, rng);
        if (!r) continue;
        const sig = JSON.stringify([r.lv.sq, r.lv.ci, r.lv.walls, r.lv.gates, r.lv.ice, r.lv.portals, r.lv.bridges, r.lv.prisms]);
        if (sigs.has(sig)) continue;
        sigs.add(sig); levels.push(r.lv); gestList.push({ lv: r.lv, gest: r.gest }); made++;
      }
      if (made < count) process.stderr.write(`  (pack ${id} tier short ${made}/${count} n${base.n})\n`);
    }
    packs.push({ id, name: P.name, icon: P.icon, desc: P.desc, levels });
    sols[id] = gestList;
  }
  return { packs, sols };
}
