/* Repairs levels whose mechanics can be skipped.
 *
 * Repair before regeneration, deliberately: a generated level is correct but
 * anonymous, and these boards were composed by someone. The smallest edit
 * that makes the mechanic unavoidable keeps the author's shape and their
 * intended difficulty; only levels that resist every small edit get thrown
 * away and rebuilt.
 *
 * Greedy hill-climb over a few edit kinds, scored by (faults, par drift,
 * route count). Each step must strictly improve, so it terminates.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { makeEngine } = require('./engine');
const { certify, machines, norm, setc, at, NAME, neutral } = require('./certify');

const WEDGE_CYCLE = { w: 'x', x: 'y', y: 'z', z: 'w', W: 'X', X: 'Y', Y: 'Z', Z: 'W' };
const MOVABLE = 'sSb_=@wxyzWXYZ';

/* Candidate single edits, cheapest and least destructive first. */
function* edits(map, faults) {
  const H = map.length, W = map[0].length;
  const inb = (r, c) => r > 0 && c > 0 && r < H - 1 && c < W - 1;

  /* 1. delete a spare plate.
     Deletion is deliberately restricted to '_' and nothing else. Removing a
     wedge from a level in the Wedges pack does make the certifier go quiet,
     but it answers "this mechanic is skippable" by deleting the mechanic —
     which is the complaint, not the fix. A duplicate plate is the one case
     where the element really is just clutter and taking it away is honest. */
  for (const f of faults) {
    if (f.kind !== 'inert' || !f.at) continue;
    const [r, c] = f.at;
    if (at(map, r, c) !== '_') continue;
    /* never take the last plate: the door would be sealed forever */
    const plates = map.join('').split('').filter(x => x === '_').length;
    if (plates <= 1) continue;
    yield { kind: 'delete plate', map: setc(map, r, c, '.') };
  }

  /* 2. re-aim a wedge in place */
  for (let r = 1; r < H - 1; r++)
    for (let c = 1; c < W - 1; c++) {
      const ch = at(map, r, c);
      if (WEDGE_CYCLE[ch]) {
        let n = WEDGE_CYCLE[ch];
        while (n !== ch) { yield { kind: 'aim wedge', map: setc(map, r, c, n) }; n = WEDGE_CYCLE[n]; }
      }
    }

  /* 3. wall off a floor cell — this is what actually kills a route that
        dodges the mechanic */
  for (let r = 1; r < H - 1; r++)
    for (let c = 1; c < W - 1; c++)
      if (at(map, r, c) === '.') yield { kind: 'wall r' + r + 'c' + c, map: setc(map, r, c, '#') };

  /* 4. shift a droplet one cell. Changes the puzzle more than re-aiming a
        wedge does, so it comes late, but it is the lever that works when the
        geometry is fine and the starting position is what lets the player
        slip past the mechanic. */
  for (let r = 1; r < H - 1; r++)
    for (let c = 1; c < W - 1; c++) {
      if (!'opq'.includes(at(map, r, c))) continue;
      const ch = at(map, r, c);
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const a = r + dr, b = c + dc;
        if (!inb(a, b) || at(map, a, b) !== '.') continue;
        yield { kind: 'move droplet', map: setc(setc(map, r, c, '.'), a, b, ch) };
      }
    }

  /* 5. last resort: delete a non-signature gadget the certifier already
        called dead.
        Wedges and portals are never deletable — a pack exists to teach its
        mechanic, and silencing the complaint by removing the mechanic is the
        complaint. A sticky pad or bumper that provably does nothing is a
        different matter: it is clutter, and clearing clutter is the job. */
  for (const f of faults) {
    if (!f.at) continue;
    const [r, c] = f.at;
    const ch = at(map, r, c);
    if (!'sSb'.includes(ch)) continue;
    yield { kind: 'delete ' + (NAME[ch] || ch), map: setc(map, r, c, neutral(ch)) };
  }

  /* 6. shift a gadget one cell */
  for (let r = 1; r < H - 1; r++)
    for (let c = 1; c < W - 1; c++) {
      const ch = at(map, r, c);
      if (!MOVABLE.includes(ch)) continue;
      for (const [dr, dc] of [[-1,0],[1,0],[0,-1],[0,1]]) {
        const a = r + dr, b = c + dc;
        if (!inb(a, b) || at(map, a, b) !== '.') continue;
        yield { kind: 'move ' + (NAME[ch] || ch), map: setc(setc(map, r, c, '.'), a, b, ch) };
      }
    }
}

/* lower is better */
function score(res, origPar, tol) {
  if (!res.optimal) return null;
  if (Math.abs(res.optimal - origPar) > tol) return null;
  return [res.problems.length, Math.abs(res.optimal - origPar), res.nPaths];
}
const better = (a, b) => {
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return a[i] < b[i];
  return false;
};

function repair(E, map0, origPar, opts) {
  opts = opts || {};
  const tol = opts.tol === undefined ? 3 : opts.tol;
  const maxSteps = opts.maxSteps || 4;

  let map = norm(map0);
  let cur = certify(E, map, { walls: false });
  let curScore = [cur.problems.length, Math.abs(cur.optimal - origPar), cur.nPaths];
  const applied = [];

  for (let step = 0; step < maxSteps && cur.problems.length; step++) {
    let best = null;
    for (const e of edits(map, cur.problems)) {
      const res = certify(E, e.map, { walls: false });
      const sc = score(res, origPar, tol);
      if (!sc || !better(sc, curScore)) continue;
      if (!best || better(sc, best.sc)) best = { ...e, res, sc };
      if (sc[0] === 0 && sc[1] === 0) break;      // perfect, stop looking
    }
    if (!best) break;
    map = best.map; cur = best.res; curScore = best.sc;
    applied.push(best.kind);
  }
  return { map, cur, applied, fixed: cur.problems.length === 0 };
}

/* Try hardest to keep the level exactly as difficult as it was.
 *
 * A repair that fixes the mechanic but moves par by three has quietly
 * rewritten the difficulty curve — L171 sat at par 17 for a reason, and
 * handing back a 14 is not the same level in a different hat. So escalate:
 * demand an exact-par fix first and only widen the tolerance when nothing
 * else will do. */
function repairEscalating(E, map0, origPar) {
  let last = null;
  for (const [tol, maxSteps] of [[0, 4], [1, 5], [2, 6], [3, 8]]) {
    const r = repair(E, map0, origPar, { tol, maxSteps });
    if (r.fixed) return { ...r, tol };
    last = { ...r, tol };
  }
  return last;
}

/* Exhaustive two-edit search, for levels the greedy cannot crack.
 *
 * The hill-climb needs every step to improve on its own, so it is blind to
 * fixes where the pair works and neither half does — walling one route only
 * helps once the other route is walled too. Quadratic and slow, which is why
 * it is only reached after the cheap search has failed. */
function repairPairs(E, map0, origPar, tol) {
  const map = norm(map0);
  const base = certify(E, map, { walls: false });
  const outer = [...edits(map, base.problems)];
  for (const e1 of outer) {
    const r1 = certify(E, e1.map, { walls: false });
    if (!r1.optimal || Math.abs(r1.optimal - origPar) > tol) continue;
    if (!r1.problems.length)
      return { map: e1.map, cur: r1, applied: [e1.kind], fixed: true };
    for (const e2 of edits(e1.map, r1.problems)) {
      const r2 = certify(E, e2.map, { walls: false });
      if (!r2.optimal || r2.problems.length) continue;
      if (Math.abs(r2.optimal - origPar) > tol) continue;
      return { map: e2.map, cur: r2, applied: [e1.kind, e2.kind], fixed: true };
    }
  }
  return null;
}

if (require.main === module) {
  const E = makeEngine();
  const targets = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);
  const list = targets.length ? targets : null;

  /* find the faulty levels if none named */
  const faulty = list || E.LEVELS.map((lv, i) => i + 1).filter(n => {
    const r = certify(E, E.LEVELS[n - 1].map, { walls: false });
    return r.problems.length > 0;
  });

  const out = [];
  for (const n of faulty) {
    const lv = E.LEVELS[n - 1];
    const t0 = Date.now();
    let r = repairEscalating(E, lv.map, lv.par);
    if (!r.fixed) {
      for (const tol of [2, 3, 4]) {
        const d = repairPairs(E, lv.map, lv.par, tol);
        if (d) { r = { ...d, tol }; break; }
      }
    }
    const secs = ((Date.now() - t0) / 1000).toFixed(1);
    console.log((r.fixed ? 'FIXED  ' : 'STUCK  ') + 'L' + String(n).padEnd(4) +
      ' par ' + lv.par + '->' + r.cur.optimal + '  routes ' + r.cur.nPaths +
      '  [' + r.applied.join(' + ') + ']' +
      (r.fixed ? '' : '  remaining: ' + r.cur.problems.map(p => p.kind + ' ' + p.what).join(', ')) +
      '  ' + secs + 's');
    out.push({ level: n, idx: n - 1, fixed: r.fixed, applied: r.applied,
               par: r.cur.optimal, nPaths: r.cur.nPaths,
               oldMap: lv.map, newMap: r.map,
               remaining: r.cur.problems });
  }
  fs.mkdirSync(path.join(__dirname, 'out'), { recursive: true });
  fs.writeFileSync(path.join(__dirname, 'out', 'repair.json'), JSON.stringify(out, null, 1));
  console.log('\n' + out.filter(o => o.fixed).length + '/' + out.length + ' repaired');
}

module.exports = { repair, repairEscalating, repairPairs };
