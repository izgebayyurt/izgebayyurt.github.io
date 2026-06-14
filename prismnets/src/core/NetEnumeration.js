import * as THREE from 'three';
import { netFingerprint } from './netFingerprint.js';
import { netFromTree, edgeIndexByVertexPair } from './netLayout.js';

export const TOTAL_NETS_FOR_CUBE = 11;

const OVERLAP_EPS = 0.5; // unit-edge faces whose centroids are this close overlap
const _p = new THREE.Vector3();
const _c = new THREE.Vector3();

/**
 * Detects when the solid is fully laid flat and registers the net under a canonical
 * fingerprint invariant to translation/rotation/reflection, so congruent layouts are
 * counted once — the 11 cube nets, 2 tetrahedron nets, etc.
 *
 * Generalized from the cube-only manager. When given the solid's `geom`
 * (netLayout.solidGeometry), it reads the player's current spanning tree from the live
 * hinges and computes the canonical fingerprint via the SAME pure-math layout the
 * offline precompute uses — so the live count matches the catalog's netCount exactly,
 * independent of folded-geometry float drift. Without `geom` it falls back to
 * fingerprinting the live flat pose directly (used by the cube-only unit tests).
 */
export class NetEnumeration {
  constructor(total = TOTAL_NETS_FOR_CUBE, geom = null) {
    this.total = total;
    this.geom = geom;
    this.edgeIndex = geom ? edgeIndexByVertexPair(geom) : null;
    this.foundNets = [];        // canonical strings, in discovery order
    this.foundFootprints = [];  // face-polygon footprints (for HUD thumbnails)
    this.onNewNetFound = null;   // (index) => void
    this.onDuplicateFound = null; // (index) => void
    this.onAllFound = null;       // () => void
  }

  get foundCount() { return this.foundNets.length; }
  get allFound() { return this.foundNets.length >= this.total; }

  reset() { this.foundNets = []; this.foundFootprints = []; }

  tryRegisterNet(poly) {
    if (!isFullyUnfolded(poly)) return false;

    let canonical, footprint;
    if (this.geom) {
      const res = netFromTree(this.geom, this._treeIndices(poly));
      if (!res) return false;                     // disconnected or self-overlapping
      canonical = res.fingerprint;
      footprint = res.footprint;
    } else {
      canonical = netFingerprint(poly);
      if (canonical == null) return false;        // not coplanar → not flat
      if (isOverlapping(poly)) return false;      // self-overlapping → not a valid net
      footprint = footprintOf(poly);
    }

    const idx = this.foundNets.indexOf(canonical);
    if (idx >= 0) { this.onDuplicateFound?.(idx); return false; }

    this.foundNets.push(canonical);
    this.foundFootprints.push(footprint);
    const newIdx = this.foundNets.length - 1;
    this.onNewNetFound?.(newIdx);
    if (this.allFound) this.onAllFound?.();
    return true;
  }

  // The current spanning tree as indices into geom.edges: the non-severed (hinge)
  // edges, deduped across the two half-edges of each shared edge.
  _treeIndices(poly) {
    const set = new Set();
    for (const f of poly.faces) {
      for (const e of f.getEdges()) {
        if (e.isSevered()) continue;
        const i = this.edgeIndex.get(`${e.va}_${e.vb}`);
        if (i !== undefined) set.add(i);
      }
    }
    return [...set];
  }
}

function isFullyUnfolded(poly) {
  return poly.faces.every((f) => f.unfolded || f === poly.root);
}

// True if any two face centroids land within OVERLAP_EPS (the net folds over itself).
function isOverlapping(poly) {
  const c = poly.faces.map((f) => { f.group.getWorldPosition(_p); return [_p.x, _p.z]; });
  for (let i = 0; i < c.length; i++) {
    for (let j = i + 1; j < c.length; j++) {
      if (Math.hypot(c[i][0] - c[j][0], c[i][1] - c[j][1]) < OVERLAP_EPS) return true;
    }
  }
  return false;
}

// Each face as a polygon of [x, z] corners relative to the root centroid (fallback
// footprint from the live pose, when no shared geometry is available).
function footprintOf(poly) {
  poly.root.group.getWorldPosition(_c);
  return poly.faces.map((f) =>
    f.corners.map((corner) => {
      corner.getWorldPosition(_p);
      return [_p.x - _c.x, _p.z - _c.z];
    }),
  );
}
