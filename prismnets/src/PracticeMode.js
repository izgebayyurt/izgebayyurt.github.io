import { loadPolyhedron } from './geometry/polyhedra.js';
import { CHALLENGES, CHALLENGE_IDS, paramsForTier, pickSolid } from './challenge/challenges.js';
import { buildChallenge } from './challenge/buildChallenge.js';
import { disposeGroup } from './challenge/disposeGroup.js';

const CARD_SUB = {
  seam: 'Do the coloured seams match when it folds?',
  close: 'Does this flat shape fold up with no overlaps?',
  adjacency: 'Which face touches the marked one when folded?',
  color: 'Which folded solid does this net make? (colours)',
  arrow: 'Which folded solid does this net make? (arrows)',
};

// Practice mode: pick ONE challenge + difficulty tier, then a stream of puzzles. After
// each answer, advance via the Next button or automatically after 2s. No lives.
export class PracticeMode {
  constructor({ scene, controls, view, catalog, logger }) {
    this.scene = scene;
    this.controls = controls;
    this.view = view;
    this.logger = logger;
    this.solids = (catalog || []).flatMap((c) => c.solids.filter((s) => s.faces != null));

    this.onStart = null;
    this.onClose = null;

    this.active = false;
    this.tier = 'medium';
    this._group = null;
    this._busy = false;
    this._advanceTimer = null;

    this.panel = document.getElementById('challenge-panel');
    this.chooser = document.getElementById('practice-chooser');
    this.bar = document.getElementById('practice-bar');
    this.footer = document.getElementById('practice-footer');
    this.endBtn = document.getElementById('cv-end');
    this.labelEl = document.getElementById('practice-label');
    this.scoreEl = document.getElementById('practice-score');
    this.autoEl = document.getElementById('practice-auto');
    this._bind();
  }

  _bind() {
    // Tier buttons.
    this.chooser?.querySelectorAll('.cv-tier').forEach((b) => b.addEventListener('click', () => {
      this.tier = b.dataset.tier;
      this.chooser.querySelectorAll('.cv-tier').forEach((x) => x.classList.toggle('active', x === b));
    }));
    // Challenge cards.
    const cards = document.getElementById('practice-cards');
    if (cards) {
      cards.innerHTML = '';
      for (const id of CHALLENGE_IDS) {
        const card = document.createElement('button');
        card.className = 'cv-card';
        card.innerHTML = `<span class="cv-card-title">${CHALLENGES[id].label}</span><span class="cv-card-sub">${CARD_SUB[id]}</span>`;
        card.addEventListener('click', () => this._begin(id));
        cards.appendChild(card);
      }
    }
    this.chooser?.querySelector('[data-close="practice"]')?.addEventListener('click', () => { this.chooser.style.display = 'none'; });
    document.getElementById('practice-next')?.addEventListener('click', () => this._next());
  }

  openChooser() { if (this.chooser) this.chooser.style.display = 'flex'; }

  _begin(challengeId) {
    this.chooser.style.display = 'none';
    this.challengeId = challengeId;
    this.solved = 0;
    this.attempts = 0;
    this.active = true;
    this.onStart?.();
    this.panel.style.display = 'block';
    this.bar.style.display = 'flex';
    this.footer.style.display = 'flex';
    this.endBtn.style.display = 'block';
    this.endBtn.textContent = '← Exit practice';
    document.getElementById('gauntlet-bar').style.display = 'none';
    this.labelEl.textContent = `${CHALLENGES[challengeId].label} · ${this.tier}`;
    this._next();
  }

  async _next() {
    if (!this.active || this._busy) return;
    clearTimeout(this._advanceTimer);
    this._busy = true;
    this.view.clear();
    if (this._group) { disposeGroup(this.scene, this._group); this._group = null; }

    const params = paramsForTier(this.tier);
    const solid = pickSolid(this.solids, this.challengeId, params);
    const built = await buildChallenge(this.challengeId, params, solid, loadPolyhedron);
    if (!this.active) { disposeGroup(this.scene, built.group); this._busy = false; return; }
    this._group = built.group;
    this.scene.add(built.group);
    this.view.present(built.descriptor, {
      poly: built.poly, faceMeshes: built.faceMeshes, solidData: built.solidData,
      onAnswer: (correct) => this._onAnswer(correct),
    });
    this._renderScore();
    this._busy = false;
  }

  _onAnswer(correct) {
    this.attempts++;
    if (correct) this.solved++;
    this._renderScore();
    this.logger?.append?.('practice_answer', { challenge: this.challengeId, tier: this.tier, correct });
    if (this.autoEl?.checked) this._advanceTimer = setTimeout(() => this._next(), 2000);
  }

  _renderScore() { this.scoreEl.textContent = `Solved ${this.solved} / ${this.attempts}`; }

  stop() {
    this.active = false;
    clearTimeout(this._advanceTimer);
    this.view.clear();
    if (this._group) { disposeGroup(this.scene, this._group); this._group = null; }
    this.panel.style.display = 'none';
    this.bar.style.display = 'none';
    this.footer.style.display = 'none';
    this.onClose?.();
  }

  update() { if (this.active) this.view.update(); }
}
