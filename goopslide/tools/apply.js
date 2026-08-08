/* Writes repaired levels back into escape2.html.
 *
 * Two things this has to get right beyond the maps themselves.
 *
 * `par` is recomputed from the solver, never carried over, because several
 * repairs shift the shortest solution and a stale par would mark a perfect
 * run as over par. `limit` keeps its original slack above par.
 *
 * Saved progress is keyed by a hash of the map string, so every edited level
 * would otherwise read as never-played and silently drop the player's best.
 * A rekey table maps each old hash to its new one and is applied once.
 */
'use strict';
const fs = require('fs');
const path = require('path');
const { makeEngine, levelKey } = require('./engine');
const { certify } = require('./certify');

const HTML = path.join(__dirname, '..', 'escape2.html');
const ALLOWED = new Set(['hint', 'par', 'limit', 'risk', 'map', '_k']);

function esc(s) { return JSON.stringify(s); }

function renderLevel(lv) {
  const bits = ['hint:' + esc(lv.hint || ''), 'par:' + lv.par, 'limit:' + lv.limit];
  if (lv.risk) bits.push('risk:' + lv.risk); else bits.push('risk:0');
  return '    {' + bits.join(', ') + ',\n' +
         '     map:[' + lv.map.map(esc).join(',') + ']},';
}

function main() {
  const E = makeEngine();
  const repairs = JSON.parse(fs.readFileSync(path.join(__dirname, 'out', 'repair.json'), 'utf8'));
  const byIdx = new Map(repairs.filter(r => r.fixed).map(r => [r.idx, r]));
  if (!byIdx.size) throw new Error('apply: no fixed repairs to write');

  let src = fs.readFileSync(HTML, 'utf8');

  const levels = E.LEVELS.map((lv, i) => {
    for (const k of Object.keys(lv))
      if (!ALLOWED.has(k)) throw new Error('apply: unexpected key "' + k + '" on level ' + (i + 1));
    const rep = byIdx.get(i);
    if (!rep) return { hint: lv.hint || '', par: lv.par, limit: lv.limit, risk: lv.risk || 0, map: lv.map };
    const slack = (lv.limit || lv.par) - lv.par;
    const res = certify(E, rep.newMap, { walls: false });
    if (!res.ok) throw new Error('apply: repaired level ' + (i + 1) + ' does not certify');
    return { hint: lv.hint || '', par: res.optimal, limit: res.optimal + slack,
             risk: lv.risk || 0, map: rep.newMap };
  });

  /* ---- the LEVELS block ---- */
  const m = src.match(/(const LEVELS=\[)([\s\S]*?)(\n  \];)/);
  if (!m) throw new Error('apply: LEVELS block not found');
  const block = m[1] + '\n' + levels.map(renderLevel).join('\n') + m[3];
  src = src.slice(0, m.index) + block + src.slice(m.index + m[0].length);

  /* ---- the rekey table ---- */
  const rekey = {};
  for (const [i, rep] of byIdx) {
    const oldK = levelKey(E.LEVELS[i].map);
    const newK = levelKey(levels[i].map);
    if (oldK !== newK) rekey[oldK] = newK;
  }
  const anchor = "  const saveProg=()=>{ try{ localStorage.setItem(PKEY,JSON.stringify(prog)); }catch(e){} };";
  if (src.indexOf(anchor) < 0) throw new Error('apply: saveProg anchor not found');
  if (src.indexOf('const REKEY=') < 0) {
    const mig = anchor + '\n' +
      '  /* Levels edited by the elegance pass changed shape, and a best is keyed\n' +
      '     by a hash of the map — so without this a repaired level would read as\n' +
      '     never played and quietly lose the run. Applied once. */\n' +
      '  const REKEY=' + JSON.stringify(rekey) + ';\n' +
      '  if(!prog.rekeyed){ for(const o in REKEY){ const n=REKEY[o];\n' +
      '      if(prog.best[o]!==undefined && prog.best[n]===undefined) prog.best[n]=prog.best[o]; }\n' +
      '    prog.rekeyed=1; saveProg(); }';
    src = src.replace(anchor, mig);
  } else {
    src = src.replace(/const REKEY=\{[^\n]*\};/, 'const REKEY=' + JSON.stringify(rekey) + ';');
  }

  fs.writeFileSync(HTML, src);
  console.log('wrote ' + levels.length + ' levels; ' + byIdx.size + ' repaired, ' +
              Object.keys(rekey).length + ' rekeyed');
  const changed = [...byIdx.keys()].map(i => 'L' + (i + 1) +
      (E.LEVELS[i].par !== levels[i].par ? ' par ' + E.LEVELS[i].par + '->' + levels[i].par : ''));
  console.log(changed.join('\n'));
}

main();
