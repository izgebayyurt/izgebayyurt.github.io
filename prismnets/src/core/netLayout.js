import { Vector3 } from 'three';
import { fingerprintFromPoints } from './netFingerprint.js';

// Pure-math edge-unfolding shared by the offline precompute and the live game, so both
// derive a net's canonical fingerprint the SAME way — from the solid's intrinsic
// geometry plus a spanning tree, never from drifted folded float positions.
//
// `geom` (from solidGeometry) carries each face's outward-normal CCW 2-D frame. A net
// is a spanning tree of the face-adjacency graph: laying it flat places face 0 in its
// own frame, then hinges each child onto its parent's shared edge with a rotation-only
// rigid map (no reflection) — so coplanar parent/child land on opposite sides without
// mirroring, for any face mix.

const OVERLAP_EPS = 0.5; // unit-edge faces whose centroids are this close overlap

function _sub(a, b) { return new Vector3().subVectors(a, b); }

function newellNormal(pts) {
  const N = new Vector3();
  for (let i = 0; i < pts.length; i++) {
    const a = pts[i], b = pts[(i + 1) % pts.length];
    N.x += (a.y - b.y) * (a.z + b.z);
    N.y += (a.z - b.z) * (a.x + b.x);
    N.z += (a.x - b.x) * (a.y + b.y);
  }
  return N.normalize();
}

// Build reusable geometry from a solid's { vertices:[[x,y,z]…], faces:[[vIdx…]…] }:
// per-face outward CCW frame + the face-adjacency graph (one edge per shared edge).
export function solidGeometry(data) {
  const V = data.vertices.map((p) => new Vector3(p[0], p[1], p[2]));
  const O = new Vector3();
  for (const p of V) O.add(p);
  O.multiplyScalar(1 / V.length);

  const faces = data.faces.map((vi) => {
    const c3 = new Vector3();
    for (const i of vi) c3.add(V[i]);
    c3.multiplyScalar(1 / vi.length);
    const N = newellNormal(vi.map((i) => V[i]));
    if (N.dot(_sub(c3, O)) < 0) N.negate();
    const e1 = _sub(V[vi[0]], c3).normalize();
    const e2 = new Vector3().crossVectors(N, e1).normalize();
    return { v: vi, sides: vi.length, c3, e1, e2 };
  });

  const edgeMap = new Map();
  for (let fi = 0; fi < data.faces.length; fi++) {
    const vi = data.faces[fi];
    for (let j = 0; j < vi.length; j++) {
      const a = vi[j], b = vi[(j + 1) % vi.length];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!edgeMap.has(key)) edgeMap.set(key, { va: Math.min(a, b), vb: Math.max(a, b), fs: [] });
      edgeMap.get(key).fs.push(fi);
    }
  }
  const edges = [];
  for (const { va, vb, fs } of edgeMap.values()) {
    if (fs.length === 2) edges.push({ u: fs[0], v: fs[1], va, vb });
  }
  return { V, faces, edges };
}

// Lay the solid flat from face 0 along a spanning tree (array of indices into
// geom.edges). Returns { centroids:[{x,z,t}], valid } — `valid` is false if it
// self-overlaps. Centroids feed fingerprintFromPoints.
export function layoutTree(geom, treeEdgeIdx) {
  const { V, faces } = geom;
  const F = faces.length;

  const adj = Array.from({ length: F }, () => []);
  for (const i of treeEdgeIdx) {
    const e = geom.edges[i];
    adj[e.u].push({ to: e.v, va: e.va, vb: e.vb });
    adj[e.v].push({ to: e.u, va: e.va, vb: e.vb });
  }

  const pos2D = new Array(F);    // pos2D[f] = Map(globalVtxIdx → [x, z])
  const centroid = new Array(F);

  const root = faces[0];
  const rm = new Map();
  for (const gi of root.v) {
    const d = _sub(V[gi], root.c3);
    rm.set(gi, [d.dot(root.e1), d.dot(root.e2)]);
  }
  pos2D[0] = rm;
  centroid[0] = [0, 0];

  const visited = new Uint8Array(F); visited[0] = 1;
  const queue = [0];
  let placed = 1;
  while (queue.length) {
    const p = queue.shift();
    for (const { to, va, vb } of adj[p]) {
      if (visited[to]) continue;
      visited[to] = 1; placed++;
      placeChild(geom, pos2D, centroid, p, to, va, vb);
      queue.push(to);
    }
  }
  // The hinge edges must connect every face (a real spanning tree); otherwise the
  // input isn't a valid net.
  if (placed !== F) return { centroids: [], polygons: [], valid: false };

  const centroids = centroid.map((c, i) => ({ x: c[0], z: c[1], t: faces[i].sides }));
  const polygons = faces.map((f, i) => f.v.map((gi) => pos2D[i].get(gi)));
  return { centroids, polygons, valid: noOverlap(centroid) };
}

function placeChild(geom, pos2D, centroid, parent, child, va, vb) {
  const { V, faces } = geom;
  const f = faces[child];

  const local = new Map();
  for (const gi of f.v) {
    const d = _sub(V[gi], f.c3);
    local.set(gi, [d.dot(f.e1), d.dot(f.e2)]);
  }

  const A2 = pos2D[parent].get(va);
  const B2 = pos2D[parent].get(vb);
  const la = local.get(va), lb = local.get(vb);
  const sv = [lb[0] - la[0], lb[1] - la[1]];
  const tv = [B2[0] - A2[0], B2[1] - A2[1]];
  const ang = Math.atan2(tv[1], tv[0]) - Math.atan2(sv[1], sv[0]);
  const cos = Math.cos(ang), sin = Math.sin(ang);
  const map = (lx, ly) => {
    const rx = lx - la[0], ry = ly - la[1];
    return [A2[0] + rx * cos - ry * sin, A2[1] + rx * sin + ry * cos];
  };

  const m = new Map();
  for (const [gi, [lx, ly]] of local) m.set(gi, map(lx, ly));
  pos2D[child] = m;
  centroid[child] = map(0, 0);
}

function noOverlap(centroid) {
  for (let i = 0; i < centroid.length; i++) {
    for (let j = i + 1; j < centroid.length; j++) {
      const dx = centroid[i][0] - centroid[j][0];
      const dz = centroid[i][1] - centroid[j][1];
      if (Math.hypot(dx, dz) < OVERLAP_EPS) return false;
    }
  }
  return true;
}

// Convenience: canonical fingerprint of a tree, or null if it self-overlaps.
export function treeFingerprint(geom, treeEdgeIdx) {
  const { centroids, valid } = layoutTree(geom, treeEdgeIdx);
  return valid ? fingerprintFromPoints(centroids) : null;
}

// Canonical fingerprint + drawable footprint (face polygons of [x,z] corners) for a
// tree, or null if it self-overlaps. Used by the live game to register a found net.
export function netFromTree(geom, treeEdgeIdx) {
  const { centroids, polygons, valid } = layoutTree(geom, treeEdgeIdx);
  if (!valid) return null;
  return { fingerprint: fingerprintFromPoints(centroids), footprint: polygons };
}

// Index geom.edges by their global vertex pair "min_max" → edge index, so a live poly
// can translate its hinge edges into spanning-tree indices.
export function edgeIndexByVertexPair(geom) {
  const map = new Map();
  geom.edges.forEach((e, i) => map.set(`${e.va}_${e.vb}`, i));
  return map;
}

// Enumerate every distinct net of the solid (spanning trees of the face-adjacency
// graph, deduped by fingerprint, non-overlapping only) → [{ fingerprint, footprint }].
// Used client-side for the Net Hunt hint; only called for small, playable solids, so
// the spanning-tree count is in the hundreds. `cap` aborts on anything larger.
export function allNets(geom, cap = 20000) {
  const F = geom.faces.length, E = geom.edges.length;
  const parent = new Int32Array(F).map((_, i) => i);
  const find = (x) => { while (parent[x] !== x) x = parent[x]; return x; };
  const out = new Map();
  const chosen = [];
  let trees = 0, aborted = false;

  function rec(i, count) {
    if (aborted) return;
    if (count === F - 1) {
      if (++trees > cap) { aborted = true; return; }
      const { centroids, polygons, valid } = layoutTree(geom, chosen);
      if (valid) { const fp = fingerprintFromPoints(centroids); if (!out.has(fp)) out.set(fp, polygons); }
      return;
    }
    if (i === E || count + (E - i) < F - 1) return;
    const e = geom.edges[i];
    if (find(e.u) !== find(e.v)) {
      const snap = parent.slice();
      parent[find(e.u)] = find(e.v);
      chosen.push(i); rec(i + 1, count + 1); chosen.pop();
      parent.set(snap);
    }
    rec(i + 1, count);
  }
  rec(0, 0);
  if (aborted) return null;
  return [...out.entries()].map(([fingerprint, footprint]) => ({ fingerprint, footprint }));
}
