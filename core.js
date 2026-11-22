(function () {
  'use strict';
  const C = window.TZ_CONFIG || {};
  const sb = (C.SUPABASE_URL && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const TZ = window.TZ = { sb, state: { session: null, profile: null, members: [] }, routes: {}, ACT: {}, FORMS: {}, cache: {} };

  TZ.$ = (s, r = document) => r.querySelector(s);
  TZ.esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TZ.fmt = (d) => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  TZ.RES = { pending: 'Réservation en attente', payment_pending: 'Paiement en attente', confirmed: 'Participant confirmé', cancelled: 'Réservation annulée', expired: 'Réservation expirée', waitlist: "Liste d'attente" };
  TZ.COMP = { draft: 'Brouillon', submitted: 'Soumis', in_review: 'En vérification', changes_requested: 'Modifications demandées', approved: 'Approuvé', rejected: 'Refusé', published: 'Publié', archived: 'Archivé' };
  TZ.DEMO = '<span class="badge gold">DONNÉES DE DÉMONSTRATION</span>';
  TZ.NOSB = '<div class="warn">Supabase n\'est pas configuré (voir js/config.js). Cette fonction est désactivée.</div>';
  TZ.isAdmin = () => ['admin', 'super_admin'].includes(TZ.state.profile?.role);
  TZ.go = (h) => { location.hash = h; };
  TZ.view = (h) => { TZ.$('#app').innerHTML = h; window.scrollTo(0, 0); };
  TZ.toast = (m, bad) => { const t = TZ.$('#toast'); t.textContent = m; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(TZ._t); TZ._t = setTimeout(() => { t.hidden = true; }, 4000); };
  TZ.q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
  TZ.rpc = (n, a) => TZ.q(sb.rpc(n, a));
  TZ.run = async (fn, ok) => { try { await fn(); if (ok) TZ.toast(ok); await TZ.route(); } catch (e) { TZ.toast(e.message || String(e), true); } };
  TZ.cd = (d) => { const ms = new Date(d) - Date.now(); if (ms < 0) return 'Terminée ou en cours'; return `Dans ${Math.floor(ms / 864e5)} j ${Math.floor(ms % 864e5 / 36e5)} h`; };
  TZ.code = (id) => 'TZ-' + String(id).slice(0, 6).toUpperCase();
  TZ.tabs = (base, list, cur) => '<div class="tabs">' + list.map(([k, l]) => `<a href="#/${base}/${k}" class="${k === cur ? 'on' : ''}">${l}</a>`).join('') + '</div>';
  TZ.csv = (name, rows) => {
    const body = rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + body], { type: 'text/csv' })); a.download = name; a.click();
  };
  TZ.upload = async (bucket, file) => {
    const path = `${TZ.state.session.user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) throw error; return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };
  TZ.poster = (u) => `<div class="poster">${u ? `<img src="${TZ.esc(u)}" alt="Affiche" loading="lazy">` : 'Emplacement affiche'}</div>`;

  // --- Auth / profil ---
  TZ.loadProfile = async () => {
    const s = TZ.state;
    if (!sb || !s.session) { s.profile = null; s.members = []; return; }
    s.profile = (await sb.from('profiles').select('*').eq('id', s.session.user.id).maybeSingle()).data;
    s.members = (await sb.from('partner_members').select('*, partners(*)').eq('user_id', s.session.user.id)).data || [];
  };
  TZ.renderNav = async () => {
    const { session, profile, members } = TZ.state; const box = TZ.$('#authbox');
    if (!session) { box.innerHTML = '<a class="btn" href="#/login">Se connecter</a><a class="btn primary" href="#/register">Créer un compte</a>'; return; }
    let n = 0;
    try { n = (await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false)).count || 0; } catch (e) { /* ignore */ }
    const space = TZ.isAdmin() ? ['#/admin', 'Administration'] : members.length ? ['#/partner', 'Espace partenaire'] : ['#/me', 'Mon espace'];
    box.innerHTML = `<a class="btn" href="${space[0]}">${space[1]}${n ? ` <span class="badge cy">${n}</span>` : ''}</a>` + (TZ.isAdmin() || members.length ? '<a class="btn" href="#/me">Profil</a>' : '') + '<button class="btn" data-act="logout">Déconnexion</button>';
  };

  // --- Routeur ---
  TZ.route = async () => {
    const [name, ...args] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent);
    TZ.$('#nav').classList.remove('open');
    document.querySelectorAll('#nav > a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#/' + name));
    const f = TZ.routes[name || ''];
    if (!f) return TZ.view('<p class="center">Page introuvable.</p>');
    TZ.view('<p class="center muted">Chargement…</p>');
    try { await f(...args); } catch (e) { console.error(e); TZ.view(`<p class="err">Erreur : ${TZ.esc(e.message)}</p>`); }
  };
  addEventListener('hashchange', TZ.route);

  document.addEventListener('click', (e) => { const el = e.target.closest('[data-act]'); if (el && TZ.ACT[el.dataset.act]) { e.preventDefault(); TZ.ACT[el.dataset.act](el.dataset, el); } });
  document.addEventListener('submit', (e) => { const f = e.target.closest('form[data-form]'); if (f && TZ.FORMS[f.dataset.form]) { e.preventDefault(); TZ.FORMS[f.dataset.form](f, new FormData(f)); } });

  TZ.ACT.logout = async () => { await sb.auth.signOut(); };
  TZ.ACT.share = async (d) => {
    const url = location.href.split('#')[0] + '#/competition/' + d.id;
    if (navigator.share) try { await navigator.share({ title: d.name, url }); return; } catch (e) { return; }
    await navigator.clipboard?.writeText(url); TZ.toast('Lien copié');
  };
  TZ.ACT.ics = (d) => {
    const c = TZ.cache[d.id]; if (!c) return;
    const f = (x) => new Date(x).toISOString().replace(/[-:]|\.\d{3}/g, '');
    const end = new Date(new Date(c.starts_at).getTime() + 3 * 36e5);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TAMZORYA GAMING//FR', 'BEGIN:VEVENT', 'UID:' + c.id + '@tamzorya', 'DTSTAMP:' + f(Date.now()), 'DTSTART:' + f(c.starts_at), 'DTEND:' + f(end),
      'SUMMARY:' + c.name, 'LOCATION:' + (c.venue_name || '') + ' ' + (c.city || ''), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = c.name + '.ics'; a.click();
  };
  TZ.ACT.exportCsv = (d) => { const r = TZ.cache['roster:' + d.id] || []; TZ.csv('participants.csv', [['Réservation', 'Joueur', 'Tag', 'Téléphone', 'Statut', 'Montant payé'], ...r.map((x) => [TZ.code(x.reservation_id), x.display_name, x.gamer_tag, x.phone, TZ.RES[x.status], x.paid_amount])]); };

  // Documents à (ré)accepter : retourne la liste des documents dont une nouvelle version exige une acceptation
  TZ.pendingLegal = async () => {
    if (!sb || !TZ.state.session) return [];
    const vs = await TZ.q(sb.from('legal_document_versions').select('slug,version,requires_reacceptance').not('published_at', 'is', null).eq('requires_reacceptance', true));
    const acc = await TZ.q(sb.from('user_legal_acceptances').select('document_type,document_version').eq('user_id', TZ.state.session.user.id));
    const need = {}; vs.forEach((v) => { need[v.slug] = Math.max(need[v.slug] || 0, v.version); });
    return Object.entries(need).filter(([slug, v]) => Math.max(0, ...acc.filter((a) => a.document_type === slug).map((a) => a.document_version)) < v).map(([slug, version]) => ({ slug, version }));
  };
  TZ.ACT.acceptLegal = (d) => TZ.run(() => TZ.rpc('accept_legal', { p_type: d.slug, p_version: +d.version, p_context: 'reacceptance' }), 'Acceptation enregistrée');

  addEventListener('online', () => { TZ.$('#offline').hidden = true; });
  addEventListener('offline', () => { TZ.$('#offline').hidden = false; });
})();
