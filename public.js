(function () {
  'use strict';
  const { sb, esc, fmt, state, routes, ACT, FORMS, q, view } = TZ;

  const DEMO_COMPS = [
    { id: 'demo-king-arena', name: 'KING ARENA', game: 'EA FC', description: 'Compétition de démonstration. Remplacez par vos vraies données.', starts_at: '2026-12-20T14:00:00', venue_name: 'GAMES CITY', city: 'Kinshasa', address: '', max_players: 32, fee: 5, currency: 'USD', rewards: 'À définir', status: 'published', partners: { name: 'GAMES CITY' }, requires_rules_acceptance: true },
    { id: 'demo-2', name: 'Night Clash', game: 'Tekken', description: 'Exemple de compétition (démo).', starts_at: '2027-01-10T16:00:00', venue_name: 'GAMES CITY', city: 'Kinshasa', address: '', max_players: 16, fee: 3, currency: 'USD', rewards: 'À définir', status: 'published', partners: { name: 'GAMES CITY' }, requires_rules_acceptance: true },
  ];
  async function getComps() {
    if (!sb) return { items: DEMO_COMPS, demo: true };
    const { data, error } = await sb.from('competitions').select('*, partners(name)').eq('status', 'published').order('starts_at');
    return error || !data || !data.length ? { items: DEMO_COMPS, demo: true } : { items: data, demo: false };
  }
  const orga = (c) => `Organisé par TAMZORYA GAMING${c.partners?.name ? ' en partenariat avec ' + esc(c.partners.name) : ''}`;
  const card = (c, demo) => { TZ.cache[c.id] = c; return `<a class="card" href="#/competition/${esc(c.id)}">${TZ.poster(c.poster_url)}<div class="row"><h3>${esc(c.name)}</h3>${demo ? TZ.DEMO : ''}</div>
    <div class="muted small">${esc(c.game)} • ${fmt(c.starts_at)}</div><div class="muted small">${esc(c.venue_name)}${c.city ? ', ' + esc(c.city) : ''} • ${esc(c.fee)} ${esc(c.currency)}</div><div class="ok small">${TZ.cd(c.starts_at)}</div></a>`; };

  routes[''] = async () => {
    const { items, demo } = await getComps(); const up = items.filter((c) => new Date(c.starts_at) > Date.now());
    view(`<section class="hero"><img src="logo.png" alt="TAMZORYA GAMING — Play, Compete, Win"><h1>La plateforme des compétitions gaming en RDC et en Afrique</h1>
      <p class="muted">Découvrez les tournois, réservez votre place, suivez vos résultats et visez le Grand Tournoi annuel.</p>
      <div class="row center"><a class="btn primary" href="#/competitions">Découvrir les compétitions</a><a class="btn" href="#/competitions">Réserver une place</a><a class="btn" href="#/rankings">Voir les classements</a><a class="btn" href="#/partners">Découvrir les partenaires</a>
      ${state.session ? '' : '<a class="btn" href="#/register">Créer un compte</a><a class="btn" href="#/login">Se connecter</a>'}</div></section>
      <h2>Compétition à la une</h2>${(up[0] || items[0]) ? `<div class="grid">${card(up[0] || items[0], demo)}</div>` : ''}
      <h2>Prochaines compétitions</h2><div class="grid">${up.slice(0, 6).map((c) => card(c, demo)).join('') || '<p class="muted">Aucune compétition à venir.</p>'}</div>
      <div class="grid" style="margin-top:20px"><a class="card" href="#/vs"><h3>⚔️ VS DU JOUR</h3><p class="muted">Les confrontations de la journée.</p></a><a class="card" href="#/rankings"><h3>🏆 Classements</h3><p class="muted">Général, annuel, par jeu.</p></a><a class="card" href="#/road"><h3>👑 Road to Grand Tournament</h3><p class="muted">Qualifiez-vous parmi les 16 meilleurs.</p></a></div>`);
  };

  routes.competitions = async () => {
    const { items, demo } = await getComps(); const games = [...new Set(items.map((c) => c.game))];
    view(`<h1>Compétitions</h1>${demo ? TZ.DEMO : ''}<div class="row" style="margin-top:12px"><input id="fq" placeholder="Rechercher…" style="flex:1;min-width:160px"><select id="fg" style="width:auto"><option value="">Tous les jeux</option>${games.map((g) => `<option>${esc(g)}</option>`).join('')}</select>
      <select id="fs" style="width:auto"><option value="up">À venir</option><option value="past">Terminées / passées</option><option value="all">Toutes</option></select></div><div id="list" class="grid"></div>`);
    const draw = () => {
      const t = TZ.$('#fq').value.toLowerCase(), g = TZ.$('#fg').value, s = TZ.$('#fs').value;
      const r = items.filter((c) => (!t || (c.name + c.venue_name + c.game).toLowerCase().includes(t)) && (!g || c.game === g) && (s === 'all' || (s === 'up') === (new Date(c.starts_at) > Date.now())));
      TZ.$('#list').innerHTML = r.map((c) => card(c, demo)).join('') || '<p class="muted">Aucun résultat.</p>';
    };
    ['fq', 'fg', 'fs'].forEach((i) => TZ.$('#' + i).addEventListener('input', draw)); draw();
  };

  routes.competition = async (id) => {
    const { items, demo } = await getComps(); const c = items.find((x) => x.id === id);
    if (!c) return view('<p class="center">Compétition introuvable.</p>'); TZ.cache[c.id] = c;
    let taken = 0, parts = [], mine = null, rules = null, results = [];
    if (!demo) {
      taken = (await TZ.rpc('competition_taken', { p_competition: id })) || 0; parts = (await TZ.rpc('competition_participants', { p_competition: id })) || [];
      rules = (await sb.from('competition_rules').select('*').eq('competition_id', id).maybeSingle()).data;
      results = (await sb.from('public_competition_results').select('*').eq('competition_id', id).order('rank')).data || [];
      if (state.session) mine = (await sb.from('reservations').select('*').eq('competition_id', id).eq('user_id', state.session.user.id).maybeSingle()).data;
    }
    const left = Math.max(0, c.max_players - taken), past = new Date(c.starts_at) < Date.now();
    let box;
    if (demo) box = '<p class="ok small">Compétition de démonstration : réservation non connectée.</p>';
    else if (!state.session) box = '<a class="btn primary" href="#/login">Se connecter pour réserver</a>';
    else if (mine && !['cancelled', 'expired'].includes(mine.status)) box = `<p>Statut : <span class="badge cy">${TZ.RES[mine.status]}</span></p><p>Code de réservation : <b>${TZ.code(mine.id)}</b></p>
      ${mine.status === 'confirmed' ? '<p class="ok small">Paiement validé : vous êtes officiellement participant.</p>' : '<p class="small muted">Présentez ce code et payez au guichet de la salle. Vous ne serez confirmé qu\'après validation du paiement.</p>'}
      ${mine.status !== 'confirmed' ? `<button class="btn danger sm" data-act="cancelRes" data-id="${mine.id}">Annuler ma réservation</button>` : ''}`;
    else if (past) box = '<p class="muted">Cette compétition est passée.</p>';
    else box = `<form data-form="reserve" data-id="${id}"><p class="small muted">Une réservation n'est <b>pas</b> une inscription définitive : vous êtes confirmé uniquement après validation de votre paiement au guichet.</p>
      ${c.requires_rules_acceptance ? '<label class="chk"><input type="checkbox" name="rules"><span>J\'ai lu et j\'accepte <a href="#/legal/reglement-competitions" target="_blank">le règlement de cette compétition</a>.</span></label>' : ''}
      <button class="btn primary">${left ? 'Confirmer ma demande de réservation' : 'Rejoindre la liste d\'attente'}</button></form>`;
    view(`<div class="row"><h1>${esc(c.name)}</h1>${demo ? TZ.DEMO : ''}</div><p class="ok">${orga(c)}</p>
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(300px,1fr))"><div class="card">${TZ.poster(c.poster_url)}<p>${esc(c.description)}</p>
      <table><tr><td>Jeu</td><td>${esc(c.game)}</td></tr><tr><td>Date</td><td>${fmt(c.starts_at)} <span class="ok">(${TZ.cd(c.starts_at)})</span></td></tr><tr><td>Lieu</td><td>${esc(c.venue_name)}, ${esc(c.city)}<br><span class="muted">${esc(c.address)}</span></td></tr>
      <tr><td>Places</td><td>${demo ? esc(c.max_players) : `${left} restantes / ${esc(c.max_players)}`}</td></tr><tr><td>Frais</td><td>${esc(c.fee)} ${esc(c.currency)}</td></tr><tr><td>Récompenses</td><td>${esc(c.rewards)}</td></tr></table>
      <div class="row" style="margin-top:12px"><button class="btn sm" data-act="ics" data-id="${esc(c.id)}">📅 Ajouter au calendrier</button><button class="btn sm" data-act="share" data-id="${esc(c.id)}" data-name="${esc(c.name)}">🔗 Partager</button></div></div>
      <div class="card"><h2>Réserver une place</h2>${box}</div></div>
      ${rules ? `<div class="card"><h2>Règlement particulier</h2><div class="small">${['content', 'format', 'duration', 'tiebreak', 'disqualification'].filter((k) => rules[k]).map((k) => `<p>${esc(rules[k])}</p>`).join('')}</div></div>` : ''}
      ${parts.length ? `<div class="card"><h2>Participants confirmés (${parts.length})</h2><p class="small">${parts.map((p) => esc(p.display_name)).join(' • ')}</p></div>` : ''}
      ${results.length ? `<div class="card"><h2>Résultats</h2><table>${results.map((r) => `<tr><td>#${r.rank}</td><td>${esc(r.player)}</td></tr>`).join('')}</table></div>` : ''}`);
  };
  FORMS.reserve = (f, d) => TZ.run(async () => {
    if (f.querySelector('[name=rules]') && !d.get('rules')) throw new Error('Vous devez accepter le règlement de la compétition.');
    if ((await TZ.pendingLegal()).length) throw new Error('Veuillez d\'abord accepter les documents mis à jour (Mon espace).');
    await TZ.rpc('reserve_place', { p_competition: f.dataset.id });
  }, 'Réservation enregistrée');
  ACT.cancelRes = (d) => { if (confirm('Annuler cette réservation ?')) TZ.run(() => TZ.rpc('cancel_reservation', { p_reservation: d.id }), 'Réservation annulée'); };

  routes.partners = async () => {
    let list = null;
    if (sb) list = (await sb.from('partners').select('*').order('name')).data;
    const demo = !list || !list.length;
    if (demo) list = [{ name: 'GAMES CITY', city: 'Kinshasa', description: 'Salle partenaire actuelle de TAMZORYA GAMING (fiche de démonstration, à compléter).' }];
    view(`<h1>Salles partenaires</h1>${demo ? TZ.DEMO : ''}<div class="grid" style="margin-top:12px">${list.map((p) => `<div class="card">${p.logo_url ? `<img src="${esc(p.logo_url)}" alt="" height="48">` : ''}<h2>${esc(p.name)}</h2>
      <p class="muted small">${[p.quartier, p.commune, p.city, p.province].filter(Boolean).map(esc).join(', ')}${p.landmark ? '<br>Repère : ' + esc(p.landmark) : ''}</p><p>${esc(p.description)}</p>
      <p class="small">${p.phone ? '📞 ' + esc(p.phone) + ' ' : ''}${p.email ? '✉️ ' + esc(p.email) : ''}</p>${(p.photos || []).slice(0, 3).map((u) => `<img src="${esc(u)}" alt="" height="70" loading="lazy" style="border-radius:8px;margin-right:6px">`).join('')}</div>`).join('')}</div>`);
  };

  routes.rankings = async (tab = 'general', game = '') => {
    const T = [['general', 'Général'], ['annual', 'Annuel'], ['game', 'Par jeu']]; let rows = [], extra = '', demo = !sb;
    if (sb) {
      if (tab === 'annual') { const y = new Date().getFullYear(); rows = await q(sb.from('rankings_annual').select('*').eq('season', y).order('points', { ascending: false }).limit(100)); extra = `<p class="muted small">Saison ${y}</p>`; }
      else if (tab === 'game') {
        const all = await q(sb.from('rankings_by_game').select('*').order('points', { ascending: false })); const games = [...new Set(all.map((r) => r.game))]; const g = game || games[0] || '';
        rows = all.filter((r) => r.game === g); extra = `<div class="tabs">${games.map((x) => `<a href="#/rankings/game/${encodeURIComponent(x)}" class="${x === g ? 'on' : ''}">${esc(x)}</a>`).join('')}</div>`;
      } else rows = await q(sb.from('rankings_general').select('*').order('points', { ascending: false }).limit(100));
      demo = false;
    }
    if (!rows.length) { demo = true; rows = [{ player: 'Joueur A', points: 0 }, { player: 'Joueur B', points: 0 }, { player: 'Joueur C', points: 0 }]; }
    const cfg = sb ? ((await sb.from('points_config').select('*').order('points', { ascending: false })).data || []) : [];
    view(`<div class="row"><h1>Classements</h1>${demo ? TZ.DEMO : ''}</div>${TZ.tabs('rankings', T, tab)}${extra}<div class="card scroll"><table><tr><th>#</th><th>Joueur</th><th>Points</th></tr>
      ${rows.map((r, i) => `<tr><td>${i + 1}</td><td>${esc(r.player)}</td><td>${esc(r.points)}</td></tr>`).join('')}</table></div>
      <div class="card"><h2>Barème (public)</h2><p class="small muted">${cfg.length ? cfg.map((c) => `${esc(c.label || c.key)} : ${c.points} pts`).join(' • ') : 'Défini par TAMZORYA GAMING.'}<br>Les points ne sont attribués qu'après validation officielle des résultats.</p></div>`);
  };

  routes.vs = async () => {
    let rows = [], demo = false;
    if (sb) { const a = new Date(); a.setHours(0, 0, 0, 0); const b = new Date(a.getTime() + 864e5); rows = (await sb.from('public_matches').select('*').gte('scheduled_at', a.toISOString()).lt('scheduled_at', b.toISOString()).order('scheduled_at')).data || []; }
    if (!rows.length) { demo = true; rows = [{ player1: 'Joueur A', player2: 'Joueur B', game: 'EA FC', competition: 'KING ARENA', scheduled_at: null, status: 'scheduled' }]; }
    const L = { scheduled: 'Programmé', live: 'En cours', finished: 'Terminé', cancelled: 'Annulé' };
    view(`<div class="row"><h1>⚔️ VS DU JOUR</h1>${demo ? TZ.DEMO : ''}</div><div class="grid" style="margin-top:12px">${rows.map((m) => `<div class="card"><p class="muted small">${esc(m.competition)} • ${esc(m.game)} • ${m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString('fr-FR', { timeStyle: 'short' }) : '--:--'}</p>
      <p class="vs">${esc(m.player1 || '?')} <i>VS</i> ${esc(m.player2 || '?')}</p><p class="center muted small">${L[m.status]}${m.score1 != null ? ` — ${m.score1} : ${m.score2}` : ''}${m.winner ? `<br>🏆 Gagnant : ${esc(m.winner)}` : ''}</p></div>`).join('')}</div>`);
  };

  routes.road = async () => {
    let cfg = null, qs = [];
    if (sb) { cfg = (await sb.from('grand_tournament_config').select('*').eq('published', true).order('season', { ascending: false }).limit(1).maybeSingle()).data; if (cfg) qs = (await sb.from('public_qualifications').select('*').eq('season', cfg.season).order('rank')).data || []; }
    view(`<h1>👑 ROAD TO GRAND TOURNAMENT</h1><p class="muted">Chaque année, au minimum 16 joueurs qualifiés selon leurs performances. Les règles sont publiques.</p>
      <div class="card"><h2>Critères de qualification</h2><p>${cfg ? `Saison ${cfg.season} — ${cfg.slots} places.<br>${esc(cfg.criteria)}` : 'Seront publiés par TAMZORYA GAMING.'}</p></div>
      <div class="card"><h2>Liste des qualifiés</h2>${qs.length ? `<table>${qs.map((r) => `<tr><td>#${r.rank ?? '-'}</td><td>${esc(r.player)}</td><td>${esc(r.status)}</td></tr>`).join('')}</table>` : '<p class="muted">Pas encore publiée.</p>'}</div>
      <a class="btn" href="#/rankings/annual">Voir le classement annuel</a>`);
  };

  // --- Authentification ---
  routes.login = () => view(`<div class="narrow"><h1>Connexion</h1>${sb ? '' : TZ.NOSB}<form class="card" data-form="login"><input name="email" type="email" required placeholder="E-mail" autocomplete="email"><input name="password" type="password" required placeholder="Mot de passe" autocomplete="current-password">
    <button class="btn primary" style="width:100%">Se connecter</button><p><button type="button" class="btn sm" data-act="forgot">Mot de passe oublié ?</button></p></form><p class="muted">Pas de compte ? <a href="#/register">Créer un compte</a></p></div>`);
  FORMS.login = (f, d) => TZ.run(async () => { const { error } = await sb.auth.signInWithPassword({ email: d.get('email'), password: d.get('password') }); if (error) throw new Error('Identifiants incorrects ou e-mail non vérifié.'); TZ.go('#/me'); });
  ACT.forgot = async () => {
    const email = TZ.$('[name=email]')?.value; if (!email) return TZ.toast('Saisissez d\'abord votre e-mail.', true);
    await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] }); TZ.toast('Si ce compte existe, un e-mail a été envoyé.');
  };
  routes.reset = () => view('<div class="narrow"><h1>Nouveau mot de passe</h1><form class="card" data-form="reset"><input name="p" type="password" minlength="8" required placeholder="Nouveau mot de passe (8+ caractères)"><button class="btn primary">Enregistrer</button></form></div>');
  FORMS.reset = (f, d) => TZ.run(async () => { const { error } = await sb.auth.updateUser({ password: d.get('p') }); if (error) throw error; TZ.go('#/me'); }, 'Mot de passe modifié');

  routes.register = () => view(`<div class="narrow"><h1>Créer un compte joueur</h1>${sb ? '' : TZ.NOSB}<form class="card" data-form="register"><input name="name" required maxlength="40" placeholder="Pseudo / nom affiché"><input name="email" type="email" required placeholder="E-mail"><input name="password" type="password" minlength="8" required placeholder="Mot de passe (8+ caractères)">
    <label class="chk"><input type="checkbox" name="terms"><span>En créant mon compte, je reconnais avoir lu et j’accepte le <a href="#/legal/reglement-general" target="_blank">Règlement général</a> et les <a href="#/legal/conditions-utilisation" target="_blank">Conditions d’utilisation</a> de TAMZORYA GAMING ainsi que sa <a href="#/legal/confidentialite" target="_blank">Politique de confidentialité</a>.</span></label>
    <label class="chk muted"><input type="checkbox" name="marketing"><span>(Facultatif) J'accepte de recevoir des communications promotionnelles.</span></label><p id="rerr" class="err small"></p><button class="btn primary" style="width:100%">Créer mon compte</button></form></div>`);
  FORMS.register = async (f, d) => {
    if (!d.get('terms')) return (TZ.$('#rerr').textContent = 'Vous devez accepter les conditions d\'utilisation et la politique de confidentialité pour créer votre compte.');
    const { error } = await sb.auth.signUp({ email: d.get('email'), password: d.get('password'), options: { emailRedirectTo: location.href.split('#')[0], data: { display_name: d.get('name'), accepted_terms: true, marketing_consent: !!d.get('marketing') } } });
    if (error) TZ.$('#rerr').textContent = error.message; else f.innerHTML = '<p class="ok">Compte créé. Vérifiez votre e-mail pour confirmer votre adresse, puis connectez-vous.</p>';
  };

  routes.legal = async (slug) => {
    let doc = (window.LEGAL_DOCS || []).find((x) => x.slug === slug); if (!doc) return view('<p class="center">Document introuvable.</p>');
    let ver = doc.version, eff = '[à définir]', arts = doc.articles;
    if (sb) { const v = (await sb.from('legal_document_versions').select('*').eq('slug', slug).not('published_at', 'is', null).order('version', { ascending: false }).limit(1)).data?.[0];
      if (v) { ver = v.version; eff = v.effective_at ? fmt(v.effective_at) : eff; if (v.content?.articles?.length) arts = v.content.articles; } }
    view(`<article class="narrow" style="max-width:760px"><div class="warn">PROJET DE DOCUMENT — à faire vérifier par un professionnel du droit avant publication définitive. Informations légales de TAMZORYA GAMING à compléter.</div>
      <h1>${esc(doc.title)}</h1><p class="muted small">Version ${ver} • Entrée en vigueur : ${eff}</p>${arts.map(([t, b]) => `<h3 class="ok">${esc(t)}</h3><p class="small" style="color:#cbd5e1">${esc(b)}</p>`).join('')}
      <p class="small">${window.LEGAL_DOCS.filter((x) => x.slug !== slug).map((x) => `<a href="#/legal/${x.slug}">${esc(x.title)}</a>`).join(' • ')}</p></article>`);
  };
})();
