// v3 "Clean Editorial"
// Soft cream, generous whitespace, restrained interactions, wireframe 3D bg.

const V3 = window.V3 = {};

V3.usePalette = (key) => {
  const palettes = {
    cream: { bg: '#f5efe4', surface: '#ede5d6', ink: '#1f1c18', inkDim: 'rgba(31,28,24,0.62)', inkFaint: 'rgba(31,28,24,0.32)', rule: 'rgba(31,28,24,0.14)', accent: '#b85c3c', accent2: '#6b7a5a' },
    sand: { bg: '#efe9dd', surface: '#e6dec9', ink: '#2a221b', inkDim: 'rgba(42,34,27,0.64)', inkFaint: 'rgba(42,34,27,0.34)', rule: 'rgba(42,34,27,0.14)', accent: '#9c5a3c', accent2: '#7a7a4c' },
    sage: { bg: '#eef0e6', surface: '#e2e6d6', ink: '#1f2620', inkDim: 'rgba(31,38,32,0.64)', inkFaint: 'rgba(31,38,32,0.32)', rule: 'rgba(31,38,32,0.14)', accent: '#5a7a52', accent2: '#a8623c' },
    dusk: { bg: '#ece9e1', surface: '#dfdbd0', ink: '#2a2730', inkDim: 'rgba(42,39,48,0.64)', inkFaint: 'rgba(42,39,48,0.34)', rule: 'rgba(42,39,48,0.14)', accent: '#7a5e9a', accent2: '#b78840' }
  };
  return palettes[key] || palettes.cream;
};

V3.useFonts = (key) => {
  const f = {
    newsreader: { display: '"Newsreader", "Cormorant Garamond", Georgia, serif', body: '"Geist", -apple-system, system-ui, sans-serif', mono: '"Geist Mono", ui-monospace, monospace' },
    sectra: { display: '"DM Serif Display", Georgia, serif', body: '"Geist", -apple-system, system-ui, sans-serif', mono: '"Geist Mono", ui-monospace, monospace' },
    instrument: { display: '"Instrument Serif", Georgia, serif', body: '"Manrope", -apple-system, system-ui, sans-serif', mono: '"Geist Mono", ui-monospace, monospace' }
  };
  return f[key] || f.newsreader;
};

// ── Tiny in-view reveal hook ──────────────────────────────────────────
V3.useReveal = () => {
  const ref = React.useRef(null);
  const [seen, setSeen] = React.useState(false);
  React.useEffect(() => {
    if (!ref.current || seen) return;
    const io = new IntersectionObserver(([e]) => {
      if (e.isIntersecting) {setSeen(true);io.disconnect();}
    }, { threshold: 0.15 });
    io.observe(ref.current);
    return () => io.disconnect();
  }, [seen]);
  const style = {
    opacity: seen ? 1 : 0,
    transform: seen ? 'translateY(0)' : 'translateY(14px)',
    transition: 'opacity .8s cubic-bezier(.2,.7,.3,1), transform .8s cubic-bezier(.2,.7,.3,1)'
  };
  return [ref, style];
};

// ── Eyebrow ───────────────────────────────────────────────────────────
V3.Eyebrow = ({ children, c, fonts, accent }) =>
<div
  style={{
    fontFamily: fonts.mono,
    fontSize: 11,
    letterSpacing: '0.25em',
    color: accent || c.inkDim,
    textTransform: 'uppercase',
    display: 'flex',
    alignItems: 'center',
    gap: 12
  }}>
  
    <span
    style={{
      width: 24,
      height: 1,
      background: 'currentColor',
      opacity: 0.6,
      display: 'inline-block'
    }} />
  
    {children}
  </div>;


// ── Nav ───────────────────────────────────────────────────────────────
V3.Nav = ({ c, fonts }) =>
<header
  style={{
    position: 'sticky',
    top: 0,
    zIndex: 50,
    backdropFilter: 'blur(12px)',
    WebkitBackdropFilter: 'blur(12px)',
    background: c.bg + 'cc',
    borderBottom: `1px solid ${c.rule}`
  }}>
  
    <div
    style={{
      maxWidth: 1240,
      margin: '0 auto',
      padding: '18px 40px',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between'
    }}>
    
      <div
      style={{
        fontFamily: fonts.display,
        fontSize: 22,
        color: c.ink,
        letterSpacing: '-0.01em'
      }}>İzge Bayyurt


    </div>
      <nav style={{ display: 'flex', gap: 28, fontFamily: fonts.body, fontSize: 14 }}>
        {[
      ['Work', '#work'],
      ['Research', '#research'],
      ['Interactive', '#interactive'],
      ['Writing', '#writing'],
      ['Side projects', '#side'],
      ['About', '#about']].
      map(([n, h]) =>
      <a key={n} href={h} style={{ color: c.inkDim, textDecoration: 'none', transition: 'color .2s' }}
      onMouseEnter={(e) => e.currentTarget.style.color = c.ink}
      onMouseLeave={(e) => e.currentTarget.style.color = c.inkDim}>
            {n}
          </a>
      )}
        <a
        href="Izge%20Bayyurt%20-%20CV.pdf"
        target="_blank"
        rel="noreferrer"
        style={{
          color: c.ink,
          textDecoration: 'none',
          borderBottom: `1px solid ${c.accent}`,
          paddingBottom: 1
        }}>
        
          CV ↗
        </a>
      </nav>
    </div>
  </header>;


// ── Hero ──────────────────────────────────────────────────────────────
V3.Hero = ({ c, fonts }) =>
<section
  style={{
    maxWidth: 1240,
    margin: '0 auto',
    padding: '140px 40px 120px',
    position: 'relative'
  }}>
  
    <V3.Eyebrow c={c} fonts={fonts} accent={c.accent}>
      Master's student · VR researcher · maker
    </V3.Eyebrow>
    <h1
    style={{
      fontFamily: fonts.display,
      fontWeight: 400,

      lineHeight: 1.02,
      letterSpacing: '-0.025em',
      color: c.ink,
      margin: '32px 0 0',
      textWrap: 'balance', fontSize: "120px"
    }}>
    
      Building <em style={{ color: c.accent, fontStyle: 'italic', fontSize: "120px" }}>virtual worlds</em>
      <br />
      to study how we learn.
    </h1>
    <div
    style={{
      display: 'grid',
      gridTemplateColumns: '1.4fr 1fr',
      gap: 60,
      marginTop: 56,
      alignItems: 'start'
    }} data-comment-anchor="1dd500e6be-div-163-5">
    
      <p
      style={{
        fontFamily: fonts.body,


        color: c.inkDim,
        margin: 0,
        maxWidth: 620,
        textWrap: 'pretty', fontWeight: "400", lineHeight: "1.5", height: "129px", fontSize: "22px"
      }}>
      
        I'm a master's student in teaching at <em style={{ ...{ color: c.ink, fontFamily: fonts.display, fontStyle: 'italic', fontSize: 22 }, color: "#003263", fontSize: "22px" }}>University of Maine</em>, working on the spot where interactive experiences and math learning overlap. On the side I make games and music, draw, grow things in my garden, and chase a better espresso pull.
      </p>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 16, fontFamily: fonts.body, fontSize: 14 }}>
        <div style={{ position: 'relative' }}>
          {/* Editorial frame: thin accent slab offset behind the portrait, FIG label above, caption strip below. */}
          <div
          aria-hidden="true"
          style={{
            position: 'absolute',
            inset: 0,
            transform: 'translate(10px, 10px)',
            background: c.accent2,
            borderRadius: 4,
            opacity: 0.18,
            pointerEvents: 'none'
          }} />
        
          <div
          style={{
            position: 'relative',
            display: 'flex',
            justifyContent: 'space-between',
            alignItems: 'baseline',
            fontFamily: fonts.mono,
            fontSize: 9,
            letterSpacing: '0.22em',
            textTransform: 'uppercase',
            color: c.inkFaint,
            padding: '0 0 8px',
            borderBottom: `1px solid ${c.rule}`,
            marginBottom: 10
          }}>
          
            <span>FIG. 01 · PORTRAIT</span>
            <span>Boston · 2023</span>
          </div>
          <image-slot
          id="hero-portrait"
          src={(typeof window !== 'undefined' && window.PORTRAIT_SRC) || undefined}
          shape="rounded"
          radius="3"
          placeholder="drop a portrait"
          style={{
            width: '100%',
            height: 'auto',
            aspectRatio: '1/1',
            display: 'block',
            border: `1px solid ${c.rule}`,
            background: c.surface,
            position: 'relative',
            filter: 'saturate(0.92) contrast(1.02)'
          }}>
        </image-slot>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${c.rule}` }}>
          <span style={{ color: c.inkFaint }}>Currently</span>
          <span style={{ color: c.ink }}>Orono, ME</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${c.rule}` }}>
          <span style={{ color: c.inkFaint }}>This month</span>
          <span style={{ color: c.ink }}>Finishing my thesis
</span>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', padding: '6px 0', borderBottom: `1px solid ${c.rule}` }}>
          <span style={{ color: c.inkFaint }}>Open to</span>
          <span style={{ color: c.ink }}>Chats &amp; collaborations</span>
        </div>
        <div style={{ display: 'flex', gap: 12, marginTop: 8 }}>
          <a style={{
          fontFamily: fonts.body,
          fontSize: 14,
          fontWeight: 500,
          color: c.bg,
          background: c.ink,
          padding: '10px 20px',
          borderRadius: 999,
          textDecoration: 'none',
          cursor: 'pointer'
        }}>
          
            izge.bayyurt@maine.edu
          </a>
          <a
          href="Izge%20Bayyurt%20-%20CV.pdf"
          target="_blank"
          rel="noreferrer"
          style={{
            fontFamily: fonts.body,
            fontSize: 14,
            color: c.ink,
            padding: '10px 18px',
            borderRadius: 999,
            border: `1px solid ${c.rule}`,
            textDecoration: 'none',
            cursor: 'pointer'
          }}>
          
            CV ↓
          </a>
        </div>
      </div>
    </div>
  </section>;


// ── Section header ────────────────────────────────────────────────────
V3.SectionHeader = ({ kicker, title, intro, c, fonts, accent }) => {
  const [ref, style] = V3.useReveal();
  return (
    <div ref={ref} style={{ ...style, display: 'grid', gridTemplateColumns: '1fr 2fr', gap: 60, marginBottom: 56 }}>
      <V3.Eyebrow c={c} fonts={fonts} accent={accent}>{kicker}</V3.Eyebrow>
      <div>
        <h2
          style={{
            fontFamily: fonts.display,
            fontWeight: 400,
            fontSize: 'clamp(40px, 5vw, 64px)',
            lineHeight: 1.05,
            letterSpacing: '-0.02em',
            color: c.ink,
            margin: 0,
            textWrap: 'balance'
          }}>
          
          {title}
        </h2>
        {intro &&
        <p
          style={{
            fontFamily: fonts.body,
            fontSize: 17,
            lineHeight: 1.6,
            color: c.inkDim,
            margin: '24px 0 0',
            maxWidth: 680
          }}>
          
            {intro}
          </p>
        }
      </div>
    </div>);

};

// Asteroidz mini-card embed (uses IzgeAsteroids from existing port)
V3.AsteroidsCard = ({ c, fonts }) => {
  const [ref, style] = V3.useReveal();
  return (
    <div
      ref={ref}
      style={{
        ...style,
        gridColumn: 'span 2',
        background: c.ink,
        color: c.bg,
        borderRadius: 4,
        padding: 28,
        display: 'grid',
        gridTemplateColumns: '1fr 1fr',
        gap: 32,
        alignItems: 'stretch'
      }}>
      
      <div style={{ display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
        <div>
          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: '0.25em',
              color: c.accent,
              opacity: 0.9,
              marginBottom: 16
            }}>
            
            ◇ PLAYABLE · 2018
          </div>
          <h3
            style={{
              fontFamily: fonts.display,
              fontWeight: 400,
              fontSize: 52,
              lineHeight: 1,
              color: c.bg,
              margin: 0,
              letterSpacing: '-0.02em'
            }}>
            <a href="games/asteroids.html" style={{ color: c.bg, textDecoration: 'none' }}>Asteroids</a>
          </h3>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 15,
              lineHeight: 1.6,
              color: 'rgba(245,239,228,0.7)',
              maxWidth: 360,
              marginTop: 18
            }}>My first-semester final project at Colby: The classic arcade game Asteroids! written in Python. Every rock is a procedurally-generated lumpy polygon. I ported it from Python to JavaScript so you can try not-dying right here in the page.


          </p>
        </div>
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            letterSpacing: '0.18em',
            color: 'rgba(245,239,228,0.45)',
            marginTop: 20,
            display: 'flex',
            gap: 22,
            flexWrap: 'wrap'
          }}>
          <a href="games/asteroids.html" style={{ color: c.bg, textDecoration: 'none', borderBottom: `1px solid ${c.accent}`, paddingBottom: 2 }}>FULL WRITEUP →</a>
          <a href="https://github.com/izgebayyurt/asteroids" target="_blank" rel="noreferrer" style={{ color: 'rgba(245,239,228,0.6)', textDecoration: 'none', borderBottom: '1px solid rgba(245,239,228,0.3)', paddingBottom: 2 }}>PYTHON SOURCE ↗</a>
        </div>
      </div>
      <div
        style={{
          background: '#000',
          border: `1px solid rgba(245,239,228,0.15)`,
          minHeight: 320,
          position: 'relative'
        }}>
        
        <IzgeAsteroids accent={c.accent} accentHot={c.accent2} />
      </div>
    </div>);

};

Object.assign(window, { V3 });