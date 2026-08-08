/* What it means for a Goop Out level to be elegant, in code.
 *
 * The rule is: everything printed on the board must be load-bearing. An
 * element fails that in either of two independent ways.
 *
 *   DODGEABLE — some par-length solution never touches it. The player is
 *               invited to engage with a thing they can simply ignore, which
 *               is the worst kind of level: it teaches a mechanic and then
 *               does not ask for it.
 *   INERT     — delete it and the level still solves in the same number of
 *               moves by the same number of routes. It was never a
 *               constraint at all, only furniture.
 *
 * Neither implies the other, and which test applies depends on the element.
 * A wall is usually untouched even when it is essential — its whole job is
 * to be the thing droplets never reach — so walls are judged on INERT alone.
 * Gadgets sit in the path of play and are judged on both.
 *
 * One correction that matters: a wall buried inside a solid block is inert by
 * definition, because no droplet could ever have reached it. Counting those
 * would invent hundreds of faults that do not exist, so only walls actually
 * facing playable floor are considered.
 */
'use strict';
const { makeEngine } = require('./engine');
const { analyse, reachCount, lockstepParSolution } = require('./solver');

const EXITS    = 'ABC';
const SIZEDOOR = 'DEFGHIJKL';
const WEDGES   = 'wxyzWXYZ';
const SINGLES  = ['s', 'S', 'b'].concat(WEDGES.split(''));

const NAME = { s: 'sticky pad', S: 'wall goo', b: 'bumper', '@': 'portal pair',
               '_=': 'plate/door', _: 'plate' };
for (const w of 'wxyz') NAME[w] = 'wedge';
for (const w of 'WXYZ') NAME[w] = 'wedge(wall)';

/* parse() reads a missing character as wall, so padding rows to full width
   is a pure notation change and makes (r,c) addressable without special
   cases. Callers that write maps back should unpad again. */
function norm(map) {
  const w = Math.max(...map.map(s => s.length));
  return map.map(s => s + '#'.repeat(w - s.length));
}
const at   = (m, r, c) => m[r][c];
const setc = (m, r, c, ch) =>
  m.map((row, i) => (i === r ? row.slice(0, c) + ch + row.slice(c + 1) : row));
const FLOORISH = ch => ch !== '#' && !(EXITS + SIZEDOOR).includes(ch);

/* Goo is goo ON a wall: the feature is the goo, so neutralising it leaves a
   plain wall behind. Everything else neutralises to floor. */
const neutral = ch => (ch === 'S' ? '#' : '.');

/* Every machine on the board, as a list of cells that belong to it. */
function machines(map) {
  const out = [], plates = [], doors = [], portals = [];
  for (let r = 0; r < map.length; r++) {
    for (let c = 0; c < map[r].length; c++) {
      const ch = at(map, r, c);
      if (ch === '_') plates.push([r, c]);
      else if (ch === '=') doors.push([r, c]);
      else if (ch === '@') portals.push([r, c]);
      else if (SINGLES.includes(ch)) out.push({ ch, cells: [[r, c]] });
    }
  }
  if (portals.length === 2) out.push({ ch: '@', cells: portals });
  if (plates.length || doors.length) {
    out.push({ ch: '_=', cells: plates.concat(doors) });
    /* a second plate nothing ever stands on is its own fault, so each plate
       past the first is also judged alone */
    if (plates.length > 1) for (const p of plates) out.push({ ch: '_', cells: [p] });
  }
  return out;
}

function interiorWallsFacingFloor(map) {
  const out = [];
  for (let r = 1; r < map.length - 1; r++)
    for (let c = 1; c < map[r].length - 1; c++) {
      if (at(map, r, c) !== '#') continue;
      const faces = [[r-1,c],[r+1,c],[r,c-1],[r,c+1]].some(([a, b]) => FLOORISH(at(map, a, b)));
      if (faces) out.push([r, c]);
    }
  return out;
}

/* opts: { walls:true, maxRoutes:Infinity, parRange:[lo,hi] } */
let _shadow = null;   // second engine, for the lockstep dodgeability test
function shadow() { return (_shadow = _shadow || makeEngine()); }

function certify(E, map0, opts) {
  opts = opts || {};
  const map = norm(map0);
  const base = analyse(E, { map }, { touch: false });
  const problems = [];

  if (!base.solvable) return { ok: false, optimal: null, nPaths: 0, base,
                               problems: [{ kind: 'unsolvable' }] };
  if (base.truncated) problems.push({ kind: 'too-big-to-certify' });

  const same = r => r.solvable && r.optimal === base.optimal && r.nPaths === base.nPaths;

  for (const m of machines(map)) {
    let alt = map;
    for (const [r, c] of m.cells) alt = setc(alt, r, c, neutral(at(map, r, c)));
    const inert = same(analyse(E, { map: alt }, { touch: false }));
    const dodgeable = lockstepParSolution(E, shadow(), map, alt, base.optimal);
    /* E's board is left bound to `alt` by the line above; rebind it */
    E.parse({ map });
    if (dodgeable)
      problems.push({ kind: 'dodgeable', what: NAME[m.ch] || m.ch, at: m.cells[0] });
    if (inert)
      problems.push({ kind: 'inert', what: NAME[m.ch] || m.ch, at: m.cells[0] });
  }

  /* Walls need a stricter test than gadgets, and it took being wrong to see
     why. Judging a wall by "does par change?" declares most of the geometry
     inert — it flagged 265 walls across this game — but removing them turns
     corridor puzzles into empty boxes. A wall's job is to shape the space the
     player reasons through, and almost all of that work happens off the
     optimal line. So a wall only counts as furniture if deleting it leaves
     the ENTIRE reachable state space untouched, not merely the best route.
     Under that rule the same game has a handful of dead walls, not hundreds,
     which matches what the boards actually look like. */
  const wallNotes = [];
  if (opts.walls) {
    let baseReach = null;
    for (const [r, c] of interiorWallsFacingFloor(map)) {
      const cand = setc(map, r, c, '.');
      if (!same(analyse(E, { map: cand }, { touch: false }))) continue;
      if (baseReach === null) baseReach = reachCount(E, { map }).n;
      if (reachCount(E, { map: cand }).n === baseReach)
        wallNotes.push({ kind: 'inert', what: 'wall', at: [r, c] });
    }
  }

  const maxRoutes = opts.maxRoutes || Infinity;
  if (base.nPaths > maxRoutes)
    problems.push({ kind: 'too-many-routes', n: base.nPaths });

  if (opts.parRange && (base.optimal < opts.parRange[0] || base.optimal > opts.parRange[1]))
    problems.push({ kind: 'par-out-of-range', par: base.optimal });

  /* wallNotes deliberately do NOT affect ok: see the note above. They are
     reported because they are true, not because they need fixing. */
  return { ok: problems.length === 0, optimal: base.optimal,
           nPaths: base.nPaths, base, problems, wallNotes };
}

module.exports = { certify, machines, interiorWallsFacingFloor, norm, setc, at,
                   neutral, NAME, FLOORISH, EXITS, SIZEDOOR, WEDGES, SINGLES };

/* ---- CLI: certify every level in the shipped page ---- */
if (require.main === module) {
  const E = makeEngine();
  const only = process.argv.slice(2).filter(a => /^\d+$/.test(a)).map(Number);
  let bad = 0, faults = 0, inertWalls = 0;
  const withWalls = process.argv.includes('--walls');
  const t0 = Date.now();
  E.LEVELS.forEach((lv, i) => {
    if (only.length && !only.includes(i + 1)) return;
    const r = certify(E, lv.map, { walls: withWalls });
    if (lv.par !== r.optimal)
      r.problems.push({ kind: 'par-wrong', declared: lv.par, actual: r.optimal });
    inertWalls += r.wallNotes.length;
    if (r.problems.length) {
      bad++; faults += r.problems.length;
      console.log('L' + (i + 1) + '  par ' + r.optimal + '  routes ' + r.nPaths +
        r.problems.map(p => '  · ' + p.kind + (p.what ? ' ' + p.what : '') +
                      (p.at ? ' @r' + p.at[0] + 'c' + p.at[1] : '')).join(''));
    }
  });
  console.log('\n' + (only.length || E.LEVELS.length) + ' levels · ' + bad +
    ' with mechanic faults · ' + faults + ' faults total · ' +
    ((Date.now() - t0) / 1000).toFixed(1) + 's');
  if (withWalls)
    console.log(inertWalls + ' provably inert walls (reported, not faults — a wall ' +
                'reads as geometry, and geometry is allowed not to matter)');
  process.exit(bad ? 1 : 0);
}
