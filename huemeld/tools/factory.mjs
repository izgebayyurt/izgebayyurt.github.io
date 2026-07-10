/* Level design factory.
   Pairs board shapes with objectives, then uses the Monte-Carlo solver to set a
   fair, winnable move budget for each, and writes ../levels.js.
   Run:  node huemeld/tools/factory.mjs           (writes levels.js + prints report)
         node huemeld/tools/factory.mjs --dry      (report only) */
import { createRequire } from "module";
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
const require = createRequire(import.meta.url);
const HM = require("../engine.js");
import { estimate, winRate } from "./simulate.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));

/* ---- shape library (# = playable, . = wall). Various forms, not just rectangles ---- */
const S = {
  rect7: ["#######", "#######", "#######", "#######", "#######", "#######", "#######"],
  rect78: ["#######", "#######", "#######", "#######", "#######", "#######", "#######", "#######"],
  diamond: [
    "....#....", "...###...", "..#####..", ".#######.", "#########",
    ".#######.", "..#####..", "...###...", "....#...."
  ],
  plus: ["..###..", "..###..", "#######", "#######", "#######", "..###..", "..###.."],
  octagon: ["..####..", ".######.", "########", "########", "########", "########", ".######.", "..####.."],
  heart: [
    ".##...##.", "#########", "#########", "#########", ".#######.", "..#####..", "...###...", "....#...."
  ],
  pyramid: ["...#...", "..###..", ".#####.", "#######", "#######", "#######"]
};

const W = { R: 4, Y: 4, B: 4, O: 1, G: 1, P: 1 };   // primaries common, blends rare

/* ---- 50 procedurally-generated levels, secondary-only objectives ----
   Under the merge -> combo -> min-2-clear mechanic, primaries can never be
   directly banked (only merged into a secondary), so every objective here
   targets O/G/P. Difficulty ramps in tiers by how many secondary colours a
   level demands at once (1 -> 2 -> 3), which is what actually drives move
   count up (juggling three colours means turning down worse-scoring merges
   more often); board shape just cycles through the library for variety —
   the solver, not this formula, is what sets the real per-level difficulty
   via the tuned move budget. */
const SHAPE_CYCLE = [S.rect7, S.plus, S.pyramid, S.diamond, S.heart, S.rect78, S.octagon];
const SEC = ["O", "G", "P"];

function buildSpec(i) {
  const shape = SHAPE_CYCLE[i % SHAPE_CYCLE.length];
  let numColors, count;
  if (i < 12) { numColors = 1; count = 5 + i; }                          // 5..16
  else if (i < 26) { numColors = 2; count = 5 + Math.floor((i - 12) / 2); }  // 5..11
  else if (i < 40) { numColors = 3; count = 4 + Math.floor((i - 26) / 3); }  // 4..8
  else { numColors = 3; count = 8 + Math.floor((i - 40) / 2); }         // 8..12
  const objectives = [];
  for (let k = 0; k < numColors; k++) objectives.push({ color: SEC[(i + k) % 3], count });
  return { shape, spawn: W, objectives };
}
const SPECS = Array.from({ length: 50 }, (_, i) => buildSpec(i));

const FLOOR = 4;   // a genuine safety net for degenerate cases only — real budgets under the merge+combo mechanic run 5-30+, so this must not dominate them the way FLOOR=6 did for the old (more efficient) mechanic
const TARGET_WIN = 0.72;   // the *imperfect* sim player (see simulate.mjs — merges without a guaranteed combo partner are common here since secondaries are rare) should clear this often — a careful human does better

/* Escalate the budget from just above the median until the imperfect sim
   player wins TARGET_WIN of the time, so the move count is a real
   constraint rather than pure headroom. */
function tune(spec) {
  const est = estimate(spec, 200, 11);
  const p50 = isFinite(est.p50) ? est.p50 : est.mean;
  let budget = Math.max(FLOOR, Math.ceil(p50 * 1.1));
  const bump = Math.max(1, Math.round(p50 * 0.1));
  let wr = winRate(spec, budget, 150, 7001), guard = 0;
  while (wr < TARGET_WIN && guard++ < 15) { budget += bump; wr = winRate(spec, budget, 150, 7001); }
  return { est, budget, winRate: wr };
}

const dry = process.argv.includes("--dry");
const out = [];
const rows = [];
let id = 1;
process.stdout.write("  simulating (150 trials/level)...\n");
for (const spec of SPECS) {
  const play = HM.playableCount(HM.newState({ ...spec, moves: 1 }));
  const t = tune(spec);
  const objStr = spec.objectives.map(o => `${o.count}${o.color}`).join(" + ");
  console.log("  · #" + String(id).padEnd(3) + objStr.padEnd(16) + " -> " + String(t.budget).padStart(3) + " moves   (p50 " +
    String(t.est.p50).padStart(3) + ", p80 " + String(t.est.p80).padStart(3) + ", solves " +
    (t.est.finishRate * 100).toFixed(0) + "%, win@budget " + (t.winRate * 100).toFixed(0) + "%)");
  rows.push({
    id, cells: play, obj: objStr,
    finish: (t.est.finishRate * 100).toFixed(0) + "%",
    p50: t.est.p50, p80: t.est.p80, moves: t.budget, win: (t.winRate * 100).toFixed(0) + "%"
  });
  out.push({ id, shape: spec.shape, spawn: spec.spawn, objectives: spec.objectives, moves: t.budget });
  id++;
}

console.log("\n  Huemeld level report (greedy Monte-Carlo, 200 trials each)\n");
console.log("  #    cells  objectives      solve%  p50  p80  MOVES  win@budget");
console.log("  " + "-".repeat(72));
for (const r of rows) {
  console.log(
    "  " + String(r.id).padEnd(5) + String(r.cells).padEnd(7) +
    r.obj.padEnd(16) + r.finish.padEnd(8) + String(r.p50).padEnd(5) + String(r.p80).padEnd(5) +
    String(r.moves).padEnd(7) + r.win
  );
}
console.log("");

if (!dry) {
  const banner = "/* GENERATED by tools/factory.mjs — do not edit by hand. Move budgets are\n" +
    "   set by Monte-Carlo simulation so every level is winnable with margin. */\n";
  const body =
    "(function(root,ls){ if(typeof module===\"object\"&&module.exports) module.exports=ls;\n" +
    "  else root.HUEMELD_LEVELS=ls; })(typeof self!==\"undefined\"?self:this,\n" +
    JSON.stringify(out, null, 2) + ");\n";
  writeFileSync(join(__dir, "..", "levels.js"), banner + body);
  console.log("  wrote ../levels.js (" + out.length + " levels)\n");
}
