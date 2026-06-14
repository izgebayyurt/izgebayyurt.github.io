// Interactive Rubik's cube — drag a face to rotate it, scramble + reset.
// Standard Rubik's color scheme. Smooth drag-release animations; world-aware
// sign math so every face rotates the right way after scrambles.

// Faces: +X red, -X orange, +Y white, -Y yellow, +Z blue, -Z green
const STICKER_COLORS = [
'#c83a2c', // +X right · red
'#e88c2e', // -X left  · orange
'#f0e8d0', // +Y top   · white (cream)
'#e8b82a', // -Y bottom · yellow
'#2e64a8', // +Z front · blue
'#3b8c52' // -Z back  · green
];

const ID = () => [[1, 0, 0], [0, 1, 0], [0, 0, 1]];
const rot = (axis, ang) => {
  const c0 = Math.cos(ang),s = Math.sin(ang);
  if (axis === 0) return [[1, 0, 0], [0, c0, -s], [0, s, c0]];
  if (axis === 1) return [[c0, 0, s], [0, 1, 0], [-s, 0, c0]];
  return [[c0, -s, 0], [s, c0, 0], [0, 0, 1]];
};
const mmul = (A, B) => {
  const R = [[0, 0, 0], [0, 0, 0], [0, 0, 0]];
  for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++)
  for (let k = 0; k < 3; k++) R[i][j] += A[i][k] * B[k][j];
  return R;
};
const mvec = (A, v) => [
A[0][0] * v[0] + A[0][1] * v[1] + A[0][2] * v[2],
A[1][0] * v[0] + A[1][1] * v[1] + A[1][2] * v[2],
A[2][0] * v[0] + A[2][1] * v[1] + A[2][2] * v[2]];


const RubiksMini = ({ c, fonts }) => {
  const canvasRef = React.useRef(null);
  const stateRef = React.useRef(null);
  const [, setTick] = React.useState(0);

  if (!stateRef.current) {
    const cubelets = [];
    for (let x = -1; x <= 1; x++)
    for (let y = -1; y <= 1; y++)
    for (let z = -1; z <= 1; z++)
    cubelets.push({ orig: [x, y, z], pos: [x, y, z], mat: ID() });
    stateRef.current = {
      cubelets,
      view: { rx: -0.5, ry: 0.6 },
      anim: null,
      queue: [],
      drag: null,
      viewDrag: null,
      scrambled: false
    };
  }
  const sched = () => setTick((x) => (x + 1) % 1_000_000);

  const applyMove = (axis, layer, dir) => {
    const st = stateRef.current;
    const final = rot(axis, Math.PI / 2 * dir);
    st.cubelets.forEach((cu) => {
      if (Math.round(cu.pos[axis]) === layer) {
        cu.pos = mvec(final, cu.pos).map((x) => Math.round(x));
        cu.mat = mmul(final, cu.mat);
      }
    });
  };

  const startQueued = () => {
    const st = stateRef.current;
    if (st.anim || st.queue.length === 0) return;
    const m = st.queue.shift();
    st.anim = {
      axis: m.axis, layer: m.layer,
      fromAngle: 0,
      toAngle: Math.PI / 2 * m.dir,
      target: m.dir,
      startMs: performance.now()
    };
  };

  const scramble = () => {
    const st = stateRef.current;
    // Cancel any in-flight animation/queue/drag so a new scramble starts cleanly.
    st.queue = [];
    if (st.anim) {
      const sgn = Math.sign(st.anim.target) || 0;
      for (let i = 0; i < Math.abs(st.anim.target); i++) applyMove(st.anim.axis, st.anim.layer, sgn);
      st.anim = null;
    }
    st.drag = null;
    const N = 22;
    let prevAxis = -1;
    for (let i = 0; i < N; i++) {
      let axis;
      do {axis = Math.floor(Math.random() * 3);} while (axis === prevAxis);
      prevAxis = axis;
      const layer = Math.floor(Math.random() * 3) - 1;
      const dir = Math.random() < 0.5 ? 1 : -1;
      st.queue.push({ axis, layer, dir });
    }
    st.scrambled = true;
    sched();
    startQueued();
  };

  const reset = () => {
    const st = stateRef.current;
    st.queue = [];
    if (st.anim) {
      const sgn = Math.sign(st.anim.target) || 0;
      for (let i = 0; i < Math.abs(st.anim.target); i++) applyMove(st.anim.axis, st.anim.layer, sgn);
      st.anim = null;
    }
    st.cubelets.forEach((cu) => {cu.pos = cu.orig.slice();cu.mat = ID();});
    st.scrambled = false;
    sched();
  };

  // ── Geometry ──
  // SIDE = cubelet half-edge; STICKER = drawn sticker half-edge.
  // HIT_HALF = half-edge used for the input hit test — covers the full
  // cubelet face so clicks in the gaps between stickers still rotate the
  // face instead of falling through to a view-drag.
  const SIDE = 0.46;
  const STICKER = 0.43;
  const HIT_HALF = 0.48;
  const FACES_LOCAL = [
  [1, 0, 0], [-1, 0, 0],
  [0, 1, 0], [0, -1, 0],
  [0, 0, 1], [0, 0, -1]];

  const project = (p, view, scale, W, H) => {
    const { rx, ry } = view;
    let x = p[0],y = p[1],z = p[2];
    const cy = Math.cos(ry),sy = Math.sin(ry);
    let x1 = x * cy + z * sy;
    let z1 = -x * sy + z * cy;
    const cx = Math.cos(rx),sx = Math.sin(rx);
    let y1 = y * cx - z1 * sx;
    let z2 = y * sx + z1 * cx;
    const focal = 7;
    const f = focal / (focal + z2);
    return [W / 2 + x1 * scale * f, H / 2 - y1 * scale * f, z2];
  };
  const stickerLocalCorners = (faceDir, half = STICKER) => {
    const ax = faceDir.findIndex((v) => v !== 0);
    const sn = faceDir[ax];
    const a1 = (ax + 1) % 3;
    const a2 = (ax + 2) % 3;
    return [[half, half], [-half, half], [-half, -half], [half, -half]].map(([p, q]) => {
      const co = [0, 0, 0];
      co[ax] = sn * SIDE;
      co[a1] = p;
      co[a2] = q;
      return co;
    });
  };
  const insideQuad = (p, q) => {
    let sign = 0;
    for (let i = 0; i < 4; i++) {
      const a = q[i],b = q[(i + 1) % 4];
      const cross = (b[0] - a[0]) * (p[1] - a[1]) - (b[1] - a[1]) * (p[0] - a[0]);
      const s = Math.sign(cross);
      if (s !== 0) {if (sign === 0) sign = s;else if (s !== sign) return false;}
    }
    return true;
  };

  React.useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * 2;
      canvas.height = r.height * 2;
      ctx.setTransform(2, 0, 0, 2, 0, 0);
    };
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(canvas);

    let raf;
    const ANIM_MS = 240;
    const loop = () => {
      const now = performance.now();
      const st = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width,H = rect.height;
      const scale = Math.min(W, H) * 0.15;
      ctx.clearRect(0, 0, W, H);

      // ── Animation: smooth from fromAngle → toAngle, commit at end ──
      let animMat = ID();
      let animAxis = null,animLayer = null;
      if (st.anim) {
        const t = Math.min(1, (now - st.anim.startMs) / ANIM_MS);
        if (t >= 1) {
          // Commit before rendering this frame, then render with no anim
          // overlay so we don't double-apply the rotation (1-frame flash).
          const sgn = Math.sign(st.anim.target);
          for (let i = 0; i < Math.abs(st.anim.target); i++) applyMove(st.anim.axis, st.anim.layer, sgn);
          st.anim = null;
          startQueued();
        } else {
          const e = 1 - Math.pow(1 - t, 3); // ease-out cubic
          const cur = st.anim.fromAngle + (st.anim.toAngle - st.anim.fromAngle) * e;
          animMat = rot(st.anim.axis, cur);
          animAxis = st.anim.axis;
          animLayer = st.anim.layer;
        }
      }
      // ── Drag preview ──
      let dragMat = ID(),dragAxis = null,dragLayer = null;
      if (st.drag && st.drag.axis !== null) {
        dragAxis = st.drag.axis;
        dragLayer = st.drag.layer;
        dragMat = rot(dragAxis, st.drag.angle);
      }
      const view = st.view;

      // Build sticker list
      const stickers = [];
      st.cubelets.forEach((cu) => {
        let mat = cu.mat;
        let pos = cu.pos.slice();
        if (animAxis !== null && Math.round(cu.pos[animAxis]) === animLayer) {
          mat = mmul(animMat, cu.mat);
          pos = mvec(animMat, cu.pos);
        } else if (dragAxis !== null && Math.round(cu.pos[dragAxis]) === dragLayer) {
          mat = mmul(dragMat, cu.mat);
          pos = mvec(dragMat, cu.pos);
        }
        FACES_LOCAL.forEach((dir, faceIdx) => {
          const ax = dir.findIndex((v) => v !== 0);
          if (cu.orig[ax] * dir[ax] !== 1) return;
          const localCorners = stickerLocalCorners(dir);
          const worldCorners = localCorners.map((lc) => {
            const r = mvec(mat, lc);
            return [pos[0] + r[0], pos[1] + r[1], pos[2] + r[2]];
          });
          const screen = worldCorners.map((p) => project(p, view, scale, W, H));
          const avgZ = (screen[0][2] + screen[1][2] + screen[2][2] + screen[3][2]) / 4;
          // back-face cull
          const normalWorld = mvec(mat, dir);
          const cyV = Math.cos(view.ry),syV = Math.sin(view.ry);
          const nzR = -normalWorld[0] * syV + normalWorld[2] * cyV;
          const cxV = Math.cos(view.rx),sxV = Math.sin(view.rx);
          const nzCam = normalWorld[1] * sxV + nzR * cxV;
          if (nzCam > -0.02) return;
          stickers.push({
            screen, color: STICKER_COLORS[faceIdx], z: avgZ,
            faceLocal: dir, faceIdx,
            cubelet: cu,
            faceWorld: normalWorld.map(Math.round),
            hitScreen: stickerLocalCorners(dir, HIT_HALF).map((lc) => {
              const r = mvec(mat, lc);
              return project([pos[0] + r[0], pos[1] + r[1], pos[2] + r[2]], view, scale, W, H);
            })
          });
        });
      });
      stickers.sort((a, b) => b.z - a.z);

      // Edges
      ctx.lineWidth = 1;
      st.cubelets.forEach((cu) => {
        let mat = cu.mat;
        let pos = cu.pos.slice();
        if (animAxis !== null && Math.round(cu.pos[animAxis]) === animLayer) {
          mat = mmul(animMat, cu.mat);
          pos = mvec(animMat, cu.pos);
        } else if (dragAxis !== null && Math.round(cu.pos[dragAxis]) === dragLayer) {
          mat = mmul(dragMat, cu.mat);
          pos = mvec(dragMat, cu.pos);
        }
        const corners = [
        [-SIDE, -SIDE, -SIDE], [SIDE, -SIDE, -SIDE], [SIDE, SIDE, -SIDE], [-SIDE, SIDE, -SIDE],
        [-SIDE, -SIDE, SIDE], [SIDE, -SIDE, SIDE], [SIDE, SIDE, SIDE], [-SIDE, SIDE, SIDE]];

        const pj = corners.map((co) => {
          const r = mvec(mat, co);
          return project([pos[0] + r[0], pos[1] + r[1], pos[2] + r[2]], view, scale, W, H);
        });
        const edges = [[0, 1], [1, 2], [2, 3], [3, 0], [4, 5], [5, 6], [6, 7], [7, 4], [0, 4], [1, 5], [2, 6], [3, 7]];
        ctx.strokeStyle = c.inkFaint;
        ctx.beginPath();
        edges.forEach(([a, b]) => {
          ctx.moveTo(pj[a][0], pj[a][1]);
          ctx.lineTo(pj[b][0], pj[b][1]);
        });
        ctx.stroke();
      });

      stickers.forEach((sk) => {
        const [p0, p1, p2, p3] = sk.screen;
        ctx.fillStyle = sk.color;
        ctx.strokeStyle = c.ink;
        ctx.lineWidth = 1.4;
        ctx.beginPath();
        ctx.moveTo(p0[0], p0[1]);
        ctx.lineTo(p1[0], p1[1]);
        ctx.lineTo(p2[0], p2[1]);
        ctx.lineTo(p3[0], p3[1]);
        ctx.closePath();
        ctx.fill();
        ctx.stroke();
      });

      st.lastStickers = stickers;
      st.lastFit = { W, H, scale };
      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => {cancelAnimationFrame(raf);ro.disconnect();};
  }, [c]);

  // ── Input ──
  const screenPos = (e) => {
    const rect = canvasRef.current.getBoundingClientRect();
    return [e.clientX - rect.left, e.clientY - rect.top];
  };
  const projectAxisAt = (worldP, axisVec, view, scale, W, H) => {
    const here = project(worldP, view, scale, W, H);
    const there = project([worldP[0] + axisVec[0] * 0.1, worldP[1] + axisVec[1] * 0.1, worldP[2] + axisVec[2] * 0.1], view, scale, W, H);
    return [there[0] - here[0], there[1] - here[1]];
  };

  const onDown = (e) => {
    e.preventDefault();
    const st = stateRef.current;
    const p = screenPos(e);
    if (st.anim) return;
    const fit = st.lastFit;
    if (!fit) return;
    // Shift+drag always rotates the view, even when starting on a sticker.
    if (e.shiftKey) {
      st.viewDrag = { x: p[0], y: p[1], rx0: st.view.rx, ry0: st.view.ry };
      return;
    }
    const sorted = (st.lastStickers || []).slice().sort((a, b) => a.z - b.z);
    let hit = null;
    for (const sk of sorted) {
      if (insideQuad(p, sk.hitScreen || sk.screen)) {hit = sk;break;}
    }
    if (!hit) {
      st.viewDrag = { x: p[0], y: p[1], rx0: st.view.rx, ry0: st.view.ry };
      return;
    }
    // World face normal (already integer-rounded from cull pass)
    const faceWorld = hit.faceWorld;
    const ax = faceWorld.findIndex((v) => v !== 0);
    const a1 = (ax + 1) % 3,a2 = (ax + 2) % 3;
    const tA = [0, 0, 0];tA[a1] = 1;
    const tB = [0, 0, 0];tB[a2] = 1;
    const ctr = hit.cubelet.pos;
    const dirA2 = projectAxisAt(ctr, tA, st.view, fit.scale, fit.W, fit.H);
    const dirB2 = projectAxisAt(ctr, tB, st.view, fit.scale, fit.W, fit.H);
    st.drag = {
      x0: p[0], y0: p[1],
      faceWorld,
      cubelet: hit.cubelet,
      axesWorld: [{ axisIdx: a1, screen2: dirA2 }, { axisIdx: a2, screen2: dirB2 }],
      axis: null, layer: null, angle: 0, worldSign: 1
    };
  };

  const onMove = (e) => {
    const st = stateRef.current;
    const p = screenPos(e);
    if (st.viewDrag) {
      st.view.rx = st.viewDrag.rx0 - (p[1] - st.viewDrag.y) * 0.01;
      st.view.ry = st.viewDrag.ry0 + (p[0] - st.viewDrag.x) * 0.01;
      st.view.rx = Math.max(-1.2, Math.min(1.2, st.view.rx));
      return;
    }
    if (!st.drag) return;
    const dx = p[0] - st.drag.x0;
    const dy = p[1] - st.drag.y0;
    const mag2 = dx * dx + dy * dy;
    if (mag2 < 60) {
      st.drag.angle = 0;
      st.drag.axis = null;
      return;
    }
    if (st.drag.axis === null) {
      const proj = st.drag.axesWorld.map((opt) => {
        const len = Math.hypot(opt.screen2[0], opt.screen2[1]) || 1;
        const ux = opt.screen2[0] / len;
        const uy = opt.screen2[1] / len;
        return { opt, len: dx * ux + dy * uy };
      });
      proj.sort((a, b) => Math.abs(b.len) - Math.abs(a.len));
      const winner = proj[0];
      const ax = st.drag.faceWorld.findIndex((v) => v !== 0);
      const a1 = (ax + 1) % 3,a2 = (ax + 2) % 3;
      const slideAxis = winner.opt.axisIdx;
      const rotAxis = slideAxis === a1 ? a2 : a1;
      const layer = Math.round(st.drag.cubelet.pos[rotAxis]);
      // Rotation axis = faceWorld × slide  → component along rotAxis tells direction
      const slideVec = [0, 0, 0];slideVec[slideAxis] = 1;
      const cr = [
      st.drag.faceWorld[1] * slideVec[2] - st.drag.faceWorld[2] * slideVec[1],
      st.drag.faceWorld[2] * slideVec[0] - st.drag.faceWorld[0] * slideVec[2],
      st.drag.faceWorld[0] * slideVec[1] - st.drag.faceWorld[1] * slideVec[0]];

      const worldSign = cr[rotAxis] > 0 ? 1 : -1;
      st.drag.axis = rotAxis;
      st.drag.layer = layer;
      st.drag.worldSign = worldSign;
      st.drag.angle = winner.len / 70 * worldSign;
    } else {
      const ax = st.drag.faceWorld.findIndex((v) => v !== 0);
      const a1 = (ax + 1) % 3,a2 = (ax + 2) % 3;
      const slideAxis = st.drag.axis === a1 ? a2 : a1;
      const opt = st.drag.axesWorld.find((o) => o.axisIdx === slideAxis);
      if (!opt) return;
      const len = Math.hypot(opt.screen2[0], opt.screen2[1]) || 1;
      const ux = opt.screen2[0] / len;
      const uy = opt.screen2[1] / len;
      const proj = dx * ux + dy * uy;
      st.drag.angle = Math.max(-Math.PI, Math.min(Math.PI, proj / 70 * st.drag.worldSign));
    }
  };

  const onUp = () => {
    const st = stateRef.current;
    if (st.viewDrag) {st.viewDrag = null;return;}
    if (!st.drag) return;
    const d = st.drag;
    st.drag = null;
    if (d.axis === null) {sched();return;}
    const target = Math.round(d.angle / (Math.PI / 2));
    const toAngle = target * (Math.PI / 2);
    st.anim = {
      axis: d.axis, layer: d.layer,
      fromAngle: d.angle,
      toAngle,
      target,
      startMs: performance.now()
    };
    st.scrambled = true;
    sched();
  };

  // ── View nudge — flipped to match user intent ──
  // ←: spin cube so its left side comes into view (camera moves right)
  // ↑: tilt cube so its top tilts toward you (camera looks more down)
  const nudgeView = (drx, dry) => {
    const st = stateRef.current;
    st.view.rx = Math.max(-1.2, Math.min(1.2, st.view.rx + drx));
    st.view.ry = st.view.ry + dry;
    sched();
  };

  // Click-and-hold autorepeat (chevrons removed; kept holdRef cleanup for safety)
  const holdRef = React.useRef(null);
  const endHold = () => {
    if (holdRef.current) {
      clearInterval(holdRef.current);
      holdRef.current = null;
    }
  };
  React.useEffect(() => () => endHold(), []);

  const st = stateRef.current;

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: 32, alignItems: 'center', marginTop: 28 }}>
      <div
        style={{
          width: 440,
          height: 440,
          background: c.surface,
          border: `1px solid ${c.rule}`,
          borderRadius: 6,
          position: 'relative',
          cursor: st.drag ? 'grabbing' : 'grab',
          touchAction: 'none',
          userSelect: 'none'
        }}
        title="drag a sticker to turn its face · shift+drag (or drag empty space) to rotate the view">
        
        <canvas
          ref={canvasRef}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          style={{ width: '100%', height: '100%', display: 'block' }} />
        
        <div
          style={{
            position: 'absolute',
            left: 14,
            bottom: 10,
            fontFamily: fonts.mono,
            fontSize: 9,
            letterSpacing: '0.16em',
            textTransform: 'uppercase',
            color: c.inkFaint,
            pointerEvents: 'none'
          }}>
          
          drag sticker to turn face · shift + drag to rotate view
        </div>
      </div>
      <div>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.22em', color: c.accent2, textTransform: 'uppercase', marginBottom: 6 }}>
          Cubing · personal best
        </div>
        <div style={{ fontFamily: fonts.display, fontWeight: 400, fontSize: 38, color: c.ink, lineHeight: 1, letterSpacing: '-0.02em' }}>
          22<span style={{ fontStyle: 'italic', color: c.accent, fontSize: 22 }}>s</span>
        </div>
        <div style={{ fontFamily: fonts.body, fontSize: 13, color: c.inkDim, marginTop: 8, maxWidth: 360, lineHeight: 1.55 }}>
          Used to be into speedcubing in my teens; this is roughly my fastest 3×3.{' '}
          <em style={{ color: c.inkFaint }}>

          </em>
        </div>
        <div style={{ display: 'flex', gap: 8, marginTop: 16 }}>
          <button
            onClick={scramble}
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '10px 18px',
              background: c.ink,
              color: c.bg,
              border: 'none',
              cursor: 'pointer',
              borderRadius: 2
            }}>
            
            ⤫ Scramble
          </button>
          <button
            onClick={reset}
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: '0.18em',
              textTransform: 'uppercase',
              padding: '10px 18px',
              background: 'transparent',
              color: c.ink,
              border: `1px solid ${c.rule}`,
              cursor: 'pointer',
              borderRadius: 2
            }}>
            
            ↻ Reset
          </button>
        </div>
      </div>
    </div>);

};

window.RubiksMini = RubiksMini;