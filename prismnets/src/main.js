import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

import { loadPolyhedron, loadCatalog } from './geometry/polyhedra.js';
import { buildPolyhedron } from './geometry/build.js';
import { NetEnumeration } from './core/NetEnumeration.js';
import { solidGeometry, allNets } from './core/netLayout.js';
import { SessionLogger, netStateString } from './SessionLogger.js';
import { createPicker } from './picker.js';
import { createHUD } from './hud.js';
import { PeelOutline } from './PeelOutline.js';
import { SubmergedOutline } from './SubmergedOutline.js';
import { forceAlert } from './AlertBox.js';
import { setupSolidPicker } from './SolidPicker.js';
import { createOnboarding } from './Onboarding.js';
import { NetMarkers } from './gauntlet/NetMarkers.js';
import { ChallengeView } from './challenge/ChallengeView.js';
import { PracticeMode } from './PracticeMode.js';
import { GauntletMode } from './gauntlet/GauntletMode.js';

// ── Renderer / scene / camera ─────────────────────────────────────────────────
const app = document.getElementById('app');
const renderer = new THREE.WebGLRenderer({ antialias: true });
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.localClippingEnabled = true; // for the submerged-edge clip plane
app.appendChild(renderer.domElement);

const scene = new THREE.Scene();
scene.background = new THREE.Color(0xdce9f5);

const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 100);
const CAM_HOME = new THREE.Vector3(3.2, 3.4, 4.2);
const TARGET_HOME = new THREE.Vector3(0, 0.3, 0);
camera.position.copy(CAM_HOME);

const controls = new OrbitControls(camera, renderer.domElement);
controls.enableDamping = true;
controls.dampingFactor = 0.08;
controls.target.copy(TARGET_HOME);
controls.minDistance = 1.5;
controls.maxDistance = 20;

scene.add(new THREE.HemisphereLight(0xffffff, 0x9dd188, 1.0));
const dir = new THREE.DirectionalLight(0xffffff, 1.6);
dir.position.set(5, 9, 4);
scene.add(dir);
scene.add(new THREE.AmbientLight(0xffffff, 0.25));

const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(60, 60),
  new THREE.MeshStandardMaterial({ color: 0x9dd188, roughness: 0.95 }),
);
ground.rotation.x = -Math.PI / 2;
ground.position.y = -0.001;
scene.add(ground);

const grid = new THREE.GridHelper(40, 40, 0x6fae7e, 0x86bf90);
grid.material.opacity = 0.35;
grid.material.transparent = true;
scene.add(grid);

const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));
const bloom = new UnrealBloomPass(new THREE.Vector2(window.innerWidth, window.innerHeight), 0.7, 0.2, 0.85);
composer.addPass(bloom);
composer.addPass(new OutputPass());

const peel = new PeelOutline(scene, camera);
const submerged = new SubmergedOutline(scene, camera);
const netMarkers = new NetMarkers(scene, camera);
const logger = new SessionLogger();
logger.startSession();

const solidId = new URLSearchParams(location.search).get('solid') || 'cube';

// ── Render loop ────────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let _poly = null, practice = null, gauntlet = null, mode = 'sandbox', onboarding = null;
function animate() {
  requestAnimationFrame(animate);
  const dt = Math.min(clock.getDelta(), 0.05);
  if (_poly) _poly.update(dt);
  if (mode === 'practice') { practice.update(); submerged.mesh.visible = false; }
  else if (mode === 'gauntlet') { gauntlet.update(); submerged.mesh.visible = false; }
  else if (_poly) submerged.update(_poly); // sandbox / net hunt
  peel.update(dt);
  onboarding?.tick();
  controls.update();
  composer.render();
}
animate();

const HELP_BODY =
  'A net is a 3-D shape unfolded flat — like a cardboard box opened out.\n\n' +
  'Controls:\n' +
  '• Hover near an edge, then click to fold / unfold that face.\n' +
  '• Drag to orbit · scroll to zoom.\n\n' +
  'Modes:\n' +
  '• Sandbox — fold freely.\n' +
  '• Net Hunt — find every distinct net (small shapes).\n' +
  '• Puzzle — practise one challenge.\n' +
  '• Gauntlet — a timed-difficulty run.\n\n' +
  'Switch shapes top-left.';

// Screen-space position of a foldable edge to pulse during idle (sandbox / net hunt).
const _hp = new THREE.Vector3(), _hp2 = new THREE.Vector3();
function foldHintPos() {
  if (!_poly || (mode !== 'sandbox' && mode !== 'net')) return null;
  for (const f of _poly.faces) {
    if (f.unfolded || f === _poly.root) continue;
    for (const e of f.getEdges()) {
      if (!e.edgeButton?.active || e.isSevered()) continue;
      e.corner1.getWorldPosition(_hp);
      e.corner2.getWorldPosition(_hp2);
      _hp.add(_hp2).multiplyScalar(0.5).project(camera);
      if (_hp.z > 1) continue; // behind the camera
      return { x: (_hp.x * 0.5 + 0.5) * window.innerWidth, y: (-_hp.y * 0.5 + 0.5) * window.innerHeight };
    }
  }
  return null;
}

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
  composer.setSize(window.innerWidth, window.innerHeight);
  bloom.setSize(window.innerWidth, window.innerHeight);
});

init();

async function init() {
  const [solidData, catalog] = await Promise.all([loadPolyhedron(solidId), loadCatalog()]);
  setupSolidPicker(catalog, solidId);

  // Net Hunt is enabled for solids whose net count is both known (precomputed offline)
  // and small enough to actually hunt by hand. See scripts/precompute-nets.mjs.
  const NETHUNT_MAX = 30;
  const catalogEntry = catalog.flatMap((g) => g.solids).find((s) => s.id === solidId);
  const netCount = catalogEntry?.netCount ?? null;
  const netTractable = netCount != null && netCount <= NETHUNT_MAX;
  const hud = createHUD(netTractable ? netCount : 0);

  const { poly, group, faceMeshes } = buildPolyhedron(solidData, 1);
  _poly = poly;

  const baseFace = solidData.faces[0];
  const baseCy = baseFace.reduce((s, vi) => s + solidData.vertices[vi][1], 0) / baseFace.length;
  group.position.set(0, -baseCy + 0.01, 0);
  scene.add(group);

  // Net enumeration — target count + shared pure-math layout generalize to any solid
  // (Phase C). Passing `geom` makes the live count match the precomputed netCount.
  const geom = netTractable ? solidGeometry(solidData) : null;
  const netManager = new NetEnumeration(netTractable ? netCount : 0, geom);
  if (netTractable) {
    poly.netManager = netManager;
    let halfwayShown = false;
    netManager.onNewNetFound = (idx) => {
      hud.markFound(idx, netManager.foundFootprints[idx]);
      hud.setProgress(netManager.foundCount);
      hud.showToast(`New net found!  ${netManager.foundCount} / ${netManager.total}`);
      logger.logNetComplete(netStateString(poly.faces));
      onboarding?.setNetHunt(mode === 'net', netManager.foundCount, netManager.total);
      if (!halfwayShown && netManager.foundCount >= netManager.total / 2 && !netManager.allFound) {
        halfwayShown = true;
        setTimeout(() => hud.showToast('Halfway there! 🔥'), 1700);
      }
    };
    netManager.onDuplicateFound = () => hud.showToast('Net already found', true);
    netManager.onAllFound = () => {
      onboarding?.celebrate();
      if (speedrun.on) stopSpeedrun(true);
      else hud.showToast(`🎉 All ${netManager.total} nets found!`);
    };
  }

  const picker = createPicker({
    renderer, camera, poly, faceMeshes, logger, enableHover: true,
    onHoverChange: (edge) => peel.setEdge(edge),
  });

  onboarding = createOnboarding({
    logger,
    getHintPos: foldHintPos,
    onHelp: () => forceAlert('How to play', HELP_BODY),
  });

  // Shared challenge view + the two challenge drivers.
  const view = new ChallengeView({ scene, camera, controls, renderer, netMarkers });
  practice = new PracticeMode({ scene, controls, view, catalog, logger });
  gauntlet = new GauntletMode({ scene, view, catalog, logger });

  // ── DOM refs ────────────────────────────────────────────────────────────────
  const nethuntPanel = document.getElementById('nethunt-panel');
  const nethuntBtns = document.getElementById('nethunt-buttons');
  const hintEl = document.getElementById('hint');
  const legendEl = document.getElementById('legend');
  const btn = {
    sandbox: document.getElementById('mode-sandbox'),
    net: document.getElementById('mode-net'),
    puzzle: document.getElementById('mode-puzzle'),
    gauntlet: document.getElementById('mode-gauntlet'),
  };
  const setActiveBtn = (m) => Object.entries(btn).forEach(([k, b]) => b.classList.toggle('active', k === m));

  // ── Free-fold modes (Sandbox / Net Hunt) ────────────────────────────────────
  function enterFreeFold(m) {
    mode = m;
    picker.setClickEnabled(true);
    picker.setHoverEnabled(true);
    group.visible = true;
    camera.position.copy(CAM_HOME);
    controls.target.copy(TARGET_HOME);
    controls.update();
    const showGallery = m === 'net' && netTractable;
    nethuntPanel.style.display = showGallery ? '' : 'none';
    nethuntBtns.style.display = '';
    if (legendEl) legendEl.style.display = '';
    setActiveBtn(m === 'net' ? 'net' : 'sandbox');
    hintEl.textContent = m === 'net'
      ? (netTractable ? `Find all ${netCount} distinct nets · click an edge to fold/unfold` : 'Net hunting isn’t available for this shape — try Sandbox or Puzzle')
      : 'Sandbox · click an edge to fold/unfold · drag to orbit · scroll to zoom';
    const isNet = m === 'net' && netTractable;
    onboarding?.setNetHunt(isNet, netManager.foundCount, netManager.total);
    hintBtn.style.display = isNet ? '' : 'none';
    speedrunBtn.style.display = isNet ? '' : 'none';
    if (!isNet) { hud.clearHint(); if (speedrun.on) stopSpeedrun(false); }
  }
  const enterSandbox = () => enterFreeFold('sandbox');
  const enterNetHunt = () => enterFreeFold('net');

  // ── Challenge modes take over the view ───────────────────────────────────────
  function takeOver(m) {
    mode = m;
    picker.setClickEnabled(false);
    picker.setHoverEnabled(false);
    group.visible = false;
    nethuntPanel.style.display = 'none';
    nethuntBtns.style.display = 'none';
    if (legendEl) legendEl.style.display = 'none';
    setActiveBtn(m);
    hintEl.textContent = '';
    onboarding?.setNetHunt(false);
    if (speedrun.on) stopSpeedrun(false);
  }
  const backToSandbox = () => { camera.position.copy(CAM_HOME); controls.target.copy(TARGET_HOME); controls.update(); enterSandbox(); };
  practice.onStart = () => takeOver('puzzle');
  practice.onClose = backToSandbox;
  gauntlet.onStart = () => takeOver('gauntlet');
  gauntlet.onClose = backToSandbox;

  function leaveChallenges() { if (practice.active) practice.stop(); if (gauntlet.active) gauntlet.stop(); }

  btn.sandbox.addEventListener('click', () => { leaveChallenges(); enterSandbox(); });
  btn.net.addEventListener('click', () => { leaveChallenges(); enterNetHunt(); });
  btn.puzzle.addEventListener('click', () => { if (mode === 'practice') return; leaveChallenges(); practice.openChooser(); });
  btn.gauntlet.addEventListener('click', () => { if (mode === 'gauntlet') return; leaveChallenges(); gauntlet.openChooser(); });
  document.getElementById('cv-end').addEventListener('click', leaveChallenges);

  // ── HUD buttons ─────────────────────────────────────────────────────────────
  document.getElementById('reset').addEventListener('click', () => { logger.logReset(netStateString(poly.faces)); poly.reset(); });
  document.getElementById('export').addEventListener('click', () => logger.export());
  window.addEventListener('beforeunload', () => logger.endSession());

  // ── Net Hunt hint: reveal the silhouette of a net not yet found ──────────────
  const hintBtn = document.getElementById('hint-btn');
  let allNetsCache = null, hintIdx = 0;
  hintBtn.addEventListener('click', () => {
    if (!netTractable) return;
    if (!allNetsCache) allNetsCache = allNets(geom) || [];
    const unfound = allNetsCache.filter((n) => !netManager.foundNets.includes(n.fingerprint));
    if (!unfound.length) { hud.showToast('No nets left to hint!'); return; }
    hud.showHint(unfound[hintIdx++ % unfound.length].footprint);
  });

  // ── Speed-run: time finding every net; keep a per-solid best ─────────────────
  const speedrunBtn = document.getElementById('speedrun-btn');
  const speedrun = { on: false, t0: 0, timer: null };
  const bestKey = `pn_best_${solidId}`;
  function startSpeedrun() {
    speedrun.on = true;
    speedrunBtn.setAttribute('aria-pressed', 'true');
    netManager.reset(); hud.resetGallery(); hud.setProgress(0); hud.clearHint();
    poly.reset();
    speedrun.t0 = performance.now();
    hud.setTimer(0); hud.showTimer(true);
    clearInterval(speedrun.timer);
    speedrun.timer = setInterval(() => hud.setTimer((performance.now() - speedrun.t0) / 1000), 250);
    hud.showToast('Speed-run! Find all nets ⏱');
  }
  function stopSpeedrun(won) {
    clearInterval(speedrun.timer);
    speedrun.on = false;
    speedrunBtn.setAttribute('aria-pressed', 'false');
    if (won) {
      const secs = (performance.now() - speedrun.t0) / 1000;
      hud.setTimer(secs);
      const prev = parseFloat(localStorage.getItem(bestKey) || 'Infinity');
      const best = Math.min(prev, secs);
      localStorage.setItem(bestKey, String(best));
      const fmt = (s) => `${Math.floor(s / 60)}:${String(Math.floor(s % 60)).padStart(2, '0')}`;
      hud.showToast(secs <= prev ? `🏆 New best: ${fmt(secs)}!` : `Done in ${fmt(secs)} · best ${fmt(best)}`);
    } else {
      hud.showTimer(false);
    }
  }
  speedrunBtn.addEventListener('click', () => (speedrun.on ? stopSpeedrun(false) : startSpeedrun()));

  enterSandbox();

  // First-ever visit: a one-line welcome that kicks off the interactive tutorial.
  // Returning visitors skip straight in (the ? button reopens help anytime).
  setTimeout(() => {
    if (localStorage.getItem('pn_tutorial_done_v1') === '1') return;
    forceAlert('Welcome to PrismNets',
      'Unfold 3-D shapes into flat nets. Let’s start with a quick 3-step walkthrough — tap “Got it”.',
      () => onboarding.startTutorial());
  }, 500);

  window.PrismNets = { poly, netManager, logger, scene, camera };
}
