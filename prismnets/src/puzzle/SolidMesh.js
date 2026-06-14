import * as THREE from 'three';

/**
 * Builds an ASSEMBLED solid as a THREE.Group of per-face meshes, each textured with
 * the icon assigned to that face. Used to render the puzzle's candidate solids for
 * ANY polyhedron (replaces the cube-only BoxGeometry approach).
 *
 * @param {{vertices:number[][], faces:number[][]}} data  polyhedron definition
 * @param {THREE.Texture[]} textures  icon textures, indexed by assignment
 * @param {number[]} assignment  assignment[faceIndex] = texture index
 * @param {number} scale
 * @returns {THREE.Group}
 */
export function buildSolidMesh(data, textures, assignment, scale = 1) {
  const verts = data.vertices.map((v) => new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(scale));
  const group = new THREE.Group();

  for (let fi = 0; fi < data.faces.length; fi++) {
    const worldVerts = data.faces[fi].map((vi) => verts[vi]);
    const geo = buildFaceGeometry(worldVerts);
    const mat = new THREE.MeshStandardMaterial({
      map: textures[assignment[fi]], roughness: 0.35, metalness: 0.0, side: THREE.DoubleSide,
    });
    group.add(new THREE.Mesh(geo, mat));
  }
  return group;
}

// Plain assembled solid (no icons) with prominent edge outlines — for the gauntlet's
// reference "what it folds into" view.
export function buildPlainSolidMesh(data, scale = 1, color = 0x57a7e0) {
  const verts = data.vertices.map((v) => new THREE.Vector3(v[0], v[1], v[2]).multiplyScalar(scale));
  const group = new THREE.Group();
  const mat = new THREE.MeshStandardMaterial({ color, roughness: 0.45, metalness: 0.0, side: THREE.DoubleSide });
  const lineMat = new THREE.LineBasicMaterial({ color: 0x0b1c2e });
  for (const f of data.faces) {
    const fv = f.map((i) => verts[i]);
    group.add(new THREE.Mesh(buildFaceGeometry(fv), mat));
    const loop = fv.concat([fv[0]]);
    group.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(loop), lineMat));
  }
  return group;
}

// Bounding-sphere radius about the origin — used to frame the candidate camera so
// every solid (small tetra → larger octa) sits nicely in the viewport.
export function boundingRadius(data, scale = 1) {
  let r = 0;
  for (const v of data.vertices) r = Math.max(r, Math.hypot(v[0], v[1], v[2]) * scale);
  return r || 1;
}

// Triangle-fan geometry with a planar UV projection (U along the first edge, V
// perpendicular in the face plane), so a square icon maps sensibly onto the face.
// Positions are the solid-space vertices directly (the solid is centred on the
// origin), so each face sits in its real place — no per-face translation needed.
function buildFaceGeometry(verts) {
  const n = verts.length;
  const c = new THREE.Vector3(); // face centroid, for the outward-winding test only
  for (const v of verts) c.add(v);
  c.divideScalar(n);

  // UV centred on the face centroid so the icon's centred symbol lands on the face
  // centre for any polygon (not the bounding-box centre, off for non-square faces).
  const uDir = verts[1].clone().sub(verts[0]).normalize();
  const edge2 = verts[n - 1].clone().sub(verts[0]);
  const vDir = new THREE.Vector3()
    .crossVectors(new THREE.Vector3().crossVectors(uDir, edge2).normalize(), uDir)
    .normalize();
  const us = verts.map((p) => p.clone().sub(c).dot(uDir));
  const vs = verts.map((p) => p.clone().sub(c).dot(vDir));
  const uHalf = Math.max(...us.map(Math.abs)) || 1;
  const vHalf = Math.max(...vs.map(Math.abs)) || 1;

  const positions = [], uvAttrib = [];
  for (let i = 0; i < n - 2; i++) {
    for (const vi of [0, i + 1, i + 2]) {
      positions.push(verts[vi].x, verts[vi].y, verts[vi].z);
      uvAttrib.push(0.5 + us[vi] / (2 * uHalf), 0.5 + vs[vi] / (2 * vHalf));
    }
  }

  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
  geo.setAttribute('uv', new THREE.Float32BufferAttribute(uvAttrib, 2));
  geo.computeVertexNormals();

  // Ensure outward-facing winding (normal pointing away from the solid centre ≈ origin).
  const nrm = geo.getAttribute('normal');
  if (nrm.getX(0) * c.x + nrm.getY(0) * c.y + nrm.getZ(0) * c.z < 0) flipWinding(geo);
  return geo;
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
