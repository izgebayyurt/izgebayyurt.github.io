/* Removes walls that do nothing.
 *
 * Inertness is not additive: two walls can each be individually removable
 * while removing both together opens a shortcut. So this cannot simply take
 * the audit's list and delete it — every removal is re-verified against the
 * ORIGINAL level, and the loop runs to a fixpoint because taking one wall out
 * can expose another that was previously buried (and therefore untestable).
 *
 * Invariant held for every level: same shortest-solution length, and the same
 * number of shortest solutions. The puzzle is identical; only furniture goes.
 *
 * Writes out/strip.json; apply.js is what touches the page.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { makeEngine } = require('./engine');
const { analyse } = require('./solver');
const { interiorWallsFacingFloor, norm, setc } = require('./certify');

function stripLevel(E, map0) {
  let map = norm(map0);
  const base = analyse(E, { map }, { touch: false });
  if (!base.solvable) return { map: map0, removed: [] };

  const removed = [];
  let changed = true;
  while (changed) {
    changed = false;
    for (const [r, c] of interiorWallsFacingFloor(map)) {
      const cand = setc(map, r, c, '.');
      const a = analyse(E, { map: cand }, { touch: false });
      /* compared against the ORIGINAL level, not the partially stripped one */
      if (a.solvable && a.optimal === base.optimal && a.nPaths === base.nPaths) {
        map = cand; removed.push([r, c]); changed = true;
      }
    }
  }
  return { map, removed, optimal: base.optimal, nPaths: base.nPaths };
}

if (require.main === module) {
  const E = makeEngine();
  const out = [];
  let total = 0;
  const t0 = Date.now();
  E.LEVELS.forEach((lv, i) => {
    const r = stripLevel(E, lv.map);
    if (r.removed.length) {
      total += r.removed.length;
      out.push({ idx: i, level: i + 1, removed: r.removed,
                 optimal: r.optimal, nPaths: r.nPaths,
                 oldMap: lv.map, newMap: r.map });
    }
    if ((i + 1) % 25 === 0) process.stderr.write('  ..' + (i + 1) + '\n');
  });
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out', 'strip.json'), JSON.stringify(out, null, 1));
  console.log('stripped ' + total + ' inert walls from ' + out.length + ' levels in ' +
              ((Date.now() - t0) / 1000).toFixed(1) + 's');
}

module.exports = { stripLevel };
