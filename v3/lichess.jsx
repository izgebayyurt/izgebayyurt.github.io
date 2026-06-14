// Lichess live card — custom chess board renderer with chevron navigation.

const LICHESS_USER = 'griezwahlm';

const PIECE_URL = (piece) => {
  const color = piece === piece.toUpperCase() ? 'w' : 'b';
  const type = piece.toUpperCase(); // K Q R B N P
  return `https://cdn.jsdelivr.net/gh/lichess-org/lila@master/public/piece/cburnett/${color}${type}.svg`;
};

function expandFenRow(rowStr) {
  const result = [];
  for (const ch of rowStr) {
    if (/\d/.test(ch)) {
      for (let i = 0; i < +ch; i++) result.push(null);
    } else {
      result.push(ch);
    }
  }
  return result;
}

const ChessBoard = ({ fen, c, fonts, lastMove }) => {
  const placement = (fen || 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR').split(' ')[0];
  const ranks = placement.split('/');
  const LIGHT = '#ebd9b3';
  const DARK = '#a17a52';
  return (
    <div
      style={{
        aspectRatio: '1',
        display: 'grid',
        gridTemplateRows: 'repeat(8, 1fr)',
        border: `2px solid ${c.ink}`,
        borderRadius: 2,
        overflow: 'hidden',
        background: DARK
      }}>
      
      {ranks.map((rankStr, rankIdx) => {
        const cells = expandFenRow(rankStr);
        const rank = 8 - rankIdx;
        return (
          <div key={rankIdx} style={{ display: 'grid', gridTemplateColumns: 'repeat(8, 1fr)' }}>
            {cells.map((piece, fileIdx) => {
              const file = String.fromCharCode(97 + fileIdx);
              const square = file + rank;
              const isLight = (rankIdx + fileIdx) % 2 === 0;
              const isLastMove = lastMove && (lastMove.from === square || lastMove.to === square);
              const base = isLight ? LIGHT : DARK;
              const bg = isLastMove ?
              `color-mix(in srgb, ${base}, ${c.accent} 32%)` :
              base;
              return (
                <div
                  key={fileIdx}
                  style={{
                    background: bg,
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    position: 'relative',
                    fontSize: 'clamp(22px, 4.2vw, 44px)',
                    lineHeight: 1
                  }}>
                  
                  {piece &&
                  <img
                    src={PIECE_URL(piece)}
                    alt=""
                    draggable={false}
                    style={{
                      width: '88%',
                      height: '88%',
                      userSelect: 'none',
                      pointerEvents: 'none',
                      filter: 'drop-shadow(0 1px 1px rgba(0,0,0,0.15))'
                    }} />

                  }
                  {rankIdx === 7 &&
                  <span
                    style={{
                      position: 'absolute',
                      bottom: 2,
                      right: 4,
                      fontFamily: fonts.mono,
                      fontSize: 9,
                      color: isLight ? DARK : LIGHT,
                      letterSpacing: '0.05em',
                      opacity: 0.85
                    }}>
                    
                      {file}
                    </span>
                  }
                  {fileIdx === 0 &&
                  <span
                    style={{
                      position: 'absolute',
                      top: 2,
                      left: 4,
                      fontFamily: fonts.mono,
                      fontSize: 9,
                      color: isLight ? DARK : LIGHT,
                      letterSpacing: '0.05em',
                      opacity: 0.85
                    }}>
                    
                      {rank}
                    </span>
                  }
                </div>);

            })}
          </div>);

      })}
    </div>);

};

const ChevronBtn = ({ kind, onClick, disabled, c }) => {
  const sw = 1.6;
  const paths = {
    first:
    <g>
        <line x1="4.5" y1="4" x2="4.5" y2="12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
        <polyline points="13,4 8,8 13,12" stroke="currentColor" strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
      </g>,

    prev:
    <polyline points="11,4 6,8 11,12" stroke="currentColor" strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />,

    next:
    <polyline points="5,4 10,8 5,12" stroke="currentColor" strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />,

    last:
    <g>
        <polyline points="3,4 8,8 3,12" stroke="currentColor" strokeWidth={sw} fill="none" strokeLinecap="round" strokeLinejoin="round" />
        <line x1="11.5" y1="4" x2="11.5" y2="12" stroke="currentColor" strokeWidth={sw} strokeLinecap="round" />
      </g>

  };
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      style={{
        width: 36,
        height: 36,
        padding: 0,
        border: `1px solid ${c.rule}`,
        background: 'transparent',
        color: disabled ? c.inkFaint : c.ink,
        cursor: disabled ? 'default' : 'pointer',
        opacity: disabled ? 0.4 : 1,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        transition: 'background .15s, color .15s',
        borderRadius: 3
      }}
      onMouseEnter={(e) => {if (!disabled) e.currentTarget.style.background = c.surface;}}
      onMouseLeave={(e) => {e.currentTarget.style.background = 'transparent';}}>
      
      <svg viewBox="0 0 16 16" width="14" height="14">{paths[kind]}</svg>
    </button>);

};

const MoveList = ({ history, current, onSelect, c, fonts }) => {
  const ref = React.useRef(null);
  const activeRef = React.useRef(null);
  React.useEffect(() => {
    if (activeRef.current && ref.current) {
      const a = activeRef.current.getBoundingClientRect();
      const r = ref.current.getBoundingClientRect();
      if (a.top < r.top || a.bottom > r.bottom) {
        activeRef.current.scrollIntoView({ block: 'center', behavior: 'auto' });
      }
    }
  }, [current]);
  const pairs = [];
  for (let i = 1; i < history.length; i += 2) {
    pairs.push({
      num: Math.ceil(i / 2),
      white: { idx: i, san: history[i].san },
      black: history[i + 1] ? { idx: i + 1, san: history[i + 1].san } : null
    });
  }
  return (
    <div
      ref={ref}
      style={{
        fontFamily: fonts.mono,
        fontSize: 12,
        color: c.inkDim,
        display: 'grid',
        gridTemplateColumns: 'auto 1fr 1fr',
        gap: '2px 8px',
        maxHeight: 220,
        overflowY: 'auto',
        paddingRight: 8
      }}>
      
      {pairs.map((p) =>
      <React.Fragment key={p.num}>
          <span style={{ color: c.inkFaint, alignSelf: 'center' }}>{p.num}.</span>
          <button
          ref={current === p.white.idx ? activeRef : null}
          onClick={() => onSelect(p.white.idx)}
          style={mvStyle(c, current === p.white.idx)}>
          
            {p.white.san}
          </button>
          {p.black ?
        <button
          ref={current === p.black.idx ? activeRef : null}
          onClick={() => onSelect(p.black.idx)}
          style={mvStyle(c, current === p.black.idx)}>
          
              {p.black.san}
            </button> :

        <span />
        }
        </React.Fragment>
      )}
    </div>);

};

function mvStyle(c, active) {
  return {
    background: active ? c.accent : 'transparent',
    color: active ? c.bg : c.ink,
    border: 'none',
    padding: '3px 8px',
    cursor: 'pointer',
    fontFamily: 'inherit',
    fontSize: 'inherit',
    textAlign: 'left',
    borderRadius: 2
  };
}

const LichessCard = ({ c, fonts }) => {
  const [data, setData] = React.useState(null);
  const [lastGame, setLastGame] = React.useState(null);
  const startFen = 'rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1';
  const [history, setHistory] = React.useState([{ san: null, fen: startFen, from: null, to: null }]);
  const [moveIdx, setMoveIdx] = React.useState(0);
  const [err, setErr] = React.useState(false);

  React.useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const r = await fetch(`https://lichess.org/api/user/${LICHESS_USER}`);
        if (!r.ok) throw new Error('no profile');
        const j = await r.json();
        if (!cancelled) setData(j);

        const g = await fetch(
          `https://lichess.org/api/games/user/${LICHESS_USER}?max=1&moves=true&pgnInJson=true`,
          { headers: { Accept: 'application/x-ndjson' } }
        );
        if (!g.ok) throw new Error('no games');
        const txt = await g.text();
        const line = txt.trim().split('\n')[0];
        if (!line) throw new Error('no game');
        const lg = JSON.parse(line);
        if (!cancelled) setLastGame(lg);

        if (lg.pgn) {
          // Hide the dynamic import from Babel-standalone, which would
          // otherwise statically transform `await import(...)` into a
          // `require(...)` call that throws at runtime.
          const dynamicImport = new Function('u', 'return import(u)');
          const mod = await dynamicImport('https://esm.sh/chess.js@0.13.4');
          const Chess = mod.Chess || mod.default;
          const chess = new Chess();
          chess.load_pgn(lg.pgn);
          const verbose = chess.history({ verbose: true });
          const c2 = new Chess();
          const fens = [{ san: null, fen: c2.fen(), from: null, to: null }];
          verbose.forEach((m) => {
            c2.move(m);
            fens.push({ san: m.san, fen: c2.fen(), from: m.from, to: m.to });
          });
          if (!cancelled) {
            setHistory(fens);
            setMoveIdx(0);
          }
        }
      } catch (e) {
        if (!cancelled) setErr(true);
      }
    })();
    return () => {cancelled = true;};
  }, []);

  // Keyboard navigation
  React.useEffect(() => {
    const onKey = (e) => {
      if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') return;
      if (e.key === 'ArrowLeft') setMoveIdx((i) => Math.max(0, i - 1));else
      if (e.key === 'ArrowRight') setMoveIdx((i) => Math.min(history.length - 1, i + 1));
    };
    return () => {};
  }, [history.length]);

  const perfs = data?.perfs || {};
  const order = ['bullet', 'blitz', 'rapid', 'classical'];
  const currentPos = history[moveIdx] || history[0];
  const lastMove = moveIdx > 0 ? history[moveIdx] : null;
  const fmtDate = (ms) =>
  ms ? new Date(ms).toLocaleDateString(undefined, { year: 'numeric', month: 'short', day: 'numeric' }) : '';

  const moveLabel =
  moveIdx === 0 ?
  'START' :
  `${Math.ceil(moveIdx / 2)}${moveIdx % 2 === 1 ? '. white' : '…  black'}`;

  return (
    <div
      style={{
        gridColumn: 'span 2',
        background: c.bg,
        border: `1px solid ${c.rule}`,
        borderRadius: 4,
        padding: 32,
        position: 'relative'
      }}>
      
      {/* Header */}
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'baseline',
          flexWrap: 'wrap',
          gap: 24,
          marginBottom: 32
        }}>
        
        <div style={{ minWidth: 280 }}>
          <a
            href={`https://lichess.org/@/${LICHESS_USER}`}
            target="_blank"
            rel="noreferrer"
            style={{
              fontFamily: fonts.mono,
              fontSize: 10,
              letterSpacing: '0.22em',
              color: c.accent2,
              textTransform: 'uppercase',
              display: 'inline-flex',
              alignItems: 'center',
              gap: 10,
              marginBottom: 8,
              textDecoration: 'none',
              whiteSpace: 'nowrap',
              borderBottom: `1px solid transparent`,
              transition: 'border-color .15s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.borderColor = c.accent2}
            onMouseLeave={(e) => e.currentTarget.style.borderColor = 'transparent'}>
            
            <span style={{ width: 6, height: 6, borderRadius: '50%', background: '#5a9c3a', flexShrink: 0 }} />
            <span>Live · lichess.org/@/{LICHESS_USER}</span>
          </a>
          <h3
            style={{
              fontFamily: fonts.display,
              fontWeight: 400,
              fontSize: 36,
              color: c.ink,
              margin: 0,
              letterSpacing: '-0.015em'
            }}>Got some free-time? How about a game of chess?


          </h3>
          <p
            style={{
              fontFamily: fonts.body,
              fontSize: 14,
              lineHeight: 1.55,
              color: c.inkDim,
              margin: '10px 0 0',
              maxWidth: 480
            }}>I started playing chess when I was four years old. Played both individually and in team tournements until I was eighteen. Nowadays, I wind down by playing online. Shoot me a challenge on Lichess - @griezwahlm


          </p>
        </div>
        {data &&
        <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap' }}>
            {order.map((k) => {
            const p = perfs[k];
            if (!p) return null;
            return (
              <div key={k}>
                  <div
                  style={{ ...{
                      fontFamily: fonts.mono,
                      fontSize: 9,
                      letterSpacing: '0.18em',
                      color: c.inkFaint,
                      textTransform: 'uppercase'
                    }, color: "rgb(220, 87, 45)", fontSize: "10px" }}>
                  
                    {k === 'classical' ? 'Classical ELO' : k}
                  </div>
                  <div
                  style={{
                    fontFamily: fonts.display,
                    fontWeight: 400,
                    fontSize: 26,
                    color: c.ink,
                    marginTop: 4,
                    letterSpacing: '-0.01em'
                  }}>
                  
                    {k === 'classical' ? 1844 : p.rating}
                  </div>
                </div>);

          })}
          </div>
        }
      </div>

      {/* Board + sidebar */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1.4fr) minmax(0, 1fr)', gap: 36, alignItems: 'stretch' }}>
        <div style={{ maxWidth: 520, width: '100%', margin: '0 auto' }}>
          <ChessBoard fen={currentPos.fen} c={c} fonts={fonts} lastMove={lastMove} />
        </div>

        {/* Game info + notation, stretched to board height */}
        <div style={{ display: 'flex', flexDirection: 'column', minHeight: 0, overflow: 'hidden' }}>
          {lastGame ?
          <>
              <div
              style={{
                fontFamily: fonts.mono,
                fontSize: 10,
                letterSpacing: '0.22em',
                color: c.inkFaint,
                textTransform: 'uppercase',
                marginBottom: 8
              }}>MOST RECENT GAME


            </div>
              <div
              style={{
                fontFamily: fonts.display,
                fontStyle: 'italic',
                fontSize: 20,
                color: c.ink,
                letterSpacing: '-0.01em',
                lineHeight: 1.25
              }}>
              
                {lastGame.players?.white?.user?.name || 'White'}{' '}
                <span style={{ fontFamily: fonts.body, fontStyle: 'normal', fontSize: 14, color: c.inkFaint }}>vs</span>{' '}
                {lastGame.players?.black?.user?.name || 'Black'}
              </div>
              <div style={{ fontFamily: fonts.body, fontSize: 13, color: c.inkDim, marginTop: 6, display: 'flex', alignItems: 'baseline', gap: 8, flexWrap: 'wrap' }}>
                <span
                style={{
                  fontFamily: fonts.display,
                  fontWeight: 400,
                  fontSize: 18,
                  color: lastGame.winner === 'white' ? c.ink : lastGame.winner === 'black' ? c.inkFaint : c.inkDim,
                  letterSpacing: '-0.01em'
                }}>
                
                  {lastGame.winner === 'white' ? '1–0' : lastGame.winner === 'black' ? '0–1' : '½–½'}
                </span>
                <span style={{ color: c.inkFaint }}>·</span>
                <span style={{ textTransform: 'capitalize' }}>
                  {{
                  outoftime: 'Out of time',
                  mate: 'Checkmate',
                  resign: 'Resignation',
                  stalemate: 'Stalemate',
                  timeout: 'Timeout',
                  draw: 'Draw',
                  cheat: 'Cheat',
                  variantend: 'Variant end',
                  nostart: 'No start',
                  unknownfinish: 'Unfinished'
                }[lastGame.status] || lastGame.status}
                </span>
                <span style={{ color: c.inkFaint }}>·</span>
                <span>{lastGame.speed?.toUpperCase()}</span>
                <span style={{ color: c.inkFaint }}>·</span>
                <span>{fmtDate(lastGame.createdAt)}</span>
              </div>
              <a
              href={`https://lichess.org/${lastGame.id}`}
              target="_blank"
              rel="noreferrer"
              style={{
                display: 'inline-block',
                fontFamily: fonts.mono,
                fontSize: 11,
                letterSpacing: '0.18em',
                color: c.accent2,
                textDecoration: 'none',
                marginTop: 12,
                borderBottom: `1px solid ${c.accent2}`,
                paddingBottom: 1,
                textTransform: 'uppercase',
                alignSelf: 'flex-start'
              }}>
              
                Open on lichess ↗
              </a>

              {history.length > 1 &&
            <div style={{ flex: 1, display: 'flex', flexDirection: 'column', minHeight: 0, marginTop: 22 }}>
                  <div
                style={{
                  fontFamily: fonts.mono,
                  fontSize: 10,
                  letterSpacing: '0.22em',
                  color: c.inkFaint,
                  textTransform: 'uppercase',
                  marginBottom: 10
                }}>
                
                    Notation
                  </div>
                  <div style={{ flex: 1, overflowY: 'auto', minHeight: 0 }}>
                    <MoveList history={history} current={moveIdx} onSelect={setMoveIdx} c={c} fonts={fonts} />
                  </div>
                </div>
            }
            </> :
          err ?
          <div style={{ fontFamily: fonts.body, fontSize: 13, color: c.inkDim, fontStyle: 'italic' }}>
              Couldn't reach lichess.org right now. Try lichess.org/@/{LICHESS_USER} ↗
            </div> :

          <div
            style={{
              fontFamily: fonts.mono,
              fontSize: 11,
              color: c.inkFaint,
              letterSpacing: '0.2em'
            }}>
            
              LOADING…
            </div>
          }
        </div>
      </div>

      {/* Thin horizontal bar beneath the board + notation row */}
      <div style={{ height: 1, background: c.rule, margin: '22px 0 18px' }} />

      {/* Chevron nav centered below the bar */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10 }}>
        <ChevronBtn kind="first" onClick={() => setMoveIdx(0)} disabled={moveIdx === 0} c={c} />
        <ChevronBtn kind="prev" onClick={() => setMoveIdx(Math.max(0, moveIdx - 1))} disabled={moveIdx === 0} c={c} />
        <div
          style={{
            fontFamily: fonts.mono,
            fontSize: 11,
            color: c.inkDim,
            minWidth: 120,
            textAlign: 'center',
            letterSpacing: '0.18em',
            textTransform: 'uppercase'
          }}>
          
          {moveLabel}
        </div>
        <ChevronBtn
          kind="next"
          onClick={() => setMoveIdx(Math.min(history.length - 1, moveIdx + 1))}
          disabled={moveIdx === history.length - 1}
          c={c} />
        
        <ChevronBtn
          kind="last"
          onClick={() => setMoveIdx(history.length - 1)}
          disabled={moveIdx === history.length - 1}
          c={c} />
        
      </div>
    </div>);

};

window.LichessCard = LichessCard;