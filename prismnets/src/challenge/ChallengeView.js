import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { buildSolidMesh, buildPlainSolidMesh, boundingRadius } from '../puzzle/SolidMesh.js';
import { makeFaceTextures, makeArrowTextures } from '../puzzle/FaceIcons.js';

// Shared presenter for all challenge types. Both Practice and Gauntlet drive it; they
// own their own surrounding chrome (lives/score, Next/difficulty, choosers). Given a
// challenge descriptor + context { poly, faceMeshes, solidData, onAnswer }, it shows
// the right UI, takes the answer, fires onAnswer(correct), and shows ✓/✗ feedback.
//
// Modalities: 'tf' (True/False), 'pickFace' (tap a candidate face on the net),
// 'pickCandidate' (cycle N folded solids, Select). On-net types use the main-scene net
// + NetMarkers; match types render the net with icons + folded candidates in a viewport.

// A self-contained mini 3D viewport bound to a DOM element.
class MiniViewport {
  constructor(el, w, h, { autoRotate = false } = {}) {
    this.el = el;
    this.rdr = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    this.rdr.setSize(w, h);
    this.rdr.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.rdr.setClearColor(0x000000, 0);
    el.appendChild(this.rdr.domElement);

    this.scene = new THREE.Scene();
    this.cam = new THREE.PerspectiveCamera(42, w / h, 0.1, 50);
    this.orb = new OrbitControls(this.cam, this.rdr.domElement);
    this.orb.enableZoom = false;
    this.orb.enablePan = false;
    this.orb.enableDamping = true;
    this.orb.autoRotate = autoRotate;
    this.orb.autoRotateSpeed = 1.6;
    this.scene.add(new THREE.HemisphereLight(0xffffff, 0x445566, 1.2));
    const sun = new THREE.DirectionalLight(0xffffff, 1.4);
    sun.position.set(3, 5, 4);
    this.scene.add(sun);
    this.mesh = null;
  }

  setMesh(mesh, radius, keepCamera = false) {
    this._dispose();
    this.mesh = mesh;
    this.scene.add(mesh);
    if (!keepCamera) {
      this.cam.position.set(1.8, 1.4, 2.2).normalize().multiplyScalar(3.5 * radius);
      this.orb.target.set(0, 0, 0);
      this.orb.update();
    }
  }

  render() { if (this.mesh) { this.orb.update(); this.rdr.render(this.scene, this.cam); } }

  _dispose() {
    if (!this.mesh) return;
    this.scene.remove(this.mesh);
    this.mesh.traverse((o) => {
      if (o.geometry) o.geometry.dispose();
      if (o.material && !Array.isArray(o.material)) o.material.dispose();
    });
    this.mesh = null;
  }
}

export class ChallengeView {
  constructor({ scene, camera, controls, renderer, netMarkers }) {
    this.scene = scene; this.camera = camera; this.controls = controls;
    this.renderer = renderer; this.netMarkers = netMarkers;

    this.refVp = new MiniViewport(document.getElementById('challenge-ref-viewport'), 240, 140, { autoRotate: true });
    this.candVp = new MiniViewport(document.getElementById('challenge-cand-viewport'), 240, 200);

    this.refBox = document.getElementById('challenge-ref');
    this.candBox = document.getElementById('challenge-cands');
    this.tfBox = document.getElementById('challenge-tf');
    this.pickHint = document.getElementById('challenge-pick-hint');
    this.promptEl = document.getElementById('challenge-prompt');
    this.feedbackEl = document.getElementById('challenge-feedback');
    this.counterEl = document.getElementById('challenge-cand-counter');

    this.refShow = document.getElementById('challenge-ref-show');
    document.getElementById('challenge-ref-close')?.addEventListener('click', () => this._showRef(false));
    this.refShow?.addEventListener('click', () => this._showRef(true));
    document.getElementById('cv-true')?.addEventListener('click', () => this._answerTF(true));
    document.getElementById('cv-false')?.addEventListener('click', () => this._answerTF(false));
    document.getElementById('cv-prev')?.addEventListener('click', () => this._step(-1));
    document.getElementById('cv-next')?.addEventListener('click', () => this._step(1));
    document.getElementById('cv-select')?.addEventListener('click', () => this._selectCandidate());

    this._down = null;
    this._onDown = (e) => { if (e.button === 0) this._down = { x: e.clientX, y: e.clientY }; };
    this._onUp = (e) => this._pickFaceUp(e);

    this._iconCache = new Map();
    this._reset();
  }

  _reset() {
    this._d = null; this._ctx = null; this._locked = true;
    this._candidates = null; this._candIdx = 0; this._candTextures = null;
  }

  // ── Present a challenge ──────────────────────────────────────────────────────
  present(descriptor, ctx) {
    this._d = descriptor; this._ctx = ctx; this._locked = false;
    this._raycaster = this._raycaster || new THREE.Raycaster();
    this._ndc = this._ndc || new THREE.Vector2();
    this.promptEl.textContent = descriptor.prompt;
    this.feedbackEl.textContent = '';
    this.feedbackEl.style.color = '';

    // Reference "folds into" solid (shown by default; user can hide it).
    this._hasRef = !!descriptor.showReference;
    if (this._hasRef) {
      this.refVp.setMesh(buildPlainSolidMesh(ctx.solidData, 1), boundingRadius(ctx.solidData));
      this._showRef(true);
    } else {
      this.refBox.style.display = 'none';
      if (this.refShow) this.refShow.style.display = 'none';
    }

    if (descriptor.answerMode === 'pickCandidate') {
      this._presentMatch(descriptor, ctx);
    } else {
      this._presentOnNet(descriptor, ctx);
    }
  }

  _presentOnNet(d, ctx) {
    this.candBox.style.display = 'none';
    this.netMarkers.set(d.markers || { dots: [], stubs: [] });
    if (d.faceTints) {
      for (const t of d.faceTints) {
        const f = ctx.poly.faces.find((x) => x.getID() === t.faceId);
        f?.mesh.material.color.set(t.color);
      }
    }
    const isPick = d.answerMode === 'pickFace';
    this.tfBox.style.display = isPick ? 'none' : '';
    this.pickHint.style.display = isPick ? '' : 'none';
    if (isPick) {
      this.renderer.domElement.addEventListener('pointerdown', this._onDown);
      this.renderer.domElement.addEventListener('pointerup', this._onUp);
    }
  }

  _presentMatch(d, ctx) {
    this.netMarkers.set({ dots: [], stubs: [] });
    this.tfBox.style.display = 'none';
    this.pickHint.style.display = 'none';
    this.candBox.style.display = '';

    const tex = this._icons(d.iconKind, ctx.poly.faces.length);
    this._candTextures = tex;
    // Paint icons on the flat net.
    ctx.poly.faces.forEach((f, fi) => {
      const m = f.mesh.material;
      m.map = tex[d.assignment[fi]];
      m.color.set(0xffffff);
      m.needsUpdate = true;
    });
    this._candidates = d.candidates;
    this._candIdx = 0;
    this._showCandidate(0, true);
  }

  _showCandidate(idx, first) {
    this._candIdx = idx;
    this.counterEl.textContent = `${idx + 1} / ${this._candidates.length}`;
    const mesh = buildSolidMesh(this._ctx.solidData, this._candTextures, this._candidates[idx], 1);
    this.candVp.setMesh(mesh, boundingRadius(this._ctx.solidData), !first);
  }

  _step(dir) {
    if (this._locked || !this._candidates) return;
    const n = this._candidates.length;
    this._showCandidate((this._candIdx + dir + n) % n, false);
  }

  // ── Answer resolution ────────────────────────────────────────────────────────
  _answerTF(value) {
    if (this._locked || this._d?.answerMode !== 'tf') return;
    this._resolve(value === this._d.correct);
  }

  _selectCandidate() {
    if (this._locked || this._d?.answerMode !== 'pickCandidate') return;
    this._resolve(this._candIdx === this._d.correctIdx);
  }

  _pickFaceUp(e) {
    if (this._locked || this._d?.answerMode !== 'pickFace' || !this._down) return;
    const moved = Math.hypot(e.clientX - this._down.x, e.clientY - this._down.y);
    this._down = null;
    if (moved > 5) return; // orbit drag
    const rect = this.renderer.domElement.getBoundingClientRect();
    this._ndc.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
    this._ndc.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;
    this._raycaster.setFromCamera(this._ndc, this.camera);
    const hits = this._raycaster.intersectObjects(this._ctx.faceMeshes, false);
    if (!hits.length) return;
    const face = hits[0].object.userData.face;
    if (!face || !this._d.candidateIds.includes(face.getID())) return;
    const correctFace = this._ctx.poly.faces.find((x) => x.getID() === this._d.correct);
    correctFace?.mesh.material.color.set('#43c08a');
    if (face.getID() !== this._d.correct) face.mesh.material.color.set('#e05e5e');
    this._resolve(face.getID() === this._d.correct);
  }

  _resolve(correct) {
    if (this._locked) return;
    this._locked = true;
    this.feedbackEl.textContent = correct ? '✓ Correct' : '✗ Wrong';
    this.feedbackEl.style.color = correct ? '#43c08a' : '#e05e5e';
    this._ctx.onAnswer?.(correct);
  }

  // ── Teardown / loop ──────────────────────────────────────────────────────────
  clear() {
    this.netMarkers.clear();
    this.renderer.domElement.removeEventListener('pointerdown', this._onDown);
    this.renderer.domElement.removeEventListener('pointerup', this._onUp);
    this.candVp._dispose();
    this.refVp._dispose();
    this._reset();
  }

  update() {
    this.netMarkers.update();
    if (this._d?.showReference && this.refBox.style.display !== 'none') this.refVp.render();
    if (this._d?.answerMode === 'pickCandidate') this.candVp.render();
  }

  _showRef(on) {
    if (!this._hasRef) return;
    this.refBox.style.display = on ? '' : 'none';
    if (this.refShow) this.refShow.style.display = on ? 'none' : 'block';
  }

  _icons(kind, n) {
    const key = `${kind}:${n}`;
    if (!this._iconCache.has(key)) {
      this._iconCache.set(key, kind === 'arrow' ? makeArrowTextures(n) : makeFaceTextures(n));
    }
    return this._iconCache.get(key);
  }
}
