// Shared detail-page renderer for the games. Each game's HTML file defines a
// GAME_DATA object and calls renderGamePage(GAME_DATA). Styled to match the
// homepage (dusk palette, Newsreader display, Geist body).

const GAME_PAL = {
  bg: '#ece9e1', surface: '#dfdbd0', ink: '#2a2730',
  inkDim: 'rgba(42,39,48,0.64)', inkFaint: 'rgba(42,39,48,0.34)',
  rule: 'rgba(42,39,48,0.14)', accent: '#7a5e9a', accent2: '#b78840'
};
const GAME_FONTS = {
  display: '"Newsreader", "Cormorant Garamond", Georgia, serif',
  body: '"Geist", -apple-system, system-ui, sans-serif',
  mono: '"Geist Mono", ui-monospace, monospace'
};

// ── Fixed back-to-homepage bar ────────────────────────────────────────
function BackBar({ c, fonts }) {
  const [hover, setHover] = React.useState(false);
  return (
    <nav
      style={{
        position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100,
        height: 54, display: 'flex', alignItems: 'center',
        justifyContent: 'space-between', padding: '0 28px', boxSizing: 'border-box',
        background: 'rgba(236,233,225,0.82)', backdropFilter: 'blur(14px)',
        WebkitBackdropFilter: 'blur(14px)', borderBottom: `1px solid ${c.rule}`
      }}>
      <a
        href="../"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{
          display: 'inline-flex', alignItems: 'center', gap: 10,
          textDecoration: 'none', color: c.ink, fontFamily: fonts.display, fontSize: 17
        }}>
        <span style={{ fontSize: 19, color: c.accent, transition: 'transform .25s ease', transform: hover ? 'translateX(-5px)' : 'none' }}>←</span>
        <span>Back to homepage</span>
      </a>
      <span style={{ fontFamily: '"Instrument Serif", Georgia, serif', fontStyle: 'italic', fontSize: 20, color: c.ink }}>İzge Bayyurt</span>
    </nav>);

}

// ── Small labelled divider ────────────────────────────────────────────
function SubLabel({ c, fonts, children }) {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '0 0 28px' }}>
      <span style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: c.inkFaint, whiteSpace: 'nowrap' }}>{children}</span>
      <span style={{ flex: 1, height: 1, background: c.rule }}></span>
    </div>);

}

// ── Playable Asteroids slot ───────────────────────────────────────────
function PlayableSlot({ c, fonts, acc }) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
      <div style={{ position: 'relative', aspectRatio: '4 / 3', background: '#000', border: `1px solid rgba(245,239,228,0.18)`, borderRadius: 4, overflow: 'hidden' }}>
        {window.IzgeAsteroids ?
        <window.IzgeAsteroids accent={acc} accentHot={c.accent2} /> :
        <div style={{ color: '#f4ecd8', fontFamily: fonts.mono, fontSize: 12, position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>loading…</div>}
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.16em', textTransform: 'uppercase', color: 'rgba(245,239,228,0.55)' }}>
        Click to start · ← → steer · ↑ thrust
      </div>
    </div>);

}

// ── Gallery figure ────────────────────────────────────────────────────
function Figure({ item, c, fonts, acc }) {
  const [hover, setHover] = React.useState(false);
  return (
    <figure style={{ margin: 0 }}>
      <a
        href={item.src} target="_blank" rel="noreferrer"
        onMouseEnter={() => setHover(true)}
        onMouseLeave={() => setHover(false)}
        style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', height: 340, overflow: 'hidden', borderRadius: 4, border: `1px solid ${hover ? acc : c.rule}`, background: '#0f0e14', transition: 'border-color .3s' }}>
        <img
          src={item.src} alt={item.caption || ''}
          style={{ maxWidth: '100%', maxHeight: '100%', objectFit: 'contain', display: 'block', transform: hover ? 'scale(1.03)' : 'scale(1)', transition: 'transform .5s ease' }} />
      </a>
      {item.caption &&
      <figcaption style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.04em', color: c.inkFaint, marginTop: 10 }}>{item.caption}</figcaption>}
    </figure>);

}

// ── Page ──────────────────────────────────────────────────────────────
function GamePage({ data }) {
  const c = GAME_PAL, fonts = GAME_FONTS;
  const acc = data.accent === 2 ? c.accent2 : c.accent;

  React.useEffect(() => { document.title = data.title + ' · İzge Bayyurt'; }, []);

  return (
    <div style={{ background: c.bg, minHeight: '100vh', color: c.ink }}>
      <BackBar c={c} fonts={fonts} />
      <div style={{ height: 54 }}></div>

      {/* Hero band */}
      <header style={{ background: c.ink, color: c.bg }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '72px 40px 76px', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 56, alignItems: 'center' }} className="gd-hero">
          <div>
            <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.25em', color: acc, textTransform: 'uppercase', marginBottom: 18 }}>{data.kicker}</div>
            <h1 style={{ fontFamily: fonts.display, fontWeight: 400, fontSize: 72, lineHeight: 0.98, letterSpacing: '-0.02em', margin: 0, color: c.bg }}>{data.title}</h1>
            <p style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 22, lineHeight: 1.4, color: 'rgba(245,239,228,0.82)', margin: '22px 0 0', maxWidth: 460 }}>{data.tagline}</p>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '22px 36px', marginTop: 30, alignItems: 'flex-start' }}>
              {data.meta.map((m) =>
              <div key={m.label} style={{ minWidth: 88 }}>
                  <div style={{ fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,239,228,0.45)', marginBottom: 5 }}>{m.label}</div>
                  <div style={{ fontFamily: fonts.body, fontSize: 14, color: 'rgba(245,239,228,0.9)', lineHeight: 1.35 }}>{m.value}</div>
                </div>)}
            </div>

            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 14, marginTop: 34 }}>
              {data.links.map((l, i) =>
              <a key={l.label} href={l.href} target="_blank" rel="noreferrer"
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: fonts.body, fontSize: 14,
                color: i === 0 ? c.ink : c.bg, background: i === 0 ? acc : 'transparent',
                border: `1px solid ${i === 0 ? acc : 'rgba(245,239,228,0.35)'}`, borderRadius: 999,
                padding: '11px 22px', textDecoration: 'none'
              }}>
                  {l.label} <span style={{ fontSize: 15 }}>↗</span>
                </a>)}
            </div>
          </div>

          <div>
            {data.playable ?
            <PlayableSlot c={c} fonts={fonts} acc={acc} /> :
            <div style={{ borderRadius: 4, overflow: 'hidden', border: `1px solid rgba(245,239,228,0.18)`, background: '#0f0e14', height: 460, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                <img src={data.hero} alt={data.title} style={{ maxWidth: '100%', maxHeight: '100%', display: 'block', objectFit: 'contain' }} />
              </div>}
          </div>
        </div>
      </header>

      {/* About */}
      <section style={{ maxWidth: 760, margin: '0 auto', padding: '88px 40px 40px' }}>
        <SubLabel c={c} fonts={fonts}>About</SubLabel>
        {data.about.map((para, i) =>
        <p key={i} style={{ fontFamily: fonts.body, fontSize: 17, lineHeight: 1.72, color: c.inkDim, margin: i === 0 ? 0 : '20px 0 0', textAlign: 'justify', textWrap: 'pretty' }}>{para}</p>)}
      </section>

      {/* Gallery */}
      <section style={{ maxWidth: 1180, margin: '0 auto', padding: '48px 40px 112px' }}>
        <SubLabel c={c} fonts={fonts}>Gallery</SubLabel>
        <div className="gd-gallery" style={{ display: 'grid', gridTemplateColumns: `repeat(${data.galleryCols || 2}, 1fr)`, gap: 24 }}>
          {data.gallery.map((g, i) => <Figure key={i} item={g} c={c} fonts={fonts} acc={acc} />)}
        </div>
      </section>

      {/* Footer back link */}
      <footer style={{ borderTop: `1px solid ${c.rule}`, background: c.surface }}>
        <div style={{ maxWidth: 1180, margin: '0 auto', padding: '40px', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: 16 }}>
          <a href="../" style={{ fontFamily: fonts.display, fontSize: 20, color: c.ink, textDecoration: 'none', display: 'inline-flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: c.accent }}>←</span> Back to homepage
          </a>
          <span style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.18em', textTransform: 'uppercase', color: c.inkFaint }}>İzge Bayyurt · {new Date().getFullYear()}</span>
        </div>
      </footer>
    </div>);

}

function renderGamePage(data) {
  const style = document.createElement('style');
  style.textContent = `
    @media (max-width: 860px){
      .gd-hero{ grid-template-columns: 1fr !important; gap: 36px !important; }
      .gd-gallery{ grid-template-columns: 1fr !important; }
    }`;
  document.head.appendChild(style);
  ReactDOM.createRoot(document.getElementById('root')).render(<GamePage data={data} />);
}

window.renderGamePage = renderGamePage;
