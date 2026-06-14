// Searchable, grouped solid picker. Replaces the tiny dropdown — there are 120+
// solids (Platonic, Archimedean, prisms, antiprisms, 92 Johnson). Selecting one
// reloads the page with ?solid=<id>.

export function setupSolidPicker(catalog, currentId) {
  const btn = document.getElementById('solid-btn');
  const overlay = document.getElementById('solid-overlay');
  const list = document.getElementById('solid-list');
  const search = document.getElementById('solid-search');
  const closeBtn = document.getElementById('solid-close');
  if (!btn || !overlay || !list) return;

  // Flatten for lookup + label the current selection on the button.
  const all = catalog.flatMap((c) => c.solids.map((s) => ({ ...s, group: c.label })));
  const current = all.find((s) => s.id === currentId);
  btn.textContent = (current ? current.display : 'Cube') + '  ▾';

  function choose(id) {
    const params = new URLSearchParams(location.search);
    params.set('solid', id);
    location.search = params.toString();
  }

  // Build the grouped list once; search toggles row visibility.
  const rows = [];
  for (const cat of catalog) {
    const header = document.createElement('div');
    header.className = 'solid-group';
    header.textContent = cat.label;
    list.appendChild(header);

    for (const s of cat.solids) {
      const row = document.createElement('button');
      row.className = 'solid-row' + (s.id === currentId ? ' current' : '');
      // Net Hunt is offered for solids with a small, precomputed net count (≤ 30);
      // the very small ones (≤ 11 nets) make the gentlest first hunts.
      const huntable = s.netCount != null && s.netCount <= 30;
      const starter = huntable && s.netCount <= 11;
      row.dataset.search = `${s.display} ${s.j || ''} ${cat.label}${huntable ? ' nethunt' : ''}${starter ? ' starter good first hunt' : ''}`.toLowerCase();
      const meta = [s.j, s.faces != null ? `${s.faces} faces` : null,
        starter ? `★ ${s.netCount} nets` : huntable ? `🧩 ${s.netCount} nets` : null].filter(Boolean).join(' · ');
      row.innerHTML = `<span class="solid-name">${s.display}</span><span class="solid-meta">${meta}</span>`;
      row.addEventListener('click', () => choose(s.id));
      list.appendChild(row);
      rows.push({ row, header, key: row.dataset.search });
    }
  }

  function applyFilter(q) {
    const needle = q.trim().toLowerCase();
    const headerHasVisible = new Map();
    for (const { row, header, key } of rows) {
      const show = !needle || key.includes(needle);
      row.style.display = show ? '' : 'none';
      if (show) headerHasVisible.set(header, true);
    }
    // Hide group headers with no visible rows.
    for (const cat of list.querySelectorAll('.solid-group')) {
      cat.style.display = headerHasVisible.get(cat) ? '' : 'none';
    }
  }

  function open() {
    overlay.style.display = 'flex';
    search.value = '';
    applyFilter('');
    search.focus();
    const cur = list.querySelector('.solid-row.current');
    if (cur) cur.scrollIntoView({ block: 'center' });
  }
  function close() { overlay.style.display = 'none'; }

  btn.addEventListener('click', open);
  closeBtn?.addEventListener('click', close);
  overlay.addEventListener('click', (e) => { if (e.target === overlay) close(); });
  search.addEventListener('input', () => applyFilter(search.value));
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape') close(); });
}
