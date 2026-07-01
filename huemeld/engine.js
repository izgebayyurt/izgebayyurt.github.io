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

  function classify(s, from, to) {
    if (!playable(s, from.r, from.c) || !playable(s, to.r, to.c)) return "illegal";
    if (Math.abs(from.r - to.r) + Math.abs(from.c - to.c) !== 1) return "illegal";
    var a = s.grid[from.r][from.c], b = s.grid[to.r][to.c];
    if (!a || !b) return "illegal";
    if (isPrim(a) && isPrim(b) && a !== b) return "mix";
    if (a === b) return "noop";
    return "swap";
  }

  function doMove(s, from, to) {
    var t = classify(s, from, to);
    if (t === "mix") {
      s.grid[to.r][to.c] = mix(s.grid[from.r][from.c], s.grid[to.r][to.c]);
      s.grid[from.r][from.c] = null;
      return { type: "mix", emptied: from, target: to };
    }
    if (t === "swap") {
      var a = s.grid[from.r][from.c];
      s.grid[from.r][from.c] = s.grid[to.r][to.c];
      s.grid[to.r][to.c] = a;
      return { type: "swap" };
    }
    return { type: t };
  }

  /* unconditional applies for the browser's intent-driven input (a forced swap of
     two primaries must NOT mix; a forced mix skips classification). */
  function applySwap(s, a, b) { var t = s.grid[a.r][a.c]; s.grid[a.r][a.c] = s.grid[b.r][b.c]; s.grid[b.r][b.c] = t; }
  function applyMix(s, a, b) { var m = mix(s.grid[a.r][a.c], s.grid[b.r][b.c]); s.grid[b.r][b.c] = m; s.grid[a.r][a.c] = null; return m; }

  function legalMoves(s) {
    var res = [], r, c;
    for (r = 0; r < s.H; r++) for (c = 0; c < s.W; c++) {
      if (!playable(s, r, c) || !s.grid[r][c]) continue;
      var nb = [[r, c + 1], [r + 1, c], [r, c - 1], [r - 1, c]];
      for (var i = 0; i < 4; i++) {
        var nr = nb[i][0], nc = nb[i][1];
        if (!playable(s, nr, nc) || !s.grid[nr][nc]) continue;
        var t = classify(s, { r: r, c: c }, { r: nr, c: nc });
        if (t === "mix" || t === "swap") res.push({ from: { r: r, c: c }, to: { r: nr, c: nc }, type: t });
      }
    }
    return res;
  }

  function objectivesMet(s) { for (var i = 0; i < s.obj.length; i++) if (s.obj[i].have < s.obj[i].need) return false; return true; }
  function checkEnd(s) { if (objectivesMet(s)) s.won = true; else if (s.movesLeft <= 0) s.lost = true; return s; }

  /* full synchronous cascade (used by the simulator; the browser drives the
     same primitives step-by-step so it can animate between waves). */
  function cascade(s, rng) {
    var combo = 0, total = 0;
    while (true) {
      var comps = findPops(s);
      if (!comps.length) break;
      combo++;
      var r = clearComps(s, comps);
      var g = Math.round(r.gain * combo);
      total += g; s.score += g;
      gravity(s, rng);
    }
    return total;
  }

  /* commit one player move + resolve. Returns false if the move was illegal/noop
     (no move charged). */
  function step(s, from, to, rng) {
    var t = classify(s, from, to);
    if (t !== "mix" && t !== "swap") return false;
    doMove(s, from, to);
    s.movesLeft--;
    cascade(s, rng);
    checkEnd(s);
    return true;
  }

  return {
    PRIM: PRIM, SEC: SEC, COLORS: COLORS, HEX: HEX, NAME: NAME, POP_MIN: POP_MIN,
    isPrim: isPrim, mix: mix, split: split,
    makeSpawner: makeSpawner, parseShape: parseShape, playable: playable,
    colRows: colRows, playableCount: playableCount,
    newState: newState, clone: clone, fill: fill,
    findPops: findPops, gravity: gravity, clearComps: clearComps,
    classify: classify, doMove: doMove, applySwap: applySwap, applyMix: applyMix, legalMoves: legalMoves,
    objectivesMet: objectivesMet, checkEnd: checkEnd, cascade: cascade, step: step
  };
});
