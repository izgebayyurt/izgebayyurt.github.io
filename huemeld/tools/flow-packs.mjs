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

function makeBrown(spec, rng) {
  const L = buildChainLevel(spec.n, rng, { looseness: spec.looseness || 1.0, minCells: 12 });
  if (!L) return null;
  if (spec.n * spec.n - L.walls.length < spec.minOpen) return null;
  return { lv: { n: L.n, sq: L.sq, ci: L.ci, walls: L.walls, gates: [] }, gest: L.gest };
}

function makeArrows(spec, rng) {
  const build = spec.type === "fork" ? buildForkLevel : buildJunctionLevel;
  const L = build(spec.n, rng, { looseness: spec.looseness == null ? 0.95 : spec.looseness });
  if (!L) return null;
  if (spec.n * spec.n - L.walls.length < spec.minOpen) return null;
  const skip = keepOut(L, true);
  const cands = pathInteriors(L.gest).filter((x) => !skip.has(key(x.r, x.c)));
  const picked = spreadPick(cands, spec.gates, rng);
  if (!picked) return null;
  // most gates get the arrow (the pack's point); the rest stay plain colour gates
  const gates = picked.map((x, i) => {
    const col = L.paint.get(key(x.r, x.c));
    return i < spec.arrows ? [col, x.r, x.c, DIRL(x.din)] : [col, x.r, x.c];
  });
  return { lv: { n: L.n, sq: L.sq, ci: L.ci, walls: L.walls, gates }, gest: L.gest };
}

function makeIce(spec, rng) {
  const build = spec.type === "fork" ? buildForkLevel : buildJunctionLevel;
  const L = build(spec.n, rng, { looseness: spec.looseness == null ? 0.95 : spec.looseness });
  if (!L) return null;
  if (spec.n * spec.n - L.walls.length < spec.minOpen) return null;
  const skip = keepOut(L, false);
  const straight = pathInteriors(L.gest).filter((x) =>
    !skip.has(key(x.r, x.c)) && x.din[0] === x.dout[0] && x.din[1] === x.dout[1]);
  const picked = spreadPick(straight, spec.ice, rng);
  if (!picked) return null;
  return { lv: { n: L.n, sq: L.sq, ci: L.ci, walls: L.walls, gates: [], ice: picked.map((x) => [x.r, x.c]) }, gest: L.gest };
}

function makePortals(spec, rng) {
  const L = buildJunctionLevel(spec.n, rng, { looseness: spec.looseness == null ? 0.95 : spec.looseness, jump: 1 });
  if (!L || !L.portals) return null;
  if (spec.n * spec.n - L.walls.length < spec.minOpen) return null;
  return { lv: { n: L.n, sq: L.sq, ci: L.ci, walls: L.walls, gates: [], portals: L.portals }, gest: L.gest };
}

function makeBridges(spec, rng) {
  const L = buildJunctionLevel(spec.n, rng, { looseness: 1.0, bridge: spec.bridge });
  if (!L || !L.bridges) return null;
  if (spec.n * spec.n - L.walls.length < spec.minOpen) return null;
  return { lv: { n: L.n, sq: L.sq, ci: L.ci, walls: L.walls, gates: [], bridges: L.bridges }, gest: L.gest };
}

function makePrisms(spec, rng) {
  const L = buildPrismLevel(spec.n, rng, { looseness: spec.looseness == null ? 1.0 : spec.looseness, minCells: 12 });
  if (!L) return null;
  if (spec.n * spec.n - L.walls.length < spec.minOpen) return null;
  return { lv: { n: L.n, sq: L.sq, ci: L.ci, walls: L.walls, gates: [], prisms: L.prisms }, gest: L.gest };
}

/* ---- assembly ---- */
const RAMPS = {
  brown: { name: "Brown", icon: "🟤", desc: "Mix all three primaries", make: makeBrown, tiers: [
    [4, { n: 5, minOpen: 22, looseness: 1.0 }],
    [4, { n: 6, minOpen: 31, looseness: 1.0 }],
    [2, { n: 7, minOpen: 42, looseness: 1.0 }],
  ] },
  arrows: { name: "Arrows", icon: "➤", desc: "Gates with a direction", make: makeArrows, tiers: [
    [3, { n: 5, type: "junction", minOpen: 24, gates: 2, arrows: 1 }],
    [3, { n: 6, type: "junction", minOpen: 33, gates: 3, arrows: 2 }],
    [2, { n: 6, type: "fork", minOpen: 31, gates: 3, arrows: 2 }],
    [2, { n: 7, type: "fork", minOpen: 44, gates: 4, arrows: 3 }],
  ] },
  ice: { name: "Ice", icon: "❄", desc: "Cross frozen cells straight", make: makeIce, tiers: [
    [3, { n: 5, type: "junction", minOpen: 24, ice: 2 }],
    [3, { n: 6, type: "junction", minOpen: 33, ice: 3 }],
    [2, { n: 6, type: "fork", minOpen: 31, ice: 3 }],
    [2, { n: 7, type: "fork", minOpen: 44, ice: 4 }],
  ] },
  portals: { name: "Portals", icon: "◎", desc: "Lines warp between twins", make: makePortals, tiers: [
    [4, { n: 5, minOpen: 23 }],
    [4, { n: 6, minOpen: 32 }],
    [2, { n: 7, minOpen: 43 }],
  ] },
  bridges: { name: "Bridges", icon: "⌗", desc: "Lines cross over each other", make: makeBridges, tiers: [
    [4, { n: 5, minOpen: 23, bridge: 1 }],
    [4, { n: 6, minOpen: 32, bridge: 1 }],
    [2, { n: 7, minOpen: 43, bridge: 2 }],
  ] },
  prisms: { name: "Prisms", icon: "◈", desc: "Split a blend back apart", make: makePrisms, tiers: [
    [4, { n: 5, minOpen: 22 }],
    [4, { n: 6, minOpen: 31 }],
    [2, { n: 7, minOpen: 42 }],
  ] },
};

export function genPacks(seed) {
  const packs = [], sols = {};
  for (const id of Object.keys(RAMPS)) {
    const P = RAMPS[id], rng = mulberry32(seed ^ (id.length * 2654435761));
    const levels = [], gestList = [], sigs = new Set();
    for (const [count, base] of P.tiers) {
      let made = 0, attempts = 0;
      while (made < count && attempts < count * 4000) {
        attempts++;
        const r = P.make(base, rng);
        if (!r) continue;
        const sig = JSON.stringify([r.lv.sq, r.lv.ci, r.lv.walls, r.lv.gates, r.lv.ice, r.lv.portals]);
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
