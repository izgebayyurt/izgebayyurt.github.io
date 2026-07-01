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
  var POP_MIN = 4;

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
    var obj = level.objectives.map(function (o) { return { color: o.color, need: o.count, have: 0 }; });
    return {
      W: p.W, H: p.H, mask: p.mask, grid: grid,
      spawn: level.spawn, spawnFn: makeSpawner(level.spawn),
      obj: obj, movesLeft: level.moves, moves: level.moves,
      score: 0, won: false, lost: false, level: level
    };
  }

  function clone(s) {
    return {
      W: s.W, H: s.H, mask: s.mask,
      grid: s.grid.map(function (row) { return row.slice(); }),
      spawn: s.spawn, spawnFn: s.spawnFn,
      obj: s.obj.map(function (o) { return { color: o.color, need: o.need, have: o.have }; }),
      movesLeft: s.movesLeft, moves: s.moves, score: s.score, won: s.won, lost: s.lost, level: s.level
    };
  }

  function findPops(s) {
    var seen = {}, comps = [], r, c;
    for (r = 0; r < s.H; r++) for (c = 0; c < s.W; c++) {
      if (!s.mask[r][c]) continue;
      var key = r + "," + c, v = s.grid[r][c];
      if (!v || seen[key]) continue;
      var stack = [[r, c]], comp = []; seen[key] = 1;
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
      if (comp.length >= POP_MIN) comps.push(comp);
    }
    return comps;
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
        if (i < empty) { s.grid[r][c] = s.spawnFn(rng); fresh[r + "," + c] = 1; }
        else s.grid[r][c] = existing[i - empty];
      }
    }
    return fresh;
  }

  function creditObjectives(s, color) {
    for (var i = 0; i < s.obj.length; i++) if (s.obj[i].color === color && s.obj[i].have < s.obj[i].need) s.obj[i].have++;
  }

  function clearComps(s, comps) {
    var cleared = 0, gain = 0, i, j;
    for (i = 0; i < comps.length; i++) {
      var comp = comps[i], n = comp.length;
      for (j = 0; j < comp.length; j++) {
        var p = split(comp[j]), col = s.grid[p[0]][p[1]];
        s.grid[p[0]][p[1]] = null; cleared++;
        creditObjectives(s, col);
      }
      var over = n - POP_MIN;
      gain += n * 12 + over * over * 16;
    }
    return { cleared: cleared, gain: gain };
  }

  function fill(s, rng) {
    for (var c = 0; c < s.W; c++) { var rows = colRows(s, c); for (var i = 0; i < rows.length; i++) s.grid[rows[i]][c] = s.spawnFn(rng); }
    var guard = 0;
    while (guard++ < 300) {
      var comps = findPops(s);
      if (!comps.length) break;
      for (var a = 0; a < comps.length; a++) for (var b = 0; b < comps[a].length; b++) { var p = split(comps[a][b]); s.grid[p[0]][p[1]] = null; }
      gravity(s, rng);
    }
  }

  /* "eat": dragging onto a SAME-coloured neighbour — the neighbour's identity
     doesn't change, but it's the chain-drag's bread and butter (see applyEat).
     Anything else that isn't a same-colour pair or a different-primary pair
     (e.g. primary+secondary, or two different secondaries) is just not a
     valid direction to move in — "illegal", full stop. */
  function classify(s, from, to) {
    if (!playable(s, from.r, from.c) || !playable(s, to.r, to.c)) return "illegal";
    if (Math.abs(from.r - to.r) + Math.abs(from.c - to.c) !== 1) return "illegal";
    var a = s.grid[from.r][from.c], b = s.grid[to.r][to.c];
    if (!a || !b) return "illegal";
    if (isPrim(a) && isPrim(b) && a !== b) return "mix";
    if (a === b) return "eat";
    return "illegal";
  }

  function applyMix(s, a, b) { var m = mix(s.grid[a.r][a.c], s.grid[b.r][b.c]); s.grid[b.r][b.c] = m; s.grid[a.r][a.c] = null; return m; }
  /* chain-drag step: `to` is same colour as `from`, so it's absorbed — `from`
     empties (the caller owes a gravity() pass), `to` is left untouched and is
     the new anchor for continuing the chain. The running count/colour being
     chained is gesture-side state, not stored on the grid. */
  function applyEat(s, from, to) { s.grid[from.r][from.c] = null; }

  /* banks a virtual (already-consumed) same-colour chain of `count` tiles —
     used when a chain-drag ends (release, or diverts into a mix) — crediting
     objectives and scoring exactly as clearGroup would for a real spatial
     group, without needing one (the tiles are already gone from the board,
     eaten one at a time as the chain progressed). */
  function bankVirtualClear(s, color, count) {
    if (count <= 0) return { cleared: 0, gain: 0 };
    for (var i = 0; i < count; i++) creditObjectives(s, color);
    var over = Math.max(0, count - POP_MIN);
    return { cleared: count, gain: count * 12 + over * over * 16 };
  }

  /* flood-fill the connected same-colour group seeded at one cell, ANY size >=1
     (unlike findPops, this is not gated by POP_MIN — it's used for player-driven
     manual clearing, where even a lone stuck tile is a legal, if inefficient,
     target). Returns [] if the cell is empty/unplayable. */
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

  /* every connected group on the board, one entry each (dedup by component,
     not by cell) — used to enumerate distinct clear targets. */
  function allComponents(s) {
    var seen = {}, comps = [], r, c;
    for (r = 0; r < s.H; r++) for (c = 0; c < s.W; c++) {
      if (!playable(s, r, c) || !s.grid[r][c]) continue;
      var key = r + "," + c;
      if (seen[key]) continue;
      var comp = groupAt(s, r, c);
      for (var i = 0; i < comp.length; i++) seen[comp[i]] = 1;
      comps.push(comp);
    }
    return comps;
  }

  /* player-driven manual clear (the "double-tap" action): pops the WHOLE
     connected group at (r,c), any size, crediting objectives per tile.
     POP_MIN is now purely a scoring bonus threshold, not a mechanical gate —
     the caller still owes a gravity() pass to refill. */
  function clearGroup(s, r, c) {
    var comp = groupAt(s, r, c);
    if (!comp.length) return { cleared: 0, gain: 0, comp: comp };
    var n = comp.length, i;
    for (i = 0; i < comp.length; i++) {
      var p = split(comp[i]), col = s.grid[p[0]][p[1]];
      s.grid[p[0]][p[1]] = null;
      creditObjectives(s, col);
    }
    var over = Math.max(0, n - POP_MIN);
    return { cleared: n, gain: n * 12 + over * over * 16, comp: comp };
  }

  /* legal actions in the merge-only design: mix (drag two adjacent different
     primaries) or clear (tap any populated cell — one action per distinct
     connected component, since every cell in a component yields the same
     outcome). There is always at least one clear action available on any
     board with a playable cell, so this list is never empty. */
  function legalActions(s) {
    var res = [], r, c, i;
    for (r = 0; r < s.H; r++) for (c = 0; c < s.W; c++) {
      if (!playable(s, r, c) || !s.grid[r][c]) continue;
      var nb = [[r, c + 1], [r + 1, c], [r, c - 1], [r - 1, c]];
      for (i = 0; i < 4; i++) {
        var nr = nb[i][0], nc = nb[i][1];
        if (!playable(s, nr, nc) || !s.grid[nr][nc]) continue;
        if (classify(s, { r: r, c: c }, { r: nr, c: nc }) === "mix") {
          res.push({ type: "mix", from: { r: r, c: c }, to: { r: nr, c: nc } });
        }
      }
    }
    var comps = allComponents(s);
    for (i = 0; i < comps.length; i++) {
      var p = split(comps[i][0]);
      res.push({ type: "clear", r: p[0], c: p[1], size: comps[i].length });
    }
    return res;
  }

  /* apply one legal action in place: mix refills only the emptied source cell;
     clear refills the whole popped group. Both end with a full board. */
  function applyAction(s, action, rng) {
    if (action.type === "mix") { applyMix(s, action.from, action.to); gravity(s, rng); return 0; }
    var res = clearGroup(s, action.r, action.c);
    gravity(s, rng);
    s.score += res.gain;
    return res.gain;
  }

  function stepAction(s, action, rng) {
    applyAction(s, action, rng);
    s.movesLeft--;
    checkEnd(s);
  }

  function objectivesMet(s) { for (var i = 0; i < s.obj.length; i++) if (s.obj[i].have < s.obj[i].need) return false; return true; }
  function checkEnd(s) { if (objectivesMet(s)) s.won = true; else if (s.movesLeft <= 0) s.lost = true; return s; }

  return {
    PRIM: PRIM, SEC: SEC, COLORS: COLORS, HEX: HEX, NAME: NAME, POP_MIN: POP_MIN,
    isPrim: isPrim, mix: mix, split: split,
    makeSpawner: makeSpawner, parseShape: parseShape, playable: playable,
    colRows: colRows, playableCount: playableCount,
    newState: newState, clone: clone, fill: fill,
    findPops: findPops, gravity: gravity, clearComps: clearComps,
    groupAt: groupAt, allComponents: allComponents, clearGroup: clearGroup,
    legalActions: legalActions, applyAction: applyAction, stepAction: stepAction,
    classify: classify, applyMix: applyMix, applyEat: applyEat, bankVirtualClear: bankVirtualClear,
    objectivesMet: objectivesMet, checkEnd: checkEnd
  };
});
