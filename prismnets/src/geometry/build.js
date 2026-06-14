import * as THREE from 'three';
import { Polyhedron, FACE_COLORS } from '../core/Polyhedron.js';
import { Face } from '../core/Face.js';
import { Edge } from '../core/Edge.js';

// Face colour from the Unity DoubleSidedBlue.mat; outline keeps the net readable.
const FACE_MAT = new THREE.MeshStandardMaterial({
  color: 0x45afee, roughness: 0.5, metalness: 0.0, side: THREE.DoubleSide,
});
const OUTLINE_MAT = new THREE.LineBasicMaterial({ color: 0x0b1c2e, linewidth: 2 });

/**
 * Generic polyhedron builder — JS port of PolyhedronBuilder.BuildFromData.
 * Builds the Three.js scene graph (face meshes) AND the logical Polyhedron/Face/Edge
 * model on the same node hierarchy. There are no rendered edge buttons — foldable
 * edges are detected by cursor proximity (see picker.js); each Edge carries a small
 * state object (active/locked) that the connectivity logic toggles.
 *
 * @returns {{ poly: Polyhedron, group: THREE.Group }}
 */
export function buildPolyhedron(data, scale = 1) {
  const verts = data.vertices.map((v) => new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(scale));

  // Edge → the (faceIndex, localEdgeIndex) pairs that share it.
  const edgeToFaces = new Map();
  for (let fi = 0; fi < data.faces.length; fi++) {
    const fv = data.faces[fi];
    for (let ei = 0; ei < fv.length; ei++) {
      const a = fv[ei], b = fv[(ei + 1) % fv.length];
      const key = a < b ? `${a}_${b}` : `${b}_${a}`;
      if (!edgeToFaces.has(key)) edgeToFaces.set(key, []);
      edgeToFaces.get(key).push({ fi, ei });
    }
  }

  const group = new THREE.Group();
  group.name = data.name;
  const poly = new Polyhedron(group);

  const faceComps = [];
  const faceMeshes = []; // polygon meshes, for cursor raycasting

  // ── Faces, corners, meshes ────────────────────────────────────────────────
  for (let fi = 0; fi < data.faces.length; fi++) {
    const fv = data.faces[fi];
    const worldVerts = fv.map((vi) => verts[vi]);
    const centroid = centroidOf(worldVerts);

    const faceGroup = new THREE.Group();
    faceGroup.name = `Face_${fi}`;
    faceGroup.position.copy(centroid);
    group.add(faceGroup);

    const face = new Face(`face_${fi}`, poly);
    face.isBase = fi === 0;
    face.group = faceGroup;
    face.vertexIds = fv.slice(); // global vertex indices, in corner order

    // Polygon mesh (local coordinates relative to the face centroid).
    const meshGroup = buildFaceMesh(worldVerts, centroid);
    faceGroup.add(meshGroup);
    meshGroup.traverse((o) => {
      if (o.isMesh) { o.userData.face = face; face.mesh = o; faceMeshes.push(o); }
    });

    // Corner markers at each vertex (empty Object3D; world pos drives fold math).
    for (let ci = 0; ci < fv.length; ci++) {
      const c = new THREE.Object3D();
      c.position.copy(verts[fv[ci]]).sub(centroid);
      faceGroup.add(c);
      face.corners.push(c);
    }

    // Edge objects, one per face-edge slot (between corner j and j+1).
    for (let j = 0; j < fv.length; j++) {
      const a = fv[j], b = fv[(j + 1) % fv.length];
      const edge = new Edge(`face_${fi}_${j}`, face, face.corners[j], face.corners[(j + 1) % fv.length]);
      edge.va = Math.min(a, b); // global vertex indices of this physical edge
      edge.vb = Math.max(a, b);
      face.addEdge(edge);
    }

    faceComps.push(face);
  }

  // ── Wire shared edges: connectivity, fold angle, edge buttons ──────────────
  for (const pairs of edgeToFaces.values()) {
    if (pairs.length !== 2) continue; // boundary edge (shouldn't occur on a closed solid)
    const { fi: fi0, ei: ei0 } = pairs[0];
    const { fi: fi1, ei: ei1 } = pairs[1];

    const e0 = faceComps[fi0].getEdge(ei0);
    const e1 = faceComps[fi1].getEdge(ei1);
    e0.setConnectedEdge(e1);
    e1.setConnectedEdge(e0);

    const foldAngle = computeFoldAngle(verts, data.faces[fi0], data.faces[fi1]);
    e0.foldAngle = foldAngle;
    e1.foldAngle = foldAngle;

    e0.setEdgeButton(makeEdgeButton());
    e1.setEdgeButton(makeEdgeButton());
  }

  poly.faces = faceComps;
  poly.root = faceComps[0];
  poly.initialize();

  // The base face is the fixed reference you unfold the cube around — lock its
  // buttons so it can't be rotated (NetEnumeration measures every face relative to
  // the root, and allows the root to stay folded). Sides still fold ONTO the base
  // via their own buttons on the shared edges.
  for (const e of poly.root.getEdges()) {
    if (e.edgeButton) { e.edgeButton.locked = true; e.edgeButton.setActive(false); }
  }

  // Mark the base face (the fixed anchor) gold so it's identifiable in every mode.
  if (poly.root.mesh) poly.root.mesh.material.color.setHex(FACE_COLORS.base);

  return { poly, group, faceMeshes };
}

// ── Helpers ──────────────────────────────────────────────────────────────────

// State-only "edge button": tracks whether the edge is foldable. No geometry — the
// connectivity logic toggles `active`, and the picker reads it for proximity hover.
// setMaterial is a no-op (the tendril is the only hover visual).
function makeEdgeButton() {
  return {
    active: true,
    locked: false, // base-face edges are locked off — the base is the fixed anchor
    setActive(on) { if (this.locked) on = false; this.active = on; },
    setMaterial() {},
  };
}

function buildFaceMesh(worldVerts, centroid) {
  const n = worldVerts.length;
  const local = worldVerts.map((v) => v.clone().sub(centroid));

  // UV planar projection centred on the face CENTROID (local origin, since `local`
  // is centroid-relative), so the icon's centred symbol lands on the face centre for
  // any polygon — not the bounding-box centre, which is off for non-square faces.
  const uDir = local[1].clone().sub(local[0]).normalize();
  const edge2 = local[n - 1].clone().sub(local[0]);
  const vDir = new THREE.Vector3()
    .crossVectors(new THREE.Vector3().crossVectors(uDir, edge2).normalize(), uDir)
    .normalize();
  const us = local.map(p => p.dot(uDir));
  const vs = local.map(p => p.dot(vDir));
  const uHalf = Math.max(...us.map(Math.abs)) || 1;
  const vHalf = Math.max(...vs.map(Math.abs)) || 1;

  // Triangle fan from vertex 0; build positions and UVs in lock-step.
  const positions = [], uvAttrib = [];
  for (let i = 0; i < n - 2; i++) {
    for (const vi of [0, i + 1, i + 2]) {
      pushVert(positions, local[vi]);
      uvAttrib.push(0.5 + us[vi] / (2 * uHalf), 0.5 + vs[vi] / (2 * vHalf));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvAttrib, 2));
  geo.computeVertexNormals();

  // Ensure outward-facing winding (away from the solid centre ≈ origin).
  geo.computeVertexNormals();
  const nrm = geo.getAttribute('normal');
  if (nrm.getX(0) * centroid.x + nrm.getY(0) * centroid.y + nrm.getZ(0) * centroid.z < 0) {
    flipWinding(geo);
  }

  const group = new THREE.Group();
  group.add(new THREE.Mesh(geo, FACE_MAT.clone()));

  // Outline for readability.
  const loop = [...local, local[0]];
  const outlinePts = [];
  for (let i = 0; i < loop.length - 1; i++) { outlinePts.push(loop[i], loop[i + 1]); }
  const outlineGeo = new THREE.BufferGeometry().setFromPoints(outlinePts);
  group.add(new THREE.LineSegments(outlineGeo, OUTLINE_MAT));

  return group;
}

function flipWinding(geo) {
  for (const attrName of ['position', 'uv']) {
    const attr = geo.getAttribute(attrName);
    if (!attr) continue;
    for (let i = 0; i < attr.count; i += 3) {
      for (let k = 0; k < attr.itemSize; k++) {
        const a = attr.getComponent(i + 1, k);
        const b = attr.getComponent(i + 2, k);
        attr.setComponent(i + 1, k, b);
        attr.setComponent(i + 2, k, a);
      }
    }
    attr.needsUpdate = true;
  }
  geo.computeVertexNormals();
}

function pushVert(arr, v) { arr.push(v.x, v.y, v.z); }

function centroidOf(pts) {
  const c = new THREE.Vector3();
  for (const p of pts) c.add(p);
  return c.divideScalar(pts.length);
}

function outwardNormal(allVerts, faceVerts) {
  const v0 = allVerts[faceVerts[0]];
  const e1 = allVerts[faceVerts[1]].clone().sub(v0);
  const e2 = allVerts[faceVerts[2]].clone().sub(v0);
  const n = e1.cross(e2).normalize();
  const c = new THREE.Vector3();
  for (const vi of faceVerts) c.add(allVerts[vi]);
  c.divideScalar(faceVerts.length);
  if (n.dot(c) < 0) n.negate();
  return n;
}

// foldAngle = 180° − dihedral; for a cube this is 90°.
function computeFoldAngle(allVerts, face1, face2) {
  const n1 = outwardNormal(allVerts, face1);
  const n2 = outwardNormal(allVerts, face2);
  const dihedral = Math.acos(THREE.MathUtils.clamp(-n1.dot(n2), -1, 1)) * THREE.MathUtils.RAD2DEG;
  return 180 - dihedral;
}
