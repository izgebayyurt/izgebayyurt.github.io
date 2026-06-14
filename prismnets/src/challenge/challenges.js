import * as THREE from 'three';

// Unified challenge generators, shared by Practice and Gauntlet. Each operates on a
// poly that the driver has already built + unfolded into a net, and returns a uniform
// descriptor consumed by ChallengeView:
//
//   { type, answerMode, prompt, correct?, ... }
//   answerMode:
//     'tf'            → True/False buttons        (seam, close)
//     'pickFace'      → tap a candidate face      (adjacency)  + candidateIds, faceTints, markers
//     'pickCandidate' → pick 1 of N folded solids (color, arrow) + candidates, correctIdx, iconKind
//
// On-net challenges also carry markers:{dots,stubs} (for NetMarkers) and showReference.

const REFERENCE_COLOR = '#f2c238'; // gold (matches base-face colour)
const CANDIDATE_COLOR = '#ffffff';
const SEAM_PALETTE = [
  '#e0524d', '#4d8fe0', '#5fbf73', '#d9a13a', '#9b7fe0',
  '#42b3b3', '#d96bb0', '#b0863a', '#6fb0e0', '#cf6a4a',
];

const _wa = new THREE.Vector3();
const _wb = new THREE.Vector3();

// ── Challenge registry + difficulty ─────────────────────────────────────────────
// Per-challenge metadata: presentation modality + solid face-count constraints.
export const CHALLENGES = {
  seam:      { label: 'Seams',          answerMode: 'tf',            minFaces: 4 },
  close:     { label: 'Will it close?', answerMode: 'tf',            minFaces: 4 },
  adjacency: { label: 'Adjacency',      answerMode: 'pickFace',      minFaces: 6 },
  color:     { label: 'Match · colours', answerMode: 'pickCandidate', minFaces: 4, iconKind: 'color' },
  arrow:     { label: 'Match · arrows',  answerMode: 'pickCandidate', minFaces: 4, maxFaces: 10, iconKind: 'arrow' },
};
export const CHALLENGE_IDS = ['seam', 'close', 'adjacency', 'color', 'arrow'];

export const TIERS = ['easy', 'medium', 'hard', 'impossible'];
const TIER_LEVEL = { easy: 0, medium: 4, hard: 9, impossible: 16 };
export function paramsForTier(tier) { return difficultyFor(TIER_LEVEL[tier] ?? 0); }

// A single rising level drives every knob: solid face count, net spread, candidate
// count (adjacency), seam count/subtlety, distractor strength (match).
export function difficultyFor(level) {
  const maxFaces = Math.min(6 + level * 2, 32);
  return {
    level,
    minFaces: Math.max(4, maxFaces - 4),
    maxFaces,
    spreadBand: [1.0 + level * 0.15, 2.0 + level * 0.5],
    candidateCount: Math.min(2 + Math.floor(level / 2), 6), // adjacency
    seamCount: Math.min(2 + level, 12),
    seamSubtlety: Math.min(level / 10, 1),
  };
}

// Face-count band for a (challenge, params) pair, honouring per-challenge constraints.
export function faceRange(challengeId, params) {
  const m = CHALLENGES[challengeId];
  const min = Math.max(params.minFaces, m.minFaces || 4);
  const max = Math.min(params.maxFaces, m.maxFaces || Infinity);
  return [min, Math.max(min, max)];
}

// Pick a catalog solid ({id, display, faces}) within the challenge's face band; widen
// the band if empty so a run never stalls.
export function pickSolid(solids, challengeId, params) {
  const [min, max0] = faceRange(challengeId, params);
  let max = max0;
  let pool = solids.filter((s) => s.faces >= min && s.faces <= max);
  while (!pool.length && max < 200) { max += 2; pool = solids.filter((s) => s.faces >= min && s.faces <= max); }
  if (!pool.length) pool = solids;
  return pool[(Math.random() * pool.length) | 0];
}

// ── Helpers ──────────────────────────────────────────────────────────────────
export function gluePairs(poly) {
  const seen = new Set();
  const pairs = [];
  for (const face of poly.faces) {
    for (const e of face.getEdges()) {
      if (!e.isSevered() || seen.has(e.getID())) continue;
      const c = e.getConnectedEdge();
      seen.add(e.getID());
      seen.add(c.getID());
      pairs.push([e, c]);
    }
  }
  return pairs;
}

function netDist(a, b) {
  a.group.getWorldPosition(_wa);
  b.group.getWorldPosition(_wb);
  return _wa.distanceTo(_wb);
}

function shuffle(arr) {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
  return arr;
}

function sameArray(a, b) {
  if (a.length !== b.length) return false;
  for (let i = 0; i < a.length; i++) if (a[i] !== b[i]) return false;
  return true;
}

// Face-index pairs that share an edge in the solid.
function adjacentFacePairs(poly) {
  const idx = new Map(poly.faces.map((f, i) => [f, i]));
  const seen = new Set();
  const pairs = [];
  for (let i = 0; i < poly.faces.length; i++) {
    for (const e of poly.faces[i].getEdges()) {
      const j = idx.get(e.getConnectedEdge().getFace());
      if (j === undefined || j === i) continue;
      const key = i < j ? `${i}_${j}` : `${j}_${i}`;
      if (seen.has(key)) continue;
      seen.add(key);
      pairs.push([i, j]);
    }
  }
  return pairs;
}

// ── Seam match (True/False) ────────────────────────────────────────────────────
export function genSeam(poly, params) {
  const pairs = shuffle(gluePairs(poly)).slice(0, Math.max(2, params.seamCount));
  const stubs = [];
  pairs.forEach(([a, b], i) => {
    const color = SEAM_PALETTE[i % SEAM_PALETTE.length];
    stubs.push({ edge: a, color }, { edge: b, color, _pair: i });
  });

  let correct = true;
  if (pairs.length >= 2 && Math.random() < 0.5) {
    correct = false;
    const i = (Math.random() * pairs.length) | 0;
    const half = stubs.find((s) => s._pair === i);
    const offset = params.seamSubtlety > 0.5 ? 1 : 3;
    half.color = SEAM_PALETTE[(i + offset) % SEAM_PALETTE.length];
  }

  return {
    type: 'seam', answerMode: 'tf', correct, showReference: true,
    prompt: 'Do the coloured seams match up when this folds?',
    markers: { dots: [], stubs },
  };
}

// ── Adjacency (pick the candidate face that touches the reference) ───────────────
export function genAdjacent(poly, params) {
  const faces = poly.faces;
  let ref = null, correct = null;
  for (const f of shuffle(faces.slice())) {
    const severedAdj = f.getEdges().filter((e) => e.isSevered())
      .map((e) => e.getConnectedEdge().getFace());
    if (severedAdj.length) { ref = f; correct = shuffle(severedAdj)[0]; break; }
  }
  if (!ref) {
    ref = faces[(Math.random() * faces.length) | 0];
    correct = ref.getEdges()[0].getConnectedEdge().getFace();
  }

  const adjacent = new Set(ref.getEdges().map((e) => e.getConnectedEdge().getFace()));
  const decoys = faces
    .filter((f) => f !== ref && f !== correct && !adjacent.has(f))
    .sort((a, b) => netDist(ref, a) - netDist(ref, b))
    .slice(0, Math.max(0, params.candidateCount - 1));

  const candidates = shuffle([correct, ...decoys]);
  const faceTints = [
    { faceId: ref.getID(), color: REFERENCE_COLOR },
    ...candidates.map((f) => ({ faceId: f.getID(), color: CANDIDATE_COLOR })),
  ];

  return {
    type: 'adjacency', answerMode: 'pickFace', showReference: true,
    prompt: 'Tap the WHITE face that touches the gold face when folded.',
    correct: correct.getID(),
    candidateIds: candidates.map((f) => f.getID()),
    faceTints,
    markers: { dots: [], stubs: [] },
  };
}

// ── Will it close (True/False) ──────────────────────────────────────────────────
// The driver arranges the net valid or overlapping beforehand and passes `valid`.
export function genClose(poly, valid, solidName) {
  return {
    type: 'close', answerMode: 'tf', correct: valid, showReference: true,
    prompt: `Does this flat shape fold into the ${solidName} with no overlaps?`,
    markers: { dots: [], stubs: [] },
  };
}

// ── Fold-to-solid match (pick 1 of N folded candidates) ─────────────────────────
// Returns face→icon assignments: the correct candidate matches the net's assignment;
// distractors swap the icons on two adjacent faces (a single transposition is never a
// rotation of these solids, so each distractor is a genuinely different solid).
// iconKind ('color' | 'arrow') tells ChallengeView which texture set to render with.
export function genMatch(poly, params, iconKind) {
  const n = poly.faces.length;
  const assignment = shuffle(Array.from({ length: n }, (_, i) => i));
  const candidates = [[...assignment]];
  const tryAdd = (i, j) => {
    if (candidates.length >= 4) return;
    const v = [...assignment];
    [v[i], v[j]] = [v[j], v[i]];
    if (!candidates.some((c) => sameArray(c, v))) candidates.push(v);
  };
  for (const [i, j] of shuffle(adjacentFacePairs(poly))) tryAdd(i, j);
  for (let i = 0; candidates.length < 4 && i < n; i++) {
    for (let j = i + 1; candidates.length < 4 && j < n; j++) tryAdd(i, j);
  }

  let correctIdx = 0;
  // Fisher–Yates that tracks where the correct candidate (index 0) lands.
  for (let i = candidates.length - 1; i > 0; i--) {
    const j = (Math.random() * (i + 1)) | 0;
    if (correctIdx === i) correctIdx = j; else if (correctIdx === j) correctIdx = i;
    [candidates[i], candidates[j]] = [candidates[j], candidates[i]];
  }

  return {
    type: iconKind === 'arrow' ? 'arrow' : 'color',
    answerMode: 'pickCandidate', showReference: false,
    prompt: 'Which folded solid does this net make?',
    iconKind, assignment, candidates, correctIdx,
  };
}
