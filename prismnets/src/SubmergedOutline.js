import * as THREE from 'three';

/**
 * Highlights the parts of face edges that pass BELOW the ground plane (faces that
 * clip through the floor at grazing angles). For each (convex) face, the single
 * below-ground arc of its perimeter is drawn as red, camera-facing quads — one per
 * segment — with a round disc at every arc point. The discs act as round caps/joins:
 * where two segments meet at a vertex they overlap into a smooth rounded corner
 * instead of a hard miter. A world-space clipping plane at y = 0 trims any pixels
 * that would rise above the surface, so only sub-surface pixels show.
 */
const GROUND_Y = 0;
const HALF_W = 0.006;     // line half-width / cap radius (world units)
const CAP_SEGS = 10;      // disc resolution for round caps/joins
const MAX_VERTS = 16384;
const COLOR = 0xff3b30;   // red

const _cam = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _mid = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _side = new THREE.Vector3();

export class SubmergedOutline {
  constructor(scene, camera) {
    this.camera = camera;
    this.positions = new Float32Array(MAX_VERTS * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setDrawRange(0, 0);
    this.geo = geo;

    // Keep only y < 0 (normal·p + constant ≥ 0 with normal=(0,-1,0) ⇒ y ≤ 0).
    this.clipPlane = new THREE.Plane(new THREE.Vector3(0, -1, 0), GROUND_Y);
    const mat = new THREE.MeshBasicMaterial({
      color: COLOR, transparent: true, opacity: 0.95,
      depthTest: false, depthWrite: false, side: THREE.DoubleSide,
      clippingPlanes: [this.clipPlane],
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 6;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);

    this._W = [];   // scratch: face corner world positions
    this._arc = []; // scratch: ordered below-ground arc points
  }

  update(poly) {
    this.camera.updateMatrixWorld();
    this.camera.getWorldPosition(_cam);
    _right.setFromMatrixColumn(this.camera.matrixWorld, 0); // camera right (world)
    _up.setFromMatrixColumn(this.camera.matrixWorld, 1);    // camera up (world)

    let v = 0;
    for (const face of poly.faces) {
      const n = face.corners.length;
      if (n < 2) continue;
      for (let i = 0; i < n; i++) {
        this._W[i] = this._W[i] || new THREE.Vector3();
        face.corners[i].getWorldPosition(this._W[i]);
      }
      v = this._emitFace(n, v);
      if (v >= MAX_VERTS * 3) break;
    }

    if (v === 0) { this.mesh.visible = false; return; }
    this.geo.setDrawRange(0, v / 3);
    this.geo.getAttribute('position').needsUpdate = true;
    this.mesh.visible = true;
  }

  // Build the below-ground arc for one (convex) face, then stroke it.
  _emitFace(n, v) {
    const W = this._W;
    let below = 0;
    for (let i = 0; i < n; i++) if (W[i].y < GROUND_Y) below++;
    if (below === 0) return v;

    const arc = this._arc;
    arc.length = 0;
    let closed = false;

    if (below === n) {
      for (let i = 0; i < n; i++) arc.push(W[i].clone());
      closed = true;
    } else {
      let start = -1;
      for (let i = 0; i < n; i++) {
        if (W[i].y >= GROUND_Y && W[(i + 1) % n].y < GROUND_Y) { start = i; break; }
      }
      if (start < 0) return v;
      arc.push(crossing(W[start], W[(start + 1) % n]));
      let j = (start + 1) % n;
      while (W[j].y < GROUND_Y) { arc.push(W[j].clone()); j = (j + 1) % n; }
      arc.push(crossing(W[(j - 1 + n) % n], W[j]));
    }
    return this._stroke(arc, closed, v);
  }

  _stroke(arc, closed, v) {
    const m = arc.length;
    if (m < 1) return v;

    // Segment bodies (camera-facing quads).
    const segs = closed ? m : m - 1;
    for (let s = 0; s < segs && v + 18 <= MAX_VERTS * 3; s++) {
      const a = arc[s], b = arc[(s + 1) % m];
      _dir.copy(b).sub(a);
      if (_dir.lengthSq() < 1e-12) continue;
      _dir.normalize();
      _mid.copy(a).add(b).multiplyScalar(0.5);
      _toCam.copy(_cam).sub(_mid).normalize();
      _side.crossVectors(_dir, _toCam);
      if (_side.lengthSq() < 1e-12) continue;
      _side.normalize().multiplyScalar(HALF_W);
      v = this._tri(v, a.x + _side.x, a.y + _side.y, a.z + _side.z,
                       a.x - _side.x, a.y - _side.y, a.z - _side.z,
                       b.x + _side.x, b.y + _side.y, b.z + _side.z);
      v = this._tri(v, a.x - _side.x, a.y - _side.y, a.z - _side.z,
                       b.x - _side.x, b.y - _side.y, b.z - _side.z,
                       b.x + _side.x, b.y + _side.y, b.z + _side.z);
    }

    // Round caps / joins: a billboard disc at each arc point.
    for (let i = 0; i < m && v + CAP_SEGS * 9 <= MAX_VERTS * 3; i++) v = this._disc(arc[i], v);
    return v;
  }

  _disc(c, v) {
    let px = c.x + _right.x * HALF_W, py = c.y + _right.y * HALF_W, pz = c.z + _right.z * HALF_W;
    for (let k = 1; k <= CAP_SEGS; k++) {
      const a = (k / CAP_SEGS) * Math.PI * 2;
      const ca = Math.cos(a) * HALF_W, sa = Math.sin(a) * HALF_W;
      const nx = c.x + _right.x * ca + _up.x * sa;
      const ny = c.y + _right.y * ca + _up.y * sa;
      const nz = c.z + _right.z * ca + _up.z * sa;
      v = this._tri(v, c.x, c.y, c.z, px, py, pz, nx, ny, nz);
      px = nx; py = ny; pz = nz;
    }
    return v;
  }

  _tri(v, ax, ay, az, bx, by, bz, cx, cy, cz) {
    const P = this.positions;
    P[v++] = ax; P[v++] = ay; P[v++] = az;
    P[v++] = bx; P[v++] = by; P[v++] = bz;
    P[v++] = cx; P[v++] = cy; P[v++] = cz;
    return v;
  }
}

function crossing(a, b) {
  const t = (GROUND_Y - a.y) / (b.y - a.y);
  return a.clone().lerp(b, t);
}
