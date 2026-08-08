/* Shortest-path oracle over Goop Out states, plus the bookkeeping the
 * elegance audit needs.
 *
 * Two questions matter and they are not the same question:
 *
 *   1. How short is the shortest solution?  (is `par` honest?)
 *   2. Which cells does *any* shortest solution ever touch?
 *
 * (2) is the one that answers "you never had to use that thing". Rather than
 * enumerating optimal solutions — there can be thousands — we build the BFS
 * DAG, mark backwards from the win the edges that lie on some shortest path,
 * and union the cells those edges disturb. That is exact and cheap.
 */
'use strict';

const DIRS = ['up', 'down', 'left', 'right'];

/* Every cell any droplet occupied or passed through during one swipe. */
function moveTouched(before, res) {
  const t = new Set();
  for (const d of before.drops) t.add(d.r + ',' + d.c);
  for (const d of res.drops) {
    t.add(d.r + ',' + d.c);
    if (d.corners) for (const cc of d.corners) t.add(cc.r + ',' + cc.c);
  }
  for (const m of res.merges) for (const cc of m.trail) t.add(cc[0] + ',' + cc[1]);
  for (const dr of res.drains) for (const cc of dr.trail) t.add(cc[0] + ',' + cc[1]);
  return t;
}

/* Wall goo is a wall, so no trail ever enters it; the only evidence it did
   anything is a droplet that came out of the swipe newly glued. */
function newlyStuck(before, res) {
  const was = new Map(before.drops.map(d => [d.id, !!d.stuck]));
  return res.drops.some(d => d.stuck && !was.get(d.id));
}

/* BFS over swipe-states.
 *
 * Returns { solvable, optimal, nPaths, states, touchedAny, gooUsed, truncated }
 * where touchedAny is the union of cells disturbed along shortest solutions.
 */
function analyse(E, level, opts) {
  opts = opts || {};
  const maxDepth = opts.maxDepth || 40;
  const stateCap = opts.stateCap || 300000;
  const wantTouch = opts.touch !== false;

  const st = E.parse(level);           // (re)binds the shared board globals
  const s0 = { drops: st.drops, molds: st.molds };
  const k0 = E.sig(s0.drops, s0.molds);

  if (E.isWinS(s0.drops, s0.molds)) {
    return { solvable: true, optimal: 0, nPaths: 1, states: 1,
             touchedAny: new Set(), gooUsed: false, truncated: false,
             avoidable: () => true, gooAvoidable: () => true };
  }

  const dist = new Map([[k0, 0]]);
  const nodes = new Map([[k0, s0]]);
  const count = new Map([[k0, 1]]);
  /* edges[toKey] = [{from, touched, goo}] — only shortest-path edges kept */
  const edges = new Map();

  let frontier = [k0];
  let depth = 0;
  let winKey = null;
  let truncated = false;

  while (frontier.length && depth < maxDepth && !winKey) {
    const next = [];
    for (const key of frontier) {
      const s = nodes.get(key);
      for (const dir of DIRS) {
        const res = E.simulate(s.drops, s.molds, dir);
        /* the shipped solver treats a locked droplet as a dead branch */
        if (res.drops.some(d => d.locked)) continue;
        const ns = { drops: res.drops, molds: res.molds };
        const nk = E.sig(ns.drops, ns.molds);
        if (nk === key) continue;                       // swipe did nothing

        const known = dist.get(nk);
        if (known !== undefined && known <= depth) continue;

        if (known === undefined) {
          dist.set(nk, depth + 1);
          nodes.set(nk, ns);
          count.set(nk, 0);
          next.push(nk);
          if (dist.size > stateCap) { truncated = true; break; }
        }
        count.set(nk, count.get(nk) + count.get(key));
        if (wantTouch) {
          if (!edges.has(nk)) edges.set(nk, []);
          edges.get(nk).push({ from: key,
                               touched: moveTouched(s, res),
                               goo: newlyStuck(s, res) });
        }
        if (E.isWinS(ns.drops, ns.molds)) winKey = nk;
      }
      if (truncated) break;
    }
    if (truncated) break;
    depth++;
    frontier = next;
    if (winKey) break;
  }

  if (!winKey) {
    return { solvable: false, optimal: null, nPaths: 0, states: dist.size,
             touchedAny: new Set(), gooUsed: false, truncated,
             avoidable: () => undefined, gooAvoidable: () => undefined };
  }

  /* Walk the DAG backwards from the win, keeping only edges that lie on a
     shortest solution, and union what they disturb. */
  const touchedAny = new Set();
  let gooUsed = false;
  if (wantTouch) {
    const seen = new Set([winKey]);
    let layer = [winKey];
    while (layer.length) {
      const prev = [];
      for (const k of layer) {
        const inc = edges.get(k);
        if (!inc) continue;
        const d = dist.get(k);
        for (const e of inc) {
          if (dist.get(e.from) !== d - 1) continue;     // not a shortest edge
          for (const c of e.touched) touchedAny.add(c);
          if (e.goo) gooUsed = true;
          if (!seen.has(e.from)) { seen.add(e.from); prev.push(e.from); }
        }
      }
      layer = prev;
    }
  }

  /* "Touched by SOME shortest solution" is too generous a bar. The question
     that matches the complaint is whether a player can win while never
     touching the thing at all — so, for a given cell, ask whether the win is
     still reachable using only shortest-path edges that leave it alone.
     Cheap: one forward sweep over the DAG per cell asked about. */
  const optimal = dist.get(winKey);
  let fwd = null;
  const buildFwd = () => {
    fwd = new Map();
    for (const [to, inc] of edges) {
      const dTo = dist.get(to);
      for (const e of inc) {
        if (dist.get(e.from) !== dTo - 1) continue;
        if (!fwd.has(e.from)) fwd.set(e.from, []);
        fwd.get(e.from).push({ to, touched: e.touched, goo: e.goo });
      }
    }
  };

  /* skip(e) -> true when this edge must not be used */
  function winsWhileAvoiding(skip) {
    if (!fwd) buildFwd();
    let layer = new Set([k0]);
    for (let d = 0; d < optimal; d++) {
      const nxt = new Set();
      for (const k of layer) {
        const outs = fwd.get(k);
        if (!outs) continue;
        for (const e of outs) { if (!skip(e)) nxt.add(e.to); }
      }
      if (!nxt.size) return false;
      layer = nxt;
    }
    return layer.has(winKey);
  }

  const heavy = dist.size > 60000;
  return {
    solvable: true, optimal, nPaths: count.get(winKey),
    states: dist.size, touchedAny, gooUsed, truncated,
    /* undefined = too big to answer honestly rather than a silent false */
    avoidable: cellKey => (heavy || !wantTouch) ? undefined
      : winsWhileAvoiding(e => e.touched.has(cellKey)),
    /* a machine made of several cells is dodged only if all of it is */
    avoidableCells: cells => (heavy || !wantTouch) ? undefined
      : winsWhileAvoiding(e => cells.some(c => e.touched.has(c))),
    gooAvoidable: () => (heavy || !wantTouch) ? undefined
      : winsWhileAvoiding(e => e.goo)
  };
}

/* Every state the board can reach, win or not.
 *
 * analyse() stops the moment it finds the win, so it says nothing about the
 * rest of the space — and the rest of the space is most of what a player
 * actually experiences while solving. Two levels can share a shortest
 * solution and a shortest-solution count while offering completely different
 * amounts of board to think about. */
function reachCount(E, level, cap) {
  cap = cap || 400000;
  const st = E.parse(level);
  let layer = [{ drops: st.drops, molds: st.molds }];
  const seen = new Set([E.sig(st.drops, st.molds)]);
  while (layer.length) {
    const next = [];
    for (const s of layer) {
      for (const dir of DIRS) {
        const r = E.simulate(s.drops, s.molds, dir);
        if (r.drops.some(d => d.locked)) continue;
        const k = E.sig(r.drops, r.molds);
        if (seen.has(k)) continue;
        seen.add(k);
        if (seen.size > cap) return { n: seen.size, truncated: true };
        next.push({ drops: r.drops, molds: r.molds });
      }
    }
    layer = next;
  }
  return { n: seen.size, truncated: false };
}

/* Is there a par-length solution that never engages a given gadget?
 *
 * The obvious test — "does any droplet's trail cross the gadget's cell?" — is
 * wrong, and wrong in precisely the case wedges and bumpers exist for. A
 * bounce reverses a droplet *before* it enters the deflecting cell, so the
 * cell never appears in any trail even though it just redirected the whole
 * move. Trail-watching therefore reports the most important interactions in
 * the game as non-interactions.
 *
 * So don't watch trails. Run the real board and a copy with the gadget
 * neutralised side by side, feeding both the same swipes, and demand the two
 * stay in *identical* droplet configurations at every step. If a par-length
 * win survives that, the gadget provably influenced nothing along the way —
 * whatever mechanism it might have used. EA and EB are two independent
 * engines so each keeps its own board bound and neither needs re-parsing.
 */
function lockstepParSolution(EA, EB, mapA, mapB, par, cap) {
  cap = cap || 200000;
  const a0 = EA.parse({ map: mapA });
  const b0 = EB.parse({ map: mapB });
  let s = { drops: a0.drops, molds: a0.molds };
  if (EA.sig(a0.drops, a0.molds) !== EB.sig(b0.drops, b0.molds)) return false;

  let layer = [s];
  const seen = new Set([EA.sig(s.drops, s.molds)]);
  for (let d = 0; d < par; d++) {
    const next = [];
    for (const cur of layer) {
      for (const dir of DIRS) {
        const ra = EA.simulate(cur.drops, cur.molds, dir);
        if (ra.drops.some(x => x.locked)) continue;
        const ka = EA.sig(ra.drops, ra.molds);
        if (ka === EA.sig(cur.drops, cur.molds)) continue;    // no-op swipe

        const rb = EB.simulate(cur.drops, cur.molds, dir);
        /* the moment the two boards disagree, the gadget mattered */
        if (ka !== EB.sig(rb.drops, rb.molds)) continue;

        if (EA.isWinS(ra.drops, ra.molds)) return d + 1 === par;
        if (seen.has(ka)) continue;
        seen.add(ka);
        if (seen.size > cap) return false;
        next.push({ drops: ra.drops, molds: ra.molds });
      }
    }
    layer = next;
    if (!layer.length) return false;
  }
  return false;
}

module.exports = { analyse, reachCount, lockstepParSolution, DIRS };
