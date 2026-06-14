// Black-and-white world globe with real continent outlines.
// Drag to rotate, hover a dot for a story.

// Places I've lived, studied, or visited.
// Format: { kind, label, lat, lng, year, note }
// Or with sub-stays:  { kind, label, lat, lng, year, stays: [{ sub, year, note }, ...] }
const PLACES = [
  { kind: 'lived',   label: 'Istanbul, Turkey',         lat: 41.01, lng: 28.98,   year: '1996-2018', note: 'Where I grew up.' },
  { kind: 'studied', label: 'Mostar, Bosnia & H.',      lat: 43.34, lng: 17.81,   year: '2017-18',   note: 'UWC. Learned to make Bosnian coffee.' },
  {
    kind: 'lived',
    label: 'Maine, USA',
    lat: 44.72, lng: -69.15, // somewhere between Waterville and Orono
    year: '2018-22 · 2023 →',
    stays: [
      { sub: 'Waterville', year: '2018-22', note: 'Colby College. CS, INSITE Lab, a lot of snow.' },
      { sub: 'Orono',      year: '2023 →', note: "UMaine. IMRE Lab. Currently here." },
    ],
  },
  { kind: 'studied', label: 'Copenhagen, Denmark',      lat: 55.68, lng: 12.57,   year: '2021-22',   note: 'MeetinVR internship + a study abroad in game design.' },
  { kind: 'lived',   label: 'San Francisco, CA',        lat: 37.77, lng: -122.42, year: '2022',         note: 'Pocket Gems. Mobile-game backends.' },
  { kind: 'visited', label: 'Geneva, Switzerland',      lat: 46.21, lng: 6.14,    year: '2018',         note: 'CERN, for the obvious reason.' },
];

const LAND_URL = 'https://cdn.jsdelivr.net/npm/world-atlas@2/land-110m.json';

const PlacesGlobe = ({ c, fonts }) => {
  const canvasRef = React.useRef(null);
  const stateRef = React.useRef({
    rx: -10,         // pitch in degrees
    ry: 30,          // yaw in degrees
    auto: 0,
    drag: null,
    hover: null,
  });
  const [land, setLand] = React.useState(null);
  const [hover, setHover] = React.useState(null);
  const hoverRef = React.useRef(null);

  // Load land topojson once
  React.useEffect(() => {
    let cancelled = false;
    fetch(LAND_URL)
      .then((r) => r.json())
      .then((world) => {
        if (cancelled) return;
        const topo = window.topojson;
        if (!topo) {
          // Try after a beat — topojson-client script may still be loading
          setTimeout(() => {
            if (window.topojson && !cancelled) {
              setLand(window.topojson.feature(world, world.objects.land));
            }
          }, 200);
          return;
        }
        setLand(topo.feature(world, world.objects.land));
      })
      .catch(() => {});
    return () => { cancelled = true; };
  }, []);

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
    const loop = () => {
      const now = performance.now();
      const dt = now - prevMs;
      prevMs = now;
      const st = stateRef.current;
      const rect = canvas.getBoundingClientRect();
      const W = rect.width, H = rect.height;
      const radius = Math.min(W, H) * 0.43;

      ctx.clearRect(0, 0, W, H);

      if (!st.drag && !st.hover) st.auto += dt * 0.012;
      const lambda = st.ry + st.auto;
      const phi = st.rx;

      // d3-geo orthographic projection
      const d3g = window.d3;
      if (!d3g || !d3g.geoOrthographic) {
        // fallback: just draw the sphere outline
        ctx.fillStyle = c.bg;
        ctx.beginPath();
        ctx.arc(W / 2, H / 2, radius, 0, Math.PI * 2);
        ctx.fill();
        ctx.strokeStyle = c.rule;
        ctx.stroke();
      } else {
        const projection = d3g.geoOrthographic()
          .scale(radius)
          .translate([W / 2, H / 2])
          .rotate([lambda, phi])
          .clipAngle(90);
        const path = d3g.geoPath(projection, ctx);

        // water
        ctx.fillStyle = c.bg;
        ctx.beginPath();
        path({ type: 'Sphere' });
        ctx.fill();

        // graticule — faint
        if (d3g.geoGraticule) {
          const grat = d3g.geoGraticule().step([20, 20])();
          ctx.beginPath();
          path(grat);
          ctx.strokeStyle = c.inkFaint;
          ctx.lineWidth = 0.4;
          ctx.stroke();
        }

        // land
        if (land) {
          ctx.beginPath();
          path(land);
          ctx.fillStyle = c.ink;
          ctx.fill();
          ctx.strokeStyle = c.inkDim;
          ctx.lineWidth = 0.5;
          ctx.stroke();
        }

        // sphere outline
        ctx.beginPath();
        path({ type: 'Sphere' });
        ctx.strokeStyle = c.rule;
        ctx.lineWidth = 1;
        ctx.stroke();

        // Place dots — d3.geoDistance to test visibility
        const center = [-lambda, -phi];
        const projected = PLACES.map((p) => {
          const xy = projection([p.lng, p.lat]);
          const d = d3g.geoDistance([p.lng, p.lat], center);
          return { ...p, xy, visible: d < Math.PI / 2 };
        });

        // Hover hit-test
        const mx = st.hover?.x, my = st.hover?.y;
        let bestIdx = -1, bestDist = 14;
        projected.forEach((p, i) => {
          if (!p.visible || !p.xy) return;
          if (mx == null) return;
          const dx = p.xy[0] - mx, dy = p.xy[1] - my;
          const d = Math.sqrt(dx * dx + dy * dy);
          if (d < bestDist) { bestDist = d; bestIdx = i; }
        });
        const newHover = bestIdx >= 0 ? projected[bestIdx] : null;
        if (newHover?.label !== hoverRef.current?.label) {
          hoverRef.current = newHover;
          setHover(newHover);
        }

        // Draw dots — all in red, slightly different on hover
        const MARKER = '#c14b3f';
        projected.forEach((p, i) => {
          if (!p.xy) return;
          const visible = p.visible;
          const isHover = i === bestIdx;
          if (!visible) {
            ctx.fillStyle = MARKER;
            ctx.globalAlpha = 0.22;
            ctx.beginPath();
            ctx.arc(p.xy[0], p.xy[1], 2.2, 0, Math.PI * 2);
            ctx.fill();
            ctx.globalAlpha = 1;
            return;
          }
          // halo (cream ring so the marker pops against dark land)
          ctx.fillStyle = c.bg;
          ctx.beginPath();
          ctx.arc(p.xy[0], p.xy[1], isHover ? 8 : 5.5, 0, Math.PI * 2);
          ctx.fill();
          ctx.fillStyle = MARKER;
          ctx.beginPath();
          ctx.arc(p.xy[0], p.xy[1], isHover ? 5.5 : 3.4, 0, Math.PI * 2);
          ctx.fill();
          if (isHover) {
            ctx.strokeStyle = MARKER;
            ctx.lineWidth = 1;
            ctx.beginPath();
            ctx.arc(p.xy[0], p.xy[1], 11, 0, Math.PI * 2);
            ctx.stroke();
          }
        });
      }

      raf = requestAnimationFrame(loop);
    };
    loop();
    return () => { cancelAnimationFrame(raf); ro.disconnect(); };
  }, [land, c]);

  const onDown = (e) => {
    const st = stateRef.current;
    st.drag = { x: e.clientX, y: e.clientY, rx0: st.rx, ry0: st.ry + st.auto };
    st.ry = st.drag.ry0;
    st.auto = 0;
  };
  const onMove = (e) => {
    const st = stateRef.current;
    const rect = canvasRef.current.getBoundingClientRect();
    st.hover = { x: e.clientX - rect.left, y: e.clientY - rect.top };
    if (st.drag) {
      st.ry = st.drag.ry0 + (e.clientX - st.drag.x) * 0.4;
      st.rx = st.drag.rx0 - (e.clientY - st.drag.y) * 0.4;
      st.rx = Math.max(-90, Math.min(90, st.rx));
    }
  };
  const onUp = () => { stateRef.current.drag = null; };
  const onLeave = () => { stateRef.current.hover = null; hoverRef.current = null; setHover(null); stateRef.current.drag = null; };

  return (
    <div style={{ position: 'relative', width: '100%' }}>
      <canvas
        ref={canvasRef}
        onMouseDown={onDown}
        onMouseMove={onMove}
        onMouseUp={onUp}
        onMouseLeave={onLeave}
        style={{ width: '100%', height: 380, display: 'block', cursor: stateRef.current.drag ? 'grabbing' : 'grab' }}
      />
      <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.18em', color: c.inkFaint, textTransform: 'uppercase', marginTop: 8, textAlign: 'center' }}>
        drag to rotate · hover a dot
      </div>
      {hover && (
        <div
          style={{
            position: 'absolute',
            left: 0,
            right: 0,
            bottom: 28,
            margin: '0 auto',
            maxWidth: 300,
            padding: '12px 16px',
            background: c.bg,
            border: `1px solid ${c.rule}`,
            borderRadius: 4,
            fontFamily: fonts.body,
            fontSize: 13,
            color: c.ink,
            boxShadow: '0 6px 20px rgba(0,0,0,0.08)',
            pointerEvents: 'none',
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 12 }}>
            <strong style={{ fontFamily: fonts.display, fontStyle: 'italic', fontWeight: 400, fontSize: 17, color: c.ink }}>
              {hover.label}
            </strong>
            <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.inkFaint, letterSpacing: '0.15em' }}>
              {hover.year}
            </span>
          </div>
          {hover.stays ? (
            <div style={{ marginTop: 8 }}>
              {hover.stays.map((s, i) => (
                <div
                  key={i}
                  style={{
                    marginTop: i === 0 ? 0 : 8,
                    paddingTop: i === 0 ? 0 : 8,
                    borderTop: i === 0 ? 'none' : `1px solid ${c.rule}`,
                  }}
                >
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', gap: 8 }}>
                    <em style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 14, color: c.ink }}>{s.sub}</em>
                    <span style={{ fontFamily: fonts.mono, fontSize: 10, color: c.inkFaint, letterSpacing: '0.12em' }}>{s.year}</span>
                  </div>
                  <div style={{ color: c.inkDim, fontSize: 12, marginTop: 2 }}>{s.note}</div>
                </div>
              ))}
            </div>
          ) : (
            <div style={{ color: c.inkDim, marginTop: 4 }}>{hover.note}</div>
          )}
        </div>
      )}
    </div>
  );
};

window.PlacesGlobe = PlacesGlobe;
