import * as THREE from 'three';

/**
 * Hover ribbon for the desktop build. Hidden until an edge is hovered. It lies FLAT on
 * the face: a filled crescent between the EDGE (corner→corner) and an ARC that bulges
 * into the face toward the cursor. The arc's apex passes through the cursor's hit point
 * on the face, so it never pops out along the normal and never pinches to a spike.
 * Brightness peaks at the arc's apex; bloom glows that peak.
 */
const RES_U = 14;  // segments along the edge / arc
const RES_T = 6;   // segments from the edge across to the arc
const BREATHE_AMOUNT = 0.05;
const BREATHE_SPEED = 2.4;
const RAMP = 10;   // strength ramp speed (per second)
const MAX_DEPTH_RATIO = 0.22; // arc apex never exceeds this fraction of edge length from the edge
const Z_LIFT = 0.005;         // lift off the face plane to avoid z-clashing

const _c1 = new THREE.Vector3();
const _c2 = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _ctrl = new THREE.Vector3();
const _bottom = new THREE.Vector3();
const _top = new THREE.Vector3();
const _p = new THREE.Vector3();
const _inward = new THREE.Vector3();
const _edgeDir = new THREE.Vector3();
const _faceNormal = new THREE.Vector3();

export class Tendril {
  constructor(scene, camera) {
    this.camera = camera ?? null;
    const vertCount = (RES_U + 1) * (RES_T + 1);
    this.positions = new Float32Array(vertCount * 3);
    this.colors = new Float32Array(vertCount * 4);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 4));
    geo.setIndex(bakeTriangles());
    this.geo = geo;

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, depthWrite: false,
      side: THREE.DoubleSide, // normal blending — clean salmon, no additive flicker
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.visible = false;
    this.mesh.renderOrder = 5;
    this.mesh.frustumCulled = false;
    scene.add(this.mesh);

    this.edge = null;
    this.peak = null;     // THREE.Vector3 — cursor hit point on the face
    this._lastEdge = null;
    this._faceUnfolded = false;
    this.strength = 0;
    this.time = 0;
  }

  setEdge(edge) {
    if (edge) { this._lastEdge = edge; this._faceUnfolded = edge.getFace().unfolded; }
    this.edge = edge;
  }
  setPeak(point) {
    if (!point) return;
    if (!this.peak) this.peak = new THREE.Vector3();
    this.peak.copy(point);
  }

  update(dt) {
    this.time += dt;
    const target = this.edge ? 1 : 0;
    this.strength += (target - this.strength) * Math.min(1, RAMP * dt);
    if (this.strength < 0.01 && !this.edge) { this.mesh.visible = false; return; }
    this.rebuild(this.edge || this._lastEdge, this.peak);
  }

  rebuild(edge, peak) {
    if (!edge || !peak) { this.mesh.visible = false; return; }
    edge.corner1.getWorldPosition(_c1);
    edge.corner2.getWorldPosition(_c2);
    _mid.copy(_c1).add(_c2).multiplyScalar(0.5); // edge midpoint

    // Inward direction from edge midpoint toward cursor, capped so the arc stays
    // near the edge — avoids triggering on clicks anywhere on the face.
    const edgeLen = _c1.distanceTo(_c2);
    _inward.copy(peak).sub(_mid);
    const rawDist = _inward.length();
    if (rawDist < 0.0001) { this.mesh.visible = false; return; }
    const cappedDist = Math.min(rawDist, edgeLen * MAX_DEPTH_RATIO);
    _inward.normalize();

    // Face normal via edge-dir × inward — used to lift vertices off the face plane.
    _edgeDir.copy(_c2).sub(_c1).normalize();
    _faceNormal.crossVectors(_edgeDir, _inward).normalize();
    // Always lift toward the camera so back-face hovers render on the correct side.
    if (this.camera) {
      this.camera.getWorldPosition(_ctrl);       // temp borrow _ctrl before it's set
      if (_faceNormal.dot(_ctrl.sub(_mid)) < 0) _faceNormal.negate();
    }

    const breathe = 1 + Math.sin(this.time * BREATHE_SPEED) * BREATHE_AMOUNT * this.strength;
    _ctrl.copy(_mid).addScaledVector(_inward, 2 * cappedDist * breathe);

    for (let u = 0; u <= RES_U; u++) {
      const fu = u / RES_U;
      _bottom.copy(_c1).lerp(_c2, fu);          // on the straight edge
      bezier(_c1, _ctrl, _c2, fu, _top);        // on the arc

      for (let t = 0; t <= RES_T; t++) {
        const ft = t / RES_T;
        const idx = u * (RES_T + 1) + t;
        _p.copy(_bottom).lerp(_top, ft)
          .addScaledVector(_faceNormal, Z_LIFT); // lift off face to avoid z-clashing
        this.positions[idx * 3] = _p.x;
        this.positions[idx * 3 + 1] = _p.y;
        this.positions[idx * 3 + 2] = _p.z;

        // brightest at the arc's apex (centre of the arc, fu≈0.5, on the arc ft≈1)
        const glow = Math.sin(fu * Math.PI) * ft;
        const bright = 0.5 + 1.2 * glow;        // HDR at the apex so it blooms
        const r = this._faceUnfolded ? 1.00 : 1.0;
        const g = this._faceUnfolded ? 0.50 : 1.0;
        const b = this._faceUnfolded ? 0.45 : 1.0;
        this.colors[idx * 4] = r * bright;
        this.colors[idx * 4 + 1] = g * bright;
        this.colors[idx * 4 + 2] = b * bright;
        this.colors[idx * 4 + 3] = Math.sin(fu * Math.PI) * (0.3 + 0.4 * ft) * this.strength;
      }
    }
    this.geo.getAttribute('position').needsUpdate = true;
    this.geo.getAttribute('color').needsUpdate = true;
    this.mesh.visible = true;
  }
}

function bezier(p0, p1, p2, t, out) {
  const u = 1 - t;
  return out.copy(p0).multiplyScalar(u * u)
    .addScaledVector(p1, 2 * u * t)
    .addScaledVector(p2, t * t);
}

function bakeTriangles() {
  const idx = [];
  for (let u = 0; u < RES_U; u++) {
    for (let t = 0; t < RES_T; t++) {
      const bl = u * (RES_T + 1) + t;
      const br = (u + 1) * (RES_T + 1) + t;
      const tl = bl + 1;
      const tr = br + 1;
      idx.push(bl, tl, br, tl, tr, br);
    }
  }
  return idx;
}
