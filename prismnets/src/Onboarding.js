// Newcomer onboarding: a first-run interactive tutorial, reactive idle hints, Net Hunt
// empty-state coaching, milestone toasts, and an all-found celebration. Self-contained —
// it injects its own DOM + styles and observes the SessionLogger event stream, so it
// stays decoupled from the picker/mode wiring.
//
// createOnboarding({ logger, getHintPos, onHelp }):
//   getHintPos() → {x,y} screen px of a foldable edge to pulse during idle (or null)
//   onHelp()     → open the help/"what's a net" overlay (reopenable from the ? button)

const TUT_KEY = 'pn_tutorial_done_v1';
const IDLE_MS = 8000;

const STEPS = [
  { text: 'Move your cursor over the shape, near one of its edges.', advance: (e) => e.type === 'hover_enter' },
  { text: 'Now click — that edge stays put and the face folds out flat.', advance: (e) => e.type === 'unfold' },
  { text: 'Keep folding. Lay every face flat and you’ve made a net!', advance: (e) => e.type === 'net_complete' || e.type === 'unfold' /* counted below */ },
];

export function createOnboarding({ logger, getHintPos, onHelp }) {
  injectStyles();
  const els = buildDom(onHelp);

  // ── First-run tutorial ──────────────────────────────────────────────────────
  let stepIdx = -1;
  let unfoldsInStep3 = 0;
  const tutorialDone = () => localStorage.getItem(TUT_KEY) === '1';

  function showStep(i) {
    stepIdx = i;
    if (i >= STEPS.length) return finishTutorial();
    els.tut.style.display = 'block';
    els.tutText.textContent = STEPS[i].text;
    els.tutDots.querySelectorAll('span').forEach((d, k) => d.classList.toggle('on', k <= i));
  }
  function finishTutorial() {
    localStorage.setItem(TUT_KEY, '1');
    stepIdx = -1;
    els.tut.style.display = 'none';
  }
  function startTutorial() {
    if (tutorialDone()) return;
    showStep(0);
  }
  els.tutSkip.addEventListener('click', finishTutorial);

  // ── Idle hint (pulse a foldable edge) ───────────────────────────────────────
  let idleTimer = null;
  let pulsing = false;
  function resetIdle() {
    if (pulsing) { pulsing = false; els.pulse.style.display = 'none'; }
    clearTimeout(idleTimer);
    idleTimer = setTimeout(showIdleHint, IDLE_MS);
  }
  function showIdleHint() {
    const pos = getHintPos?.();
    if (!pos) { idleTimer = setTimeout(showIdleHint, IDLE_MS); return; }
    pulsing = true;
    els.pulse.style.left = `${pos.x}px`;
    els.pulse.style.top = `${pos.y}px`;
    els.pulse.style.display = 'block';
  }
  // Keep the pulse glued to the edge while it shows (camera may move).
  function tick() {
    if (pulsing) {
      const pos = getHintPos?.();
      if (!pos) { pulsing = false; els.pulse.style.display = 'none'; }
      else { els.pulse.style.left = `${pos.x}px`; els.pulse.style.top = `${pos.y}px`; }
    }
  }

  // ── Net Hunt empty-state coaching ───────────────────────────────────────────
  function setCoach(msg) {
    els.coach.textContent = msg || '';
    els.coach.style.display = msg ? 'block' : 'none';
  }

  // ── Event stream ────────────────────────────────────────────────────────────
  const prevOnEvent = logger.onEvent;
  logger.onEvent = (e) => {
    prevOnEvent?.(e);
    if (e.type === 'unfold' || e.type === 'fold' || e.type === 'hover_enter') resetIdle();
    if (stepIdx >= 0) {
      const step = STEPS[stepIdx];
      if (stepIdx === 2) { // step 3 completes on a net, or after a few more folds
        if (e.type === 'net_complete') return showStep(3);
        if (e.type === 'unfold' && ++unfoldsInStep3 >= 3) return showStep(3);
      } else if (step.advance(e)) {
        showStep(stepIdx + 1);
      }
    }
  };

  resetIdle();

  return {
    startTutorial,
    tick,
    // Net Hunt mode toggled: drive empty-state coaching from progress.
    setNetHunt(active, found, total) {
      if (!active) return setCoach(null);
      if (found === 0) setCoach('Find your first net — fold every face flat.');
      else if (found < total) setCoach(`${found} / ${total} found. Try unfolding in a different order for a new shape.`);
      else setCoach(null);
    },
    celebrate: () => celebrate(els.confetti),
    teardown() { clearTimeout(idleTimer); },
  };
}

// ── Confetti burst (lightweight canvas, no deps) ──────────────────────────────────
function celebrate(canvas) {
  const ctx = canvas.getContext('2d');
  const W = (canvas.width = window.innerWidth);
  const H = (canvas.height = window.innerHeight);
  canvas.style.display = 'block';
  const colors = ['#43c08a', '#4d8fe0', '#f2c238', '#e0524d', '#9b7fe0'];
  const N = 140;
  const parts = Array.from({ length: N }, () => ({
    x: W / 2, y: H * 0.32,
    vx: (Math.random() - 0.5) * 16,
    vy: Math.random() * -14 - 4,
    s: Math.random() * 5 + 3,
    c: colors[(Math.random() * colors.length) | 0],
    rot: Math.random() * Math.PI, vr: (Math.random() - 0.5) * 0.3,
    life: 1,
  }));
  let raf;
  const t0 = performance.now();
  function frame(now) {
    const dt = Math.min((now - (frame._last || now)) / 16.7, 2); frame._last = now;
    ctx.clearRect(0, 0, W, H);
    let alive = false;
    for (const p of parts) {
      p.vy += 0.45 * dt; p.x += p.vx * dt; p.y += p.vy * dt; p.rot += p.vr * dt;
      p.life = Math.max(0, 1 - (now - t0) / 2200);
      if (p.life > 0 && p.y < H + 20) {
        alive = true;
        ctx.save(); ctx.globalAlpha = p.life; ctx.translate(p.x, p.y); ctx.rotate(p.rot);
        ctx.fillStyle = p.c; ctx.fillRect(-p.s / 2, -p.s / 2, p.s, p.s * 0.6); ctx.restore();
      }
    }
    if (alive) raf = requestAnimationFrame(frame);
    else { ctx.clearRect(0, 0, W, H); canvas.style.display = 'none'; }
  }
  cancelAnimationFrame(raf);
  raf = requestAnimationFrame(frame);
}

// ── DOM + styles ──────────────────────────────────────────────────────────────────
function buildDom(onHelp) {
  const make = (html) => { const t = document.createElement('template'); t.innerHTML = html.trim(); return t.content.firstChild; };

  const confetti = make('<canvas id="ob-confetti"></canvas>');
  const pulse = make('<div id="ob-pulse" aria-hidden="true"></div>');
  const coach = make('<div id="ob-coach"></div>');
  const help = make('<button id="ob-help" title="Help · what is a net?" aria-label="Help">?</button>');
  const tut = make(`
    <div id="ob-tutorial" role="dialog" aria-live="polite">
      <div id="ob-tut-text"></div>
      <div id="ob-tut-foot">
        <span id="ob-tut-dots"><span></span><span></span><span></span></span>
        <button id="ob-tut-skip">Skip</button>
      </div>
    </div>`);
  for (const el of [confetti, pulse, coach, help, tut]) document.body.appendChild(el);
  help.addEventListener('click', () => onHelp?.());

  return {
    confetti, pulse, coach, help, tut,
    tutText: tut.querySelector('#ob-tut-text'),
    tutDots: tut.querySelector('#ob-tut-dots'),
    tutSkip: tut.querySelector('#ob-tut-skip'),
  };
}

function injectStyles() {
  if (document.getElementById('ob-styles')) return;
  const s = document.createElement('style');
  s.id = 'ob-styles';
  s.textContent = `
    #ob-confetti { position: fixed; inset: 0; z-index: 300; pointer-events: none; display: none; }
    #ob-pulse {
      position: fixed; z-index: 90; width: 26px; height: 26px; margin: -13px 0 0 -13px;
      border-radius: 50%; border: 2px solid #43c08a; pointer-events: none; display: none;
      box-shadow: 0 0 0 0 rgba(67,192,138,0.5); animation: ob-pulse 1.3s ease-out infinite;
    }
    @keyframes ob-pulse {
      0% { box-shadow: 0 0 0 0 rgba(67,192,138,0.55); opacity: 1; }
      100% { box-shadow: 0 0 0 18px rgba(67,192,138,0); opacity: 0.4; }
    }
    @media (prefers-reduced-motion: reduce) { #ob-pulse { animation: none; } }
    #ob-coach {
      position: fixed; left: 16px; bottom: 120px; z-index: 10; display: none; max-width: 230px;
      background: rgba(67,192,138,0.14); border: 1px solid rgba(67,192,138,0.5);
      border-radius: 10px; padding: 10px 12px; color: #c9f5e2;
      font: 12.5px/1.45 system-ui, sans-serif;
    }
    #ob-help {
      position: fixed; right: 16px; top: 16px; z-index: 30; width: 34px; height: 34px;
      border-radius: 50%; background: rgba(18,19,26,0.85); border: 1px solid #3a3f55;
      color: #c8ccdc; font: 600 16px system-ui, sans-serif; cursor: pointer;
      backdrop-filter: blur(6px);
    }
    #ob-help:hover { background: #313650; }
    #ob-tutorial {
      position: fixed; left: 50%; bottom: 52px; transform: translateX(-50%);
      z-index: 40; display: none; width: min(380px, calc(100% - 32px));
      background: rgba(18,19,26,0.96); border: 1px solid #43c08a; border-radius: 12px;
      padding: 14px 16px; color: #eafff5; font: 14px/1.5 system-ui, sans-serif;
      box-shadow: 0 10px 40px rgba(0,0,0,0.6);
    }
    #ob-tut-foot { display: flex; align-items: center; justify-content: space-between; margin-top: 12px; }
    #ob-tut-dots span {
      display: inline-block; width: 7px; height: 7px; border-radius: 50%;
      background: #333647; margin-right: 5px;
    }
    #ob-tut-dots span.on { background: #43c08a; }
    #ob-tut-skip {
      background: none; border: none; color: #7a7e98; font-size: 12px; cursor: pointer; padding: 2px 4px;
    }
    #ob-tut-skip:hover { color: #c0c4d6; }
  `;
  document.head.appendChild(s);
}
