// IzgeAsteroids — faithful JS port of izgebayyurt/asteroids (Colby CS152, 2018-19)
// - Procedurally generated convex-polygon asteroids (5-12 corners)
// - Asteroids spawn from a random screen edge every 120 frames
// - Ship turns/thrusts, no shooting (survival mode)
// - Yellow/orange flicker on ship when accelerating
// - Welcome screen → game → game-over with score
// - Ported from main_project.py — same algorithms (convex generation, edge-spawn, screen-wrap)

const IzgeAsteroids = ({ accent = '#f5d067', accentHot = '#ff4f81' }) => {
  const ref = React.useRef(null);

  React.useEffect(() => {
    const canvas = ref.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    const setSize = () => {
      const r = canvas.getBoundingClientRect();
      canvas.width = r.width * 2;
      canvas.height = r.height * 2;
      canvas.style.width = r.width + 'px';
      canvas.style.height = r.height + 'px';
    };
    setSize();
    const ro = new ResizeObserver(setSize);
    ro.observe(canvas);
    let W = () => canvas.width / 2;
    let H = () => canvas.height / 2;

    // ── State ──
    let state = 'welcome'; // 'welcome' | 'play' | 'over'
    let frame = 0;
    let score = 0;
    let asteroids = [];
    const ship = {
      x: 0, y: 0, a: -Math.PI / 2,
      vx: 0, vy: 0, av: 0, // angular velocity
      flicker: 0,
      size: 14,
    };
    const reset = () => {
      ship.x = W() / 2;
      ship.y = H() / 2;
      ship.a = -Math.PI / 2;
      ship.vx = ship.vy = ship.av = 0;
      ship.flicker = 0;
      asteroids = [];
      frame = 0;
      score = 0;
    };
    reset();

    // ── Faithful asteroid generator (convex polygon, ~5-12 corners) ──
    // Same approach as main_project.py: random x/y coords, isolate extremes,
    // split halves, build vector lengths, sort by quadrant + angle, accumulate.
    const randIn = (lo, hi) => lo + Math.random() * (hi - lo);
    const sortAsc = (a) => a.sort((x, y) => x - y);
    const angleSort = (vs) => {
      // split into 4 quadrants, sort within each by atan2, concat
      const q = [[], [], [], []];
      vs.forEach((v) => {
        if (v[0] >= 0 && v[1] >= 0) q[0].push(v);
        else if (v[0] <= 0 && v[1] >= 0) q[1].push(v);
        else if (v[0] <= 0 && v[1] <= 0) q[2].push(v);
        else q[3].push(v);
      });
      q.forEach((arr) => arr.sort((a, b) => Math.atan2(a[1], a[0]) - Math.atan2(b[1], b[0])));
      return [].concat(...q);
    };
    const shuffle = (a) => {
      for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
      }
      return a;
    };
    const makeAsteroidShape = () => {
      const n = 5 + Math.floor(Math.random() * 8); // 5..12
      const xs = [], ys = [];
      for (let i = 0; i < n; i++) {
        // pick from -10..-1 or 1..10, scale by uniform(0.01, 1)
        const sx = Math.random() < 0.5 ? -1 : 1;
        const sy = Math.random() < 0.5 ? -1 : 1;
        xs.push(sx * (1 + Math.random() * 9) * randIn(0.01, 1));
        ys.push(sy * (1 + Math.random() * 9) * randIn(0.01, 1));
      }
      sortAsc(xs); sortAsc(ys);
      const xMin = xs.shift(), xMax = xs.pop();
      const yMin = ys.shift(), yMax = ys.pop();
      const half = Math.floor(xs.length / 2);
      const xLo = shuffle(xs.slice(0, half).concat([xMin, xMax]));
      const xHi = shuffle(xs.slice(half).concat([xMin, xMax]));
      const yLo = shuffle(ys.slice(0, half).concat([yMin, yMax]));
      const yHi = shuffle(ys.slice(half).concat([yMin, yMax]));
      sortAsc(xLo); sortAsc(xHi); sortAsc(yLo); sortAsc(yHi);
      const xVecs = [];
      for (let i = 0; i < xLo.length - 1; i++) xVecs.push(xLo[i] - xLo[i + 1]);
      for (let i = 0; i < xHi.length - 1; i++) xVecs.push(xHi[i + 1] - xHi[i]);
      const yVecs = [];
      for (let i = 0; i < yLo.length - 1; i++) yVecs.push(yLo[i] - yLo[i + 1]);
      for (let i = 0; i < yHi.length - 1; i++) yVecs.push(yHi[i + 1] - yHi[i]);
      shuffle(xVecs); shuffle(yVecs);
      const len = Math.min(xVecs.length, yVecs.length);
      const vecs = [];
      for (let i = 0; i < len; i++) vecs.push([xVecs[i], yVecs[i]]);
      const sorted = angleSort(vecs);
      const pts = [];
      let cx = 0, cy = 0;
      sorted.forEach((v) => {
        cx += v[0]; cy += v[1];
        pts.push([cx, cy]);
      });
      // recenter
      let xs2 = pts.map((p) => p[0]), ys2 = pts.map((p) => p[1]);
      const minX = Math.min(...xs2), maxX = Math.max(...xs2);
      const minY = Math.min(...ys2), maxY = Math.max(...ys2);
      const ccx = (minX + maxX) / 2, ccy = (minY + maxY) / 2;
      const recentered = pts.map((p) => [p[0] - ccx, p[1] - ccy]);
      // scale to ~12-22 px
      const r = Math.max(maxX - minX, maxY - minY);
      const target = 18 + Math.random() * 12;
      const k = target / (r || 1);
      return recentered.map((p) => [p[0] * k, p[1] * k]);
    };

    const spawnAsteroid = () => {
      const w = W(), h = H();
      const side = Math.floor(Math.random() * 4);
      let x, y, vx, vy;
      const sp = 0.7 + Math.random() * 0.8;
      if (side === 0) { x = -30; y = h / 2 + randIn(-h / 3, h / 3); vx = sp; vy = randIn(-0.4, 0.4); }
      else if (side === 1) { x = w / 2 + randIn(-w / 3, w / 3); y = -30; vx = randIn(-0.4, 0.4); vy = sp; }
      else if (side === 2) { x = w + 30; y = h / 2 + randIn(-h / 3, h / 3); vx = -sp; vy = randIn(-0.4, 0.4); }
      else { x = w / 2 + randIn(-w / 3, w / 3); y = h + 30; vx = randIn(-0.4, 0.4); vy = -sp; }
      asteroids.push({
        x, y, vx, vy,
        a: Math.random() * Math.PI * 2,
        av: (Math.random() < 0.5 ? -1 : 1) * randIn(0.01, 0.04),
        shape: makeAsteroidShape(),
      });
    };

    // ── Collision (segment-vs-segment, like ship-vs-asteroid in main_project.py) ──
    const ccw = (A, B, C) => (C[1] - A[1]) * (B[0] - A[0]) > (B[1] - A[1]) * (C[0] - A[0]);
    const segIntersect = (A, B, C, D) =>
      ccw(A, C, D) !== ccw(B, C, D) && ccw(A, B, C) !== ccw(A, B, D);
    const shipPoints = () => {
      const a = ship.a;
      const s = ship.size;
      return [
        [ship.x + Math.cos(a) * s, ship.y + Math.sin(a) * s],
        [ship.x + Math.cos(a + 2.5) * s * 0.8, ship.y + Math.sin(a + 2.5) * s * 0.8],
        [ship.x + Math.cos(a - 2.5) * s * 0.8, ship.y + Math.sin(a - 2.5) * s * 0.8],
      ];
    };
    const asteroidWorldPoints = (ast) =>
      ast.shape.map((p) => {
        const c = Math.cos(ast.a), s = Math.sin(ast.a);
        return [ast.x + p[0] * c - p[1] * s, ast.y + p[0] * s + p[1] * c];
      });
    const collides = (sp, ap) => {
      for (let i = 0; i < ap.length; i++) {
        const a1 = ap[i], a2 = ap[(i + 1) % ap.length];
        for (let j = 0; j < 3; j++) {
          const s1 = sp[j], s2 = sp[(j + 1) % 3];
          if (segIntersect(s1, s2, a1, a2)) return true;
        }
      }
      return false;
    };

    // ── Input ──
    const keys = {};
    const onKey = (e, down) => {
      const k = e.key;
      if (['ArrowLeft', 'ArrowRight', 'ArrowUp', ' ', 'q', 'Q', 'r', 'R'].includes(k)) {
        e.preventDefault();
        keys[k.toLowerCase()] = down;
        if (down && (k === ' ' || k === 'r' || k === 'R')) {
          if (state === 'welcome') { state = 'play'; reset(); }
          else if (state === 'over') { state = 'play'; reset(); }
        }
      }
    };
    const kd = (e) => onKey(e, true);
    const ku = (e) => onKey(e, false);
    canvas.tabIndex = 0;
    canvas.addEventListener('keydown', kd);
    canvas.addEventListener('keyup', ku);
    canvas.addEventListener('mouseenter', () => canvas.focus());
    canvas.addEventListener('click', () => {
      canvas.focus();
      if (state === 'welcome' || state === 'over') {
        state = 'play';
        reset();
      }
    });

    // ── Loop ──
    let raf;
    const loop = () => {
      const w = W(), h = H();
      ctx.setTransform(2, 0, 0, 2, 0, 0); // CSS px coords
      ctx.fillStyle = '#000';
      ctx.fillRect(0, 0, w, h);

      // ── starfield (cosmetic, not in py original) ──
      ctx.fillStyle = 'rgba(244,236,216,0.3)';
      for (let i = 0; i < 30; i++) {
        const sx = (i * 137.5) % w;
        const sy = (i * 89.7) % h;
        ctx.fillRect(sx, sy, 1, 1);
      }

      if (state === 'welcome') {
        ctx.fillStyle = '#f4ecd8';
        ctx.font = '600 22px "Big Shoulders Display", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('WELCOME TO ASTROIDZ', w / 2, h / 2 - 18);
        // flicker like the py original
        if (Math.floor(frame / 30) % 2 === 0) {
          ctx.fillStyle = accent;
          ctx.font = '500 12px "JetBrains Mono", monospace';
          ctx.fillText('▸ CLICK / SPACE TO START', w / 2, h / 2 + 12);
        }
        ctx.fillStyle = 'rgba(244,236,216,0.5)';
        ctx.font = '400 10px "JetBrains Mono", monospace';
        ctx.fillText('CS152 · COLBY · 2018', w / 2, h / 2 + 36);
        ctx.fillText('PORTED FROM PYTHON', w / 2, h / 2 + 50);
        frame++;
      } else if (state === 'play') {
        // input → ship
        const dt = 0.6;
        const turnRate = 0.0035;
        const thrust = 0.045;
        if (keys['arrowleft']) { ship.av -= turnRate; ship.flicker = 6; }
        if (keys['arrowright']) { ship.av += turnRate; ship.flicker = 6; }
        if (keys['arrowup']) {
          ship.vx += Math.cos(ship.a) * thrust;
          ship.vy += Math.sin(ship.a) * thrust;
          ship.flicker = 6;
        }
        // angular friction (py: 0.99 when no key)
        if (!keys['arrowleft'] && !keys['arrowright']) ship.av *= 0.92;
        ship.a += ship.av;
        ship.x += ship.vx * dt;
        ship.y += ship.vy * dt;
        ship.vx *= 0.998;
        ship.vy *= 0.998;
        // wrap
        if (ship.x < 0) ship.x += w;
        if (ship.x > w) ship.x -= w;
        if (ship.y < 0) ship.y += h;
        if (ship.y > h) ship.y -= h;
        // spawn (every 120 frames in py)
        if (frame % 120 === 0) spawnAsteroid();
        if (frame === 0) for (let i = 0; i < 3; i++) spawnAsteroid();
        // update asteroids
        asteroids.forEach((ast) => {
          ast.x += ast.vx;
          ast.y += ast.vy;
          ast.a += ast.av;
          // wrap (so they don't disappear forever)
          if (ast.x < -60) ast.x = w + 30;
          if (ast.x > w + 60) ast.x = -30;
          if (ast.y < -60) ast.y = h + 30;
          if (ast.y > h + 60) ast.y = -30;
        });
        // collisions
        const sp = shipPoints();
        for (const ast of asteroids) {
          const dxs = ast.x - ship.x, dys = ast.y - ship.y;
          if (dxs * dxs + dys * dys < 900) {
            if (collides(sp, asteroidWorldPoints(ast))) {
              state = 'over';
              break;
            }
          }
        }

        // ── draw asteroids ──
        ctx.strokeStyle = '#f4ecd8';
        ctx.lineWidth = 1.4;
        asteroids.forEach((ast) => {
          ctx.save();
          ctx.translate(ast.x, ast.y);
          ctx.rotate(ast.a);
          ctx.beginPath();
          ast.shape.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p[0], p[1]);
            else ctx.lineTo(p[0], p[1]);
          });
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        });

        // ── ship ──
        ctx.save();
        ctx.translate(ship.x, ship.y);
        ctx.rotate(ship.a);
        if (ship.flicker > 0) {
          // exhaust trail
          ctx.fillStyle = ship.flicker % 2 ? '#ff9a3c' : '#f5d067';
          ctx.beginPath();
          ctx.moveTo(-6, -3);
          ctx.lineTo(-12 - Math.random() * 4, 0);
          ctx.lineTo(-6, 3);
          ctx.closePath();
          ctx.fill();
          ship.flicker--;
        }
        ctx.strokeStyle = ship.flicker > 0 ? accent : '#f4ecd8';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.moveTo(ship.size, 0);
        ctx.lineTo(-ship.size * 0.7, ship.size * 0.7);
        ctx.lineTo(-ship.size * 0.4, 0);
        ctx.lineTo(-ship.size * 0.7, -ship.size * 0.7);
        ctx.closePath();
        ctx.stroke();
        ctx.restore();

        // HUD
        score = Math.floor(frame / 10);
        ctx.fillStyle = 'rgba(244,236,216,0.7)';
        ctx.font = '500 11px "JetBrains Mono", monospace';
        ctx.textAlign = 'left';
        ctx.fillText('SCORE  ' + String(score).padStart(5, '0'), 10, 18);
        ctx.textAlign = 'right';
        ctx.fillStyle = accent;
        ctx.fillText('● PLAYING', w - 10, 18);
        frame++;
      } else if (state === 'over') {
        // ghost the world
        ctx.globalAlpha = 0.25;
        ctx.strokeStyle = '#f4ecd8';
        ctx.lineWidth = 1;
        asteroids.forEach((ast) => {
          ctx.save();
          ctx.translate(ast.x, ast.y);
          ctx.rotate(ast.a);
          ctx.beginPath();
          ast.shape.forEach((p, i) => {
            if (i === 0) ctx.moveTo(p[0], p[1]);
            else ctx.lineTo(p[0], p[1]);
          });
          ctx.closePath();
          ctx.stroke();
          ctx.restore();
        });
        ctx.globalAlpha = 1;
        ctx.fillStyle = accentHot;
        ctx.font = '700 28px "Big Shoulders Display", Impact, sans-serif';
        ctx.textAlign = 'center';
        ctx.fillText('GAME OVER', w / 2, h / 2 - 22);
        ctx.fillStyle = '#f4ecd8';
        ctx.font = '600 16px "Big Shoulders Display", Impact, sans-serif';
        ctx.fillText('SCORE  ' + String(score).padStart(5, '0'), w / 2, h / 2 + 4);
        if (Math.floor(frame / 30) % 2 === 0) {
          ctx.fillStyle = accent;
          ctx.font = '500 11px "JetBrains Mono", monospace';
          ctx.fillText('▸ CLICK / SPACE / R TO RESTART', w / 2, h / 2 + 30);
        }
        frame++;
      }

      raf = requestAnimationFrame(loop);
    };
    loop();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      canvas.removeEventListener('keydown', kd);
      canvas.removeEventListener('keyup', ku);
    };
  }, [accent, accentHot]);

  return (
    <div style={{ position: 'relative', width: '100%', height: '100%' }}>
      <canvas
        ref={ref}
        style={{ width: '100%', height: '100%', display: 'block', outline: 'none', cursor: 'crosshair' }}
      />
      <div
        style={{
          position: 'absolute',
          bottom: 8,
          left: 12,
          right: 12,
          fontSize: 9,
          fontFamily: '"JetBrains Mono", ui-monospace, monospace',
          color: '#f0e8d8',
          opacity: 0.55,
          letterSpacing: '0.1em',
          pointerEvents: 'none',
          display: 'flex',
          justifyContent: 'space-between',
        }}
      >
        <span>← → TURN · ↑ THRUST · NO SHOOTING · JUST SURVIVE</span>
        <span>github.com/izgebayyurt/asteroids ↗</span>
      </div>
    </div>
  );
};

window.IzgeAsteroids = IzgeAsteroids;
