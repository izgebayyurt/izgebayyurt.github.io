import * as THREE from 'three';

const SIZE = 256;

// Distinct (colour, symbol) pairs for face identification. Up to 8 are defined —
// enough for the cube (6), octahedron (8), pyramid (5) and tetrahedron (4). The
// white bar near the top edge encodes "up" so face orientation is readable too.
const PALETTE = [
  { bg: '#b03030', draw: drawCircle },   // red     circle
  { bg: '#2060a0', draw: drawTriangle }, // blue    triangle
  { bg: '#226e40', draw: drawStar },     // green    star
  { bg: '#a07010', draw: drawArrow },    // amber    arrow
  { bg: '#6030a0', draw: drawDiamond },  // purple   diamond
  { bg: '#b06020', draw: drawCross },    // orange   cross
  { bg: '#2a8c8c', draw: drawSquare },   // teal     square
  { bg: '#9c2f6b', draw: drawHexagon },  // magenta  hexagon
];

// Build `count` distinct face textures. For count ≤ 8 the hand-drawn shape palette
// is used; beyond that (many-faced Archimedean / Johnson solids) it falls back to
// distinct hue tiles numbered 1..count, which scale to any face count.
export function makeFaceTextures(count = PALETTE.length) {
  if (count <= PALETTE.length) {
    return PALETTE.slice(0, count).map(({ bg, draw }) => tile(bg, draw));
  }
  return Array.from({ length: count }, (_, i) => {
    const hue = Math.round((i * 360) / count);
    const bg = `hsl(${hue}, 55%, 42%)`;
    return tile(bg, (ctx) => drawNumber(ctx, i + 1));
  });
}

// Arrow textures: a UNIFORM background with a directional arrow rotated to a distinct
// angle per face. No per-face colour — orientation (the arrow direction) is the only
// cue, so the solver must track how each arrow ends up oriented when folded. Best on
// ≤ ~8-face solids; angles get hard to tell apart beyond that (an "impossible" tier).
const ARROW_BG = '#3a6ea5';
export function makeArrowTextures(count) {
  return Array.from({ length: count }, (_, i) => {
    const angle = (i * 360) / Math.max(1, count);
    return tile(ARROW_BG, (ctx) => { ctx.rotate((angle * Math.PI) / 180); drawArrow(ctx); });
  });
}

// One face texture: coloured background, border, top "up" marker, and a centred glyph.
function tile(bg, draw) {
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = SIZE;
  const ctx = canvas.getContext('2d');

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, SIZE, SIZE);

  ctx.strokeStyle = 'rgba(255,255,255,0.4)';
  ctx.lineWidth = 10;
  ctx.strokeRect(6, 6, SIZE - 12, SIZE - 12);

  // Top orientation marker — small white bar near the top edge.
  ctx.fillStyle = 'rgba(255,255,255,0.9)';
  ctx.fillRect(SIZE * 0.35, 16, SIZE * 0.30, 7);

  ctx.save();
  ctx.translate(SIZE / 2, SIZE / 2 + 10);
  draw(ctx);
  ctx.restore();

  return new THREE.CanvasTexture(canvas);
}

function drawNumber(ctx, n) {
  ctx.fillStyle = 'white';
  ctx.font = 'bold 140px system-ui, sans-serif';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText(String(n), 0, 4);
}

function drawCircle(ctx) {
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.arc(0, 0, 62, 0, Math.PI * 2);
  ctx.fill();
}

function drawTriangle(ctx) {
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(0, -70);
  ctx.lineTo(63, 56);
  ctx.lineTo(-63, 56);
  ctx.closePath();
  ctx.fill();
}

function drawStar(ctx) {
  ctx.fillStyle = 'white';
  const r1 = 68, r2 = 29, n = 5;
  ctx.beginPath();
  for (let i = 0; i < n * 2; i++) {
    const r = i % 2 === 0 ? r1 : r2;
    const a = (i * Math.PI / n) - Math.PI / 2;
    if (i === 0) ctx.moveTo(Math.cos(a) * r, Math.sin(a) * r);
    else ctx.lineTo(Math.cos(a) * r, Math.sin(a) * r);
  }
  ctx.closePath();
  ctx.fill();
}

function drawArrow(ctx) {
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(-66, -15);
  ctx.lineTo(8, -15);
  ctx.lineTo(8, -43);
  ctx.lineTo(68, 0);
  ctx.lineTo(8, 43);
  ctx.lineTo(8, 15);
  ctx.lineTo(-66, 15);
  ctx.closePath();
  ctx.fill();
}

function drawDiamond(ctx) {
  ctx.fillStyle = 'white';
  ctx.beginPath();
  ctx.moveTo(0, -73);
  ctx.lineTo(56, 0);
  ctx.lineTo(0, 73);
  ctx.lineTo(-56, 0);
  ctx.closePath();
  ctx.fill();
}

function drawCross(ctx) {
  ctx.fillStyle = 'white';
  const arm = 21, len = 66;
  ctx.fillRect(-arm, -len, arm * 2, len * 2);
  ctx.fillRect(-len, -arm, len * 2, arm * 2);
}

function drawSquare(ctx) {
  ctx.fillStyle = 'white';
  ctx.fillRect(-52, -52, 104, 104);
}

function drawHexagon(ctx) {
  ctx.fillStyle = 'white';
  ctx.beginPath();
  for (let i = 0; i < 6; i++) {
    const a = (i * Math.PI / 3) - Math.PI / 2;
    const x = Math.cos(a) * 66, y = Math.sin(a) * 66;
    if (i === 0) ctx.moveTo(x, y); else ctx.lineTo(x, y);
  }
  ctx.closePath();
  ctx.fill();
}
