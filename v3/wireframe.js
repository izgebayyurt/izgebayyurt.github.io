// Tiny wireframe 3D — single shared canvas covering the viewport.
// Scroll drives rotation; otherwise idle drift keeps the page feeling alive.
// No Three.js. ~150 lines. Soft strokes against a cream bg.

(function () {
  const SHAPES = {};

  // ── Geometry builders ────────────────────────────────────────────────
  SHAPES.icosahedron = () => {
    const t = (1 + Math.sqrt(5)) / 2;
    const v = [
      [-1, t, 0], [1, t, 0], [-1, -t, 0], [1, -t, 0],
      [0, -1, t], [0, 1, t], [0, -1, -t], [0, 1, -t],
      [t, 0, -1], [t, 0, 1], [-t, 0, -1], [-t, 0, 1],
    ];
    const e = [
      [0,11],[0,5],[0,1],[0,7],[0,10],[1,5],[5,11],[11,10],[10,7],[7,1],
      [3,9],[3,4],[3,2],[3,6],[3,8],[3,9],[4,9],[4,5],[4,11],[4,2],
      [2,11],[2,10],[2,6],[6,10],[6,7],[6,8],[8,7],[8,1],[8,9],[9,1],
      [9,5],[5,4],[11,2],[1,7],
    ];
    return { v, e };
  };

  SHAPES.octahedron = () => ({
    v: [[1,0,0],[-1,0,0],[0,1,0],[0,-1,0],[0,0,1],[0,0,-1]],
    e: [[0,2],[0,3],[0,4],[0,5],[1,2],[1,3],[1,4],[1,5],[2,4],[2,5],[3,4],[3,5]],
  });

  SHAPES.torus = (R = 1, r = 0.38, N = 22, n = 10) => {
    const v = [];
    for (let i = 0; i < N; i++) {
      const u = (i / N) * Math.PI * 2;
      for (let j = 0; j < n; j++) {
        const k = (j / n) * Math.PI * 2;
        const x = (R + r * Math.cos(k)) * Math.cos(u);
        const y = (R + r * Math.cos(k)) * Math.sin(u);
        const z = r * Math.sin(k);
        v.push([x, y, z]);
      }
    }
    const e = [];
    for (let i = 0; i < N; i++) {
      for (let j = 0; j < n; j++) {
        const a = i * n + j;
        const b = i * n + ((j + 1) % n);
        const c = ((i + 1) % N) * n + j;
        e.push([a, b]);
        e.push([a, c]);
      }
    }
    return { v, e };
  };

  SHAPES.cube = () => ({
    v: [[-1,-1,-1],[1,-1,-1],[1,1,-1],[-1,1,-1],[-1,-1,1],[1,-1,1],[1,1,1],[-1,1,1]],
    e: [[0,1],[1,2],[2,3],[3,0],[4,5],[5,6],[6,7],[7,4],[0,4],[1,5],[2,6],[3,7]],
  });

  // Three rotation: X then Y then Z
  function rotate([x, y, z], rx, ry, rz) {
    let cy = Math.cos(rx), sy = Math.sin(rx);
    let y1 = y * cy - z * sy;
    let z1 = y * sy + z * cy;
    let cx = Math.cos(ry), sx = Math.sin(ry);
    let x2 = x * cx + z1 * sx;
    let z2 = -x * sx + z1 * cx;
    let cz = Math.cos(rz), sz = Math.sin(rz);
    let x3 = x2 * cz - y1 * sz;
    let y3 = x2 * sz + y1 * cz;
    return [x3, y3, z2];
  }

  // ── Mount ────────────────────────────────────────────────────────────
  function mount(opts) {
    const canvas = document.createElement('canvas');
    canvas.style.cssText =
      'position:fixed;inset:0;width:100vw;height:100vh;pointer-events:none;z-index:0;';
    document.body.appendChild(canvas);
    const ctx = canvas.getContext('2d');

    let DPR = Math.min(window.devicePixelRatio || 1, 2);
    let W = 0, H = 0;
    const fit = () => {
      const r = canvas.getBoundingClientRect();
      W = r.width; H = r.height;
      canvas.width = W * DPR; canvas.height = H * DPR;
      ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
    };
    fit();
    window.addEventListener('resize', fit);

    // Objects laid out by viewport-relative anchor
    const objects = [
      { shape: SHAPES.icosahedron(),  ax: 0.88, ay: 0.16, size: 170, baseRot: [0.2, 0.4, 0],  scrollMult: [0.0015, 0.002, 0.0008], idle: [0.00012, 0.00018, 0.00005], opacity: 0.55 },
      { shape: SHAPES.torus(),         ax: -0.08, ay: 0.42, size: 220, baseRot: [0.9, 0.2, 0.3],  scrollMult: [-0.0012, 0.0018, 0.0005], idle: [0.0001, 0.00015, 0.00004], opacity: 0.45 },
      { shape: SHAPES.octahedron(),    ax: 0.94, ay: 0.84, size: 110, baseRot: [0.3, 0.6, 0.4],  scrollMult: [0.0018, -0.001, 0.0009], idle: [0.00015, 0.0001, 0.00007], opacity: 0.55 },
      { shape: SHAPES.cube(),          ax: -0.04, ay: 1.55, size: 150, baseRot: [0.4, 0.3, 0.2],  scrollMult: [0.0014, 0.0014, 0],       idle: [0.00012, 0.0001, 0], opacity: 0.5 },
      { shape: SHAPES.icosahedron(),  ax: 1.02, ay: 2.05, size: 200, baseRot: [0.1, 0.2, 0.1],  scrollMult: [-0.0016, 0.0019, 0.0008], idle: [0.00014, 0.00018, 0.00005], opacity: 0.45 },
      { shape: SHAPES.torus(),         ax: -0.06, ay: 2.85, size: 200, baseRot: [0.4, 0.5, 0],     scrollMult: [0.0011, 0.002, 0.0005],   idle: [0.0001, 0.00015, 0], opacity: 0.4 },
      { shape: SHAPES.octahedron(),    ax: 1.0, ay: 3.35, size: 140, baseRot: [0.4, 0.5, 0],     scrollMult: [0.0014, -0.0017, 0.0008], idle: [0.00012, 0.0001, 0.00005], opacity: 0.45 },
    ];

    let scrollY = 0;
    let t0 = performance.now();
    const onScroll = () => { scrollY = window.scrollY; };
    window.addEventListener('scroll', onScroll, { passive: true });

    let stroke = opts.stroke || 'rgba(42,37,32,0.32)';
    let accent = opts.accent || 'rgba(184,92,60,0.5)';

    function setColors(s, a) { stroke = s; accent = a; }

    let raf;
    let paused = false;
    function loop() {
      const now = performance.now();
      const t = (now - t0);
      ctx.clearRect(0, 0, W, H);

      const sectionHeight = window.innerHeight;

      objects.forEach((o, idx) => {
        // anchor in document space
        const cyDoc = o.ay * sectionHeight;
        const cy = cyDoc - scrollY;
        const cx = o.ax * W;
        // cull if way off-screen
        if (cy < -o.size * 1.5 || cy > H + o.size * 1.5) return;

        const rx = o.baseRot[0] + scrollY * o.scrollMult[0] + t * o.idle[0];
        const ry = o.baseRot[1] + scrollY * o.scrollMult[1] + t * o.idle[1];
        const rz = o.baseRot[2] + scrollY * o.scrollMult[2] + t * o.idle[2];

        const focal = 3.2;
        const verts = o.shape.v.map((p) => {
          const r = rotate(p, rx, ry, rz);
          const f = focal / (focal + r[2]);
          return [cx + r[0] * o.size * f, cy + r[1] * o.size * f];
        });

        ctx.lineWidth = 1;
        ctx.strokeStyle = idx % 3 === 0 ? accent : stroke;
        ctx.globalAlpha = o.opacity;
        ctx.beginPath();
        o.shape.e.forEach(([a, b]) => {
          ctx.moveTo(verts[a][0], verts[a][1]);
          ctx.lineTo(verts[b][0], verts[b][1]);
        });
        ctx.stroke();

        // soft dot at vertices for icosahedron only — a little texture
        if (idx === 0 || idx === 4) {
          ctx.globalAlpha = o.opacity * 0.9;
          ctx.fillStyle = idx % 3 === 0 ? accent : stroke;
          verts.forEach((p) => {
            ctx.beginPath();
            ctx.arc(p[0], p[1], 1.3, 0, Math.PI * 2);
            ctx.fill();
          });
        }
      });
      ctx.globalAlpha = 1;

      if (!paused) raf = requestAnimationFrame(loop);
    }
    loop();

    return {
      destroy: () => { cancelAnimationFrame(raf); window.removeEventListener('scroll', onScroll); window.removeEventListener('resize', fit); canvas.remove(); },
      setVisible: (v) => { canvas.style.display = v ? 'block' : 'none'; },
      setColors,
    };
  }

  window.MountWireframe = mount;
})();
