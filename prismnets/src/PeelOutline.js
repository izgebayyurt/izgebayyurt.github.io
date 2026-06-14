import * as THREE from 'three';
import { isChildOf } from './core/Face.js';

/**
 * Hover highlight. The hovered (foldable) edge is drawn as a SOLID WHITE ribbon
 * (regardless of fold state). The other edges of that face that folding here would
 * CUT — i.e. connections to faces that are NOT children of this one, so they'd be
 * severed rather than carried along — are drawn as DARK-SALMON DASHED ribbons, as a
 * "this tears off here" warning. Child connections (which travel with the face) and
 * already-severed edges are not drawn.
 *
 * Ribbons are rebuilt every frame from live world positions, camera-facing, and
 * lifted toward the camera so back-face hovers still render on the visible side.
 */
const RAMP = 12;            // fade-in/out speed (per second)
const HALF_W = 0.020;       // hovered-edge ribbon half-width
const DASH_HALF_W = 0.013;  // severed-edge dashed ribbon half-width (thinner)
const LIFT = 0.012;
const WHITE_BRIGHT = 1.5;   // dimmed slightly (was 1.7) so the glow is a touch softer
const DASH_LEN = 0.085;     // dash + gap along a severed edge
const GAP_LEN = 0.06;
const MAX_QUADS = 96;       // 1 white + dashes across a few edges

const _cam = new THREE.Vector3();
const _c1 = new THREE.Vector3();
const _c2 = new THREE.Vector3();
const _a = new THREE.Vector3();
const _b = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _side = new THREE.Vector3();
const _lift = new THREE.Vector3();

export class PeelOutline {
  constructor(scene, camera) {
    this.camera = camera;

    const verts = MAX_QUADS * 4;
    this.positions = new Float32Array(verts * 3);
    this.colors = new Float32Array(verts * 4);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
    const idx = [];
    for (let q = 0; q < MAX_QUADS; q++) {
      const base = q * 4;
      idx.push(base, base + 1, base + 2, base + 1, base + 3, base + 2);
    }
    geo.setIndex(idx);
    this.geo = geo;

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.visible = false;
    this.mesh.renderOrder = 5;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.edge = null;       // the hovered foldable edge
    this._lastEdge = null;  // kept for the fade-out
    this.strength = 0;
  }

  // edge = the hovered foldable edge, or null to clear.
  setEdge(edge) {
    this.edge = edge || null;
    if (edge) this._lastEdge = edge;
  }

  update(dt = 1 / 60) {
    const target = this.edge ? 1 : 0;
    this.strength += (target - this.strength) * Math.min(1, RAMP * dt);
    const e = this._lastEdge;
    if (!e || (this.strength < 0.01 && !this.edge)) { this.mesh.visible = false; return; }
    this._rebuild(e);
  }

  _rebuild(hovered) {
    this.camera.getWorldPosition(_cam);
    const face = hovered.getFace();
    let q = 0;

    // Hovered edge — solid white.
    hovered.corner1.getWorldPosition(_c1);
    hovered.corner2.getWorldPosition(_c2);
    q = this._solid(_c1, _c2, 1.0, 1.0, 1.0, WHITE_BRIGHT, HALF_W, q);

    // Edges that folding here would cut. A neighbour is severed when it is NOT a
    // child of this face, OR it can still reach the base without this face — i.e.
    // it's held in place by another connection and won't travel with the fold (a
    // BFS-child isn't necessarily a face that moves with its parent). This mirrors
    // the engine's own unfold-severing rule (Polyhedron._unfoldKeepsConnected).
    for (const e of face.getEdges()) {
      if (q >= MAX_QUADS) break;
      if (e.getID() === hovered.getID() || e.isSevered()) continue;
      const connFace = e.getConnectedEdge().getFace();
      const severs = !isChildOf(connFace.group, face.group) || !connFace.checkOneConnectionLeft(face);
      if (!severs) continue;
      e.corner1.getWorldPosition(_c1);
      e.corner2.getWorldPosition(_c2);
      q = this._dashed(_c1, _c2, q);
    }

    for (let z = q; z < MAX_QUADS; z++) this._zeroQuad(z);
    this.geo.getAttribute('position').needsUpdate = true;
    this.geo.getAttribute('color').needsUpdate = true;
    this.mesh.visible = true;
  }

  // One camera-facing quad spanning a→b.
  _solid(a, b, r, g, bl, bright, halfW, q) {
    _dir.copy(b).sub(a).normalize();
    _toCam.copy(_cam).sub(a).normalize();
    _side.crossVectors(_dir, _toCam).normalize().multiplyScalar(halfW);
    _lift.copy(_toCam).multiplyScalar(LIFT);
    return this._quad(a, b, r, g, bl, bright, q);
  }

  // A dashed run along a→b: short quads separated by gaps. Dark salmon, no bloom.
  _dashed(a, b, q) {
    const total = a.distanceTo(b);
    const step = DASH_LEN + GAP_LEN;
    _dir.copy(b).sub(a).normalize();
    _toCam.copy(_cam).sub(a).normalize();
    _side.crossVectors(_dir, _toCam).normalize().multiplyScalar(DASH_HALF_W);
    _lift.copy(_toCam).multiplyScalar(LIFT);
    for (let s = 0; s < total && q < MAX_QUADS; s += step) {
      const e = Math.min(s + DASH_LEN, total);
      _a.copy(a).addScaledVector(_dir, s);
      _b.copy(a).addScaledVector(_dir, e);
      q = this._quad(_a, _b, 0.74, 0.42, 0.36, 1.0, q); // dark salmon
    }
    return q;
  }

  // Writes a quad (uses the current _side / _lift) between p→r with a solid colour.
  _quad(p, r2, r, g, bl, bright, q) {
    const base = q * 4;
    this._setVert(base + 0, p, -1);
    this._setVert(base + 1, p, +1);
    this._setVert(base + 2, r2, -1);
    this._setVert(base + 3, r2, +1);
    for (let k = 0; k < 4; k++) {
      const ci = (base + k) * 4;
      this.colors[ci] = r * bright;
      this.colors[ci + 1] = g * bright;
      this.colors[ci + 2] = bl * bright;
      this.colors[ci + 3] = 0.95 * this.strength;
    }
    return q + 1;
  }

  _setVert(vi, base, sign) {
    const i = vi * 3;
    this.positions[i]     = base.x + _side.x * sign + _lift.x;
    this.positions[i + 1] = base.y + _side.y * sign + _lift.y;
    this.positions[i + 2] = base.z + _side.z * sign + _lift.z;
  }

  _zeroQuad(q) {
    const b = q * 4;
    for (let k = 0; k < 4; k++) this.colors[(b + k) * 4 + 3] = 0;
  }
}
