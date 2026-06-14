import { buildPolyhedron } from '../geometry/build.js';
import { unfoldWithSpread, makeOverlapNet } from '../geometry/unfold.js';
import { genSeam, genAdjacent, genClose, genMatch } from './challenges.js';

const LIFT = 0.01;

// Build + unfold a poly for one challenge instance and generate its descriptor.
// Returns { poly, group, faceMeshes, solidData, descriptor }. The caller adds `group`
// to the scene (already positioned to rest face 0 just above the ground) and presents
// the descriptor via ChallengeView.
export async function buildChallenge(challengeId, params, solid, loadPolyhedron) {
  const data = await loadPolyhedron(solid.id);
  const built = buildPolyhedron(data, 1);
  const { poly, group } = built;

  const baseCy = data.faces[0].reduce((s, vi) => s + data.vertices[vi][1], 0) / data.faces[0].length;
  group.position.set(0, -baseCy + LIFT, 0);

  const [lo, hi] = params.spreadBand;
  let descriptor;
  if (challengeId === 'seam') {
    unfoldWithSpread(poly, lo, hi);
    descriptor = genSeam(poly, params);
  } else if (challengeId === 'adjacency') {
    unfoldWithSpread(poly, lo, hi);
    descriptor = genAdjacent(poly, params);
  } else if (challengeId === 'close') {
    let valid = Math.random() < 0.5;
    if (!valid && !makeOverlapNet(poly)) valid = true; // couldn't overlap → make it valid
    if (valid) unfoldWithSpread(poly, lo, hi);
    descriptor = genClose(poly, valid, solid.display);
  } else { // 'color' | 'arrow'
    unfoldWithSpread(poly, lo, hi);
    descriptor = genMatch(poly, params, challengeId === 'arrow' ? 'arrow' : 'color');
  }

  return { ...built, solidData: data, descriptor };
}
