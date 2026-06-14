import * as THREE from 'three';

/**
 * Gauntlet overlay: billboard DOTS at face centres (reference / candidate markers
 * for adjacency questions) and short camera-facing STUBS at seam-edge midpoints
 * (colored seam markers for seam-match questions). Rebuilt every frame from live
 * world positions, like PeelOutline / SubmergedOutline. Per-marker colour via
 * vertex colours; drawn on top (depthTest off).
 *
 * set({ dots, stubs }) where
 *   dots  = [{ face, color, r? }]   color: hex; r: world radius (default DOT_R)
 *   stubs = [{ edge, color }]
 */
const DOT_R = 0.14;
const STUB_HALF_LEN = 0.18; // along the edge
const STUB_HALF_W = 0.05;   // across the edge
const DISC_SEGS = 16;
const LIFT = 0.02;          // toward camera, above the face
const MAX_VERTS = 8192;

const _cam = new THREE.Vector3();
const _right = new THREE.Vector3();
const _up = new THREE.Vector3();
const _c = new THREE.Vector3();
const _dir = new THREE.Vector3();
const _perp = new THREE.Vector3();
const _toCam = new THREE.Vector3();
const _col = new THREE.Color();

export class NetMarkers {
  constructor(scene, camera) {
    this.camera = camera;
    this.positions = new Float32Array(MAX_VERTS * 3);
    this.colors = new Float32Array(MAX_VERTS * 3);

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    geo.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    geo.setDrawRange(0, 0);
    this.geo = geo;

    const mat = new THREE.MeshBasicMaterial({
      vertexColors: true, transparent: true, opacity: 0.97,
      depthTest: false, depthWrite: false, side: THREE.DoubleSide,
    });
    this.mesh = new THREE.Mesh(geo, mat);
    this.mesh.renderOrder = 7;
    this.mesh.frustumCulled = false;
    this.mesh.visible = false;
    scene.add(this.mesh);

    this.dots = [];
    this.stubs = [];
  }

  set({ dots = [], stubs = [] } = {}) { this.dots = dots; this.stubs = stubs; }
  clear() { this.dots = []; this.stubs = []; this.mesh.visible = false; }

  update() {
    if (!this.dots.length && !this.stubs.length) { this.mesh.visible = false; return; }
    this.camera.updateMatrixWorld();
    this.camera.getWorldPosition(_cam);
    _right.setFromMatrixColumn(this.camera.matrixWorld, 0);
    _up.setFromMatrixColumn(this.camera.matrixWorld, 1);

    let v = 0;
    for (const d of this.dots) {
      if (!d.face) continue;
      d.face.group.getWorldPosition(_c);
      v = this._disc(_c, d.r || DOT_R, d.color, v);
      if (v >= MAX_VERTS * 3) break;
    }
    for (const s of this.stubs) {
      if (!s.edge || v + 18 > MAX_VERTS * 3) break;
      v = this._stub(s.edge, s.color, v);
    }

    this.geo.setDrawRange(0, v / 3);
    this.geo.getAttribute('position').needsUpdate = true;
    this.geo.getAttribute('color').needsUpdate = true;
    this.mesh.visible = v > 0;
  }

  _disc(center, r, color, v) {
    _col.set(color);
    _toCam.copy(_cam).sub(center).normalize();
    const cx = center.x + _toCam.x * LIFT, cy = center.y + _toCam.y * LIFT, cz = center.z + _toCam.z * LIFT;
    let px = cx + _right.x * r, py = cy + _right.y * r, pz = cz + _right.z * r;
    for (let k = 1; k <= DISC_SEGS && v + 9 <= MAX_VERTS * 3; k++) {
      const a = (k / DISC_SEGS) * Math.PI * 2;
      const ca = Math.cos(a) * r, sa = Math.sin(a) * r;
      const nx = cx + _right.x * ca + _up.x * sa;
      const ny = cy + _right.y * ca + _up.y * sa;
      const nz = cz + _right.z * ca + _up.z * sa;
      v = this._tri(v, cx, cy, cz, px, py, pz, nx, ny, nz, _col);
      px = nx; py = ny; pz = nz;
    }
    return v;
  }

  _stub(edge, color, v) {
    _col.set(color);
    edge.getFoldPoint(_c);
    edge.getFoldVector(_dir).normalize();
    _toCam.copy(_cam).sub(_c).normalize();
    _perp.crossVectors(_dir, _toCam);
    if (_perp.lengthSq() < 1e-9) return v;
    _perp.normalize();
    // lift toward camera so it sits above the face
    const lx = _c.x + _toCam.x * LIFT, ly = _c.y + _toCam.y * LIFT, lz = _c.z + _toCam.z * LIFT;
    const ax = _dir.x * STUB_HALF_LEN, ay = _dir.y * STUB_HALF_LEN, az = _dir.z * STUB_HALF_LEN;
    const bx = _perp.x * STUB_HALF_W, by = _perp.y * STUB_HALF_W, bz = _perp.z * STUB_HALF_W;
    // quad corners: (-a-b),(-a+b),(+a-b),(+a+b)
    const p0 = [lx - ax - bx, ly - ay - by, lz - az - bz];
    const p1 = [lx - ax + bx, ly - ay + by, lz - az + bz];
    const p2 = [lx + ax - bx, ly + ay - by, lz + az - bz];
    const p3 = [lx + ax + bx, ly + ay + by, lz + az + bz];
    v = this._tri(v, p0[0], p0[1], p0[2], p1[0], p1[1], p1[2], p2[0], p2[1], p2[2], _col);
    v = this._tri(v, p1[0], p1[1], p1[2], p3[0], p3[1], p3[2], p2[0], p2[1], p2[2], _col);
    return v;
  }

  _tri(v, ax, ay, az, bx, by, bz, cx, cy, cz, col) {
    const P = this.positions, C = this.colors;
    const verts = [ax, ay, az, bx, by, bz, cx, cy, cz];
    for (let i = 0; i < 9; i += 3) {
      P[v] = verts[i]; P[v + 1] = verts[i + 1]; P[v + 2] = verts[i + 2];
      C[v] = col.r; C[v + 1] = col.g; C[v + 2] = col.b;
      v += 3;
    }
    return v;
  }
}
