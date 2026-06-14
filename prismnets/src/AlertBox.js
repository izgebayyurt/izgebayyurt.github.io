const KEY_PREFIX = 'pn_alert_';

// Always show (ignores the "don't show again" flag) — used by the reopenable Help button.
export function forceAlert(title, body, onOk) {
  return showAlert(null, title, body, onOk);
}

export function showAlert(key, title, body, onOk) {
  if (key && localStorage.getItem(KEY_PREFIX + key) === '1') {
    onOk?.();
    return;
  }

  const overlay = document.getElementById('alert-overlay');
  // Hide the "don't show again" control when there's no key to remember.
  document.querySelector('.alert-dismiss-label').style.display = key ? '' : 'none';
  document.getElementById('alert-title').textContent = title;
  document.getElementById('alert-body').textContent = body;
  document.getElementById('alert-dismiss').checked = false;
  overlay.style.display = 'flex';

  function handleOk() {
    if (document.getElementById('alert-dismiss').checked) {
      localStorage.setItem(KEY_PREFIX + key, '1');
    }
    overlay.style.display = 'none';
    document.getElementById('alert-ok').removeEventListener('click', handleOk);
    onOk?.();
  }
  document.getElementById('alert-ok').addEventListener('click', handleOk);
}
