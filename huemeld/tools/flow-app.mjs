/* Produce the full app dataset: a ramped campaign + a daily-puzzle pool.
   Writes ../flow-data.js -> window.HUEMELD_FLOW = {campaign,daily}.

   Run: node huemeld/tools/flow-app.mjs [--seed N] */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { genGate, mulberry32 } from "./flow-gen2.mjs";
import { genPacks } from "./flow-packs.mjs";
import { countSolutions, findOneSolution } from "./flow-solve.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const seed = +(args.indexOf("--seed") >= 0 ? args[args.indexOf("--seed") + 1] : 20260712) || 20260712;
const rng = mulberry32(seed);

/* Clean single-emitter boards (one R/Y/B square each, free to fork) with secondary
   circles as objectives and COLOUR GATES for challenge. "junction" = 2 emitters +
   1 mix; "fork" = 3 emitters + 2 mixes. Boards are (near-)full — walls stay sparse. */
const SOL = { campaign: [], daily: [] };   // constructed solution edges, per level (for the verifier)
function makeLevel(base) {
  const g = genGate({ tries: 6000, ...base }, rng);
  if (!g) return null;
  const L = g.L;
  return { lv: { n: L.n, sq: L.sq, ci: L.ci, walls: L.walls || [], gates: L.gates }, edges: g.edges, gest: g.gest };
}

function buildSet(ramp, label) {
  const set = []; const sigs = new Set();
  const t0 = Date.now();
  for (const [count, base] of ramp) {
    let made = 0, attempts = 0;
    while (made < count && attempts < count * 120) {
      attempts++;
      const r = makeLevel(base);
      if (!r) continue;
      const lv = r.lv;
      const sig = JSON.stringify([lv.n, lv.sq, lv.ci, lv.walls, lv.gates]);
      if (sigs.has(sig)) continue;
      sigs.add(sig); set.push(lv); SOL[label].push({ lv, edges: r.edges, gest: r.gest }); made++;
    }
    if (made < count) process.stderr.write(`  (${label} tier short ${made}/${count} n${base.n} ${base.type})\n`);
  }
  const walls = set.reduce((a, l) => a + l.walls.length, 0) / (set.length || 1);
  process.stderr.write(`${label}: ${set.length} levels, avg walls ${walls.toFixed(1)}, ${Math.round((Date.now() - t0) / 1000)}s\n`);
  return set;
}

// campaign — 250 levels in five 50-level chapters; gates and boards scale up
const CAMPAIGN = [
  // Chapter 1 — MIX (50): one junction, full boards, gates ease in
  [10, { n: 5, type: "junction", minOpen: 25, gates: 1 }],
  [10, { n: 5, type: "junction", minOpen: 24, gates: 2 }],
  [10, { n: 6, type: "junction", minOpen: 34, looseness: 0.9, gates: 2 }],
  [10, { n: 6, type: "junction", minOpen: 33, looseness: 0.9, gates: 3 }],
  [10, { n: 6, type: "junction", minOpen: 33, looseness: 1.0, gates: 4 }],
  // Chapter 2 — FORK (50): one square feeds two mixes
  [10, { n: 6, type: "fork", minOpen: 32, looseness: 1.0, gates: 2 }],
  [15, { n: 6, type: "fork", minOpen: 31, looseness: 1.0, gates: 3 }],
  [15, { n: 7, type: "fork", minOpen: 45, looseness: 1.0, gates: 3 }],
  [10, { n: 6, type: "fork", minOpen: 31, looseness: 1.0, gates: 4 }],
  // Chapter 3 — PRESSURE (50): 7×7, gates stack up
  [15, { n: 7, type: "fork", minOpen: 45, looseness: 1.0, gates: 4 }],
  [15, { n: 7, type: "fork", minOpen: 45, looseness: 1.0, gates: 5 }],
  [10, { n: 7, type: "junction", minOpen: 46, looseness: 1.0, gates: 5 }],
  [10, { n: 7, type: "fork", minOpen: 46, looseness: 1.0, gates: 6 }],
  // Chapter 4 — BIG BOARDS (50): 8×8 arrives
  [10, { n: 7, type: "fork", minOpen: 46, looseness: 1.0, gates: 6 }],
  [10, { n: 8, type: "junction", minOpen: 59, looseness: 1.0, gates: 4 }],
  [10, { n: 8, type: "junction", minOpen: 58, looseness: 1.0, gates: 5 }],
  [10, { n: 8, type: "fork", minOpen: 58, looseness: 1.0, gates: 5 }],
  [10, { n: 8, type: "fork", minOpen: 58, looseness: 1.0, gates: 6 }],
  // Chapter 5 — MASTERY (50): dense gates on the largest clean boards
  [15, { n: 8, type: "fork", minOpen: 58, looseness: 1.0, gates: 6 }],
  [15, { n: 8, type: "fork", minOpen: 58, looseness: 1.0, gates: 7 }],
  [10, { n: 8, type: "fork", minOpen: 59, looseness: 1.0, gates: 8 }],
  [10, { n: 8, type: "junction", minOpen: 59, looseness: 1.0, gates: 8 }],
];

// daily pool — a spread of self-contained medium puzzles
const DAILY = [
  [30, { n: 6, type: "junction", minOpen: 35, looseness: 0.9, gates: 2 }],
  [30, { n: 6, type: "fork", minOpen: 32, looseness: 1.0, gates: 3 }],
  [30, { n: 7, type: "fork", minOpen: 45, looseness: 1.0, gates: 3 }],
];

const campaign = buildSet(CAMPAIGN, "campaign");
const daily = buildSet(DAILY, "daily");
// level 1 carries its solution gestures so the shell can play the ghost-hand demo
if (campaign.length && SOL.campaign[0].gest) campaign[0].demo = SOL.campaign[0].gest;
// side packs use their own rng stream so campaign/daily stay byte-identical per seed
const pk = genPacks(seed + 777);
SOL.packs = pk.sols;
pk.packs.forEach((p) => process.stderr.write(`pack ${p.id}: ${p.levels.length} levels\n`));

// levels are solvable by construction; end-to-end winnability is verified
// separately by replaying each through the real engine.
void countSolutions; void findOneSolution;

const payload = { version: 5, campaign, daily, packs: pk.packs };
const js = "/* GENERATED by tools/flow-app.mjs — single-emitter colour-gate puzzles. */\n" +
  "window.HUEMELD_FLOW=" + JSON.stringify(payload) + ";\n";
writeFileSync(join(__dir, "..", "flow-data.js"), js);
// sidecar for the engine-replay verifier (NOT shipped): levels + their solution edges
if (args.indexOf("--solfile") >= 0) writeFileSync(args[args.indexOf("--solfile") + 1], JSON.stringify(SOL));
process.stderr.write(`wrote ../flow-data.js  campaign=${campaign.length} daily=${daily.length}  ${(js.length / 1024 | 0)}KB\n`);
