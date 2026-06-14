import * as THREE from 'three';

const _c1 = new THREE.Vector3();
const _c2 = new THREE.Vector3();

/**
 * Port of PolyhedronStructure.Edge. A directed half-edge belonging to one face,
 * paired with the matching half-edge on the adjacent face (connectedEdge).
 * Corners are THREE.Object3D markers whose WORLD positions move as the face folds —
 * the fold point/vector are recomputed from them each query, exactly like the C#.
 */
export class Edge {
  constructor(id, face, corner1, corner2) {
    this.id = id;
    this.face = face;
    this.corner1 = corner1; // THREE.Object3D
    this.corner2 = corner2; // THREE.Object3D
    this.connectedEdge = null;
    this.edgeButton = null; // { mesh, ... } set by builder
    this.foldAngle = 0;
    this.severed = false;
  }

  getID() { return this.id; }
  getFace() { return this.face; }

  setConnectedEdge(edge) { this.connectedEdge = edge; }
  getConnectedEdge() { return this.connectedEdge; }

  isSevered() { return this.severed; }

  // Severing is symmetric across the shared edge (mirrors C# SetSevered).
  setSevered(isSevered) {
    if (this.connectedEdge == null) throw new Error('No connected edge');
    this.severed = isSevered;
    this.connectedEdge.severed = isSevered;
    // Reflect in the rendered button: severed edges are not foldable.
    if (this.edgeButton) this.edgeButton.setActive(!isSevered);
    if (this.connectedEdge.edgeButton) this.connectedEdge.edgeButton.setActive(!isSevered);
  }

  getEdgeButton() { return this.edgeButton; }
  setEdgeButton(b) { this.edgeButton = b; }

  // World-space fold axis: corner1 - corner2.
  getFoldVector(out = new THREE.Vector3()) {
    this.corner1.getWorldPosition(_c1);
    this.corner2.getWorldPosition(_c2);
    return out.copy(_c1).sub(_c2);
  }

  // World-space pivot: midpoint of the two corners.
  getFoldPoint(out = new THREE.Vector3()) {
    this.corner1.getWorldPosition(_c1);
    this.corner2.getWorldPosition(_c2);
    return out.copy(_c1).add(_c2).multiplyScalar(0.5);
  }
}
