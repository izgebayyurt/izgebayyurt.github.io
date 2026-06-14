// v3 sections — Featured work, Research grid, Writing, Side projects, About

// Featured work — large editorial card for one Unity/VR project
V3.Featured = ({ c, fonts }) => {
  const [ref, style] = V3.useReveal();
  return (
    <section id="work" style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 40px 88px', position: 'relative' }}>
      <V3.SectionHeader
        c={c} fonts={fonts}
        kicker="Featured"
        title={<>My research focuses on <em style={{ color: c.accent, fontStyle: 'italic' }}>imagining novel experiences
</em></>} />
      
      <div ref={ref} style={style}>
        <div style={{
          position: 'relative',
          aspectRatio: '21/9',
          background: c.surface,
          border: `1px solid ${c.rule}`,
          borderRadius: 4,
          overflow: 'hidden',
          backgroundImage:
          `repeating-linear-gradient(135deg, ${c.surface} 0, ${c.surface} 14px, color-mix(in oklab, ${c.surface}, ${c.ink} 4%) 14px, color-mix(in oklab, ${c.surface}, ${c.ink} 4%) 28px)`,
          display: 'flex',
          alignItems: 'flex-end',
          padding: 36
        }}>
          
          <div
            style={{
              position: 'absolute',
              top: 24,
              left: 28,
              fontFamily: fonts.mono,
              fontSize: 11,
              letterSpacing: '0.2em',
              color: c.inkDim
            }}>
            
            FIG. 01 · SURFACE EXPLORER · WEBGL BUILD / TRAILER
          </div>
          <button
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 84,
              height: 84,
              borderRadius: '50%',
              background: c.bg,
              color: c.ink,
              border: `1px solid ${c.rule}`,
              fontSize: 22,
              cursor: 'pointer',
              boxShadow: '0 8px 30px rgba(0,0,0,0.08)',
              transition: 'transform .25s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1.06)'}
            onMouseLeave={(e) => e.currentTarget.style.transform = 'translate(-50%, -50%) scale(1)'}>
            
            ▶
          </button>
          <div
            style={{
              fontFamily: fonts.display,
              fontWeight: 400,
              fontSize: 48,
              fontStyle: 'italic',
              color: c.ink,
              letterSpacing: '-0.015em'
            }}>
            
            Surface Explorer
          </div>
        </div>
        <div style={{ display: 'grid', gridTemplateColumns: '1.6fr 1fr 1fr 1fr', gap: 32, marginTop: 28 }}>
          <p
            style={{
              fontFamily: fonts.display,
              fontStyle: 'italic',
              fontWeight: 400,
              fontSize: 22,
              lineHeight: 1.4,
              color: c.ink,
              margin: 0,
              textWrap: 'pretty'
            }}>
            
            You stand on a giant 3D surface and throw balls across it. They follow geodesic paths, curving where the surface curves and straight where it doesn't. You can't see the whole shape; you have to infer it from how the balls move. Students who told me they weren't "math people" came up with surprisingly good hypotheses.
          </p>
          {[
          ['Engine', 'Unity 2022.3 · URP'],
          ['Role', 'Solo · design + code'],
          ['Venue', 'PME-NA 2024 · Poster']].
          map(([k, v]) =>
          <div key={k} style={{ borderTop: `1px solid ${c.rule}`, paddingTop: 14 }}>
              <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.22em', color: c.inkFaint, textTransform: 'uppercase' }}>
                {k}
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 14, color: c.ink, marginTop: 6 }}>{v}</div>
            </div>
          )}
        </div>
        <div style={{ marginTop: 40 }}>
          <GeodesicPlayground c={c} fonts={fonts} />
        </div>
      </div>
    </section>);

};

// Research grid
V3.ResearchCard = ({ c, fonts, n, title, year, role, blurb, embedUrl, medium }) => {
  const [ref, style] = V3.useReveal();
  const [hover, setHover] = React.useState(false);
  const [playing, setPlaying] = React.useState(false);
  return (
    <article
      ref={ref}
      style={{ ...style, cursor: 'pointer' }}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}>
      
      <div
        style={{
          position: 'relative',
          aspectRatio: '4/3',
          background: c.surface,
          border: `1px solid ${hover ? c.accent : c.rule}`,
          borderRadius: 4,
          overflow: 'hidden',
          transition: 'border-color .3s, transform .35s cubic-bezier(.2,.7,.3,1)',
          transform: hover ? 'translateY(-3px)' : 'translateY(0)',
          backgroundImage:
          `repeating-linear-gradient(135deg, ${c.surface} 0, ${c.surface} 12px, color-mix(in oklab, ${c.surface}, ${c.ink} 4%) 12px, color-mix(in oklab, ${c.surface}, ${c.ink} 4%) 24px)`
        }}>
        
        {playing && embedUrl ?
        <iframe
          src={embedUrl}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0 }}
          title={title}
          allow="autoplay; fullscreen; xr-spatial-tracking" /> :


        <>
            <div
            style={{
              position: 'absolute',
              top: 16,
              left: 18,
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: '0.22em',
              color: c.inkDim
            }}>
            
              {n}{medium ? ' · ' + medium : ' · UNITY · VR'}
            </div>
            <button
            onClick={(e) => {e.stopPropagation();setPlaying(true);}}
            style={{
              position: 'absolute',
              top: '50%',
              left: '50%',
              transform: 'translate(-50%, -50%)',
              width: 60,
              height: 60,
              borderRadius: '50%',
              border: `1px solid ${hover ? c.accent : c.rule}`,
              background: c.bg,
              color: hover ? c.accent : c.ink,
              fontSize: 16,
              cursor: 'pointer',
              transition: 'all .25s'
            }}>
            
              ▶
            </button>
          </>
        }
      </div>
      <div style={{ marginTop: 18, display: 'flex', justifyContent: 'space-between', alignItems: 'baseline' }}>
        <h3
          style={{
            fontFamily: fonts.display,
            fontWeight: 400,
            fontSize: 26,
            color: c.ink,
            margin: 0,
            fontStyle: hover ? 'italic' : 'normal',
            transition: 'font-style .3s',
            letterSpacing: '-0.01em'
          }}>
          
          {title}
        </h3>
        <span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.inkFaint, letterSpacing: '0.15em' }}>
          {year}
        </span>
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.2em', color: hover ? c.accent : c.inkFaint, marginTop: 4, transition: 'color .25s' }}>
        {role}
      </div>
      <p style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6, color: c.inkDim, margin: '10px 0 0' }}>
        {blurb}
      </p>
    </article>);

};

V3.Research = ({ c, fonts }) =>
<section id="research" style={{ maxWidth: 1240, margin: '0 auto', padding: '64px 40px 88px', position: 'relative' }}>
    <V3.SectionHeader
    c={c} fonts={fonts}
    kicker="Research · VR"
    title={<>Worlds I built to push <em style={{ color: c.accent2, fontStyle: 'italic' }}>boundries</em></>}
    intro="Each of these started as a research question and turned into something you'd want to actually try. Click any preview to load the build or trailer." />
  
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 36 }}>
      <V3.ResearchCard
      c={c} fonts={fonts}
      n="01" title="Surface Explorer" year="2024"
      role="THESIS · IMRE LAB · UMAINE"
      blurb="Stand on a giant 3D surface. Throw a ball. Watch where it rolls. Guess the shape. My master's thesis, and the project that convinced me people who 'don't like math' will happily reason about manifolds." />
    
      <V3.ResearchCard
      c={c} fonts={fonts}
      n="02" title="9×9×9 Chess" year="2021"
      role="LEAD DEV · INSITE LAB · COLBY"
      blurb="Chess is roughly 1,500 years old. Give it a third dimension and let players move up to nine pieces at once, and you get something closer to a real battlefield: confusing, full of intentions you can't quite read." />
    
      <V3.ResearchCard
      c={c} fonts={fonts}
      n="03" title="Offshore Wind Farm Sim" year="2022"
      role="LEAD · w/ NREL · COLBY"
      blurb="Built so fishermen, lobstermen, and coastal Mainers could feel what a wind farm in their waters might be like, above and below the surface, before voting on whether they wanted one." />
    
    </div>
  </section>;


// Manuscripts list
V3.Writing = ({ c, fonts }) => {
  const items = [
  {
    tag: 'Poster · 2024',
    authors: 'İzge Bayyurt & Justin K. Dimmel',
    title: 'Surface Explorer: Investigating 3D Solids Through Large-Scale Surfaces in Virtual Reality',
    plain: 'What it\'s really about: we built a VR thing where students stand on giant 3D shapes and figure out the geometry by throwing balls. They got surprisingly good at it.',
    venue: 'Proceedings of PME-NA · 2024',
    link: 'PDF'
  },
  {
    tag: 'Talk · 2023',
    authors: 'Justin K. Dimmel & İzge Bayyurt',
    title: 'Rise of the Machines: Navigating the Opportunities and Challenges of AI-Assisted Research and Learning',
    plain: 'What it\'s really about: AI assistants are quietly rewriting how we do research and teach. What should we lean into, and what should we be careful about?',
    venue: 'Proceedings of PME-NA · 2023',
    link: 'PDF'
  },
  {
    tag: 'In prep',
    authors: 'İzge Bayyurt, Stacy A. Doore & Alison W. Bates',
    title: 'Walking through a wind farm before it\'s built: a VR study with Gulf of Maine communities',
    plain: 'What it\'s really about: we let fishermen and coastal Mainers try a proposed wind farm in VR, above and below the water, and listened carefully to what they said.',
    venue: 'Working draft · Colby × UMaine',
    link: 'Notify'
  },
  {
    tag: 'Thesis · 2025',
    authors: 'İzge Bayyurt',
    title: 'Surface Explorer: Investigating large-scale 3D shapes using VR',
    plain: 'What it\'s really about: the full version of the ball-rolling story above, with all the methodology and results.',
    venue: 'M.Sc. in Teaching · University of Maine · Advisor: Justin Dimmel',
    link: 'PDF'
  }];

  return (
    <section id="writing" style={{ background: c.surface, marginTop: 40 }}>
      <div style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 40px 96px', position: 'relative' }}>
        <V3.SectionHeader
          c={c} fonts={fonts}
          kicker="Writing"
          title={<>Papers, posters, <em style={{ color: c.accent, fontStyle: 'italic' }}>and talks</em></>}
          intro="Each one comes with a plain-English summary, in case you don't feel like reading the academic version." />
        
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {items.map((p, i) => {
            const [ref, style] = V3.useReveal();
            return (
              <a
                key={i}
                ref={ref}
                style={{
                  ...style,
                  display: 'grid',
                  gridTemplateColumns: '140px 1fr auto',
                  gap: 32,
                  padding: '28px 0',
                  borderTop: i === 0 ? `1px solid ${c.rule}` : undefined,
                  borderBottom: `1px solid ${c.rule}`,
                  alignItems: 'baseline',
                  textDecoration: 'none',
                  color: 'inherit',
                  cursor: 'pointer',
                  transition: 'padding-left .3s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.paddingLeft = '16px'}
                onMouseLeave={(e) => e.currentTarget.style.paddingLeft = '0px'}>
                
                <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.2em', color: c.accent, textTransform: 'uppercase' }}>
                  {p.tag}
                </div>
                <div>
                  <div style={{ fontFamily: fonts.body, fontSize: 13, color: c.inkFaint, marginBottom: 6 }}>
                    {p.authors}
                  </div>
                  <h3
                    style={{
                      fontFamily: fonts.display,
                      fontWeight: 400,
                      fontSize: 26,
                      color: c.ink,
                      margin: 0,
                      letterSpacing: '-0.01em',
                      lineHeight: 1.15,
                      textWrap: 'balance'
                    }}>
                    
                    {p.title}
                  </h3>
                  {p.plain &&
                  <div
                    style={{
                      fontFamily: fonts.body,
                      fontSize: 14,
                      lineHeight: 1.55,
                      color: c.inkDim,
                      marginTop: 10,
                      maxWidth: 720
                    }}>
                    
                      {p.plain}
                    </div>
                  }
                  <div style={{ fontFamily: fonts.body, fontSize: 13, color: c.inkDim, marginTop: 8, fontStyle: 'italic' }}>
                    {p.venue}
                  </div>
                </div>
                <div style={{ fontFamily: fonts.body, fontSize: 14, color: c.ink, whiteSpace: 'nowrap', borderBottom: `1px solid ${c.accent}`, paddingBottom: 2 }}>
                  {p.link} ↗
                </div>
              </a>);

          })}
        </div>
      </div>
    </section>);

};

// ── Interactive math learning environments (live, browser-based) ──────
// Add an environment by dropping an object into this array. Once you send a
// Vercel URL, set `url` and the card flips from "In progress" to a live
// "Launch" button. `img` (a screenshot) is optional; without it a geometric
// placeholder cover is drawn. Add Vercel-hosted environments here as the user
// ships them; PrismNets is featured separately via an embedded iframe.
const INTERACTIVE_ENVS = [];


V3.Interactive = ({ c, fonts }) => {
  const [ref, st] = V3.useReveal();
  const hasCards = INTERACTIVE_ENVS.length > 0;
  return (
    <section id="interactive" style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 40px 96px', position: 'relative' }}>
      <V3.SectionHeader
        c={c} fonts={fonts}
        kicker="Interactive"
        title={<>Math you can <em style={{ color: c.accent, fontStyle: 'italic' }}>step into</em></>}
        intro="Browser-based environments I build to make abstract math tangible. No install, no headset, just a mouse and keyboard." />

      <V3.PrismNetsEmbed c={c} fonts={fonts} />

      {hasCards &&
      <div ref={ref} style={{ ...st, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 28, marginTop: 28 }}>
        {INTERACTIVE_ENVS.map((e, i) => <EnvCard key={e.title} env={e} i={i} c={c} fonts={fonts} />)}
      </div>}
    </section>);

};

// Featured: the PrismNets net-folding tool, embedded live (Three.js, build-free).
// The iframe src is set in JS so the single-file bundler leaves the multi-file
// app alone — it loads from the sibling `prismnets/` folder at runtime.
V3.PrismNetsEmbed = ({ c, fonts }) => {
  const [ref, st] = V3.useReveal();
  const frameRef = React.useRef(null);
  const [loaded, setLoaded] = React.useState(false);
  React.useEffect(() => {
    if (frameRef.current && !frameRef.current.src) frameRef.current.src = 'prismnets/index.html';
  }, []);
  return (
    <div ref={ref} style={{ ...st, marginTop: 8 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', gap: 20, flexWrap: 'wrap', marginBottom: 16 }}>
        <div>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.22em', color: c.accent, textTransform: 'uppercase', marginBottom: 12 }}>Three.js · WebGL · spatial reasoning</div>
          <h3 style={{ fontFamily: fonts.display, fontWeight: 400, fontSize: 34, color: c.ink, margin: 0, letterSpacing: '-0.015em' }}>PrismNets</h3>
          <p style={{ fontFamily: fonts.body, fontSize: 15, lineHeight: 1.6, color: c.inkDim, margin: '12px 0 0', maxWidth: 620 }}>
            Unfold polyhedra into flat nets, one face at a time. Hunt every distinct net of a cube, or take on the timed challenges. A browser port of my VR research instrument; click an edge to fold, drag to orbit.
          </p>
        </div>
        <a href="prismnets/index.html" target="_blank" rel="noreferrer"
          style={{ flexShrink: 0, display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: fonts.body, fontSize: 14, color: c.bg, background: c.accent, border: `1px solid ${c.accent}`, borderRadius: 999, padding: '11px 22px', textDecoration: 'none' }}>
          Open fullscreen <span style={{ fontSize: 15 }}>↗</span>
        </a>
      </div>
      <div style={{ position: 'relative', borderRadius: 6, overflow: 'hidden', border: `1px solid ${c.rule}`, background: '#0e0f13', aspectRatio: '16 / 10', boxShadow: '0 20px 50px rgba(31,28,24,0.10)' }}>
        {!loaded &&
        <div style={{ position: 'absolute', inset: 0, display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'rgba(232,232,238,0.6)', fontFamily: fonts.mono, fontSize: 12, letterSpacing: '0.16em', textTransform: 'uppercase', pointerEvents: 'none' }}>Loading PrismNets…</div>}
        <iframe
          ref={frameRef}
          title="PrismNets"
          onLoad={() => setLoaded(true)}
          style={{ position: 'absolute', inset: 0, width: '100%', height: '100%', border: 0, display: 'block' }}
          allow="fullscreen"
        ></iframe>
      </div>
      <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.14em', textTransform: 'uppercase', color: c.inkFaint, marginTop: 10 }}>
        Click an edge to fold or unfold · drag to orbit · scroll to zoom
      </div>
    </div>);

};

// Geometric placeholder cover, used until a real screenshot is supplied
function EnvThumb({ motif, c, acc, hover }) {
  const faint = 'rgba(245,239,228,0.14)';
  const wrap = { width: '100%', height: '100%', display: 'block', background: c.ink };
  const g = { transform: hover ? 'scale(1.05) rotate(2deg)' : 'scale(1)', transformOrigin: '160px 100px', transition: 'transform .7s cubic-bezier(.2,.7,.3,1)' };
  let body;
  if (motif === 0) {
    // wireframe sphere with two orbiting "balls"
    body = (
      <g style={g} fill="none">
        <circle cx="160" cy="100" r="70" stroke={acc} strokeWidth="1" />
        {[70, 44, 18].map((rx) => <ellipse key={'m' + rx} cx="160" cy="100" rx={rx} ry="70" stroke={faint} strokeWidth="1" />)}
        {[70, 44, 18].map((ry) => <ellipse key={'l' + ry} cx="160" cy="100" rx="70" ry={ry} stroke={faint} strokeWidth="1" />)}
        <circle cx="160" cy="30" r="4" fill={acc} stroke="none" />
        <circle cx="223" cy="118" r="4" fill={acc} stroke="none" />
      </g>);

  } else if (motif === 1) {
    // nested rotating squares
    body = (
      <g style={g} fill="none">
        {[0, 18, 36, 54].map((rot, k) =>
        <rect key={rot} x={160 - (70 - k * 14)} y={100 - (70 - k * 14)} width={(70 - k * 14) * 2} height={(70 - k * 14) * 2} stroke={k === 0 ? acc : faint} strokeWidth="1" transform={`rotate(${rot} 160 100)`} />
        )}
        <circle cx="160" cy="100" r="3" fill={acc} stroke="none" />
      </g>);

  } else {
    // wireframe torus
    body = (
      <g style={g} fill="none">
        <ellipse cx="160" cy="100" rx="82" ry="40" stroke={acc} strokeWidth="1" />
        <ellipse cx="160" cy="100" rx="34" ry="15" stroke={acc} strokeWidth="1" />
        {[58, 34, 0, -34, -58].map((dx) => <ellipse key={dx} cx={160 + dx} cy="100" rx="11" ry="40" stroke={faint} strokeWidth="1" />)}
        <circle cx="242" cy="100" r="4" fill={acc} stroke="none" />
      </g>);

  }
  return <svg viewBox="0 0 320 200" preserveAspectRatio="xMidYMid slice" style={wrap}>{body}</svg>;
}

function EnvCard({ env, i, c, fonts }) {
  const [hover, setHover] = React.useState(false);
  const acc = env.accent === 2 ? c.accent2 : c.accent;
  const live = env.url && env.url !== '#';
  return (
    <div
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        background: c.bg,
        border: `1px solid ${hover ? acc : c.rule}`,
        borderRadius: 4,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover ? '0 18px 40px rgba(31,28,24,0.08)' : 'none',
        transition: 'border-color .3s, transform .35s, box-shadow .35s'
      }}>
      <div style={{ position: 'relative', aspectRatio: '16 / 9', overflow: 'hidden', background: c.ink }}>
        {env.img ?
        <img src={env.img} alt={env.title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: hover ? 'scale(1.04)' : 'scale(1)', transition: 'transform .5s ease' }} /> :

        <EnvThumb motif={env.motif} c={c} acc={acc} hover={hover} />}
        {!live &&
        <span style={{ position: 'absolute', top: 14, left: 14, fontFamily: fonts.mono, fontSize: 9, letterSpacing: '0.2em', textTransform: 'uppercase', color: 'rgba(245,239,228,0.75)', border: '1px solid rgba(245,239,228,0.35)', borderRadius: 999, padding: '4px 10px' }}>In progress</span>}
      </div>
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.22em', color: acc, textTransform: 'uppercase', marginBottom: 14 }}>{env.stack}</div>
        <h3 style={{ fontFamily: fonts.display, fontWeight: 400, fontSize: 30, color: c.ink, margin: 0, letterSpacing: '-0.015em', fontStyle: hover ? 'italic' : 'normal', transition: 'font-style .3s' }}>{env.title}</h3>
        <p style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6, color: c.inkDim, margin: '14px 0 0' }}>{env.blurb}</p>
        <div style={{ marginTop: 'auto', paddingTop: 24 }}>
          {live ?
          <a href={env.url} target="_blank" rel="noreferrer"
          style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: fonts.body, fontSize: 14, color: hover ? c.bg : c.ink, background: hover ? acc : 'transparent', border: `1px solid ${acc}`, borderRadius: 999, padding: '10px 20px', textDecoration: 'none', transition: 'background .25s, color .25s' }}>
              Launch <span style={{ fontSize: 15 }}>↗</span>
            </a> :

          <span style={{ display: 'inline-flex', alignItems: 'center', gap: 8, fontFamily: fonts.body, fontSize: 14, color: c.inkFaint, border: `1px solid ${c.rule}`, borderRadius: 999, padding: '10px 20px' }}>
              Coming soon
            </span>}
        </div>
      </div>
    </div>);

}

// Side projects: real games, music, and drawings
V3.SideProjects = ({ c, fonts }) => {
  const [ref, st] = V3.useReveal();
  return (
    <section id="side" style={{ maxWidth: 1240, margin: '0 auto', padding: '96px 40px 96px', position: 'relative' }}>
      <V3.SectionHeader
        c={c} fonts={fonts}
        kicker="Side"
        title={<>Games, <em style={{ color: c.accent, fontStyle: 'italic' }}>music,</em> drawings</>}
        intro="What I make when I'm not in the lab. The Asteroids game is playable, and the songs and drawings below are the real thing." />

      <V3.SubLabel c={c} fonts={fonts}>Games</V3.SubLabel>
      <div ref={ref} style={{ ...st, display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 28 }}>
        <V3.AsteroidsCard c={c} fonts={fonts} />
        <V3.GameTile c={c} fonts={fonts}
          img={window.IMG.soviet_scoot}
          kicker="Unity · 2020"
          title="Soviet Scoot"
          blurb="A 2D side-scroller built from scratch over a one-month January term. As lead programmers, Owen and I brought our teammates' art and sound together in Unity. You play Larry Showers, a downed pilot scooting down a cluttered highway toward the border."
          link="Read more →"
          to="games/soviet-scoot.html" />
        <V3.GameTile c={c} fonts={fonts}
          img={window.IMG.marblz}
          kicker="Unity · 2019"
          accent={c.accent2}
          title="Marblz"
          blurb="Eight hours at the Bowdoin Hackathon with Tyler Hansen, and it took second place. A Plinko-style catcher inspired by a bean-machine arcade game I played to death as a kid in Istanbul. I made the art, the sound, and the soundtrack (further down)."
          link="Read more →"
          to="games/marblz.html" />
      </div>

      <V3.SubLabel c={c} fonts={fonts}>Music</V3.SubLabel>
      <V3.MusicBlock c={c} fonts={fonts} />

      <V3.SubLabel c={c} fonts={fonts}>Drawings</V3.SubLabel>
      <V3.DrawingsGallery c={c} fonts={fonts} />

      <V3.SubLabel c={c} fonts={fonts}>Chess, live</V3.SubLabel>
      <LichessCard c={c} fonts={fonts} />
    </section>);

};

// Small labelled divider used between the side-project blocks
V3.SubLabel = ({ c, fonts, children }) =>
  <div style={{ display: 'flex', alignItems: 'center', gap: 18, margin: '60px 0 26px' }}>
    <span style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.24em', textTransform: 'uppercase', color: c.inkFaint, whiteSpace: 'nowrap' }}>{children}</span>
    <span style={{ flex: 1, height: 1, background: c.rule }}></span>
  </div>;

// Game tile with cover image
V3.GameTile = ({ c, fonts, img, kicker, title, blurb, link, href, to, accent }) => {
  const [ref, st] = V3.useReveal();
  const [hover, setHover] = React.useState(false);
  const acc = accent || c.accent;
  const dest = to || href;
  const external = !!href && !to;
  const Tag = dest ? 'a' : 'div';
  const linkProps = dest ? { href: dest, ...(external ? { target: '_blank', rel: 'noreferrer' } : {}) } : {};
  return (
    <Tag
      ref={ref}
      {...linkProps}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...st,
        textDecoration: 'none',
        background: c.bg,
        border: `1px solid ${hover ? acc : c.rule}`,
        borderRadius: 4,
        overflow: 'hidden',
        display: 'flex',
        flexDirection: 'column',
        transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover ? '0 18px 40px rgba(31,28,24,0.08)' : 'none',
        transition: 'border-color .3s, transform .35s, box-shadow .35s'
      }}>
      <div style={{ aspectRatio: '16 / 10', overflow: 'hidden', background: c.surface }}>
        <img src={img} alt={title} style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block', transform: hover ? 'scale(1.04)' : 'scale(1)', transition: 'transform .5s ease' }} />
      </div>
      <div style={{ padding: 28, display: 'flex', flexDirection: 'column', flex: 1 }}>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.22em', color: acc, textTransform: 'uppercase', marginBottom: 14 }}>{kicker}</div>
        <h3 style={{ fontFamily: fonts.display, fontWeight: 400, fontSize: 32, color: c.ink, margin: 0, letterSpacing: '-0.015em', fontStyle: hover ? 'italic' : 'normal', transition: 'font-style .3s' }}>{title}</h3>
        <p style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6, color: c.inkDim, margin: '14px 0 0' }}>{blurb}</p>
        <div style={{ marginTop: 'auto', paddingTop: 22, fontFamily: fonts.body, fontSize: 13, color: c.ink, alignSelf: 'flex-start', borderBottom: `1px solid ${hover && dest ? acc : 'transparent'}`, paddingBottom: 2, transition: 'border-color .25s' }}>{link}</div>
      </div>
    </Tag>);

};

// Music block: Algorave video + two SoundCloud players
V3.MusicBlock = ({ c, fonts }) => {
  const [ref, st] = V3.useReveal();
  return (
    <div ref={ref} style={st}>
      <div style={{ display: 'grid', gridTemplateColumns: '1.1fr 0.9fr', gap: 40, alignItems: 'center', marginBottom: 34 }}>
        <div style={{ position: 'relative', aspectRatio: '16 / 9', borderRadius: 4, overflow: 'hidden', border: `1px solid ${c.rule}`, background: c.ink }}>
          <iframe title="Mule Rave 2020" src="https://www.youtube.com/embed/YCWjuKDOEs8" frameBorder="0" allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture" allowFullScreen style={{ position: 'absolute', inset: 0, width: '100%', height: '100%' }}></iframe>
        </div>
        <div>
          <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.22em', color: c.accent2, textTransform: 'uppercase', marginBottom: 14 }}>Live coding · 2020</div>
          <h3 style={{ fontFamily: fonts.display, fontWeight: 400, fontSize: 30, color: c.ink, margin: 0, letterSpacing: '-0.015em' }}>Mule Rave</h3>
          <p style={{ fontFamily: fonts.body, fontSize: 14.5, lineHeight: 1.65, color: c.inkDim, margin: '14px 0 0' }}>My final performance for a class on live coding. I used <em style={{ fontStyle: 'italic', color: c.ink }}>Tidal</em>, driving a SuperCollider synth, to build and bend samples on the fly. The plan was a warehouse rave; the pandemic turned it into a Twitch livestream instead. Part pre-written, part typed in real time.</p>
        </div>
      </div>
      <p style={{ fontFamily: fonts.body, fontSize: 14.5, lineHeight: 1.65, color: c.inkDim, margin: '0 0 18px', maxWidth: 720 }}>A couple of tracks I composed: usually a guitar melody with synths layered over a MIDI controller, drums mostly left to Logic. Here are Bitterlemon and the Marblz soundtrack.</p>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: 20 }}>
        <iframe title="Bitterlemon" width="100%" height="300" scrolling="no" frameBorder="no" allow="autoplay" style={{ borderRadius: 4 }} src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/993853648&color=%237a5e9a&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true"></iframe>
        <iframe title="Marblz soundtrack" width="100%" height="300" scrolling="no" frameBorder="no" allow="autoplay" style={{ borderRadius: 4 }} src="https://w.soundcloud.com/player/?url=https%3A//api.soundcloud.com/tracks/993875074&color=%23b78840&auto_play=false&hide_related=true&show_comments=false&show_user=true&show_reposts=false&show_teaser=false&visual=true"></iframe>
      </div>
      <div style={{ marginTop: 18 }}>
        <a href="https://soundcloud.com/izge-bayyurt" target="_blank" rel="noreferrer" style={{ fontFamily: fonts.body, fontSize: 13, color: c.ink, textDecoration: 'none', borderBottom: `1px solid ${c.accent}`, paddingBottom: 2 }}>More on SoundCloud ↗</a>
      </div>
    </div>);

};

// Drawings gallery
V3.DrawingsGallery = ({ c, fonts }) => {
  const [ref, st] = V3.useReveal();
  const items = [
    { img: window.IMG.iris, title: 'Iris', year: '2021' },
    { img: window.IMG.iliana, title: 'Iliana', year: '2020' },
    { img: window.IMG.tusk, title: 'Tusk', year: '2019' }];

  return (
    <div ref={ref} style={{ ...st, display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 20 }}>
      {items.map((d) => <DrawingCard key={d.title} d={d} c={c} fonts={fonts} />)}
    </div>);

};

function DrawingCard({ d, c, fonts }) {
  const [hover, setHover] = React.useState(false);
  return (
    <a
      href={d.img}
      target="_blank"
      rel="noreferrer"
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{ textDecoration: 'none', display: 'block' }}>
      <div style={{ overflow: 'hidden', borderRadius: 4, border: `1px solid ${hover ? c.accent : c.rule}`, background: c.surface, transition: 'border-color .3s' }}>
        <img src={d.img} alt={d.title} style={{ width: '100%', height: 360, objectFit: 'cover', display: 'block', transform: hover ? 'scale(1.03)' : 'scale(1)', transition: 'transform .5s ease' }} />
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 10 }}>
        <span style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 18, color: c.ink }}>{d.title}</span>
        <span style={{ fontFamily: fonts.mono, fontSize: 11, color: c.inkFaint, letterSpacing: '0.1em' }}>{d.year}</span>
      </div>
    </a>);

}

V3.SideTile = ({ c, fonts, kicker, title, blurb, link, accent }) => {
  const [ref, st] = V3.useReveal();
  const [hover, setHover] = React.useState(false);
  const acc = accent || c.accent;
  return (
    <article
      ref={ref}
      onMouseEnter={() => setHover(true)}
      onMouseLeave={() => setHover(false)}
      style={{
        ...st,
        background: c.bg,
        border: `1px solid ${hover ? acc : c.rule}`,
        borderRadius: 4,
        padding: 28,
        cursor: 'pointer',
        transition: 'border-color .3s, transform .35s, box-shadow .35s',
        transform: hover ? 'translateY(-3px)' : 'translateY(0)',
        boxShadow: hover ? '0 18px 40px rgba(31,28,24,0.08)' : 'none',
        display: 'flex',
        flexDirection: 'column',
        justifyContent: 'space-between',
        minHeight: 220
      }}>
      
      <div>
        <div style={{ fontFamily: fonts.mono, fontSize: 10, letterSpacing: '0.22em', color: acc, textTransform: 'uppercase', marginBottom: 16 }}>
          {kicker}
        </div>
        <h3
          style={{
            fontFamily: fonts.display,
            fontWeight: 400,
            fontSize: 34,
            color: c.ink,
            margin: 0,
            letterSpacing: '-0.015em',
            fontStyle: hover ? 'italic' : 'normal',
            transition: 'font-style .3s'
          }}>
          
          {title}
        </h3>
        <p style={{ fontFamily: fonts.body, fontSize: 14, lineHeight: 1.6, color: c.inkDim, margin: '14px 0 0' }}>
          {blurb}
        </p>
      </div>
      <div style={{ marginTop: 24, fontFamily: fonts.body, fontSize: 13, color: c.ink, borderBottom: `1px solid ${hover ? acc : 'transparent'}`, paddingBottom: 2, alignSelf: 'flex-start', transition: 'border-color .25s' }}>
        {link}
      </div>
    </article>);

};

// About
V3.About = ({ c, fonts }) =>
<section id="about" style={{ background: c.surface }}>
    <div style={{ maxWidth: 1240, margin: '0 auto', padding: '120px 40px', position: 'relative' }}>
      <V3.SectionHeader
      c={c} fonts={fonts}
      kicker="About · contact"
      title={<>The long way <em style={{ color: c.accent, fontStyle: 'italic' }}>around.</em></>} />
    
      <div style={{ display: 'grid', gridTemplateColumns: '1.5fr 1fr', gap: 80, alignItems: 'start' }}>
        <div>
          <p
          style={{
            fontFamily: fonts.body,
            fontSize: 17,
            lineHeight: 1.75,
            color: c.inkDim,
            margin: 0,
            maxWidth: 620,
            textWrap: 'pretty'
          }}>
          
            I grew up in <em style={{ fontFamily: fonts.display, fontStyle: 'italic', color: c.ink, fontSize: 19 }}>Istanbul</em> and then kept moving: Mostar, Waterville, Copenhagen, San Francisco, and now Orono. Usually for school or a job, sometimes just because it sounded interesting. Computer Science at Colby (Davis UWC Scholar), and a master's in teaching at <em style={{ fontFamily: fonts.display, fontStyle: 'italic', color: c.ink, fontSize: 19 }}>UMaine</em>.
          </p>
          <p
          style={{
            fontFamily: fonts.body,
            fontSize: 17,
            lineHeight: 1.75,
            color: c.inkDim,
            margin: '20px 0 0',
            maxWidth: 620,
            textWrap: 'pretty'
          }}>
          
            Along the way I built VR things at Colby's INSITE Lab and UMaine's IMRE Lab, interned at MeetinVR in Copenhagen, spent a summer at Pocket Gems shipping mobile-game backends, ran UMaine's RiSE research group, and organized with UMGWU-UAW. A modified Asteroids clone I wrote in my first semester is what pulled me toward game design in the first place. Outside all of that: a small garden, a slowly improving espresso pull, and chess. I'm a licensed player with the Turkish Chess Federation at a FIDE rating of 1844, have placed highly in national and international tournaments, and coach younger players. I used to speedsolve Rubik's cubes too; my best is 22 seconds.
          </p>
          <RubiksMini c={c} fonts={fonts} />
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, auto)', columnGap: 60, rowGap: 12, marginTop: 40, maxWidth: 540 }}>
            {[
          ['2023-25', 'M.Sc. Teaching · UMaine'],
          ['2018-22', 'B.A. Computer Science · Colby'],
          ['2022', 'Pocket Gems · backend'],
          ['2021-22', 'MeetinVR · Copenhagen'],
          ['2018-22', 'INSITE Lab · Colby'],
          ['2023-25', 'IMRE Lab · UMaine']].
          map(([y, w]) =>
          <React.Fragment key={y + w}>
                <div style={{ fontFamily: fonts.mono, fontSize: 11, color: c.inkFaint, letterSpacing: '0.12em' }}>{y}</div>
                <div style={{ fontFamily: fonts.body, fontSize: 14, color: c.ink }}>{w}</div>
              </React.Fragment>
          )}
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 0 }}>
          <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.22em', color: c.inkFaint, textTransform: 'uppercase', marginBottom: 12 }}>◆ PLACES I LIVED IN:

        </div>
          <div style={{ background: c.bg, border: `1px solid ${c.rule}`, borderRadius: 4, padding: 16, marginBottom: 28 }}>
            <PlacesGlobe c={c} fonts={fonts} />
          </div>
          <div style={{ fontFamily: fonts.mono, fontSize: 11, letterSpacing: '0.22em', color: c.inkFaint, textTransform: 'uppercase', marginBottom: 16 }}>
            ◆ Contact
          </div>
          {[
        ['Email · academic', 'izge.bayyurt@maine.edu'],
        ['Email · personal', 'izgebayyurt@gmail.com'],
        ['GitHub', '@izgebayyurt'],
        ['LinkedIn', '/in/izgebayyurt'],
        ['Google Scholar', 'İ. Bayyurt'],
        ['Spotify', 'izgebayyurt'],
        ['Instagram', '@griezwahlm']].
        map(([k, v]) =>
        <div
          key={k}
          style={{
            display: 'flex',
            justifyContent: 'space-between',
            padding: '14px 0',
            borderBottom: `1px solid ${c.rule}`,
            fontFamily: fonts.body,
            fontSize: 14
          }}>
          
              <span style={{ color: c.inkDim }}>{k}</span>
              <span style={{ color: c.ink }}>{v} ↗</span>
            </div>
        )}
        </div>
      </div>
    </div>
  </section>;


V3.Footer = ({ c, fonts }) =>
<footer style={{ maxWidth: 1240, margin: '0 auto', padding: '32px 40px', display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', position: 'relative' }}>
    <div style={{ fontFamily: fonts.display, fontStyle: 'italic', fontSize: 16, color: c.ink }}>
      İzge Bayyurt
    </div>
    <div style={{ fontFamily: fonts.mono, fontSize: 11, color: c.inkFaint, letterSpacing: '0.18em' }}>
      © 2026 · ISTANBUL · ORONO · DALLAS
    </div>
  </footer>;