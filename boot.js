(function () {
  'use strict';
  const { sb, state } = TZ;
  const closeMenu = () => { TZ.$('#drawer').hidden = true; TZ.$('#burger').textContent = '☰'; };
  TZ.$('#burger').addEventListener('click', () => { const d = TZ.$('#drawer'); d.hidden = !d.hidden; TZ.$('#burger').textContent = d.hidden ? '☰' : '✕'; });
  TZ.$('#drawer').addEventListener('click', (e) => { if (e.target.closest('a')) closeMenu(); });
  let ip = null;
  addEventListener('beforeinstallprompt', (e) => { e.preventDefault(); ip = e; TZ.$('#install').hidden = false; });
  TZ.$('#install').addEventListener('click', async () => { if (ip) { await ip.prompt(); ip = null; TZ.$('#install').hidden = true; } });
  if (!navigator.onLine) TZ.$('#offline').hidden = false;
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

  (async function init() {
    if (sb) {
      state.session = (await sb.auth.getSession()).data.session; await TZ.loadProfile();
      sb.auth.onAuthStateChange(async (ev, s) => {
        state.session = s; await TZ.loadProfile(); await TZ.renderNav();
        if (ev === 'PASSWORD_RECOVERY') TZ.go('#/reset'); else if (ev === 'SIGNED_OUT') TZ.go('#/');
      });
    }
    await TZ.renderNav(); TZ.route();
  })();
})();
