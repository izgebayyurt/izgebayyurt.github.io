/* Huemeld engine — pure game logic, no DOM.
   Loadable in the browser (window.HM) and in Node (module.exports),
   so the level-balancing simulator plays the exact same rules the player does. */
(function (root, factory) {
  if (typeof module === "object" && module.exports) module.exports = factory();
  else root.HM = factory();
})(typeof self !== "undefined" ? self : (typeof globalThis !== "undefined" ? globalThis : this), function () {
  "use strict";

  var PRIM = ["R", "Y", "B"];
  var SEC = ["O", "G", "P"];
  var COLORS = ["R", "Y", "B", "O", "G", "P"];
  var HEX = { R: "#ef4a5a", Y: "#f6c445", B: "#3d8bdf", O: "#f2913d", G: "#57c268", P: "#9b62d6" };
  var NAME = { R: "red", Y: "yellow", B: "blue", O: "orange", G: "green", P: "purple" };
  var MIX = { RY: "O", BR: "P", BY: "G" };
  var BAR_MAX = 10;   // primary-chain charge needed to fill a powerup bar (powerups themselves are a later layer)

  function isPrim(c) { return c === "R" || c === "Y" || c === "B"; }
  function mix(a, b) { return MIX[[a, b].sort().join("")] || null; }
  function split(k) { var i = k.indexOf(","); return [+k.slice(0, i), +k.slice(i + 1)]; }

  function makeSpawner(weights) {
    var keys = Object.keys(weights).filter(function (k) { return weights[k] > 0; });
    var total = 0, i;
    for (i = 0; i < keys.length; i++) total += weights[keys[i]];
    return function (rng) {
      var x = rng() * total;
      for (var j = 0; j < keys.length; j++) { x -= weights[keys[j]]; if (x < 0) return keys[j]; }
      return keys[keys.length - 1];
    };
  }

  function parseShape(shape) {
    var H = shape.length, W = 0, r, c;
    for (r = 0; r < H; r++) W = Math.max(W, shape[r].length);
    var mask = [];
    for (r = 0; r < H; r++) {
      var row = [];
      for (c = 0; c < W; c++) row.push(shape[r][c] === "#" ? 1 : 0);
      mask.push(row);
    }
    return { W: W, H: H, mask: mask };
  }

  function playable(s, r, c) { return r >= 0 && c >= 0 && r < s.H && c < s.W && s.mask[r][c] === 1; }

  function colRows(s, c) { var a = [], r; for (r = 0; r < s.H; r++) if (s.mask[r][c]) a.push(r); return a; }

  function playableCount(s) { var n = 0, r, c; for (r = 0; r < s.H; r++) for (c = 0; c < s.W; c++) n += s.mask[r][c]; return n; }

  function newState(level) {
    var p = parseShape(level.shape);
    var grid = [], r;
    for (r = 0; r < p.H; r++) grid.push(new Array(p.W).fill(null));
    var obj = (level.objectives || []).map(function (o) { return { color: o.color, need: o.count, have: 0 }; });
    var tubes = null;
    if (level.tubes) { tubes = {}; for (var tk in level.tubes) if (level.tubes.hasOwnProperty(tk)) tubes[tk] = { need: level.tubes[tk], have: 0 }; }
    var reserve = copyObj(level.reserve), altSpawnFn = null;
    if (reserve) { var alt = {}, sk; for (sk in level.spawn) if (level.spawn.hasOwnProperty(sk) && reserve[sk] == null) alt[sk] = level.spawn[sk]; altSpawnFn = makeSpawner(alt); }
    var recipes = level.recipes ? level.recipes.map(function (r) { return { seq: r.seq.slice(), count: r.count || 1, done: 0 }; }) : null;
    return {
      W: p.W, H: p.H, mask: p.mask, grid: grid,
      spawn: level.spawn, spawnFn: makeSpawner(level.spawn), reserve: reserve, altSpawnFn: altSpawnFn,
      obj: obj, goal: level.goal || "collect", tubes: tubes, recipes: recipes,
      movesLeft: level.moves, moves: level.moves,
      bars: { R: 0, Y: 0, B: 0 }, barMax: BAR_MAX,
      score: 0, won: false, lost: false, level: level
    };
  }

  function cloneTubes(t) { if (!t) return null; var o = {}; for (var k in t) if (t.hasOwnProperty(k)) o[k] = { need: t[k].need, have: t[k].have }; return o; }
  function clone(s) {
    return {
      W: s.W, H: s.H, mask: s.mask,
      grid: s.grid.map(function (row) { return row.slice(); }),
      spawn: s.spawn, spawnFn: s.spawnFn, reserve: copyObj(s.reserve), altSpawnFn: s.altSpawnFn,
      obj: s.obj.map(function (o) { return { color: o.color, need: o.need, have: o.have }; }),
      goal: s.goal, tubes: cloneTubes(s.tubes), recipes: s.recipes ? s.recipes.map(function (r) { return { seq: r.seq.slice(), count: r.count, done: r.done }; }) : null,
      bars: { R: s.bars.R, Y: s.bars.Y, B: s.bars.B }, barMax: s.barMax,
      movesLeft: s.movesLeft, moves: s.moves, score: s.score, won: s.won, lost: s.lost, level: s.level
    };
  }

  function copyObj(o) { if (!o) return null; var r = {}; for (var k in o) if (o.hasOwnProperty(k)) r[k] = o[k]; return r; }

  /* ration a scarce primary: it draws from a finite per-level reserve; once that
     reserve hits zero, spawns re-roll to the NON-reserved primaries only. This
     turns that colour into a resource you must allocate, so a mix stops being
     interchangeable. Levels with no `reserve` are unaffected. */
  function spawnTile(s, rng) {
    var c = s.spawnFn(rng);
    if (s.reserve && s.reserve[c] != null) {
      if (s.reserve[c] > 0) { s.reserve[c]--; return c; }
      return s.altSpawnFn ? s.altSpawnFn(rng) : c;
    }
    return c;
  }

  /* mask-aware gravity: within each column, tiles fall to the lowest playable
     cells (order preserved), remaining playable cells at the top refill. */
  function gravity(s, rng) {
    var fresh = {};
    for (var c = 0; c < s.W; c++) {
      var rows = colRows(s, c), existing = [], i, r;
      for (i = 0; i < rows.length; i++) { r = rows[i]; if (s.grid[r][c]) existing.push(s.grid[r][c]); }
      var n = rows.length, empty = n - existing.length;
      for (i = 0; i < n; i++) {
        r = rows[i];
        if (i < empty) { s.grid[r][c] = spawnTile(s, rng); fresh[r + "," + c] = 1; }
        else s.grid[r][c] = existing[i - empty];
      }
    }
    return fresh;
  }

  function creditObjectives(s, color) {
    for (var i = 0; i < s.obj.length; i++) if (s.obj[i].color === color && s.obj[i].have < s.obj[i].need) s.obj[i].have++;
  }

  /* NOTE: no scrub pass — same-colour circle clusters at fill time are a
     FEATURE (treasure waiting to be swept by a meld), not pre-popped matches;
     nothing on this board ever pops without a player fusion. */
  function fill(s, rng) {
    for (var c = 0; c < s.W; c++) { var rows = colRows(s, c); for (var i = 0; i < rows.length; i++) s.grid[rows[i]][c] = spawnTile(s, rng); }
  }

  /* refill empty cells IN PLACE with fresh primaries, moving nothing — the
     suspended-board counterpart to gravity(): circles stay exactly where the
     player placed them, only the emptied source/pop cells get new paint. */
  function topUp(s, rng) {
    var fresh = {};
    for (var r = 0; r < s.H; r++) for (var c = 0; c < s.W; c++) {
      if (playable(s, r, c) && !s.grid[r][c]) { s.grid[r][c] = spawnTile(s, rng); fresh[r + "," + c] = 1; }
    }
    return fresh;
  }

  /* the fusion: `from` empties, `to` becomes the blend. The newborn lands in
     the DESTINATION cell, which is what makes drag direction the aiming
     mechanic — the caller owes the burst + gravity. */
  function applyMix(s, a, b) { var m = mix(s.grid[a.r][a.c], s.grid[b.r][b.c]); s.grid[b.r][b.c] = m; s.grid[a.r][a.c] = null; return m; }

  /* flood-fill the connected same-colour group seeded at one cell, ANY size >=1.
     Returns [] if the cell is empty/unplayable. */
  function groupAt(s, r, c) {
    if (!playable(s, r, c)) return [];
    var v = s.grid[r][c];
    if (!v) return [];
    var seen = {}, stack = [[r, c]], comp = [];
    seen[r + "," + c] = 1;
    while (stack.length) {
      var cur = stack.pop(), y = cur[0], x = cur[1];
      comp.push(y + "," + x);
      var nb = [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]];
      for (var i = 0; i < 4; i++) {
        var ny = nb[i][0], nx = nb[i][1];
        if (!playable(s, ny, nx)) continue;
        var nk = ny + "," + nx;
        if (seen[nk] || s.grid[ny][nx] !== v) continue;
        seen[nk] = 1; stack.push([ny, nx]);
      }
    }
    return comp;
  }

  /* ---------- the suspended combo session ----------
     A session is locked to ONE colour and the board is SUSPENDED (no gravity)
     for its whole life. It is opened either by a MERGE (two adjacent different
     primaries -> their blend, born in the destination cell) or by a same-colour
     CHAIN. Every action while the session is open just ACCUMULATES cells into
     `collected`; nothing pops and gravity never runs until resolveSession. This
     is the single guarantee against the v2 "gravity mid-drag" bug. */

  /* score for a resolved combo of size n. Merge sessions get the steep
     superlinear curve (the whole point — build big combos by merging);
     cold secondary chains get a gentle wage; primary chains score almost
     nothing (their payoff is charging a powerup bar, a later layer). */
  function scoreCurve(kind, n) {
    if (n <= 0) return 0;
    if (kind === "merge") { var ex = n - 1; return n <= 5 ? n * 12 + ex * ex * 24 : 444 + 100 * (n - 5); }
    if (kind === "primary") return n * 2;
    return n * 10;   // gentle: cold secondary chain
  }

  function newSession(kind, color) {
    return { kind: kind, color: color, hadMerge: kind === "merge", collected: {}, count: 0, moves: 0, open: true };
  }

  /* MERGE action: fuse two adjacent different primaries. The blend lands at
     `to` and joins the collected set; `from` becomes a hole immediately (it is
     consumed) but the board is NOT gravitied — the hole just sits there until
     resolve. First merge locks the session colour to the blend. */
  function sessionMerge(s, sess, from, to) {
    var blend = applyMix(s, from, to);
    sess.kind = "merge"; sess.hadMerge = true; sess.color = blend;
    var k = to.r + "," + to.c;
    if (!sess.collected[k]) { sess.collected[k] = 1; sess.count++; }
    return blend;
  }

  /* CHAIN/SWEEP action: add one already-placed tile of the session colour to
     the collected set. Used both for same-colour chains and for sweeping
     secondaries (freshly merged or pre-existing) in a merge session. The tile
     stays on the board (suspended) until resolve. */
  function sessionCollect(s, sess, r, c) {
    if (!playable(s, r, c) || !s.grid[r][c]) return false;
    if (sess.color == null) { sess.color = s.grid[r][c]; sess.kind = "chain"; }
    if (s.grid[r][c] !== sess.color) return false;
    var k = r + "," + c;
    if (!sess.collected[k]) { sess.collected[k] = 1; sess.count++; }
    return true;
  }

  /* resolve: credit/score by the total combo COUNT (not per surviving cell —
     consumed source tiles may already be nulled by the UI so they can't be
     dragged back onto), pop whatever blob tiles remain, charge the powerup bar
     for a primary chain, then gravity + refill EXACTLY ONCE. */
  function resolveSession(s, sess, rng) {
    var keys = Object.keys(sess.collected), i;
    for (i = 0; i < keys.length; i++) { var p = split(keys[i]); if (s.grid[p[0]][p[1]]) s.grid[p[0]][p[1]] = null; }
    var n = sess.count, color = sess.color;
    var tube = null;
    if (s.goal === "tubes") {   // a combo of a secondary colour pours into its tube; big combos pour far more
      if (s.tubes && s.tubes[color]) { var add = tubeFill(n); s.tubes[color].have = Math.min(s.tubes[color].need, s.tubes[color].have + add); tube = { color: color, add: add }; }
    } else for (i = 0; i < n; i++) creditObjectives(s, color);
    var kind = sess.hadMerge ? "merge" : (isPrim(color) ? "primary" : "gentle");
    var gain = scoreCurve(kind, n);
    s.score += gain;
    if (kind === "primary" && color) s.bars[color] = Math.min(s.barMax, s.bars[color] + n);
    sess.open = false;
    var fresh = gravity(s, rng);
    return { popped: n, gain: gain, kind: kind, color: color, fresh: fresh, tube: tube };
  }

  /* burst preview: the connected circle group that WOULD pop if `from` were
     fused into `to` (the blend lands at `to`). Pure — no mutation. Returns
     keys including `to` itself, so .length is the burst size (>= 1). The
     `from` cell holds a primary, which can never equal the blend, so it is
     naturally excluded from the flood. */
  function fusePreview(s, from, to) {
    var blend = mix(s.grid[from.r][from.c], s.grid[to.r][to.c]);
    if (!blend) return [];
    var seen = {}, stack = [[to.r, to.c]], comp = [];
    seen[to.r + "," + to.c] = 1;
    while (stack.length) {
      var cur = stack.pop(), y = cur[0], x = cur[1];
      comp.push(y + "," + x);
      var nb = [[y + 1, x], [y - 1, x], [y, x + 1], [y, x - 1]];
      for (var i = 0; i < 4; i++) {
        var ny = nb[i][0], nx = nb[i][1];
        if (!playable(s, ny, nx)) continue;
        var nk = ny + "," + nx;
        if (seen[nk] || s.grid[ny][nx] !== blend) continue;
        seen[nk] = 1; stack.push([ny, nx]);
      }
    }
    return comp;
  }

  /* every legal fusion, as ORDERED (from, to) pairs — both directions of a
     pair are distinct moves because the blend lands at `to` (aiming). */
  function legalFuses(s) {
    var NB = [[1, 0], [-1, 0], [0, 1], [0, -1]];
    var res = [], r, c, i;
    for (r = 0; r < s.H; r++) for (c = 0; c < s.W; c++) {
      var a = playable(s, r, c) ? s.grid[r][c] : null;
      if (!a || !isPrim(a)) continue;
      for (i = 0; i < 4; i++) {
        var nr = r + NB[i][0], nc = c + NB[i][1];
        if (!playable(s, nr, nc)) continue;
        var b = s.grid[nr][nc];
        if (!b || !isPrim(b) || b === a) continue;
        res.push({ from: { r: r, c: c }, to: { r: nr, c: nc }, blend: mix(a, b) });
      }
    }
    return res;
  }

  function hasFusePair(s) {
    for (var r = 0; r < s.H; r++) for (var c = 0; c < s.W; c++) {
      var a = playable(s, r, c) ? s.grid[r][c] : null;
      if (!a || !isPrim(a)) continue;
      var right = playable(s, r, c + 1) ? s.grid[r][c + 1] : null;
      if (right && isPrim(right) && right !== a) return true;
      var down = playable(s, r + 1, c) ? s.grid[r + 1][c] : null;
      if (down && isPrim(down) && down !== a) return true;
    }
    return false;
  }

  /* deadlock rescue: shuffle the primary tiles' colours among their own cells
     (circles stay put) until at least one adjacent different-primary pair
     exists. Free — costs no move. Returns false in the degenerate case where
     no shuffle can help (e.g. every primary on the board is the same colour),
     which the caller may treat as unwinnable. */
  function reshufflePrimaries(s, rng) {
    var cells = [], cols = [], r, c, i;
    for (r = 0; r < s.H; r++) for (c = 0; c < s.W; c++) {
      var v = playable(s, r, c) ? s.grid[r][c] : null;
      if (v && isPrim(v)) { cells.push([r, c]); cols.push(v); }
    }
    var guard = 0;
    while (guard++ < 30 && !hasFusePair(s)) {
      for (i = cols.length - 1; i > 0; i--) { var j = (rng() * (i + 1)) | 0; var t = cols[i]; cols[i] = cols[j]; cols[j] = t; }
      for (i = 0; i < cells.length; i++) s.grid[cells[i][0]][cells[i][1]] = cols[i];
    }
    return hasFusePair(s);
  }

  function objectivesMet(s) { for (var i = 0; i < s.obj.length; i++) if (s.obj[i].have < s.obj[i].need) return false; return true; }
  function tubeFill(n) { return n * (n + 1) / 2; }   // triangular: a 5-combo pours 15, five 1-combos pour only 5 — combos fill more
  function tubesMet(s) { if (!s.tubes) return false; for (var k in s.tubes) if (s.tubes.hasOwnProperty(k) && s.tubes[k].have < s.tubes[k].need) return false; return true; }
  function recipesMet(s) { if (!s.recipes || !s.recipes.length) return false; for (var i = 0; i < s.recipes.length; i++) if (s.recipes[i].done < s.recipes[i].count) return false; return true; }
  function checkEnd(s) { var met = s.goal === "recipe" ? recipesMet(s) : (s.goal === "tubes" ? tubesMet(s) : objectivesMet(s)); if (met) s.won = true; else if (s.movesLeft <= 0) s.lost = true; return s; }

  /* connected same-colour groups of size >= 2 — chain-session openers */
  function legalChains(s, minSize) {
    var m = minSize || 2, seen = {}, res = [], r, c;
    for (r = 0; r < s.H; r++) for (c = 0; c < s.W; c++) {
      if (!playable(s, r, c) || !s.grid[r][c]) continue;
      var k = r + "," + c;
      if (seen[k]) continue;
      var comp = groupAt(s, r, c);
      for (var i = 0; i < comp.length; i++) seen[comp[i]] = 1;
      if (comp.length >= m) res.push({ r: r, c: c, color: s.grid[r][c], comp: comp });
    }
    return res;
  }

  return {
    PRIM: PRIM, SEC: SEC, COLORS: COLORS, HEX: HEX, NAME: NAME, BAR_MAX: BAR_MAX,
    isPrim: isPrim, mix: mix, split: split,
    makeSpawner: makeSpawner, parseShape: parseShape, playable: playable,
    colRows: colRows, playableCount: playableCount,
    newState: newState, clone: clone, fill: fill, gravity: gravity, topUp: topUp, applyMix: applyMix,
    groupAt: groupAt, fusePreview: fusePreview, legalFuses: legalFuses, legalChains: legalChains,
    hasFusePair: hasFusePair, reshufflePrimaries: reshufflePrimaries,
    scoreCurve: scoreCurve, newSession: newSession, sessionMerge: sessionMerge,
    sessionCollect: sessionCollect, resolveSession: resolveSession,
    objectivesMet: objectivesMet, checkEnd: checkEnd
  };
});
