import * as THREE from 'three';

// Canonical fingerprint of a flat net, invariant under 2-D translation, rotation and
// reflection — so two layouts that are the "same net" (congruent flat arrangements,
// counted once like the 11 cube nets) get identical strings. Works for any face mix.
//
// Built from an INTRINSIC invariant — the multiset of pairwise face-centroid
// distances — rather than a chosen canonical orientation. Distances are exactly
// preserved by rotation/reflection, so congruent copies produce identical strings with
// no orientation frame to round (an orientation-canonical approach splits congruent
// nets apart once solids are no longer axis-aligned). Each face also carries its
// side-count, so e.g. a triangle and a square at the same spot never conflate.
//
// Per face we emit a signature = its side-count + the sorted, quantized distances to
// every other face; the fingerprint is the sorted list of those signatures. This
// distance-signature is a standard, strongly discriminating point-set invariant.
//
// The offline net-count precompute (scripts/precompute-nets.mjs) computes the same
// fingerprint from a pure-math layout, so its counts match what the game discovers.

const COPLANAR_EPS = 0.05;
const QUANT = 100; // distances rounded to 1/QUANT of an edge length
const _p = new THREE.Vector3();

// Fingerprint from a list of { x, z, t } points (t = face side-count). The shared
// core used by both the live game (netFingerprint) and the offline precompute.
export function fingerprintFromPoints(pts) {
  const n = pts.length;
  const sigs = new Array(n);
  for (let i = 0; i < n; i++) {
    const ds = [];
    for (let j = 0; j < n; j++) {
      if (j === i) continue;
      const dx = pts[i].x - pts[j].x;
      const dz = pts[i].z - pts[j].z;
      ds.push(Math.round(Math.hypot(dx, dz) * QUANT));
    }
    ds.sort((a, b) => a - b);
    sigs[i] = `${pts[i].t}:${ds.join(',')}`;
  }
  sigs.sort();
  return sigs.join('|');
}

// Live fingerprint of the poly's current pose. Returns null if the faces aren't
// coplanar (not laid flat).
export function netFingerprint(poly) {
  const pts = [];
  let y0 = null;
  for (const f of poly.faces) {
    f.group.getWorldPosition(_p);
    if (y0 === null) y0 = _p.y;
    else if (Math.abs(_p.y - y0) > COPLANAR_EPS) return null; // not laid flat
    pts.push({ x: _p.x, z: _p.z, t: f.getEdges().length });
  }
  return fingerprintFromPoints(pts);
}
