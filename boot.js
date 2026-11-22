(function () {
  'use strict';
  const { sb, state } = TZ;
  TZ.$('#burger').addEventListener('click', () => TZ.$('#nav').classList.toggle('open'));
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
