(function () {
  'use strict';
  const C = window.TZ_CONFIG || {};
  const sb = (C.SUPABASE_URL && window.supabase) ? window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY) : null;
  const TZ = window.TZ = { sb, state: { session: null, profile: null, members: [] }, routes: {}, ACT: {}, FORMS: {}, cache: {} };
  const LS = TZ.LS = {
    get: (k) => { try { return localStorage.getItem(k); } catch (e) { return null; } },
    set: (k, v) => { try { localStorage.setItem(k, v); } catch (e) { /* ignore */ } },
    del: (k) => { try { localStorage.removeItem(k); } catch (e) { /* ignore */ } },
  };

  TZ.$ = (s, r = document) => r.querySelector(s);
  TZ.esc = (v) => String(v ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
  TZ.fmt = (d) => d ? new Date(d).toLocaleString('fr-FR', { dateStyle: 'medium', timeStyle: 'short' }) : '—';
  TZ.RES = { pending: 'En attente', payment_pending: 'Paiement en attente', confirmed: 'Confirmé', cancelled: 'Annulée', expired: 'Expirée', waitlist: "Liste d'attente" };
  TZ.COMP = { draft: 'Brouillon', submitted: 'Soumis', in_review: 'En vérification', changes_requested: 'Modifications demandées', approved: 'Approuvé', rejected: 'Refusé', published: 'Publié', archived: 'Archivé' };
  TZ.ROLE = { player: 'Joueur', partner: 'Partenaire', venue_manager: 'Responsable de salle', admin: 'Administrateur', super_admin: 'Super administrateur' };
  TZ.PSTAT = { active: 'Actif', pending: 'En attente', suspended: 'Suspendu' };
  TZ.MSTAT = { scheduled: 'Programmé', live: 'En cours', finished: 'Terminé', cancelled: 'Annulé' };
  TZ.QSTAT = { qualified: 'Qualifié', invited: 'Invité', declined: 'Décliné', replaced: 'Remplacé' };
  TZ.ACTION = { INSERT: 'Création', UPDATE: 'Modification', DELETE: 'Suppression' };
  TZ.DEMO = '';
  TZ.NOSB = '<p class="center muted">Service momentanément indisponible.</p>';
  TZ.isAdmin = () => ['admin', 'super_admin'].includes(TZ.state.profile?.role);
  TZ.mode = () => !TZ.state.session ? 'public' : TZ.isAdmin() ? 'admin' : TZ.state.members.length ? 'partner' : 'public';
  TZ.go = (h) => { location.hash = h; };
  TZ.view = (h) => { TZ.$('#app').innerHTML = h; window.scrollTo(0, 0); };
  TZ.toast = (m, bad) => { const t = TZ.$('#toast'); t.textContent = m; t.className = 'toast' + (bad ? ' bad' : ''); t.hidden = false; clearTimeout(TZ._t); TZ._t = setTimeout(() => { t.hidden = true; }, 3500); };
  TZ.errMsg = (e) => {
    const m = String((e && e.message) || e || '');
    if (/Failed to fetch|NetworkError|Load failed/i.test(m)) return 'Connexion impossible. Réessaie.';
    if (/row-level security|permission denied/i.test(m)) return 'Action non autorisée.';
    if (/duplicate key|already exists/i.test(m)) return 'Déjà enregistré.';
    if (/Invalid login/i.test(m)) return 'E-mail ou mot de passe incorrect.';
    if (/already registered/i.test(m)) return 'Cet e-mail a déjà un compte.';
    if (/not confirmed/i.test(m)) return "Confirme d'abord ton e-mail.";
    if (/rate limit|too many/i.test(m)) return 'Trop de tentatives, patiente un instant.';
    return m || 'Une erreur est survenue.';
  };
  TZ.q = async (p) => { const { data, error } = await p; if (error) throw error; return data; };
  TZ.rpc = (n, a) => TZ.q(sb.rpc(n, a));
  TZ.run = async (fn, ok) => { try { await fn(); if (ok) TZ.toast(ok); await TZ.route(); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };
  TZ.cd = (d) => { const ms = new Date(d) - Date.now(); if (ms < 0) return 'En cours / terminé'; return `Dans ${Math.floor(ms / 864e5)} j ${Math.floor(ms % 864e5 / 36e5)} h`; };
  TZ.code = (id) => 'TZ-' + String(id).slice(0, 6).toUpperCase();
  TZ.tabs = (base, list, cur) => '<div class="tabs">' + list.map(([k, l]) => `<a href="#/${base}/${k}" class="${k === cur ? 'on' : ''}">${l}</a>`).join('') + '</div>';
  TZ.shell = (base, items, cur, body) => `<div class="shell"><aside class="side">${items.map(([k, ico, label, n]) => `<a href="#/${base}/${k}" class="${k === cur ? 'on' : ''}"><span class="i">${ico}</span><span>${label}</span>${n ? `<span class="badge cy cnt">${n}</span>` : ''}</a>`).join('')}</aside><section class="main">${body}</section></div>`;
  TZ.poster = (u) => `<div class="poster">${u ? `<img src="${TZ.esc(u)}" alt="" loading="lazy">` : '<img class="ph" src="logo-icon.png" alt="">'}</div>`;
  TZ.csv = (name, rows) => {
    const body = rows.map((r) => r.map((v) => '"' + String(v ?? '').replace(/"/g, '""') + '"').join(',')).join('\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob(['\ufeff' + body], { type: 'text/csv' })); a.download = name; a.click();
  };
  TZ.upload = async (bucket, file) => {
    const path = `${TZ.state.session.user.id}/${Date.now()}-${file.name.replace(/[^\w.-]/g, '_')}`;
    const { error } = await sb.storage.from(bucket).upload(path, file, { contentType: file.type });
    if (error) throw error; return sb.storage.from(bucket).getPublicUrl(path).data.publicUrl;
  };
  TZ.baseUrl = () => location.href.split('#')[0];
  TZ.loadScript = (src) => new Promise((ok, ko) => { if (document.querySelector('script[src="' + src + '"]')) return ok(); const s = document.createElement('script'); s.src = src; s.onload = ok; s.onerror = ko; document.head.appendChild(s); });
  TZ.qr = async (el, text) => {
    try { if (!window.qrcode) await TZ.loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'); } catch (e) { /* repli */ }
    if (!window.qrcode) { el.innerHTML = '<p class="code" style="color:#000">' + TZ.esc(text.slice(3, 9).toUpperCase()) + '</p>'; return; }
    const qr = window.qrcode(0, 'M'); qr.addData(text); qr.make(); const n = qr.getModuleCount(), m = 2; let d = '';
    for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) d += 'M' + (c + m) + ',' + (r + m) + 'h1v1h-1z';
    el.innerHTML = '<svg viewBox="0 0 ' + (n + 2 * m) + ' ' + (n + 2 * m) + '" shape-rendering="crispEdges"><path d="' + d + '"/></svg>';
  };
  TZ.shareSheet = (url, text) => {
    const u = encodeURIComponent(url), t = encodeURIComponent(text + ' ' + url), s = TZ.$('#sheet'); TZ.shareData = { url, text };
    s.innerHTML = `<div class="sheet-in"><h2 class="center">📣 Partager</h2>
      <a class="btn xl block wa" target="_blank" rel="noopener" href="https://wa.me/?text=${t}">💬 WhatsApp</a>
      <a class="btn xl block fb" target="_blank" rel="noopener" href="https://www.facebook.com/sharer/sharer.php?u=${u}">📘 Facebook</a>
      <button class="btn xl block tk" data-act="shareTiktok">🎵 TikTok</button><button class="btn block" data-act="shareCopy">🔗 Copier le lien</button>
      ${navigator.share ? '<button class="btn block" data-act="shareNative">⋯ Autres applis</button>' : ''}<button class="btn block" data-act="sheetClose">Fermer</button></div>`;
    s.hidden = false;
  };
  TZ.copy = async (t) => { try { await navigator.clipboard.writeText(t); TZ.toast('Lien copié ✅'); } catch (e) { prompt('Copie le lien :', t); } };

  // --- Partage / parrainage ---
  TZ.visitor = () => { let v = LS.get('tz_vk'); if (!v) { v = (window.crypto && crypto.randomUUID) ? crypto.randomUUID() : String(Math.random()).slice(2) + Date.now(); LS.set('tz_vk', v); } return v; };
  TZ.refCode = () => (TZ.state.profile && TZ.state.profile.referral_code) || '';
  TZ.getRef = () => { try { const r = JSON.parse(LS.get('tz_ref') || 'null'); return r && Date.now() - r.at < 30 * 864e5 ? r : null; } catch (e) { return null; } };
  TZ.joinLink = (cid, withRef = true) => location.href.split('#')[0] + '#/join/' + (cid || '-') + (withRef && TZ.refCode() ? '/' + TZ.refCode() : '');

  // --- Session ---
  TZ.loadProfile = async () => {
    const s = TZ.state;
    if (!sb || !s.session) { s.profile = null; s.members = []; return; }
    s.profile = (await sb.from('profiles').select('*').eq('id', s.session.user.id).maybeSingle()).data;
    s.members = (await sb.from('partner_members').select('*, partners(*)').eq('user_id', s.session.user.id)).data || [];
  };
  TZ.renderNav = async () => {
    const { session, profile } = TZ.state, mode = TZ.mode(); document.body.dataset.mode = mode;
    const box = TZ.$('#authbox'), tab = TZ.$('#tabAccount'), tag = TZ.$('#modeTag');
    tag.hidden = mode === 'public'; tag.textContent = mode === 'admin' ? 'ADMIN' : 'PARTENAIRE';
    if (!session) {
      box.innerHTML = '<a class="btn" href="#/login">Connexion</a><a class="btn primary hide-xs" href="#/register">Rejoindre</a>';
      tab.setAttribute('href', '#/login'); tab.innerHTML = '<span>🔑</span>Connexion'; return;
    }
    tab.setAttribute('href', '#/me'); tab.innerHTML = '<span>👤</span>Compte';
    let n = 0;
    if (mode === 'public') { try { n = (await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false)).count || 0; } catch (e) { /* ignore */ } }
    box.innerHTML = mode === 'public'
      ? `<a class="btn" href="#/me">👤<span class="lbl"> Mon espace</span>${n ? ` <span class="badge cy">${n}</span>` : ''}</a><button class="btn" data-act="logout" aria-label="Déconnexion">⏻</button>`
      : `<span class="muted small lbl">${TZ.esc(profile ? profile.display_name : '')}</span><button class="btn" data-act="logout">⏻<span class="lbl"> Quitter</span></button>`;
  };
  TZ.afterLogin = async () => {
    await TZ.loadProfile(); await TZ.renderNav(); const mode = TZ.mode(), next = LS.get('tz_next'); LS.del('tz_next');
    TZ.go(mode === 'public' ? (next || '#/') : '#/' + mode); TZ.route();
  };

  // --- Routeur : chaque rôle a son propre espace ---
  TZ.route = async () => {
    const [name, ...args] = location.hash.replace(/^#\/?/, '').split('/').map(decodeURIComponent), mode = TZ.mode();
    const open = { admin: ['admin', 'legal', 'reset'], partner: ['partner', 'legal', 'reset'] }[mode];
    if (open && !open.includes(name)) return TZ.go('#/' + mode);
    if (TZ.cleanup) { TZ.cleanup(); TZ.cleanup = null; }
    document.body.dataset.mode = mode;
    document.querySelectorAll('#nav > a, #tabbar a').forEach((a) => a.classList.toggle('on', a.getAttribute('href') === '#/' + name));
    const f = TZ.routes[name || ''];
    if (!f) return TZ.view('<div class="card center">Page introuvable 🤷<br><a class="btn primary" href="#/" style="margin-top:12px">Accueil</a></div>');
    TZ.view('<p class="center muted">…</p>');
    try { await f(...args); } catch (e) { console.error(e); TZ.view(`<p class="center err">${TZ.esc(TZ.errMsg(e))}</p>`); }
  };
  addEventListener('hashchange', TZ.route);

  document.addEventListener('click', (e) => { const el = e.target.closest('[data-act]'); if (el && TZ.ACT[el.dataset.act]) { e.preventDefault(); TZ.ACT[el.dataset.act](el.dataset, el); } });
  document.addEventListener('submit', (e) => { const f = e.target.closest('form[data-form]'); if (f && TZ.FORMS[f.dataset.form]) { e.preventDefault(); TZ.FORMS[f.dataset.form](f, new FormData(f)); } });

  TZ.ACT.logout = async () => { await sb.auth.signOut(); };
  TZ.ACT.share = (d) => TZ.shareSheet(TZ.joinLink(d.id), d.name ? `🎮 ${d.name} — rejoins-moi sur TAMZORYA GAMING !` : '🎮 Rejoins-moi sur TAMZORYA GAMING !');
  TZ.ACT.sheetClose = () => { TZ.$('#sheet').hidden = true; };
  TZ.ACT.shareCopy = () => TZ.copy(TZ.shareData.url);
  TZ.ACT.shareTiktok = () => { TZ.copy(TZ.shareData.url); window.open('https://www.tiktok.com/', '_blank'); TZ.toast('Lien copié : colle-le dans ta bio ou ta vidéo TikTok 🎵'); };
  TZ.ACT.shareNative = async () => { try { await navigator.share({ title: 'TAMZORYA GAMING', text: TZ.shareData.text, url: TZ.shareData.url }); } catch (e) { /* annulé */ } };
  TZ.ACT.copyLink = (d) => TZ.copy(TZ.joinLink(d.id, d.ref !== '0'));
  TZ.ACT.ics = (d) => {
    const c = TZ.cache[d.id]; if (!c) return;
    const f = (x) => new Date(x).toISOString().replace(/[-:]|\.\d{3}/g, ''), end = new Date(new Date(c.starts_at).getTime() + 3 * 36e5);
    const ics = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//TAMZORYA GAMING//FR', 'BEGIN:VEVENT', 'UID:' + c.id + '@tamzorya', 'DTSTAMP:' + f(Date.now()), 'DTSTART:' + f(c.starts_at), 'DTEND:' + f(end), 'SUMMARY:' + c.name, 'LOCATION:' + (c.venue_name || '') + ' ' + (c.city || ''), 'END:VEVENT', 'END:VCALENDAR'].join('\r\n');
    const a = document.createElement('a'); a.href = URL.createObjectURL(new Blob([ics], { type: 'text/calendar' })); a.download = c.name + '.ics'; a.click();
  };
  TZ.ACT.exportCsv = (d) => { const r = TZ.cache['roster:' + d.id] || []; TZ.csv('participants.csv', [['Réservation', 'Joueur', 'Tag', 'Téléphone', 'Statut', 'Montant payé'], ...r.map((x) => [TZ.code(x.reservation_id), x.display_name, x.gamer_tag, x.phone, TZ.RES[x.status], x.paid_amount])]); };

  TZ.pendingLegal = async () => {
    if (!sb || !TZ.state.session) return [];
    const vs = await TZ.q(sb.from('legal_document_versions').select('slug,version,requires_reacceptance').not('published_at', 'is', null).eq('requires_reacceptance', true));
    const acc = await TZ.q(sb.from('user_legal_acceptances').select('document_type,document_version').eq('user_id', TZ.state.session.user.id));
    const need = {}; vs.forEach((v) => { need[v.slug] = Math.max(need[v.slug] || 0, v.version); });
    return Object.entries(need).filter(([slug, v]) => Math.max(0, ...acc.filter((a) => a.document_type === slug).map((a) => a.document_version)) < v).map(([slug, version]) => ({ slug, version }));
  };
  TZ.ACT.acceptLegal = (d) => TZ.run(() => TZ.rpc('accept_legal', { p_type: d.slug, p_version: +d.version, p_context: 'reacceptance' }), 'Merci ✅');
})();
