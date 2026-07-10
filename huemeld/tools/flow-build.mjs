/* Produce the Huemeld Flow 2 campaign: a ramped set of levels, EACH verified by
   the exact counter to have exactly one solution. Deterministic from --seed.

   Run: node huemeld/tools/flow-build.mjs [--seed N] [--out flow-levels.json] */
import { writeFileSync } from "fs";
import { fileURLToPath } from "url";
import { dirname, join } from "path";
import { genUnique, mulberry32 } from "./flow-gen.mjs";
import { countSolutions } from "./flow-solve.mjs";

const __dir = dirname(fileURLToPath(import.meta.url));
const args = process.argv.slice(2);
const seed = +(args[(args.indexOf("--seed") + 1) || -1] || 20260707) || 20260707;
const outArg = args.indexOf("--out") >= 0 ? args[args.indexOf("--out") + 1] : "flow-levels.json";

const rng = mulberry32(seed);
const interiorWalls = (n, count) => (r) => {
  const s = new Set(); let g = 0;
  while (s.size < count && g++ < 80) {
    const rr = 1 + ((r() * (n - 2)) | 0), cc = 1 + ((r() * (n - 2)) | 0);
    s.add(rr + "," + cc);
  }
  return s;
};

/* the ramp: each tier is [howMany, spec]. difficulty rises via board size, wall
   count, and how many colour-mixing junctions the solution demands. */
const RAMP = [
  // Tier 1 — direct delivery only (learn: drag a line from a square to its ✦, fill the board).
  // Few, long pipes -> clean, readable boards.
  [2, { n: 5, junctions: 0, minSeg: 5, maxSeg: 8, walls: 1 }],
  [2, { n: 5, junctions: 0, minSeg: 4, maxSeg: 7, walls: 2 }],
  [2, { n: 6, junctions: 0, minSeg: 5, maxSeg: 9, walls: 2 }],
  // Tier 2 — the first mixes (two primaries meet -> a secondary)
  [3, { n: 5, junctions: 1, minSeg: 2, maxSeg: 4, walls: 2 }],
  [3, { n: 6, junctions: 1, minSeg: 2, maxSeg: 4, walls: 3 }],
  // Tier 3 — juggle two blends at once
  [4, { n: 6, junctions: 2, minSeg: 2, maxSeg: 4, walls: 4 }],
  [4, { n: 6, junctions: 2, minSeg: 2, maxSeg: 3, walls: 5 }],
  // Tier 4 — bigger boards, denser walls
  [5, { n: 7, junctions: 2, minSeg: 2, maxSeg: 4, walls: 6 }],
  [5, { n: 7, junctions: 3, minSeg: 2, maxSeg: 4, walls: 7 }],
  // Tier 5 — the wall
  [4, { n: 7, junctions: 3, minSeg: 2, maxSeg: 3, walls: 8 }],
];

const BUDGET = 130_000;   // a unique tight board resolves well under this; reject anything slower
const levels = [];
const t0 = Date.now();
for (const [count, base] of RAMP) {
  let made = 0, attempts = 0;
  while (made < count && attempts < count * 60) {
    attempts++;
    const spec = {
      n: base.n, junctions: base.junctions, minSeg: base.minSeg, maxSeg: base.maxSeg, tries: 60,
      makeWalls: base.walls ? interiorWalls(base.n, base.walls) : null,
    };
    const g = genUnique(spec, rng, BUDGET);
    if (!g) continue;
    // de-dupe against identical earlier levels
    const sig = JSON.stringify([g.L.n, g.L.sq, g.L.ci, g.L.walls]);
    if (levels.some((x) => x.sig === sig)) continue;
    levels.push({ sig, L: g.L, nodes: g.res.nodes, madeJ: g.madeJ, tier: base });
    made++;
    process.stderr.write(`  [${levels.length}] n${g.L.n} walls${(g.L.walls||[]).length} junc${g.madeJ} sq${g.L.sq.length} ci${g.L.ci.length} nodes${g.res.nodes}\n`);
  }
  if (made < count) process.stderr.write(`  (tier short: ${made}/${count} for n${base.n} j${base.junctions})\n`);
}

// final independent re-verification of every level (fresh full counter, cap 2, big budget)
let allUnique = true;
for (let i = 0; i < levels.length; i++) {
  const r = countSolutions(levels[i].L, 2, 2_000_000);
  const ok = !r.aborted && r.count === 1;
  if (!ok) { allUnique = false; process.stderr.write(`  !! level ${i + 1} not unique on re-check: ${JSON.stringify(r)}\n`); }
}

const out = levels.map((x) => x.L);
writeFileSync(join(__dir, outArg), JSON.stringify(out, null, 0));
process.stderr.write(`\n${out.length} levels, allUnique=${allUnique}, ${Math.round((Date.now() - t0) / 1000)}s -> ${outArg}\n`);

// also emit the compact JS array the way flow2.html wants it
const lines = out.map((L) => {
  const sq = L.sq.map((s) => JSON.stringify(s)).join(",");
  const ci = L.ci.map((s) => JSON.stringify(s)).join(",");
  const w = (L.walls && L.walls.length) ? `, walls:[${L.walls.map((x) => "[" + x[0] + "," + x[1] + "]").join(",")}]` : "";
  return `  { n:${L.n}, sq:[${sq}], ci:[${ci}]${w} },`;
});
writeFileSync(join(__dir, outArg.replace(/\.json$/, "") + ".js.txt"), lines.join("\n") + "\n");
process.stdout.write(lines.join("\n") + "\n");
