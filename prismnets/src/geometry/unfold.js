import * as THREE from 'three';
import { rotateAroundWorldAxis } from '../mathutil.js';
import { IdleState } from '../core/StateMachine.js';

// Shared instant-unfold helpers. Used by both the puzzle and the gauntlet to lay a
// solid flat into a net along a (random) spanning tree, without animation.

const _fp = new THREE.Vector3();
const _fv = new THREE.Vector3();
const _wpos = new THREE.Vector3();

const OVERLAP_EPS = 0.5; // unit-edge solids: centres closer than this are stacked

// Randomized DFS spanning tree from the root. DFS (go deep before siblings) gives
// net VARIETY: a BFS tree always wires all of the root's neighbours straight to the
// root, so it can only ever produce the cross; DFS reaches strips, L-shapes, etc.
// Each discovered face is reparented under the face that found it (building the
// nested fold hierarchy) and recorded in pre-order (parent before child) so the
// rotation pass is valid. Reparenting while assembled — `attach` preserves world
// transform — just nests the groups without moving geometry.
export function buildSpanningTree(poly, shuffle) {
  const ops = [];
  const visited = new Set([poly.root]);

  const visit = (parent) => {
    const edges = parent.getEdges().filter((e) => !e.isSevered());
    if (shuffle) {
      for (let i = edges.length - 1; i > 0; i--) {
        const j = (Math.random() * (i + 1)) | 0;
        [edges[i], edges[j]] = [edges[j], edges[i]];
      }
    }
    for (const e of edges) {
      const child = e.getConnectedEdge().getFace();
      if (visited.has(child)) continue;
      visited.add(child);
      parent.group.attach(child.group); // nest into the fold hierarchy
      ops.push({ face: child, foldEdge: e.getConnectedEdge() });
      visit(child); // DFS: descend before taking the next sibling
    }
  };
  visit(poly.root);
  return ops;
}

// Lay the solid flat into a net along a spanning tree (instant, no animation).
export function unfoldNet(poly, shuffle) {
  poly.reset();
  for (const f of poly.faces) poly.group.attach(f.group); // flatten before reparenting

  const ops = buildSpanningTree(poly, shuffle);
  for (const { face, foldEdge } of ops) {
    foldEdge.getFoldPoint(_fp);
    foldEdge.getFoldVector(_fv);
    rotateAroundWorldAxis(face.group, _fp, _fv, -foldEdge.foldAngle);
    face.unfolded = true;
    face.currentAngle = foldEdge.foldAngle;
  }

  poly.recalculateConnections();
  poly.recalculateRanks();
  poly.correctActiveButtons();
  poly.psm.changeState(new IdleState(poly));
}

// True if no two face centres are within OVERLAP_EPS (i.e. the net laid out flat
// without self-overlap).
export function isFlatNetValid(poly) {
  const centres = poly.faces.map((f) => { f.group.getWorldPosition(_wpos); return _wpos.clone(); });
  for (let i = 0; i < centres.length; i++) {
    for (let j = i + 1; j < centres.length; j++) {
      if (centres[i].distanceTo(centres[j]) < OVERLAP_EPS) return false;
    }
  }
  return true;
}

// Max pairwise face-centre distance — a simple measure of how spread-out the net is.
export function netSpread(poly) {
  const centres = poly.faces.map((f) => { f.group.getWorldPosition(_wpos); return _wpos.clone(); });
  let max = 0;
  for (let i = 0; i < centres.length; i++) {
    for (let j = i + 1; j < centres.length; j++) {
      max = Math.max(max, centres[i].distanceTo(centres[j]));
    }
  }
  return max;
}

// Try random spanning trees, return the first valid (non-overlapping) net. Falls
// back to the deterministic DFS net if none laid out flat in time.
export function randomValidNet(poly, attempts = 12) {
  for (let i = 0; i < attempts; i++) {
    unfoldNet(poly, true);
    if (isFlatNetValid(poly)) return true;
  }
  unfoldNet(poly, false);
  return isFlatNetValid(poly);
}

// Deliberately produce a flat arrangement that WON'T close: lay out a valid net,
// then flip one leaf flap 180° about its hinge so it folds back over its neighbour
// (a guaranteed overlap). Random overlapping unfoldings are too rare (<1–8%) to rely
// on, so this constructs one directly and works for any solid. Returns true if it
// made an overlap (poly left in that state).
export function makeOverlapNet(poly) {
  randomValidNet(poly);
  // A leaf in the net has exactly one non-severed (hinge) edge.
  const leaf = poly.faces.find(
    (f) => f !== poly.root && f.getEdges().filter((e) => !e.isSevered()).length === 1,
  );
  if (!leaf) return false;
  const hinge = leaf.getEdges().find((e) => !e.isSevered());
  hinge.getFoldPoint(_fp);
  hinge.getFoldVector(_fv);
  rotateAroundWorldAxis(leaf.group, _fp, _fv, 180); // flip the flap back over its neighbour
  poly.recalculateConnections();
  return !isFlatNetValid(poly);
}

// Try random valid nets and return the one whose spread lands inside [min,max]
// (else the closest to the band). Leaves the poly in the chosen unfolded state.
export function unfoldWithSpread(poly, minSpread, maxSpread, attempts = 16) {
  let best = null, bestErr = Infinity, bestState = null;
  for (let i = 0; i < attempts; i++) {
    unfoldNet(poly, true);
    if (!isFlatNetValid(poly)) continue;
    const s = netSpread(poly);
    if (s >= minSpread && s <= maxSpread) return s;
    const err = s < minSpread ? minSpread - s : s - maxSpread;
    if (err < bestErr) { bestErr = err; best = s; bestState = snapshot(poly); }
  }
  if (bestState) restore(poly, bestState);
  else randomValidNet(poly);
  return best ?? netSpread(poly);
}

// Lightweight pose snapshot/restore (local transforms + parents) so we can keep the
// best-spread net found across attempts without re-rolling it.
function snapshot(poly) {
  return poly.faces.map((f) => ({
    face: f,
    parent: f.group.parent,
    pos: f.group.position.clone(),
    quat: f.group.quaternion.clone(),
    unfolded: f.unfolded,
    currentAngle: f.currentAngle,
  }));
}

function restore(poly, snap) {
  for (const s of snap) {
    if (s.parent && s.face.group.parent !== s.parent) s.parent.add(s.face.group);
    s.face.group.position.copy(s.pos);
    s.face.group.quaternion.copy(s.quat);
    s.face.unfolded = s.unfolded;
    s.face.currentAngle = s.currentAngle;
  }
  poly.group.updateMatrixWorld(true);
  poly.recalculateConnections();
  poly.recalculateRanks();
  poly.correctActiveButtons();
  poly.psm.changeState(new IdleState(poly));
}
