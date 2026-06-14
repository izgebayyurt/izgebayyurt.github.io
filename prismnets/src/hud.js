/**
 * Net-hunting HUD: an N-slot gallery (each found net drawn as a thumbnail of its face
 * footprint), a progress counter, transient toasts, a "try to make this" hint preview,
 * and a speed-run timer. The slot count N comes from the solid's precomputed netCount,
 * so it adapts to any solid.
 */
export function createHUD(totalNets) {
  const progressEl = document.getElementById('progress');
  const galleryEl = document.getElementById('gallery');
  const toastEl = document.getElementById('toast');
  const hintBox = document.getElementById('nethunt-hint');
  const hintCanvas = document.getElementById('hint-canvas');
  const timerEl = document.getElementById('speedrun-time');

  galleryEl.innerHTML = '';
  const cells = [];
  for (let i = 0; i < totalNets; i++) {
    const cell = document.createElement('div');
    cell.className = 'cell';
    cell.textContent = i + 1;
    galleryEl.appendChild(cell);
    cells.push(cell);
  }

  let toastTimer = null;

  function setProgress(count) {
    progressEl.textContent = `${count} / ${totalNets} nets found`;
  }

  function markFound(index, footprint) {
    const cell = cells[index];
    if (!cell) return;
    cell.classList.add('found');
    cell.textContent = '';
    cell.appendChild(drawFootprint(20, footprint, { fill: '#eafff5', stroke: 'rgba(11,28,46,0.45)' }));
  }

  // Clear all found thumbnails back to empty numbered slots (speed-run restart).
  function resetGallery() {
    cells.forEach((cell, i) => { cell.classList.remove('found'); cell.textContent = i + 1; });
  }

  function showToast(msg, isDup = false) {
    toastEl.textContent = msg;
    toastEl.classList.toggle('dup', isDup);
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => toastEl.classList.remove('show'), 1600);
  }

  // Hint preview: a faint silhouette of a net the player hasn't found yet.
  function showHint(footprint) {
    drawFootprint(40, footprint, { fill: 'rgba(242,194,56,0.55)', stroke: 'rgba(242,194,56,0.9)', canvas: hintCanvas });
    hintBox.classList.add('on');
  }
  function clearHint() { hintBox.classList.remove('on'); }

  // Speed-run timer display (logic lives in main.js; this just renders).
  function setTimer(seconds) {
    const m = Math.floor(seconds / 60), s = Math.floor(seconds % 60);
    timerEl.textContent = `${m}:${String(s).padStart(2, '0')}`;
  }
  function showTimer(on) { timerEl.classList.toggle('on', on); }

  setProgress(0);
  return { setProgress, markFound, resetGallery, showToast, showHint, clearHint, setTimer, showTimer, total: totalNets };
}

// Draw a net footprint (array of [x,z] polygons) into a square canvas, fit + upright.
// Pass an existing `canvas` to reuse it (the hint preview), else a new one is made.
function drawFootprint(size, footprint, { fill, stroke, canvas } = {}) {
  const cv = canvas || document.createElement('canvas');
  cv.width = size; cv.height = size;
  const ctx = cv.getContext('2d');
  ctx.clearRect(0, 0, size, size);
  const pad = 2;

  const all = footprint.flat();
  const xs = all.map((p) => p[0]); const ys = all.map((p) => p[1]);
  const minX = Math.min(...xs), maxX = Math.max(...xs);
  const minY = Math.min(...ys), maxY = Math.max(...ys);
  const span = Math.max(maxX - minX, maxY - minY) || 1;
  const s = (size - 2 * pad) / span;
  const offX = pad + (size - 2 * pad - (maxX - minX) * s) / 2;
  const offY = pad + (size - 2 * pad - (maxY - minY) * s) / 2;
  const tx = (x) => offX + (x - minX) * s;
  const ty = (y) => offY + (maxY - y) * s; // flip Y so it reads upright

  ctx.fillStyle = fill;
  ctx.strokeStyle = stroke;
  ctx.lineWidth = 0.6;
  for (const poly of footprint) {
    if (poly.length < 3) continue;
    ctx.beginPath();
    ctx.moveTo(tx(poly[0][0]), ty(poly[0][1]));
    for (let i = 1; i < poly.length; i++) ctx.lineTo(tx(poly[i][0]), ty(poly[i][1]));
    ctx.closePath();
    ctx.fill();
    ctx.stroke();
  }
  return cv;
}
