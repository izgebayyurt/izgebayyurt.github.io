import * as THREE from 'three';
import { rotateAroundWorldAxis, easeOutQuad } from '../mathutil.js';

const ANIM_TIME = 0.5; // seconds, matches the Unity states

const _fp = new THREE.Vector3();
const _fv = new THREE.Vector3();

// Rotate a face about its fold edge by `deg` degrees (port of
// face.transform.RotateAround(edge.GetFoldPoint(), edge.GetFoldVector(), deg)).
function rotateFace(face, edge, deg) {
  edge.getFoldPoint(_fp);
  edge.getFoldVector(_fv);
  rotateAroundWorldAxis(face.group, _fp, _fv, deg);
}

/**
 * Port of PolyhedronStateMachine. Returns false from changeState when a transition
 * is disallowed (e.g. starting a second fold while one is animating), exactly like C#.
 */
export class PolyhedronStateMachine {
  constructor() { this.currentState = null; }
  get currentStateID() { return this.currentState ? this.currentState.getStateID() : null; }

  changeState(newState) {
    if (this.currentState) {
      const cur = this.currentState.getStateID();
      const id = newState.getStateID();

      if ((id === 'StartHoverOnFoldedState' || id === 'StartHoverOnUnfoldedState') &&
          cur !== 'IdleState') return false;
      if (id === 'EndHoverOnFoldedState' && cur !== 'StartHoverOnFoldedState') return false;
      if (id === 'EndHoverOnUnfoldedState' && cur !== 'StartHoverOnUnfoldedState') return false;
      if ((id === 'UnfoldState' || id === 'FoldState' || id === 'DragState') &&
          (cur === 'UnfoldState' || cur === 'FoldState' || cur === 'DragState')) return false;

      this.currentState.exit();
    }
    this.currentState = newState;
    this.currentState.enter();
    return true;
  }

  update(dt) { if (this.currentState) this.currentState.execute(dt); }
}

export class IdleState {
  constructor(poly) { this.poly = poly; }
  getStateID() { return 'IdleState'; }
  enter() {}
  execute() {}
  exit() {}
}

export class UnfoldState {
  constructor(edge) {
    this.edge = edge;
    this.face = edge.getFace();
    this.foldAngle = edge.foldAngle;
    this.psm = this.face.poly.psm;
  }
  getStateID() { return 'UnfoldState'; }
  enter() {
    this.time = 0;
    this.startAngle = this.face.currentAngle;
    this.currentAngle = this.startAngle;
    this.edge.edgeButton?.setMaterial('active');
  }
  execute(dt) {
    if (this.time < ANIM_TIME) {
      this.time += dt;
      const t = easeOutQuad(Math.min(this.time / ANIM_TIME, 1));
      const newAngle = this.startAngle + (this.foldAngle - this.startAngle) * t;
      const angleToRotate = newAngle - this.currentAngle;
      this.currentAngle = newAngle;
      this.face.currentAngle = newAngle;
      rotateFace(this.face, this.edge, -angleToRotate);
    } else {
      this.psm.changeState(new IdleState(this.face.poly));
    }
  }
  exit() {
    const poly = this.face.poly;
    poly.recalculateConnections();
    poly.recalculateRanks();
    poly.correctActiveButtons();
    poly.addMove({ edgeId: this.edge.getID(), faceId: this.face.id, stateId: 'UnfoldState' });
    this.face.currentAngle = this.foldAngle;
    poly.hovering = false;
    poly.updateFaceMaterials();
    this.edge.edgeButton?.setMaterial('default');
    poly.checkNet();
  }
}

export class FoldState {
  constructor(edge) {
    this.edge = edge;
    this.face = edge.getFace();
    this.foldAngle = edge.foldAngle;
    this.psm = this.face.poly.psm;
  }
  getStateID() { return 'FoldState'; }
  enter() {
    this.time = 0;
    this.startAngle = this.face.currentAngle;
    this.currentAngle = this.startAngle;
    this.edge.edgeButton?.setMaterial('active');
  }
  execute(dt) {
    if (this.time < ANIM_TIME) {
      this.time += dt;
      const t = easeOutQuad(Math.min(this.time / ANIM_TIME, 1));
      const newAngle = this.startAngle * (1 - t);
      const angleToRotate = newAngle - this.currentAngle;
      this.currentAngle = newAngle;
      this.face.currentAngle = newAngle;
      rotateFace(this.face, this.edge, -angleToRotate);
    } else {
      this.psm.changeState(new IdleState(this.face.poly));
    }
  }
  exit() {
    const poly = this.face.poly;
    poly.recalculateConnections();
    poly.recalculateRanks();
    poly.correctActiveButtons();
    poly.addMove({ edgeId: this.edge.getID(), faceId: this.face.id, stateId: 'FoldState' });
    this.face.currentAngle = 0;
    poly.updateFaceMaterials();
    this.edge.edgeButton?.setMaterial('default');
  }
}

// ── Hover peek states ───────────────────────────────────────────────────────

export class StartHoverOnFoldedState {
  constructor(edge, hoverAngle) {
    this.edge = edge; this.face = edge.getFace(); this.hoverAngle = hoverAngle;
  }
  getStateID() { return 'StartHoverOnFoldedState'; }
  enter() {
    this.edge.edgeButton?.setMaterial('hover');
    this.time = 0;
    this.endTime = ANIM_TIME * ((this.hoverAngle - this.face.currentAngle) / this.hoverAngle);
    this.face.hoverInProgress = true;
    this.face.poly.hovering = true;
  }
  execute(dt) {
    if (this.time < this.endTime) {
      this.time += dt;
      let ar = (this.hoverAngle / ANIM_TIME) * dt;
      if (this.face.currentAngle + ar > this.hoverAngle) {
        ar = this.hoverAngle - this.face.currentAngle;
        this.face.currentAngle = this.hoverAngle;
      } else this.face.currentAngle += ar;
      rotateFace(this.face, this.edge, -ar);
    }
  }
  exit() { this.edge.edgeButton?.setMaterial('default'); }
}

export class StartHoverOnUnfoldedState {
  constructor(edge, hoverAngle) {
    this.edge = edge; this.face = edge.getFace(); this.hoverAngle = hoverAngle;
  }
  getStateID() { return 'StartHoverOnUnfoldedState'; }
  enter() {
    this.edge.edgeButton?.setMaterial('hover');
    this.time = 0;
    this.endTime = ANIM_TIME *
      (this.hoverAngle - (this.edge.foldAngle - this.face.currentAngle)) / this.hoverAngle;
    this.face.hoverInProgress = true;
    this.face.poly.hovering = true;
  }
  execute(dt) {
    if (this.time < this.endTime) {
      this.time += dt;
      let ar = (this.hoverAngle / ANIM_TIME) * dt;
      const floor = this.edge.foldAngle - this.hoverAngle;
      if (this.face.currentAngle - ar < floor) {
        ar = this.face.currentAngle - floor;
        this.face.currentAngle = floor;
      } else this.face.currentAngle -= ar;
      rotateFace(this.face, this.edge, ar);
    }
  }
  exit() { this.edge.edgeButton?.setMaterial('default'); }
}

export class EndHoverOnFoldedState {
  constructor(edge, hoverAngle) {
    this.edge = edge; this.face = edge.getFace(); this.hoverAngle = hoverAngle;
    this.psm = this.face.poly.psm;
  }
  getStateID() { return 'EndHoverOnFoldedState'; }
  enter() {
    this.holdTimer = 0; this.holdDone = false;
    this.time = 0; this.endTime = ANIM_TIME * this.face.currentAngle / this.hoverAngle;
  }
  execute(dt) {
    if (!this.holdDone) {
      this.holdTimer += dt;
      if (this.holdTimer >= 0.1) this.holdDone = true;
      return;
    }
    if (this.time < this.endTime) {
      this.time += dt;
      let ar = (this.hoverAngle / ANIM_TIME) * dt;
      if (this.face.currentAngle - ar < 0) { ar = this.face.currentAngle; this.face.currentAngle = 0; }
      else this.face.currentAngle -= ar;
      rotateFace(this.face, this.edge, ar);
    } else {
      this.psm.changeState(new IdleState(this.face.poly));
    }
  }
  exit() {
    const poly = this.face.poly;
    poly.recalculateConnections(); poly.recalculateRanks(); poly.correctActiveButtons();
    this.face.hoverInProgress = false; poly.hovering = false;
  }
}

export class EndHoverOnUnfoldedState {
  constructor(edge, hoverAngle) {
    this.edge = edge; this.face = edge.getFace(); this.hoverAngle = hoverAngle;
    this.psm = this.face.poly.psm;
  }
  getStateID() { return 'EndHoverOnUnfoldedState'; }
  enter() {
    this.holdTimer = 0; this.holdDone = false;
    this.time = 0;
    this.endTime = ANIM_TIME * (this.edge.foldAngle - this.face.currentAngle) / this.hoverAngle;
  }
  execute(dt) {
    if (!this.holdDone) {
      this.holdTimer += dt;
      if (this.holdTimer >= 0.1) this.holdDone = true;
      return;
    }
    if (this.time < this.endTime) {
      this.time += dt;
      let ar = (this.hoverAngle / ANIM_TIME) * dt;
      if (this.face.currentAngle + ar > this.edge.foldAngle) {
        ar = this.edge.foldAngle - this.face.currentAngle;
        this.face.currentAngle = this.edge.foldAngle;
      } else this.face.currentAngle += ar;
      rotateFace(this.face, this.edge, -ar);
    } else {
      this.psm.changeState(new IdleState(this.face.poly));
    }
  }
  exit() {
    const poly = this.face.poly;
    poly.recalculateConnections(); poly.recalculateRanks(); poly.correctActiveButtons();
    this.face.hoverInProgress = false; poly.hovering = false;
  }
}
