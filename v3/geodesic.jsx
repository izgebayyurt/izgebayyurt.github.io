// Geodesic playground — try the Surface Explorer thing right in the page.
// Surfaces: sphere (ambient 3D — geodesics smoothly cross poles),
//           torus, cylinder (sliding mesh, unbounded), hyperboloid (extended).
// Two views: afar (orbit) and on-surface (chase camera).
// Drag from anywhere = launch ball.  Shift+drag = move the camera.

const TWO_PI = Math.PI * 2;

// ── vec helpers ──────────────────────────────────────────────────────
const v_sub = (a, b) => [a[0]-b[0], a[1]-b[1], a[2]-b[2]];
const v_add = (a, b) => [a[0]+b[0], a[1]+b[1], a[2]+b[2]];
const v_scale = (a, k) => [a[0]*k, a[1]*k, a[2]*k];
const v_dot = (a, b) => a[0]*b[0] + a[1]*b[1] + a[2]*b[2];
const v_cross = (a, b) => [a[1]*b[2]-a[2]*b[1], a[2]*b[0]-a[0]*b[2], a[0]*b[1]-a[1]*b[0]];
const v_len = (a) => Math.sqrt(v_dot(a, a));
const v_norm = (a) => { const L = v_len(a) || 1; return [a[0]/L, a[1]/L, a[2]/L]; };

// Map a screen-space drag (dx, dy) to a world-space drag direction
// using the current view rotation (inverse).
function screenToWorldDrag(drag, view) {
  const dx = drag[0], dy = drag[1];
  const cy = Math.cos(view.ry), sy = Math.sin(view.ry);
  const cx = Math.cos(view.rx), sx = Math.sin(view.rx);
  // screen +X in world = (cy, sx*sy, sy*cx)
  // screen +Y (down) in world = -(0, cx, -sx) = (0, -cx, sx)
  return [
    dx * cy,
    dx * sx * sy - dy * cx,
    dx * sy * cx + dy * sx,
  ];
}

// ── Surface library ──────────────────────────────────────────────────
// Each surface defines: init(), pos3(ball), tangent3(ball), step(ball),
//                       launch(ball, drag, view, W, H), mesh(ball)
const SURFACES = {
  // ── SPHERE: ambient 3D integration, no parametric singularity ──────
  sphere: {
    label: 'Sphere',
    hint: 'Positive curvature: every geodesic is a great circle. Watch it cross the poles and come back.',
    init: () => ({ p: [1, 0, 0], t: [0, 0.024, -0.014] }),
    pos3: (b) => b.p,
    tangent3: (b) => b.t,
    step: (b) => {
      // Advance position along current tangent
      const p1 = v_add(b.p, b.t);
      const pn = v_norm(p1);
      // Re-tangentialize velocity (parallel transport, ambient form)
      const Td = v_dot(b.t, pn);
      b.t = v_sub(b.t, v_scale(pn, Td));
      b.p = pn;
    },
    launch: (b, drag, view, W, H) => {
      const dW = screenToWorldDrag(drag, view);
      // Project onto tangent plane at ball
      const dot = v_dot(dW, b.p);
      const t = v_sub(dW, v_scale(b.p, dot));
      const mag = v_len(t);
      const dragMag = Math.sqrt(drag[0]*drag[0] + drag[1]*drag[1]);
      if (mag < 0.5 || dragMag < 6) return;
      const speed = (dragMag / Math.min(W, H)) * 0.08;
      b.t = v_scale(t, speed / mag);
    },
    mesh: () => {
      const lines = [];
      const M = 18, N = 12;
      for (let j = 1; j < N; j++) {
        const th = (Math.PI * j) / N;
        const a = [];
        for (let i = 0; i <= M; i++) {
          const ph = (TWO_PI * i) / M;
          a.push([Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]);
        }
        lines.push(a);
      }
      for (let i = 0; i < M; i++) {
        const ph = (TWO_PI * i) / M;
        const a = [];
        for (let j = 0; j <= N; j++) {
          const th = (Math.PI * j) / N;
          a.push([Math.sin(th) * Math.cos(ph), Math.sin(th) * Math.sin(ph), Math.cos(th)]);
        }
        lines.push(a);
      }
      return lines;
    },
    worldScale: 0.9,
    chaseDist: 0.18,
    chaseHeight: 0.06,
    afarRot: { rx: -0.6, ry: 0.4 },
    centerForChase: (b) => [0, 0, 0],
  },

  // ── TORUS: standard parametric, periodic in both u and v ───────────
  torus: {
    label: 'Torus',
    hint: 'Variable curvature: positive on the outside, negative on the inside. Watch how the path bends differently in each region.',
    init: () => ({ u: 0, v: 0.6, du: 0.014, dv: 0.009 }),
    pos3: (b) => {
      const R = 1.0, r = 0.45;
      return [(R + r * Math.cos(b.v)) * Math.cos(b.u), (R + r * Math.cos(b.v)) * Math.sin(b.u), r * Math.sin(b.v)];
    },
    tangent3: (b) => {
      const R = 1.0, r = 0.45, w = R + r * Math.cos(b.v);
      return [
        b.du * (-w * Math.sin(b.u)) + b.dv * (-r * Math.sin(b.v) * Math.cos(b.u)),
        b.du * ( w * Math.cos(b.u)) + b.dv * (-r * Math.sin(b.v) * Math.sin(b.u)),
        b.dv * ( r * Math.cos(b.v)),
      ];
    },
    step: (st) => {
      const R = 1.0, r = 0.45;
      const denom = R + r * Math.cos(st.v);
      const ddu = (2 * r * Math.sin(st.v) / denom) * st.du * st.dv;
      const ddv = -(denom * Math.sin(st.v) / r) * st.du * st.du;
      st.du += ddu; st.dv += ddv;
      st.u += st.du; st.v += st.dv;
      if (st.u > Math.PI) st.u -= TWO_PI;
      if (st.u < -Math.PI) st.u += TWO_PI;
      if (st.v > Math.PI) st.v -= TWO_PI;
      if (st.v < -Math.PI) st.v += TWO_PI;
    },
    launch: defaultLaunch,
    mesh: () => {
      const R = 1.0, r = 0.45;
      const lines = [];
      const M = 26, N = 12;
      for (let i = 0; i < M; i++) {
        const u = (TWO_PI * i) / M;
        const a = [];
        for (let j = 0; j <= N; j++) {
          const v = (TWO_PI * j) / N;
          a.push([(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)]);
        }
        lines.push(a);
      }
      for (let j = 0; j < N; j++) {
        const v = (TWO_PI * j) / N;
        const a = [];
        for (let i = 0; i <= M; i++) {
          const u = (TWO_PI * i) / M;
          a.push([(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)]);
        }
        lines.push(a);
      }
      return lines;
    },
    worldScale: 0.7,
    chaseDist: 0.16,
    chaseHeight: 0.05,
    afarRot: { rx: -0.6, ry: 0.4 },
    centerForChase: (b) => [0, 0, 0],
  },

  // ── CYLINDER: sliding mesh, unbounded along the axis ───────────────
  cylinder: {
    label: 'Cylinder',
    hint: 'Zero curvature: a plane rolled up. Geodesics are helices that wrap forever. The mesh follows the ball.',
    init: () => ({ u: 0, v: 0, du: 0.022, dv: 0.014 }),
    pos3: (b) => [Math.cos(b.u), Math.sin(b.u), b.v],
    tangent3: (b) => [
      b.du * (-Math.sin(b.u)),
      b.du * Math.cos(b.u),
      b.dv,
    ],
    step: (st) => {
      st.u += st.du; st.v += st.dv;
      if (st.u > Math.PI) st.u -= TWO_PI;
      if (st.u < -Math.PI) st.u += TWO_PI;
      // v stays unbounded — mesh slides along.
    },
    launch: defaultLaunch,
    mesh: (b) => {
      // Mesh anchored at fixed world v positions, snapped to integer
      // multiples of dv. As the ball moves, new rings/lines appear ahead and
      // old ones drop off behind — the cylinder *visibly* slides.
      const vC = b ? b.v : 0;
      const vRange = 3.0;
      const N = 24;
      const dv = (2 * vRange) / N;
      const lines = [];
      const M = 24;
      // Vertical lines along the axis (one per angular slice)
      for (let i = 0; i < M; i++) {
        const u = (TWO_PI * i) / M;
        const a = [];
        const v0 = vC - vRange;
        const v1 = vC + vRange;
        const STEP = dv;
        const start = Math.ceil(v0 / STEP) * STEP;
        for (let v = start - STEP; v <= v1 + STEP; v += STEP) {
          a.push([Math.cos(u), Math.sin(u), v]);
        }
        lines.push(a);
      }
      // Ring lines (around the cylinder) snapped to integer multiples of dv
      const kMin = Math.ceil((vC - vRange) / dv);
      const kMax = Math.floor((vC + vRange) / dv);
      for (let k = kMin; k <= kMax; k++) {
        const v = k * dv;
        const a = [];
        for (let i = 0; i <= M; i++) {
          const u = (TWO_PI * i) / M;
          a.push([Math.cos(u), Math.sin(u), v]);
        }
        lines.push(a);
      }
      return lines;
    },
    worldScale: 0.55,
    chaseDist: 0.18,
    chaseHeight: 0.06,
    afarRot: { rx: -0.55, ry: 0.6 },
    // Afar view centers on the ball so it never scrolls off-screen.
    centerForChase: (b) => [0, 0, b.v],
  },

  // ── ELLIPSOID: tri-axial, ambient integration on the surface ────────
  ellipsoid: {
    label: 'Ellipsoid',
    hint: 'A stretched sphere with three different radii. Geodesics wind around chaotically and rarely close up where they started.',
    init: () => ({ p: [1.2, 0, 0], t: [0, 0.018, 0.022] }),
    pos3: (b) => b.p,
    tangent3: (b) => b.t,
    step: (b) => {
      const a = 1.2, B = 0.7, C = 1;
      const p1 = v_add(b.p, b.t);
      // Project p1 back to the ellipsoid surface
      const s = 1 / Math.sqrt(
        p1[0]*p1[0]/(a*a) + p1[1]*p1[1]/(B*B) + p1[2]*p1[2]/(C*C)
      );
      const pn = v_scale(p1, s);
      // Normal at pn (gradient of the implicit equation)
      const N = v_norm([2*pn[0]/(a*a), 2*pn[1]/(B*B), 2*pn[2]/(C*C)]);
      // Re-tangentialize the velocity to stay in the tangent plane
      const Td = v_dot(b.t, N);
      b.t = v_sub(b.t, v_scale(N, Td));
      b.p = pn;
    },
    launch: (b, drag, view, W, H) => {
      const a = 1.2, B = 0.7, C = 1;
      const dW = screenToWorldDrag(drag, view);
      const N = v_norm([2*b.p[0]/(a*a), 2*b.p[1]/(B*B), 2*b.p[2]/(C*C)]);
      const dot = v_dot(dW, N);
      const t = v_sub(dW, v_scale(N, dot));
      const mag = v_len(t);
      const dragMag = Math.sqrt(drag[0]*drag[0] + drag[1]*drag[1]);
      if (mag < 0.5 || dragMag < 6) return;
      const speed = (dragMag / Math.min(W, H)) * 0.08;
      b.t = v_scale(t, speed / mag);
    },
    mesh: () => {
      const a = 1.2, B = 0.7, C = 1;
      const lines = [];
      const M = 20, N = 12;
      for (let j = 1; j < N; j++) {
        const th = (Math.PI * j) / N;
        const line = [];
        for (let i = 0; i <= M; i++) {
          const ph = (TWO_PI * i) / M;
          line.push([a * Math.sin(th) * Math.cos(ph), B * Math.sin(th) * Math.sin(ph), C * Math.cos(th)]);
        }
        lines.push(line);
      }
      for (let i = 0; i < M; i++) {
        const ph = (TWO_PI * i) / M;
        const line = [];
        for (let j = 0; j <= N; j++) {
          const th = (Math.PI * j) / N;
          line.push([a * Math.sin(th) * Math.cos(ph), B * Math.sin(th) * Math.sin(ph), C * Math.cos(th)]);
        }
        lines.push(line);
      }
      return lines;
    },
    worldScale: 0.75,
    chaseDist: 0.2,
    chaseHeight: 0.06,
    afarRot: { rx: -0.55, ry: 0.5 },
    centerForChase: () => [0, 0, 0],
  },
};

// Default launch for (u, v, du, dv) surfaces — screen-axes → (du, dv)
function defaultLaunch(b, drag, view, W, H) {
  const dx = drag[0], dy = drag[1];
  const mag = Math.sqrt(dx * dx + dy * dy);
  if (mag < 6) return;
  const ang = Math.atan2(-dy, dx);
  const k = (mag / Math.min(W, H)) * 0.08;
  b.du = Math.cos(ang) * k;
  b.dv = Math.sin(ang) * k;
}

// Target world-space ball speed — ensures the ball moves at the same pace
// across all surfaces regardless of parameterization.
const TARGET_SPEED = 0.020;

function normalizeBallSpeed(surf, ball, target = TARGET_SPEED) {
  const vel = surf.tangent3(ball);
  const speed = Math.sqrt(vel[0]*vel[0] + vel[1]*vel[1] + vel[2]*vel[2]);
  if (speed < 1e-6) return;
  const f = target / speed;
  if (Array.isArray(ball.t)) {
    ball.t = [ball.t[0]*f, ball.t[1]*f, ball.t[2]*f];
  } else if ('du' in ball) {
    ball.du *= f;
    ball.dv *= f;
  }
}

// ── Quads (for solid-color mesh rendering) ──────────────────────────
function paramQuads(f, uRange, vRange, M, N) {
  const out = [];
  const du = (uRange[1] - uRange[0]) / M;
  const dv = (vRange[1] - vRange[0]) / N;
  for (let i = 0; i < M; i++) {
    for (let j = 0; j < N; j++) {
      const u0 = uRange[0] + i * du;
      const u1 = u0 + du;
      const v0 = vRange[0] + j * dv;
      const v1 = v0 + dv;
      out.push([f(u0, v0), f(u1, v0), f(u1, v1), f(u0, v1)]);
    }
  }
  return out;
}

SURFACES.sphere.normalAt = (P) => v_norm(P);
SURFACES.ellipsoid.normalAt = (P) => {
  const a = 1.2, B = 0.7, C = 1;
  return v_norm([2*P[0]/(a*a), 2*P[1]/(B*B), 2*P[2]/(C*C)]);
};
SURFACES.torus.normalAt = (P) => {
  const R = 1.0;
  const u = Math.atan2(P[1], P[0]);
  const C = [R * Math.cos(u), R * Math.sin(u), 0];
  return v_norm(v_sub(P, C));
};
SURFACES.cylinder.normalAt = (P) => v_norm([P[0], P[1], 0]);

SURFACES.sphere.quads = () =>
  paramQuads(
    (u, v) => [Math.sin(v) * Math.cos(u), Math.sin(v) * Math.sin(u), Math.cos(v)],
    [0, TWO_PI], [0, Math.PI], 64, 38,
  );

SURFACES.ellipsoid.quads = () => {
  const a = 1.2, B = 0.7, C = 1;
  return paramQuads(
    (u, v) => [a * Math.sin(v) * Math.cos(u), B * Math.sin(v) * Math.sin(u), C * Math.cos(v)],
    [0, TWO_PI], [0, Math.PI], 64, 38,
  );
};

SURFACES.torus.quads = () => {
  const R = 1.0, r = 0.45;
  return paramQuads(
    (u, v) => [(R + r * Math.cos(v)) * Math.cos(u), (R + r * Math.cos(v)) * Math.sin(u), r * Math.sin(v)],
    [0, TWO_PI], [0, TWO_PI], 72, 40,
  );
};

SURFACES.cylinder.quads = (b) => {
  // Cells snapped to integer multiples of dv so each cell stays at a
  // FIXED world position. As the ball moves, new cells enter the visible
  // window ahead and old ones drop off behind — the cylinder visibly slides.
  const vC = b ? b.v : 0;
  const range = 3.0;
  const N = 48;
  const dv = (2 * range) / N;
  const kMin = Math.ceil((vC - range) / dv) - 1;
  const kMax = Math.floor((vC + range) / dv) + 1;
  const M = 44;
  const du = TWO_PI / M;
  const out = [];
  for (let i = 0; i < M; i++) {
    const u0 = i * du;
    const u1 = u0 + du;
    for (let k = kMin; k <= kMax; k++) {
      const v0 = k * dv;
      const v1 = (k + 1) * dv;
      out.push([
        [Math.cos(u0), Math.sin(u0), v0],
        [Math.cos(u1), Math.sin(u1), v0],
        [Math.cos(u1), Math.sin(u1), v1],
        [Math.cos(u0), Math.sin(u0), v1],
      ]);
    }
  }
  return out;
};

// Smooth alpha fade for the cylinder's open ends — makes the mesh appear to
// extend toward infinity without a hard edge.
SURFACES.cylinder.fadeAt = (worldP, ball) => {
  const d = Math.abs(worldP[2] - ball.v);
  const inner = 1.6, outer = 2.9;
  if (d <= inner) return 1;
  if (d >= outer) return 0;
  const t = (d - inner) / (outer - inner);
  return 1 - t * t * (3 - 2 * t); // smoothstep
};

// ── Projection ───────────────────────────────────────────────────────
function projectOrbit(p, view, scale, W, H, center) {
  const c0 = center || [0, 0, 0];
  let x = p[0] - c0[0], y = p[1] - c0[1], z = p[2] - c0[2];
  const cy = Math.cos(view.ry), sy = Math.sin(view.ry);
  let x1 = x * cy + z * sy;
  let z1 = -x * sy + z * cy;
  const cx = Math.cos(view.rx), sx = Math.sin(view.rx);
  let y1 = y * cx - z1 * sx;
  let z2 = y * sx + z1 * cx;
  const focal = 4;
  const f = focal / (focal + z2);
  return [W / 2 + x1 * scale * f, H / 2 - y1 * scale * f, z2];
}

function computeSurfaceNormal(surf, P, ball) {
  if (surf.label === 'Sphere') return v_norm(P);
  if (surf.label === 'Ellipsoid') {
    const a = 1.2, B = 0.7, C = 1;
    return v_norm([2*P[0]/(a*a), 2*P[1]/(B*B), 2*P[2]/(C*C)]);
  }
  const ballU = { ...ball, du: 1, dv: 0 };
  const ballV = { ...ball, du: 0, dv: 1 };
  const Tu = surf.tangent3(ballU);
  const Tv = surf.tangent3(ballV);
  return v_norm(v_cross(Tu, Tv));
}

function makeChaseCam(surf, ball, smoothT) {
  // Player-controller chase camera: behind the ball along its motion
  // direction, slightly above the surface, looking at the ball. Smoothed
  // tangent (`smoothT`) keeps the camera from snapping when the ball turns.
  const P = surf.pos3(ball);
  const N = computeSurfaceNormal(surf, P, ball);
  const T = smoothT;
  const dist = surf.chaseDist || 0.4;
  const height = surf.chaseHeight || 0.12;
  const camPos = v_add(P, v_add(v_scale(T, -dist), v_scale(N, height)));
  const fwd = v_norm(v_sub(P, camPos));
  let r = v_cross(fwd, N);
  if (v_len(r) < 1e-4) r = [1, 0, 0];
  r = v_norm(r);
  const u = v_norm(v_cross(r, fwd));
  return { camPos, basis: { right: r, up: u, forward: fwd } };
}

function projectChase(p, cam, scale, W, H) {
  const d = v_sub(p, cam.camPos);
  const x = v_dot(d, cam.basis.right);
  const y = v_dot(d, cam.basis.up);
  const z = v_dot(d, cam.basis.forward);
  if (z < 0.02) return null;
  // Narrow field of view so the horizon reads as flat
  const focal = 2.6;
  const f = focal / z;
  return [W / 2 + x * scale * f, H / 2 - y * scale * f, z];
}

// ── Component ────────────────────────────────────────────────────────
const GeodesicPlayground = ({ c, fonts }) => {
  const canvasRef = React.useRef(null);
  const stateRef = React.useRef({
    surface: 'sphere',
    mode: 'afar',
    ball: null,
    trail: [],
    drag: null,
    camDrag: null,
    view: { rx: -0.6, ry: 0.4 },
    auto: 0,
    smoothT: null,
  });
  const [surface, setSurface] = React.useState('sphere');
  const [mode, setMode] = React.useState('afar');
  const [meshMode, setMeshMode] = React.useState('solid');

  React.useEffect(() => {
    const st = stateRef.current;
    st.surface = surface;
    const ball = SURFACES[surface].init();
    normalizeBallSpeed(SURFACES[surface], ball);
    st.ball = ball;
    st.trail = [];
    st.view = { ...SURFACES[surface].afarRot };
    st.auto = 0;
    st.smoothT = null;
  }, [surface]);

  React.useEffect(() => {
    const st = stateRef.current;
    st.mode = mode;
    if (mode === 'surface') {
      st.view = { rx: 0.6, ry: 0 };
    } else {
      st.view = { ...SURFACES[st.surface].afarRot };
    }
    st.auto = 0;
  }, [mode]);

  const onDown = (e) => {
    const st = stateRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (e.shiftKey) {
      st.view.ry += st.auto;
      st.auto = 0;
      st.camDrag = { x0: x, y0: y, rx0: st.view.rx, ry0: st.view.ry };
    } else {
      st.drag = { x0: x, y0: y, x1: x, y1: y };
    }
  };
  const onMove = (e) => {
    const st = stateRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    const x = e.clientX - rect.left;
    const y = e.clientY - rect.top;
    if (st.camDrag) {
      st.view.ry = st.camDrag.ry0 + (x - st.camDrag.x0) * 0.01;
      if (st.mode === 'afar') {
        st.view.rx = st.camDrag.rx0 - (y - st.camDrag.y0) * 0.01;
        st.view.rx = Math.max(-1.2, Math.min(1.2, st.view.rx));
      }
      // In surface mode, view.rx is locked (fixed tilt).
    } else if (st.drag) {
      st.drag.x1 = x;
      st.drag.y1 = y;
    }
  };
  const onUp = () => {
    const st = stateRef.current;
    if (st.camDrag) st.camDrag = null;
    if (st.drag) {
      const rect = canvasRef.current.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      const dx = st.drag.x1 - st.drag.x0;
      const dy = st.drag.y1 - st.drag.y0;
      const surf = SURFACES[st.surface];
      // Use current view (without auto) for the launch interpretation since
      // shift+drag pauses auto anyway and the user just dragged "now".
      const view = { rx: st.view.rx, ry: st.view.ry + st.auto };
      surf.launch(st.ball, [dx, dy], view, W, H);
      normalizeBallSpeed(surf, st.ball);
      st.trail = [];
      st.drag = null;
    }
  };

  const reset = () => {
    const st = stateRef.current;
    st.ball = SURFACES[st.surface].init();
    normalizeBallSpeed(SURFACES[st.surface], st.ball);
    st.trail = [];
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
    let prevMs = performance.now();
    const drawLine = (pts, projFn) => {
      let started = false;
      ctx.beginPath();
      for (let i = 0; i < pts.length; i++) {
        const p = projFn(pts[i]);
        if (!p) { started = false; continue; }
        if (started) ctx.lineTo(p[0], p[1]);
        else { ctx.moveTo(p[0], p[1]); started = true; }
      }
      ctx.stroke();
    };

    const loop = () => {
      const now = performance.now();
      const dt = now - prevMs;
      prevMs = now;
      const st = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      ctx.clearRect(0, 0, W, H);

      const surf = SURFACES[st.surface];
      if (st.ball && !st.drag) {
        surf.step(st.ball);
        st.trail.push(surf.pos3(st.ball));
        if (st.trail.length > 1200) st.trail.shift();
      }

      if (st.mode === 'afar' && !st.camDrag && !st.drag) {
        st.auto += dt * 0.00012;
      }

      let projFn, baseScale;
      if (st.mode === 'afar') {
        const view = { rx: st.view.rx, ry: st.view.ry + st.auto };
        baseScale = Math.min(W, H) * 0.45 * surf.worldScale;
        // For surfaces that track ball (cylinder), recenter afar view on ball
        const center = surf.centerForChase ? surf.centerForChase(st.ball) : [0, 0, 0];
        projFn = (p) => projectOrbit(p, view, baseScale, W, H, center);
      } else {
        // Update smoothed tangent for chase camera
        const Pball = surf.pos3(st.ball);
        const Nball = computeSurfaceNormal(surf, Pball, st.ball);
        const vel = surf.tangent3(st.ball);
        let instantT = null;
        if (v_len(vel) > 1e-5) {
          const velDot = v_dot(vel, Nball);
          instantT = v_norm(v_sub(vel, v_scale(Nball, velDot)));
        }
        if (!st.smoothT) {
          if (instantT) {
            st.smoothT = instantT.slice();
          } else {
            const nProto = Math.abs(Nball[2]) < 0.95 ? [0, 0, 1] : [1, 0, 0];
            st.smoothT = v_norm(v_cross(Nball, nProto));
          }
        } else {
          // Re-project existing smoothT to current tangent plane, then blend
          const dot0 = v_dot(st.smoothT, Nball);
          let projT = v_norm(v_sub(st.smoothT, v_scale(Nball, dot0)));
          if (instantT) {
            const blended = v_add(v_scale(projT, 0.92), v_scale(instantT, 0.08));
            const dot1 = v_dot(blended, Nball);
            projT = v_norm(v_sub(blended, v_scale(Nball, dot1)));
          }
          st.smoothT = projT;
        }
        const cam = makeChaseCam(surf, st.ball, st.smoothT);
        baseScale = Math.min(W, H) * 0.32;
        projFn = (p) => projectChase(p, cam, baseScale, W, H);
      }

      // ── Mesh: solid (flat soft color, no shading) or wireframe ──
      // Compute camera world position for trail occlusion in solid mode.
      let camPosWorld;
      if (st.mode === 'afar') {
        const view = { rx: st.view.rx, ry: st.view.ry + st.auto };
        const cx = Math.cos(view.rx), sx = Math.sin(view.rx);
        const cy = Math.cos(view.ry), sy = Math.sin(view.ry);
        const focal = 4;
        const center = surf.centerForChase ? surf.centerForChase(st.ball) : [0, 0, 0];
        camPosWorld = [
          center[0] + focal * cx * sy,
          center[1] - focal * sx,
          center[2] - focal * cx * cy,
        ];
      } else {
        // Recompute the chase cam to grab camPos
        const cam = makeChaseCam(surf, st.ball, st.smoothT);
        camPosWorld = cam.camPos;
      }

      if (meshMode === 'solid') {
        const quads = (surf.quads ? surf.quads(st.ball) : []);
        const projected = [];
        for (let qi = 0; qi < quads.length; qi++) {
          const verts = quads[qi];
          // Back-face cull ONLY for fading surfaces (cylinder): without it,
          // partial-alpha near faces would reveal the back through the front.
          // Other surfaces rely on painter sort so the back can show through
          // gaps (e.g. torus hole) when geometry allows it.
          if (surf.fadeAt && surf.normalAt) {
            const cx = (verts[0][0] + verts[1][0] + verts[2][0] + verts[3][0]) / 4;
            const cy = (verts[0][1] + verts[1][1] + verts[2][1] + verts[3][1]) / 4;
            const cz = (verts[0][2] + verts[1][2] + verts[2][2] + verts[3][2]) / 4;
            const centroid = [cx, cy, cz];
            const N = surf.normalAt(centroid);
            const view = v_sub(centroid, camPosWorld);
            if (v_dot(N, view) > 0) continue;
          }
          const proj = [
            projFn(verts[0]), projFn(verts[1]),
            projFn(verts[2]), projFn(verts[3]),
          ];
          if (proj[0] === null || proj[1] === null || proj[2] === null || proj[3] === null) continue;
          const avgZ = (proj[0][2] + proj[1][2] + proj[2][2] + proj[3][2]) / 4;
          let alpha = 1;
          if (surf.fadeAt) {
            alpha = (
              surf.fadeAt(verts[0], st.ball) +
              surf.fadeAt(verts[1], st.ball) +
              surf.fadeAt(verts[2], st.ball) +
              surf.fadeAt(verts[3], st.ball)
            ) / 4;
            if (alpha < 0.02) continue;
          }
          projected.push({ proj, avgZ, alpha });
        }
        projected.sort((a, b) => b.avgZ - a.avgZ);
        // Soft beige/gold from the palette accent2.
        ctx.fillStyle = c.accent2;
        ctx.strokeStyle = c.accent2;
        ctx.lineWidth = 0.5;
        for (let qi = 0; qi < projected.length; qi++) {
          const q = projected[qi];
          ctx.globalAlpha = q.alpha;
          ctx.beginPath();
          ctx.moveTo(q.proj[0][0], q.proj[0][1]);
          ctx.lineTo(q.proj[1][0], q.proj[1][1]);
          ctx.lineTo(q.proj[2][0], q.proj[2][1]);
          ctx.lineTo(q.proj[3][0], q.proj[3][1]);
          ctx.closePath();
          ctx.fill();
          ctx.stroke();
        }
        ctx.globalAlpha = 1;
      } else {
        ctx.strokeStyle = c.inkFaint;
        ctx.lineWidth = 0.8;
        if (surf.fadeAt) {
          // Draw each line piece-by-piece with per-segment alpha.
          surf.mesh(st.ball).forEach((line) => {
            for (let i = 0; i < line.length - 1; i++) {
              const a = surf.fadeAt(line[i], st.ball);
              const b = surf.fadeAt(line[i + 1], st.ball);
              const alpha = (a + b) / 2;
              if (alpha < 0.02) continue;
              const p1 = projFn(line[i]);
              const p2 = projFn(line[i + 1]);
              if (!p1 || !p2) continue;
              ctx.globalAlpha = alpha;
              ctx.beginPath();
              ctx.moveTo(p1[0], p1[1]);
              ctx.lineTo(p2[0], p2[1]);
              ctx.stroke();
            }
          });
          ctx.globalAlpha = 1;
        } else {
          surf.mesh(st.ball).forEach((line) => drawLine(line, projFn));
        }
      }

      // Trail
      if (st.trail.length > 1) {
        ctx.strokeStyle = c.accent;
        ctx.lineWidth = 1.8;
        const checkVis = meshMode === 'solid' && surf.normalAt;
        ctx.beginPath();
        let started = false;
        let prev = null;
        for (let ti = 0; ti < st.trail.length; ti++) {
          const P = st.trail[ti];
          if (checkVis) {
            const N = surf.normalAt(P);
            if (v_dot(N, v_sub(P, camPosWorld)) >= 0) { started = false; prev = P; continue; }
          }
          const p = projFn(P);
          if (!p) { started = false; prev = P; continue; }
          if (surf.fadeAt) {
            // For faded surfaces, draw per-segment with alpha so the trail
            // fades in/out with the mesh instead of streaking past it.
            if (started && prev) {
              const a = surf.fadeAt(prev, st.ball);
              const b = surf.fadeAt(P, st.ball);
              const alpha = (a + b) / 2;
              if (alpha >= 0.02) {
                const pp = projFn(prev);
                if (pp) {
                  ctx.globalAlpha = alpha;
                  ctx.beginPath();
                  ctx.moveTo(pp[0], pp[1]);
                  ctx.lineTo(p[0], p[1]);
                  ctx.stroke();
                }
              }
            }
          } else {
            if (started) ctx.lineTo(p[0], p[1]);
            else { ctx.moveTo(p[0], p[1]); started = true; }
          }
          prev = P;
          started = true;
        }
        if (!surf.fadeAt) ctx.stroke();
        ctx.globalAlpha = 1;
      }

      // Ball
      if (st.ball) {
        const p3 = surf.pos3(st.ball);
        const p = projFn(p3);
        if (p) {
          ctx.fillStyle = c.accent;
          ctx.beginPath();
          ctx.arc(p[0], p[1], 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.strokeStyle = c.bg;
          ctx.lineWidth = 1.5;
          ctx.stroke();

          if (st.drag) {
            ctx.strokeStyle = c.accent;
            ctx.lineWidth = 1.6;
            ctx.setLineDash([4, 4]);
            ctx.beginPath();
            ctx.moveTo(p[0], p[1]);
            ctx.lineTo(st.drag.x1, st.drag.y1);
            ctx.stroke();
            ctx.setLineDash([]);
            const ang = Math.atan2(st.drag.y1 - p[1], st.drag.x1 - p[0]);
            ctx.beginPath();
            ctx.moveTo(st.drag.x1, st.drag.y1);
            ctx.lineTo(st.drag.x1 - 9 * Math.cos(ang - 0.4), st.drag.y1 - 9 * Math.sin(ang - 0.4));
            ctx.lineTo(st.drag.x1 - 9 * Math.cos(ang + 0.4), st.drag.y1 - 9 * Math.sin(ang + 0.4));
            ctx.closePath();
            ctx.fillStyle = c.accent;
            ctx.fill();
          }
        }
      }

      // In-canvas hint
      ctx.fillStyle = c.inkFaint;
      ctx.font = `500 10px ${fonts.mono.split(',')[0]}, ui-monospace, monospace`;
      ctx.textAlign = 'left';
      ctx.fillText('DRAG: launch ball', 10, H - 22);
      ctx.fillText('SHIFT + DRAG: move camera', 10, H - 10);

      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [c, fonts, meshMode]);

  return (
    <div
      style={{
        background: c.bg,
        border: `1px solid ${c.rule}`,
        borderRadius: 4,
        padding: 24,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 32,
        alignItems: 'stretch',
      }}
    >
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.22em', color: c.accent, marginBottom: 14, textTransform: 'uppercase' }}>
            ◇ Try the research
          </div>
          <h3 style={{ fontFamily: fonts.display, fontWeight: 400, fontSize: 32, color: c.ink, margin: 0, letterSpacing: '-0.015em' }}>
            Throw a ball across a surface.
          </h3>
          <p style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6, color: c.inkDim, margin: '14px 0 0', maxWidth: 360 }}>
            {SURFACES[surface].hint}
          </p>
          <p style={{ fontFamily: fonts.body, fontSize: 13, lineHeight: 1.55, color: c.inkDim, margin: '14px 0 0', maxWidth: 360 }}>
            Drag from anywhere to launch the ball.{' '}
            <em style={{ color: c.ink, fontStyle: 'italic' }}>Shift + drag</em> to move the camera around.
          </p>
        </div>
        <div style={{ marginTop: 22, display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div>
            <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.2em', color: c.inkFaint, textTransform: 'uppercase', marginBottom: 6 }}>Surface</div>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 4 }}>
              {Object.keys(SURFACES).map((s) => (
                <button
                  key={s}
                  onClick={() => setSurface(s)}
                  style={{
                    fontFamily: fonts.mono,
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    padding: '8px 8px',
                    border: `1px solid ${surface === s ? c.accent : c.rule}`,
                    background: surface === s ? c.accent : 'transparent',
                    color: surface === s ? c.bg : c.ink,
                    cursor: 'pointer',
                    transition: 'all .2s',
                  }}
                >
                  {SURFACES[s].label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.2em', color: c.inkFaint, textTransform: 'uppercase', marginBottom: 6 }}>View</div>
            <div style={{ display: 'flex', gap: 4 }}>
              {[['afar', 'From afar'], ['surface', 'On the surface']].map(([m, label]) => (
                <button
                  key={m}
                  onClick={() => setMode(m)}
                  style={{
                    flex: 1,
                    fontFamily: fonts.mono,
                    fontSize: 10,
                    letterSpacing: '0.14em',
                    textTransform: 'uppercase',
                    padding: '8px 6px',
                    border: `1px solid ${mode === m ? c.accent2 : c.rule}`,
                    background: mode === m ? c.accent2 : 'transparent',
                    color: mode === m ? c.bg : c.ink,
                    cursor: 'pointer',
                    transition: 'all .2s',
                  }}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div>
            <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.2em', color: c.inkFaint, textTransform: 'uppercase', marginBottom: 6 }}>Mesh</div>
            <div
              style={{
                position: 'relative',
                display: 'inline-flex',
                background: c.surface,
                borderRadius: 999,
                border: `1px solid ${c.rule}`,
                padding: 3,
              }}
            >
              <div
                style={{
                  position: 'absolute',
                  top: 3,
                  bottom: 3,
                  left: meshMode === 'solid' ? 3 : '50%',
                  width: 'calc(50% - 3px)',
                  background: c.accent,
                  borderRadius: 999,
                  transition: 'left .22s cubic-bezier(.2,.7,.3,1)',
                }}
              />
              {[
                { value: 'solid', label: 'Solid' },
                { value: 'wire', label: 'Wire' },
              ].map((o) => (
                <button
                  key={o.value}
                  onClick={() => setMeshMode(o.value)}
                  style={{
                    position: 'relative',
                    padding: '6px 14px',
                    border: 'none',
                    background: 'transparent',
                    color: meshMode === o.value ? c.bg : c.inkDim,
                    cursor: 'pointer',
                    fontFamily: fonts.mono,
                    fontSize: 10,
                    letterSpacing: '0.16em',
                    textTransform: 'uppercase',
                    zIndex: 1,
                    transition: 'color .2s',
                    minWidth: 60,
                  }}
                >
                  {o.label}
                </button>
              ))}
            </div>
          </div>
          <button
            onClick={reset}
            style={{
              fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.16em',
              textTransform: 'uppercase', padding: '8px 14px',
              border: `1px solid ${c.rule}`, background: 'transparent',
              color: c.inkDim, cursor: 'pointer', alignSelf: 'flex-start',
            }}
          >
            ↻ Reset
          </button>
        </div>
      </div>
      <div
        style={{
          position: 'relative',
          background: c.surface,
          border: `1px solid ${c.rule}`,
          minHeight: 360,
        }}
      >
        <canvas
          ref={canvasRef}
          onMouseDown={onDown}
          onMouseMove={onMove}
          onMouseUp={onUp}
          onMouseLeave={onUp}
          style={{ width: '100%', height: '100%', cursor: 'crosshair', display: 'block' }}
        />
      </div>
    </div>
  );
};

window.GeodesicPlayground = GeodesicPlayground;
