// Solid registry. The cube is kept built-in (axis-aligned, unit edges, face 0 on the
// bottom) so cube net-hunting + the test suite stay stable. Every other solid —
// Platonic, Archimedean, prisms, antiprisms and all 92 Johnson solids — is loaded on
// demand from the static assets under /solids/ (generated from tesseralis/
// polyhedra-viewer, normalized to unit edges and reoriented to rest on face 0).
//
// Each solid file is { name, vertices: [[x,y,z], …], faces: [[vertexIndex, …], …] }.
// build.js derives edge adjacency and per-edge fold angles from this alone.

import { CUBE } from './cube.js';

const BUILTINS = { cube: CUBE };

// Load a solid by id (e.g. 'cube', 'icosahedron', 'gyroelongated-pentagonal-pyramid').
// Always async; built-ins resolve immediately. Falls back to the cube on failure.
export async function loadPolyhedron(id) {
  if (!id || BUILTINS[id]) return BUILTINS[id] || CUBE;
  try {
    const res = await fetch(`solids/${id}.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn(`Failed to load solid "${id}", falling back to cube:`, err);
    return CUBE;
  }
}

// Load the grouped catalog ([{ id, label, solids: [{id, display, faces, j}] }]).
export async function loadCatalog() {
  try {
    const res = await fetch(`solids/catalog.json`);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    return await res.json();
  } catch (err) {
    console.warn('Failed to load solid catalog:', err);
    return [];
  }
}
