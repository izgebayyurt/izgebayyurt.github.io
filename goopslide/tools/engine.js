/* Loads Goop Out's real rules straight out of escape2.html.
 *
 * The rules are sliced out of the shipped page rather than reimplemented
 * here, because a certifier is only worth anything if it certifies the game
 * people actually play. A hand-written copy of simulate() would drift the
 * first time a rule changed, and every verdict downstream would quietly
 * become fiction while still looking authoritative.
 *
 * The cost of that choice is a hard dependency on two anchors in the page:
 * the `const LEVELS=[` array literal, and the run of code from the shared
 * board state down to `const isWinS=`. Both are asserted below, so if the
 * page is refactored this fails loudly instead of silently certifying the
 * wrong thing.
 */
'use strict';
const fs = require('fs');
const path = require('path');

const DEFAULT_HTML = path.join(__dirname, '..', 'escape2.html');

function readSource(htmlPath) {
  const src = fs.readFileSync(htmlPath, 'utf8');

  const lm = src.match(/const LEVELS=\[([\s\S]*?)\n  \];/);
  if (!lm) throw new Error('engine: could not find the LEVELS array in ' + htmlPath);
  const LEVELS = eval('[' + lm[1] + '\n]');

  /* One contiguous slice, so no rule can be skipped by accident. */
  const a = src.indexOf('let gw,gh,grid,spikes');
  const b = src.indexOf('const isWinS=');
  if (a < 0 || b < 0) throw new Error('engine: could not find the rules slice in ' + htmlPath);
  const rules = src.slice(a, src.indexOf('\n', b));

  return { LEVELS, rules, src };
}

function makeEngine(htmlPath) {
  const { LEVELS, rules, src } = readSource(htmlPath || process.env.GOOP_HTML || DEFAULT_HTML);

  /* The slice closes over a couple of browser-only odds and ends that never
     execute inside it; stub them so it evaluates under Node. */
  const factory = new Function('LEVELS', 'localStorage', `
    'use strict';
    ${rules}
    return {
      parse, simulate, sig, isWinS,
      board: () => ({ gw, gh, grid, holes, holeMapG, holeSizeG, doorCellG,
                      platesG, triMapG, twallG, bumpSetG, stickyG, wstickyG,
                      portalG, spikes })
    };
  `);

  const store = new Map();
  const ls = {
    getItem: k => (store.has(k) ? store.get(k) : null),
    setItem: (k, v) => store.set(k, String(v)),
    removeItem: k => store.delete(k)
  };

  return Object.assign(factory(LEVELS, ls), { LEVELS, src });
}

/* The game keys saved progress by a hash of the map, so this is what decides
   whether an edited level keeps or loses a player's recorded best. */
function levelKey(map) {
  let h = 2166136261;
  const s = map.join('/');
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return (h >>> 0).toString(36);
}

module.exports = { makeEngine, levelKey, DEFAULT_HTML };
