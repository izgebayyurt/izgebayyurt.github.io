import * as THREE from 'three';
import { PolyhedronStateMachine, IdleState } from './StateMachine.js';
import { isChildOf } from './Face.js';

const CONNECT_EPS = 0.02; // world units; two half-edges this close count as hinged

// Face fill colours for net hunting: the fixed base is gold, faces already laid flat
// (unfolded) are violet, faces still folded up are the default blue.
export const FACE_COLORS = { folded: 0x45afee, unfolded: 0x9b7fe0, base: 0xf2c238 };

const _a = new THREE.Vector3();
const _b = new THREE.Vector3();

/**
 * Port of PolyhedronStructure.Polyhedron. `group` is the root THREE.Object3D that all
 * faces live under; faces get reparented into a BFS tree by recalculateRanks().
 */
export class Polyhedron {
  constructor(group) {
    this.group = group;
    this.faces = [];
    this.root = null;
    this.moves = [];
    this.psm = new PolyhedronStateMachine();
    this.hovering = false;
    this.netManager = null;     // set by app
    this.onMove = null;         // (record) => void, for logging/HUD
    this.iconMode = false;      // puzzle owns face materials (icons) — skip tinting
    this._snapshot = null;
  }

  initialize() {
    this.recalculateRanks();
    this.correctActiveButtons();
    this.psm.changeState(new IdleState(this));
    this._snapshot = this.faces.map((f) => {
      f.group.updateWorldMatrix(true, false);
      const pos = new THREE.Vector3();
      const quat = new THREE.Quaternion();
      const scl = new THREE.Vector3();
      f.group.matrixWorld.decompose(pos, quat, scl);
      return { pos, quat };
    });
  }

  update(dt) { this.psm.update(dt); }

  // BFS from root; assign ranks (distance to base) and reparent each discovered
  // face under the face that found it — building the fold hierarchy.
  recalculateRanks() {
    for (const f of this.faces) f.setRank(-1);
    this.root.setRank(0);
    const queue = [this.root];
    while (queue.length) {
      const cur = queue.shift();
      for (const edge of cur.getEdges()) {
        if (edge.isSevered()) continue;
        const cf = edge.getConnectedEdge().getFace();
        if (cf.getRank() === -1) {
          cf.setRank(cur.getRank() + 1);
          queue.push(cf);
          cur.group.attach(cf.group); // preserves world transform, like Unity reparent
        }
      }
    }
  }

  // Re-derive severed flags from geometry: half-edges whose midpoints coincide are
  // still hinged; otherwise they've separated (severed).
  recalculateConnections() {
    for (const face of this.faces) {
      for (const edge of face.getEdges()) {
        edge.getFoldPoint(_a);
        edge.getConnectedEdge().getFoldPoint(_b);
        edge.setSevered(_a.distanceTo(_b) >= CONNECT_EPS);
      }
    }
  }

  // Decide which edges are foldable. Folding a face F around edge E swings F plus
  // every face that travels with it; the move keeps the net intact only if, after
  // detaching that moving piece from everything except E, the whole graph is still
  // connected. If E is an *internal* edge of the moving piece (E leads to one of F's
  // own children, not out toward the base), then detaching cuts F's real link to the
  // base and orphans the piece — that fold is invalid (e.g. folding blue toward green).
  //
  // Decisions are computed first, then applied, because setSevered() toggles buttons
  // as a side effect during the simulation.
  correctActiveButtons() {
    const decisions = [];
    for (const face of this.faces) {
      for (const edge of face.getEdges()) {
        if (edge.isSevered()) { decisions.push([edge, false]); continue; }
        const ok = face.unfolded
          ? this._foldKeepsConnected(face, edge)    // folding a flat face back up
          : this._unfoldKeepsConnected(face, edge); // unfolding a face out of the solid
        decisions.push([edge, ok]);
      }
    }
    for (const [edge, ok] of decisions) edge.edgeButton?.setActive(ok);
  }

  // Folding a flat face swings it AND its whole subtree as one rigid piece. The move
  // keeps the net intact only if, after detaching that piece from everything except
  // the hinge `edge`, the graph is still connected. If `edge` leads to one of the
  // face's own children (an internal edge of the moving piece) rather than out toward
  // the base, the piece gets orphaned — that fold is invalid (e.g. blue → green).
  _foldKeepsConnected(face, edge) {
    const moving = this._subtree(face);
    const manipulated = [];
    for (const f of moving) {
      for (const e of f.getEdges()) {
        if (e.isSevered() || e.getID() === edge.getID()) continue;
        if (!moving.has(e.getConnectedEdge().getFace())) { e.setSevered(true); manipulated.push(e); }
      }
    }
    const ok = this.checkEverythingConnected();
    for (const e of manipulated) e.setSevered(false);
    return ok;
  }

  // Unfolding a face out of the solid frees it on its other edges (unfold() severs
  // them, then geometry re-derives connections). Offer the move when the remaining
  // structure stays connected; a child face with another route to the base rides
  // along rather than being cut.
  _unfoldKeepsConnected(face, edge) {
    const manipulated = [];
    for (const e of face.getEdges()) {
      if (e.getID() !== edge.getID() && !e.isSevered() &&
          (!isChildOf(e.getConnectedEdge().getFace().group, face.group) ||
           !e.getConnectedEdge().getFace().checkOneConnectionLeft(face))) {
        e.setSevered(true);
        manipulated.push(e);
      }
    }
    const ok = this.checkEverythingConnected();
    for (const e of manipulated) e.setSevered(false);
    return ok;
  }

  // The face plus every face currently nested under it in the fold hierarchy.
  _subtree(face) {
    const set = new Set([face]);
    for (const f of this.faces) {
      if (f !== face && isChildOf(f.group, face.group)) set.add(f);
    }
    return set;
  }

  checkEverythingConnected() {
    this.resetVisited();
    const queue = [this.root];
    this.root.setVisited(true);
    let count = 1;
    while (queue.length) {
      const cur = queue.shift();
      for (const edge of cur.getEdges()) {
        if (edge.isSevered()) continue;
        const cf = edge.getConnectedEdge().getFace();
        if (!cf.getVisited()) { cf.setVisited(true); queue.push(cf); count++; }
      }
    }
    this.resetVisited();
    return count === this.faces.length;
  }

  resetVisited() { for (const f of this.faces) f.setVisited(false); }

  addMove(record) {
    this.moves.push(record);
    if (this.onMove) this.onMove(record);
  }

  // Tint faces by role so the net is readable: gold = base, violet = laid flat,
  // blue = still folded up. Skipped while the puzzle owns the face materials (icons).
  updateFaceMaterials() {
    if (this.iconMode) return;
    for (const f of this.faces) {
      const m = f.mesh?.material;
      if (!m) continue;
      m.color.setHex(f === this.root ? FACE_COLORS.base
        : f.unfolded ? FACE_COLORS.unfolded : FACE_COLORS.folded);
    }
  }

  checkNet() { this.netManager?.tryRegisterNet(this); }

  // Restore the assembled cube from the build-time snapshot (robust against
  // accumulated float drift; clears the move stack but keeps found nets).
  reset() {
    if (!this._snapshot) return;
    // Flatten hierarchy back under the root group.
    for (const f of this.faces) this.group.attach(f.group);
    for (let i = 0; i < this.faces.length; i++) {
      const f = this.faces[i];
      const snap = this._snapshot[i];
      f.group.position.copy(snap.pos);   // poly.group is at origin/identity
      f.group.quaternion.copy(snap.quat);
      f.group.updateMatrixWorld(true);
      f.unfolded = false;
      f.currentAngle = 0;
      f.hoverInProgress = false;
    }
    for (const f of this.faces) {
      for (const e of f.getEdges()) { e.severed = false; e.edgeButton?.setActive(true); }
    }
    this.hovering = false;
    this.recalculateRanks();
    this.correctActiveButtons();
    this.psm.changeState(new IdleState(this));
    this.updateFaceMaterials();
    this.moves = [];
  }
}
