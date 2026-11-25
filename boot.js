(function () {
  'use strict';
  const { sb, state, LS, ACT } = TZ;
  if ('serviceWorker' in navigator && location.protocol !== 'file:') navigator.serviceWorker.register('sw.js').catch(() => {});

  // Bandeau hors-ligne : uniquement si un vrai test de connexion échoue
  const bar = TZ.$('#offline');
  const probe = async () => {
    try { const c = new AbortController(), t = setTimeout(() => c.abort(), 5000); await fetch('manifest.webmanifest?probe=' + Date.now(), { cache: 'no-store', signal: c.signal }); clearTimeout(t); return true; } catch (e) { return false; }
  };
  const check = async () => { bar.hidden = await probe(); };
  addEventListener('offline', check); addEventListener('online', () => { bar.hidden = true; });
  if (!navigator.onLine) check();

  // Fenêtre d'accueil pour les nouveaux visiteurs
  ACT.closeSheet = (d, el) => {
    LS.set('tz_welcome', String(Date.now())); TZ.$('#sheet').hidden = true;
    const h = el && el.getAttribute && el.getAttribute('href'); if (h) TZ.go(h);
  };
  TZ.$('#sheet').addEventListener('click', (e) => { if (e.target.id === 'sheet') ACT.closeSheet(); });
  const welcome = () => {
    if (state.session || Date.now() - (+LS.get('tz_welcome') || 0) < 3 * 864e5) return;
    if (['login', 'register', 'join', 'legal', 'reset', 'partner-request'].includes(location.hash.split('/')[1])) return;
    const s = TZ.$('#sheet');
    s.innerHTML = `<div class="sheet-in"><div class="center"><img src="logo-icon.png" width="64" height="64" alt="" style="border-radius:16px"><h2>Bienvenue 👋</h2></div>
      <a class="btn primary xl block" href="#/login" data-act="closeSheet">🔑 Se connecter</a><a class="btn xl block" href="#/register" data-act="closeSheet">✨ S'inscrire</a>
      <a class="btn block" href="#/competitions" data-act="closeSheet" style="border-style:dashed">🎮 Voir les tournois</a></div>`;
    s.hidden = false;
  };

  (async function init() {
    if (sb) {
      state.session = (await sb.auth.getSession()).data.session; await TZ.loadProfile(); await TZ.loadFeatures();
      sb.auth.onAuthStateChange((ev, s) => setTimeout(async () => {
        const was = !!state.session; state.session = s; await TZ.loadProfile(); await TZ.loadFeatures(); await TZ.renderNav();
        if (ev === 'PASSWORD_RECOVERY') TZ.go('#/reset');
        else if (ev === 'SIGNED_OUT') { TZ.go('#/'); TZ.route(); }
        else if (ev === 'SIGNED_IN' && !was) TZ.route();
      }, 0));
    }
    await TZ.renderNav(); await TZ.route(); setTimeout(welcome, 700);
  })();
})();
