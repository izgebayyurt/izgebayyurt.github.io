import * as THREE from 'three';
import { netStateString } from './SessionLogger.js';

const EDGE_PX = 130; // engage an edge only if the cursor is within this many px of it

/**
 * Buttonless pointer interaction. We raycast the cursor against the FACES, so only
 * the front-most face under the cursor is considered (no back-facing or occluded
 * edges, and nothing engages when the cursor is off the cube). On that face we
 * engage the nearest foldable HINGE edge within EDGE_PX; a click folds/unfolds the
 * face around it (the hinge stays, the rest of the face peels — see PeelOutline).
 */
export function createPicker({
  renderer, camera, poly, faceMeshes, logger,
  enableHover = true, onHoverChange = null, onPeak = null,
}) {
  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  const size = new THREE.Vector2();
  const pa = new THREE.Vector3();
  const pb = new THREE.Vector3();
  const dom = renderer.domElement;

  let clickEnabled = true;
  let hoverEnabled = enableHover;
  let downPos = null;
  let hovered = null; // { edge, face }

  function setNDC(clientX, clientY) {
    const rect = dom.getBoundingClientRect();
    ndc.x = ((clientX - rect.left) / rect.width) * 2 - 1;
    ndc.y = -((clientY - rect.top) / rect.height) * 2 + 1;
  }

  // Engagement: the front-most face under the cursor (DoubleSide handles back-faces),
  // its nearest foldable hinge edge within EDGE_PX, and the cursor's hit point.
  // Returns { edge, point } or null.
  function engage() {
    raycaster.setFromCamera(ndc, camera);
    const hits = raycaster.intersectObjects(faceMeshes, false);
    if (!hits.length) return null;
    const face = hits[0].object.userData.face;
    if (!face) return null;

    renderer.getSize(size);
    const cx = (ndc.x * 0.5 + 0.5) * size.x;
    const cy = (-ndc.y * 0.5 + 0.5) * size.y;
    let best = null;
    let bestD = EDGE_PX;
    for (const e of face.getEdges()) {
      const b = e.edgeButton;
      if (!b || !b.active || e.isSevered()) continue;
      e.corner1.getWorldPosition(pa).project(camera);
      e.corner2.getWorldPosition(pb).project(camera);
      const ax = (pa.x * 0.5 + 0.5) * size.x, ay = (-pa.y * 0.5 + 0.5) * size.y;
      const bx = (pb.x * 0.5 + 0.5) * size.x, by = (-pb.y * 0.5 + 0.5) * size.y;
      const d = segDist(cx, cy, ax, ay, bx, by);
      if (d < bestD) { bestD = d; best = e; }
    }
    return best ? { edge: best, point: hits[0].point.clone() } : null;
  }

  // Always notify onHoverChange (even when same edge) so the highlight can update
  // color immediately if the face's folded/unfolded state changed mid-hover.
  function setHovered(edge) {
    const newID = edge ? edge.getID() : null;
    const oldID = hovered ? hovered.edge.getID() : null;
    if (newID !== oldID) {
      if (hovered) {
        logger?.logHoverExit(hovered.edge.getID(), hovered.face.getID());
        hovered = null;
      }
      if (edge) {
        logger?.logHoverEnter(edge.getID(), edge.getFace().getID());
        hovered = { edge, face: edge.getFace() };
      }
    }
    onHoverChange?.(hovered ? hovered.edge : null);
  }

  function onPointerDown(e) {
    if (e.button !== 0) return;
    downPos = { x: e.clientX, y: e.clientY };
  }

  function onPointerUp(e) {
    if (e.button !== 0 || !downPos) return;
    const moved = Math.hypot(e.clientX - downPos.x, e.clientY - downPos.y);
    downPos = null;
    if (moved > 5) return; // orbit drag, not a click
    if (!clickEnabled || !hovered) return;

    const { edge, face } = hovered;
    const netState = netStateString(poly.faces);
    if (!face.unfolded) {
      logger?.logUnfold(edge.getID(), face.getID(), netState);
      face.unfold(edge);
    } else {
      logger?.logFold(edge.getID(), face.getID(), netState);
      face.fold(edge);
    }
  }

  function onPointerMove(e) {
    setNDC(e.clientX, e.clientY);
    if (!hoverEnabled) {
      if (hovered) { setHovered(null); onPeak?.(null); }
      return;
    }
    if (downPos) { setHovered(null); onPeak?.(null); return; } // suppress while orbiting
    const res = engage();
    setHovered(res ? res.edge : null);
    onPeak?.(res ? res.point : null);
  }

  dom.addEventListener('pointerdown', onPointerDown);
  dom.addEventListener('pointerup', onPointerUp);
  dom.addEventListener('pointermove', onPointerMove);

  return {
    setClickEnabled(on) { clickEnabled = on; },
    setHoverEnabled(on) {
      hoverEnabled = on;
      if (!on && hovered) { setHovered(null); onPeak?.(null); }
    },
    dispose() {
      dom.removeEventListener('pointerdown', onPointerDown);
      dom.removeEventListener('pointerup', onPointerUp);
      dom.removeEventListener('pointermove', onPointerMove);
    },
  };
}

// 2-D distance from point (px,py) to segment (ax,ay)-(bx,by).
function segDist(px, py, ax, ay, bx, by) {
  const dx = bx - ax, dy = by - ay;
  const len2 = dx * dx + dy * dy;
  let t = len2 ? ((px - ax) * dx + (py - ay) * dy) / len2 : 0;
  t = Math.max(0, Math.min(1, t));
  const cx = ax + t * dx, cy = ay + t * dy;
  return Math.hypot(px - cx, py - cy);
}
