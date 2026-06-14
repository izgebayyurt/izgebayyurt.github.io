import {
  UnfoldState, FoldState,
  StartHoverOnFoldedState, StartHoverOnUnfoldedState,
  EndHoverOnFoldedState, EndHoverOnUnfoldedState,
} from './StateMachine.js';

// Equivalent of Unity Transform.IsChildOf: true if `a` is `b` or nested under `b`.
export function isChildOf(a, b) {
  let n = a;
  while (n) { if (n === b) return true; n = n.parent; }
  return false;
}

/**
 * Port of PolyhedronStructure.Face. `group` is the THREE.Object3D that plays the
 * role of the Unity Transform — rotating/reparenting it moves the face + its subtree.
 */
export class Face {
  constructor(id, poly) {
    this.id = id;
    this.poly = poly;
    this.isBase = false;
    this.unfolded = false;
    this.currentAngle = 0;
    this.rank = -1;
    this.visited = false;
    this.hoverAngle = 25;        // peek angle (deg); Unity serialized this per-face
    this.hoverInProgress = false;

    this.group = null;           // THREE.Object3D (set by builder)
    this.corners = [];           // THREE.Object3D[]
    this.edges = [];             // Edge[]
    this.mesh = null;            // THREE.Mesh
  }

  getID() { return this.id; }
  addEdge(e) { this.edges.push(e); }
  getEdges() { return this.edges; }
  getEdge(i) { return this.edges[i]; }
  setRank(r) { this.rank = r; }
  getRank() { return this.rank; }
  getVisited() { return this.visited; }
  setVisited(v) { this.visited = v; }

  unfold(foldingEdge) {
    const ok = this.poly.psm.changeState(new UnfoldState(foldingEdge));
    if (ok) {
      this.unfolded = true;
      for (const e of this.edges) {
        if (e.getID() !== foldingEdge.getID()) e.setSevered(true);
      }
      this.poly.recalculateRanks();
    }
  }

  fold(foldingEdge) {
    const ok = this.poly.psm.changeState(new FoldState(foldingEdge));
    if (ok) this.unfolded = false;
  }

  hoverEnter(edge) {
    // Rotate around the OPPOSITE edge so the hovered side peels toward the cursor.
    const n = this.edges.length;
    const idx = this.edges.indexOf(edge);
    const rotEdge = idx >= 0 ? this.edges[(idx + Math.floor(n / 2)) % n] : edge;
    this._hoverRotEdge = rotEdge;

    let ok;
    if (this.unfolded)
      ok = this.poly.psm.changeState(new StartHoverOnUnfoldedState(rotEdge, this.hoverAngle));
    else
      ok = this.poly.psm.changeState(new StartHoverOnFoldedState(rotEdge, this.hoverAngle));
    if (ok) this.hoverEnterFixHierarchy(rotEdge);
  }

  hoverExit(edge) {
    const rotEdge = this._hoverRotEdge ?? edge;
    if (this.unfolded)
      this.poly.psm.changeState(new EndHoverOnUnfoldedState(rotEdge, this.hoverAngle));
    else
      this.poly.psm.changeState(new EndHoverOnFoldedState(rotEdge, this.hoverAngle));
  }

  hoverEnterFixHierarchy(edge) {
    for (const e of this.edges) {
      if (e.getID() === edge.getID()) continue;
      const connFace = e.getConnectedEdge().getFace();
      if (isChildOf(connFace.group, this.group)) {
        e.setSevered(true);
        if (this.poly.checkEverythingConnected()) this.poly.recalculateRanks();
        else e.setSevered(false);
      } else {
        e.setSevered(true);
      }
    }
    this.poly.recalculateRanks();
  }

  // BFS from this face; true if we can reach all faces (avoiding `faceToAvoid`)
  // WITHOUT going through the base — i.e. this branch has another connection left.
  checkOneConnectionLeft(faceToAvoid) {
    this.poly.resetVisited();
    const queue = [this];
    while (queue.length) {
      const cur = queue.shift();
      if (cur.isBase) { this.poly.resetVisited(); return false; }
      cur.setVisited(true);
      for (const e of cur.getEdges()) {
        const cf = e.getConnectedEdge().getFace();
        if (!e.isSevered() && cf !== faceToAvoid && !cf.getVisited()) queue.push(cf);
      }
    }
    this.poly.resetVisited();
    return true;
  }
}
