/* Accueil public (présentation), tableau de bord après connexion, inscription / connexion par téléphone, récupération de compte. */
(function () {
  'use strict';
  const { sb, esc, state, routes, ACT, FORMS, q, view, LS } = TZ;
  const COUNTRIES = [['CD', 'RDC', '243'], ['CG', 'Congo-Brazzaville', '242'], ['RW', 'Rwanda', '250'], ['BI', 'Burundi', '257'], ['UG', 'Ouganda', '256'], ['KE', 'Kenya', '254'], ['TZ', 'Tanzanie', '255'], ['ZM', 'Zambie', '260'], ['AO', 'Angola', '244'],
    ['CM', 'Cameroun', '237'], ['CI', "Côte d'Ivoire", '225'], ['SN', 'Sénégal', '221'], ['NG', 'Nigeria', '234'], ['GH', 'Ghana', '233'], ['MA', 'Maroc', '212'], ['ZA', 'Afrique du Sud', '27'], ['FR', 'France', '33'], ['BE', 'Belgique', '32'], ['CA', 'Canada', '1'], ['US', 'États-Unis', '1']];
  const DIAL = Object.fromEntries(COUNTRIES.map(([c, , d]) => [c, d]));
  const opts = () => COUNTRIES.map(([c, n, d]) => `<option value="${c}">${esc(n)} +${d}</option>`).join('');
  const e164 = (iso, local) => { const dial = DIAL[iso] || '243'; let d = String(local || '').replace(/\D/g, ''); if (d.startsWith(dial) && d.length > dial.length + 6) d = d.slice(dial.length); d = d.replace(/^0+/, ''); return d.length >= 6 && d.length <= 12 ? '+' + dial + d : null; };
  const authEmail = (p) => p.replace('+', '') + '@phone.tamzorya.app';   // identifiant interne : aucun e-mail réel n'est nécessaire
  const clean = (c) => String(c || '').replace(/[\s-]/g, '').toUpperCase();
  const genCode = () => { const A = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789', b = new Uint8Array(12); crypto.getRandomValues(b); return [...b].map((x) => A[x % A.length]).join('').replace(/(.{4})(?=.)/g, '$1-'); };
  const BAD_MAIL = ['mailinator.com', 'yopmail.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'throwawaymail.com', 'fakeinbox.com'];
  const phoneRow = '<div class="row nowrap"><select name="iso" style="width:auto;max-width:48%">' + opts() + '</select><input name="phone" type="tel" inputmode="tel" placeholder="Numéro de téléphone" autocomplete="tel-national" required style="flex:1;min-width:0"></div>';

  // ---------- Accueil visiteur : une page simple qui explique tout ----------
  const landing = () => {
    document.body.dataset.landing = '1';
    view(`<section class="land"><img class="land-logo" src="logo.png" alt="TAMZORYA GAMING"><h1>TAMZORYA <span class="ok">GAMING</span></h1>
      <p class="slogan">La plateforme qui rassemble les gamers, organise les compétitions et valorise les talents du gaming.</p>
      <div class="cta"><a class="btn primary xl" href="#/register">Créer un compte</a><a class="btn xl" href="#/login">Se connecter</a></div>
      <div class="perks"><div><span>🏆</span><b>Tournois</b><small>Participe et gagne</small></div><div><span>⚔️</span><b>Défis</b><small>Affronte d'autres gamers</small></div><div><span>📈</span><b>Classement</b><small>Suis ta progression</small></div>
        <div><span>🏢</span><b>Salles</b><small>Découvre les salles partenaires</small></div><div><span>⭐</span><b>Réputation</b><small>Construis ton niveau</small></div></div></section>`);
  };

  // ---------- Tableau de bord après connexion ----------
  const dashboard = async () => {
    const me = state.session.user.id, p = state.profile || {}, name = p.gamer_tag || p.display_name || 'gamer';
    const [comps, top, parts] = await Promise.all([TZ.getComps().then((r) => r.items.filter((c) => new Date(c.starts_at) > Date.now() - 6 * 36e5)), sb.from('rankings_general').select('user_id,player,points').order('points', { ascending: false }).limit(200).then((r) => r.data || []),
      sb.from('partners').select('id,name,city').order('name').limit(3).then((r) => r.data || [])]);
    const idx = top.findIndex((r) => r.user_id === me), mine = idx >= 0 ? top[idx] : null;
    let rep = null; if (TZ.feat('reputation')) { try { rep = await TZ.rpc('gamer_reputation', { p_user: me }); } catch (e) { /* ignore */ } }
    let mm = []; if (TZ.feat('friendly')) { try { mm = await TZ.rpc('my_matches'); } catch (e) { /* ignore */ } }
    const inv = mm.filter((x) => x.kind === 'invite_in' && x.status === 'pending').length, conf = mm.filter((x) => x.needs_confirm).length, next = mm.filter((x) => x.kind === 'match' && ['scheduled', 'live'].includes(x.status)).sort((a, b) => new Date(a.at) - new Date(b.at))[0];
    const av = p.avatar_url ? `<img class="av big" src="${esc(p.avatar_url)}" alt="">` : `<span class="av big">${esc(name.slice(0, 1).toUpperCase())}</span>`;
    const more = [['feed', '#/feed', '🔥', 'Communauté'], ['road', '#/road', '👑', 'Grand Tournoi'], ['card', '#/card', '🪪', 'Ma carte gamer', 'gamer_card'],
      ['search', '#/search', '🔎', 'Recherche', 'search'], ['ch', '#/challenges', '🎯', 'Défis', 'challenges'], ['partner', '#/partner-request', '🏢', 'Devenir partenaire']].filter((x) => !x[4] || TZ.feat(x[4]));
    view(`<section class="dash"><a class="card dwelcome" href="#/me">${av}<div class="dtxt"><small class="muted">Bienvenue</small><h2>${esc(name)}</h2>
        <small class="ok">${rep ? esc(rep.level_icon) + ' ' + esc(rep.level) + ' • ' + rep.xp + ' XP' : mine ? '#' + (idx + 1) + ' • ' + mine.points + ' pts' : 'Prêt pour ton premier tournoi ?'}</small></div><span class="muted">›</span></a>
      <div class="cta2"><a class="btn primary xl" href="#/competitions">🎮 Rejoindre un tournoi</a>${TZ.feat('friendly') ? '<button class="btn xl" data-act="duel">⚔️ Défier</button>' : ''}</div>
      ${TZ.feat('friendly') && (inv || conf || next) ? `<a class="card glow dalert" href="#/matches">${conf ? `<div>⏳ <b>${conf}</b> résultat${conf > 1 ? 's' : ''} à confirmer</div>` : ''}${inv ? `<div>⚔️ <b>${inv}</b> invitation${inv > 1 ? 's' : ''} reçue${inv > 1 ? 's' : ''}</div>` : ''}${next ? `<div>📅 Prochain match : <b>${esc(next.opp_name)}</b> • ${TZ.fmt(next.at)}</div>` : ''}</a>` : ''}
      <div class="sec"><h2>🎮 Tournois disponibles</h2><a href="#/competitions">Tout voir ›</a></div>${comps.length ? `<div class="hscroll">${comps.slice(0, 4).map((c) => TZ.compCard(c)).join('')}</div>` : '<div class="card center muted">Les prochains tournois arrivent bientôt</div>'}
      <div class="sec"><h2>📈 Mes performances</h2><a href="#/rankings">Classement ›</a></div>
      <div class="tiles"><div class="tile"><b>${mine ? mine.points : 0}</b><span>Points</span></div><div class="tile"><b>${mine ? '#' + (idx + 1) : '—'}</b><span>Rang</span></div>${rep ? `<div class="tile"><b>${rep.wins}-${rep.losses}</b><span>V - D</span></div>` : ''}</div>
      ${top.length ? `<div class="sec"><h2>🏆 Top 3</h2></div><div class="podium">${[1, 0, 2].map((i) => top[i] ? `<div class="p${i + 1}"><b>${['🥇', '🥈', '🥉'][i]}</b>${esc(top[i].player)}<div class="muted small">${top[i].points} pts</div></div>` : '<div></div>').join('')}</div>` : ''}
      ${parts.length ? `<div class="sec"><h2>🏢 Salles partenaires</h2><a href="#/partners">Voir ›</a></div>${parts.map((s) => `<a class="conv" href="#/partners"><div class="cmid"><b>${esc(s.name)}</b><small>${esc(s.city || '')}</small></div></a>`).join('')}` : ''}
      <details class="card more"><summary>➕ Plus de fonctionnalités</summary><div class="uni">${more.map((x) => `<a class="uni-i" href="${x[1]}"><span>${x[2]}</span>${x[3]}</a>`).join('')}</div></details></section>`);
  };
  const feedHome = routes[''], socialFeed = routes.feed;
  routes[''] = async () => (state.session ? dashboard() : landing());
  routes.feed = (tab, arg) => (!tab || tab === 'all') ? feedHome() : socialFeed(tab, arg);

  // ---------- Connexion ----------
  routes.login = () => view(`<div class="narrow"><h1>🔑 Connexion</h1>${sb ? '' : TZ.NOSB}<div class="seg"><button type="button" class="on" data-act="lmode" data-m="phone">📱 Téléphone</button><button type="button" data-act="lmode" data-m="email">✉️ E-mail</button></div>
    <form class="card" data-form="login" data-mode="phone"><div id="lph">${phoneRow}</div><input id="lem" name="email" type="email" placeholder="E-mail" autocomplete="email" hidden><input name="password" type="password" required placeholder="Mot de passe" autocomplete="current-password">
    <button class="btn primary xl block">Se connecter</button><p class="center"><a href="#/recover">Mot de passe oublié ?</a></p></form><p class="muted center">Pas encore de compte ? <a href="#/register">Créer un compte</a></p></div>`);
  ACT.lmode = (d, el) => {
    const f = TZ.$('form[data-form=login]'); if (!f) return; f.dataset.mode = d.m;
    TZ.$('#lph').hidden = d.m !== 'phone'; TZ.$('#lem').hidden = d.m !== 'email';
    const ph = f.querySelector('[name=phone]'), em = TZ.$('#lem'); if (ph) ph.required = d.m === 'phone'; if (em) em.required = d.m === 'email';
    document.querySelectorAll('.seg button').forEach((b) => b.classList.toggle('on', b.dataset.m === d.m));
  };
  FORMS.login = (f, d) => TZ.run(async () => {
    const mode = f.dataset.mode || 'phone'; let email;
    if (mode === 'email') email = String(d.get('email')).trim().toLowerCase();
    else { const p = e164(d.get('iso'), d.get('phone')); if (!p) throw new Error('Numéro de téléphone invalide'); email = authEmail(p); }
    const { error } = await sb.auth.signInWithPassword({ email, password: d.get('password') });
    if (error) throw new Error(mode === 'phone' ? 'Numéro ou mot de passe incorrect' : TZ.errMsg(error));
    await TZ.afterLogin();
  });

  // ---------- Inscription : le téléphone d'abord, l'e-mail est facultatif ----------
  routes.register = () => {
    const invited = TZ.getRef(), next = LS.get('tz_next') || ''; TZ._t0 = Date.now();
    view(`<div class="narrow"><h1>✨ Créer un compte</h1>${invited ? '<p class="ok center">Tu as été invité(e) 🎉</p>' : ''}${next.startsWith('#/competition/') ? '<p class="ok center">🎟️ Crée ton compte pour réserver ta place</p>' : ''}${sb ? '' : TZ.NOSB}
    <form class="card" data-form="register">${phoneRow}<input name="pseudo" required minlength="3" maxlength="24" placeholder="Pseudonyme" autocomplete="nickname"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true">
    <input name="password" type="password" minlength="8" required placeholder="Mot de passe (8 caractères minimum)" autocomplete="new-password"><input name="password2" type="password" minlength="8" required placeholder="Confirmer le mot de passe" autocomplete="new-password">
    <input name="email" type="email" placeholder="E-mail (facultatif)" autocomplete="email">
    <label class="chk"><input type="checkbox" name="terms"><span>En créant mon compte, je reconnais avoir lu et j’accepte le <a href="#/legal/reglement-general" target="_blank">Règlement général</a> et les <a href="#/legal/conditions-utilisation" target="_blank">Conditions d’utilisation</a> de TAMZORYA GAMING ainsi que sa <a href="#/legal/confidentialite" target="_blank">Politique de confidentialité</a>.</span></label>
    <label class="chk muted"><input type="checkbox" name="marketing"><span>(Facultatif) Recevoir les actus et promos</span></label><div id="cf"></div><p id="rerr" class="err small"></p><button class="btn primary xl block">Créer mon compte</button></form>
    <p class="muted center">Déjà inscrit ? <a href="#/login">Se connecter</a></p></div>`);
    const key = (window.TZ_CONFIG || {}).TURNSTILE_SITEKEY;
    if (key) { const go = () => window.turnstile && window.turnstile.render('#cf', { sitekey: key }); if (window.turnstile) go(); else TZ.loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit').then(go, () => {}); }
  };
  FORMS.register = async (f, d) => {
    const err = (m) => { TZ.$('#rerr').textContent = m; };
    if (d.get('website')) return;
    if (Date.now() - (TZ._t0 || 0) < 2500) return err('Un instant… réessaie dans quelques secondes.');
    if (!d.get('terms')) return err('Vous devez accepter les conditions d\'utilisation et la politique de confidentialité pour créer votre compte.');
    const p = e164(d.get('iso'), d.get('phone')); if (!p) return err('Numéro de téléphone invalide.');
    const pseudo = String(d.get('pseudo')).trim(); if (pseudo.length < 3) return err('Pseudonyme : 3 caractères minimum.');
    if (d.get('password') !== d.get('password2')) return err('Les mots de passe ne sont pas identiques.');
    const mail = String(d.get('email') || '').trim().toLowerCase();
    if (mail && (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(mail) || BAD_MAIL.includes(mail.split('@')[1]))) return err('Adresse e-mail invalide (laisse vide si tu préfères).');
    try { if ((await TZ.rpc('pseudo_available', { p_name: pseudo })) === false) return err('Ce pseudonyme est déjà pris.'); } catch (e) { /* ignore */ }
    const key = (window.TZ_CONFIG || {}).TURNSTILE_SITEKEY, captchaToken = key ? d.get('cf-turnstile-response') : undefined;
    if (key && !captchaToken) return err('Vérification en cours… réessaie dans un instant.');
    const ref = TZ.getRef(), btn = f.querySelector('.primary'); btn.disabled = true;
    const { data, error } = await sb.auth.signUp({ email: authEmail(p), password: d.get('password'), options: { captchaToken, data: { display_name: pseudo, pseudo, phone_e164: p, contact_email: mail, accepted_terms: true, marketing_consent: !!d.get('marketing'), ref_code: ref ? ref.code : '', ref_competition: ref && ref.cid ? ref.cid : '' } } });
    btn.disabled = false;
    if (error) return err(/already|registered/i.test(error.message) ? 'Ce numéro a déjà un compte. Connecte-toi.' : TZ.errMsg(error));
    if (!data.session) { f.innerHTML = '<p class="ok center">🎉 Compte créé ! Tu peux maintenant te connecter.</p><a class="btn primary block" href="#/login">Se connecter</a>'; return; }
    const code = genCode(); try { await TZ.rpc('set_recovery_code', { p_code: clean(code) }); } catch (e) { /* ignore */ }
    state.session = data.session;
    f.outerHTML = `<div class="card glow center"><h2>🔐 Ton code de récupération</h2><p class="code">${code}</p><p class="small muted">Note-le ou fais une capture : il te permettra de retrouver ton compte si tu oublies ton mot de passe. Il ne sera plus affiché.</p>
      <button class="btn" data-act="copyCode" data-c="${code}">📋 Copier</button> <button class="btn primary" data-act="regDone">J'ai noté mon code ›</button></div>`;
  };
  ACT.copyCode = (d) => TZ.copy(d.c);
  ACT.regDone = () => TZ.afterLogin();

  // ---------- Mot de passe oublié ----------
  routes.recover = () => view(`<div class="narrow"><h1>🔐 Retrouver mon compte</h1>${sb ? '' : TZ.NOSB}<form class="card" data-form="recover">${phoneRow}<input name="code" required placeholder="Code de récupération (ex : ABCD-EFGH-JKLM)" autocomplete="off" autocapitalize="characters">
    <input name="password" type="password" minlength="8" required placeholder="Nouveau mot de passe" autocomplete="new-password"><input name="password2" type="password" minlength="8" required placeholder="Confirmer le mot de passe" autocomplete="new-password"><p id="rcerr" class="err small"></p>
    <button class="btn primary xl block">Réinitialiser</button></form><div id="rchelp"></div><p class="muted center small"><a href="#/login">‹ Retour à la connexion</a></p></div>`);
  FORMS.recover = async (f, d) => {
    const err = (m) => { TZ.$('#rcerr').textContent = m; };
    const p = e164(d.get('iso'), d.get('phone')); if (!p) return err('Numéro de téléphone invalide.');
    if (d.get('password') !== d.get('password2')) return err('Les mots de passe ne sont pas identiques.');
    TZ._rcPhone = p; err('');
    try {
      const { data, error } = await sb.functions.invoke('account-recovery', { body: { action: 'reset', phone: p, code: clean(d.get('code')), password: d.get('password') } });
      if (error) { let m = ''; try { m = (await error.context.json()).error; } catch (e) { /* ignore */ } throw new Error(m || 'unavailable'); }
      if (data && data.error) throw new Error(data.error);
      TZ.toast('Mot de passe modifié ✅ Connecte-toi'); TZ.go('#/login');
    } catch (e) {
      err(e.message === 'unavailable' ? 'Service de récupération indisponible pour le moment.' : e.message);
      TZ.$('#rchelp').innerHTML = '<div class="card center"><p class="small muted">Tu n\'as plus ton code ? Demande de l\'aide à TAMZORYA GAMING.</p><button class="btn" data-act="recHelp">📨 Demander de l\'aide</button></div>';
    }
  };
  ACT.recHelp = async () => { try { await TZ.rpc('request_recovery', { p_phone: TZ._rcPhone || '', p_message: 'Mot de passe oublié' }); TZ.toast('Demande envoyée ✅ Nous te contactons'); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };
  ACT.newRecovery = async () => { if (!confirm('Générer un nouveau code ? L\'ancien ne fonctionnera plus.')) return; const c = genCode(); try { await TZ.rpc('set_recovery_code', { p_code: clean(c) }); const s = TZ.$('#sheet'); s.innerHTML = `<div class="sheet-in center"><h2>🔐 Nouveau code</h2><p class="code">${c}</p><p class="small muted">Note-le : il ne sera plus affiché.</p><button class="btn primary block" data-act="sheetClose">J'ai noté mon code</button></div>`; s.hidden = false; } catch (e) { TZ.toast(TZ.errMsg(e), true); } };

  // ---------- Administration : demandes de récupération ----------
  TZ.adminRecovery = async () => {
    const rows = await q(sb.from('recovery_requests').select('*').eq('status', 'open').order('created_at', { ascending: false })).catch(() => []);
    return `<h3 class="sechead">🔑 Demandes de récupération</h3>${rows.map((r) => `<div class="card row" style="justify-content:space-between"><div><b>${esc(r.phone)}</b><br><small class="muted">${TZ.fmt(r.created_at)}</small></div><div class="row"><button class="btn sm primary" data-act="recReset" data-p="${esc(r.phone)}" data-id="${r.id}">Réinitialiser</button><button class="btn sm" data-act="recDone" data-id="${r.id}">Traité</button></div></div>`).join('') || '<div class="card center muted">Aucune demande</div>'}`;
  };
  ACT.recReset = async (d) => {
    const pw = prompt('Mot de passe temporaire pour ' + d.p + ' (8 caractères minimum) :'); if (!pw) return;
    try { const { data, error } = await sb.functions.invoke('account-recovery', { body: { action: 'admin_reset', phone: d.p, password: pw } }); if (error || (data && data.error)) throw new Error('Échec (fonction non déployée ?)'); await sb.from('recovery_requests').update({ status: 'done' }).eq('id', d.id); TZ.toast('Mot de passe réinitialisé ✅'); TZ.route(); } catch (e) { TZ.toast(e.message, true); }
  };
  ACT.recDone = (d) => TZ.run(() => q(sb.from('recovery_requests').update({ status: 'done' }).eq('id', d.id)), 'Traité');
})();
