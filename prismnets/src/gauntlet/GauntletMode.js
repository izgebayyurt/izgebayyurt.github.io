import { loadPolyhedron } from '../geometry/polyhedra.js';
import { CHALLENGES, CHALLENGE_IDS, difficultyFor, pickSolid } from '../challenge/challenges.js';
import { buildChallenge } from '../challenge/buildChallenge.js';
import { disposeGroup } from '../challenge/disposeGroup.js';

const FEEDBACK_MS = 1300;

const CARD_SUB = {
  seam: 'Do the coloured seams match when it folds?',
  close: 'Does this flat shape fold up with no overlaps?',
  adjacency: 'Which face touches the marked one when folded?',
  color: 'Match the folded solid (colours).',
  arrow: 'Match the folded solid (arrows).',
  mixed: 'All five challenges, mixed together.',
};

// Gauntlet: a 3-strikes run that ramps in difficulty. Pick one of the 5 challenges or
// "Mixed" (random challenge each question). Uses the shared ChallengeView to present.
export class GauntletMode {
  constructor({ scene, view, catalog, logger }) {
    this.scene = scene;
    this.view = view;
    this.logger = logger;
    this.solids = (catalog || []).flatMap((c) => c.solids.filter((s) => s.faces != null));

    this.onStart = null;
    this.onClose = null;
    this.active = false;
    this._group = null;
    this._busy = false;
    this._timer = null;

    this.panel = document.getElementById('challenge-panel');
    this.chooser = document.getElementById('gauntlet-chooser');
    this.over = document.getElementById('gauntlet-over');
    this.bar = document.getElementById('gauntlet-bar');
    this.endBtn = document.getElementById('cv-end');
    this.livesEl = document.getElementById('gauntlet-lives');
    this.scoreEl = document.getElementById('gauntlet-score');
    this._bind();
  }

  _bind() {
    const cards = document.getElementById('gauntlet-cards');
    if (cards) {
      cards.innerHTML = '';
      for (const id of [...CHALLENGE_IDS, 'mixed']) {
        const label = id === 'mixed' ? 'Mixed' : CHALLENGES[id].label;
        const card = document.createElement('button');
        card.className = 'cv-card';
        card.innerHTML = `<span class="cv-card-title">${label}</span><span class="cv-card-sub">${CARD_SUB[id]}</span>`;
        card.addEventListener('click', () => this._begin(id));
        cards.appendChild(card);
      }
    }
    this.chooser?.querySelector('[data-close="gauntlet"]')?.addEventListener('click', () => { this.chooser.style.display = 'none'; });
    document.getElementById('g-again')?.addEventListener('click', () => { this.over.style.display = 'none'; this.openChooser(); });
    document.getElementById('g-exit')?.addEventListener('click', () => { this.over.style.display = 'none'; this.stop(); });
  }

  openChooser() { if (this.chooser) this.chooser.style.display = 'flex'; }

  _begin(type) {
    this.chooser.style.display = 'none';
    this.type = type;
    this.level = 0;
    this.lives = 3;
    this.score = 0;
    this.streak = 0;
    this.active = true;
    this.onStart?.();
    this.panel.style.display = 'block';
    this.bar.style.display = 'flex';
    document.getElementById('practice-bar').style.display = 'none';
    document.getElementById('practice-footer').style.display = 'none';
    this.endBtn.style.display = 'block';
    this.endBtn.textContent = '← End run';
    this._next();
  }

  async _next() {
    if (!this.active || this._busy) return;
    clearTimeout(this._timer);
    this._busy = true;
    this.view.clear();
    if (this._group) { disposeGroup(this.scene, this._group); this._group = null; }

    const params = difficultyFor(this.level);
    const challengeId = this.type === 'mixed' ? CHALLENGE_IDS[(Math.random() * CHALLENGE_IDS.length) | 0] : this.type;
    const solid = pickSolid(this.solids, challengeId, params);
    const built = await buildChallenge(challengeId, params, solid, loadPolyhedron);
    if (!this.active) { disposeGroup(this.scene, built.group); this._busy = false; return; }
    this._group = built.group;
    this.scene.add(built.group);
    this.view.present(built.descriptor, {
      poly: built.poly, faceMeshes: built.faceMeshes, solidData: built.solidData,
      onAnswer: (correct) => this._onAnswer(correct, challengeId),
    });
    this._renderStatus();
    this._busy = false;
  }

  _onAnswer(correct, challengeId) {
    this.logger?.append?.('gauntlet_answer', { type: this.type, challenge: challengeId, level: this.level, correct });
    if (correct) { this.score++; this.streak++; this.level++; }
    else { this.lives--; this.streak = 0; }
    this._renderStatus();
    this._timer = setTimeout(() => {
      if (!this.active) return;
      if (this.lives <= 0) this._gameOver();
      else this._next();
    }, FEEDBACK_MS);
  }

  _gameOver() {
    this.view.clear();
    if (this._group) { disposeGroup(this.scene, this._group); this._group = null; }
    document.getElementById('g-over-text').textContent = `Score ${this.score}`;
    this.over.style.display = 'flex';
  }

  _renderStatus() {
    this.livesEl.textContent = '♥'.repeat(Math.max(0, this.lives)) + '♡'.repeat(Math.max(0, 3 - this.lives));
    this.scoreEl.textContent = `Score ${this.score}  ·  Streak ${this.streak}`;
  }

  stop() {
    this.active = false;
    clearTimeout(this._timer);
    this.view.clear();
    if (this._group) { disposeGroup(this.scene, this._group); this._group = null; }
    this.panel.style.display = 'none';
    this.bar.style.display = 'none';
    if (this.over) this.over.style.display = 'none';
    this.onClose?.();
  }

  update() { if (this.active) this.view.update(); }
}
