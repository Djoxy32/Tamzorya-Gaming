// PROJETS de documents (v1). Source de vérité finale : tables legal_documents / legal_document_versions.


window.LEGAL_DOCS = [
  { slug: 'reglement-general', title: 'Règlement général', version: 1, articles: [
    ['Article 1 — Acceptation du règlement', "L'utilisation de la plateforme TAMZORYA GAMING implique l'acceptation du présent règlement. TAMZORYA GAMING est l'entreprise qui possède et administre la plateforme."],
    ['Article 2 — Création et utilisation des comptes', "Chaque personne ne peut détenir qu'un compte personnel. Les identifiants sont confidentiels et l'utilisateur est responsable de l'usage de son compte."],
    ['Article 3 — Exactitude des informations', "Les informations fournies doivent être exactes et tenues à jour. Toute fausse déclaration peut entraîner une suspension."],
    ['Article 4 — Règles applicables aux joueurs', "Les joueurs respectent les horaires, les adversaires, les arbitres, les organisateurs et le règlement particulier de chaque compétition."],
    ['Article 5 — Réservation et confirmation', "Une réservation en ligne n'est pas une inscription définitive. Le joueur devient participant confirmé uniquement après validation de son paiement par une personne autorisée."],
    ['Article 6 — Paiement physique au guichet', "Le paiement s'effectue au guichet de la salle organisatrice. Il n'est jamais automatique et est confirmé manuellement par un responsable autorisé, dont l'identité est enregistrée."],
    ['Article 7 — Annulation et remboursement', "Les conditions d'annulation et de remboursement sont précisées pour chaque compétition."],
    ['Article 8 — Déroulement des compétitions', "Le format, la durée et les règles du jeu sont définis dans le règlement particulier de chaque compétition."],
    ['Article 9 — Tricherie, fraude et comportements interdits', "Toute tricherie, fraude, usurpation d'identité ou manipulation de résultat est interdite et sanctionnée (disqualification, suspension, exclusion)."],
    ['Article 10 — Classements et points', "Les points sont attribués uniquement après validation officielle des résultats. Le barème est configurable et public. Toute correction est tracée."],
    ['Article 11 — Grand tournoi annuel', "Les règles de qualification (nombre de places, critères) sont publiques et peuvent évoluer, avec information préalable."],
    ['Article 12 — Comportement et communication', "Tout propos injurieux, discriminatoire ou harcelant est interdit."],
    ['Article 13 — Protection des données personnelles', "Voir la Politique de confidentialité."],
    ['Article 14 — Responsabilités de TAMZORYA GAMING', "TAMZORYA GAMING met tout en œuvre pour assurer la disponibilité de la plateforme, sans garantie d'absence d'interruption. Les partenaires restent responsables de l'accueil et du déroulement dans leurs salles."],
    ['Article 15 — Suspension et exclusion', "TAMZORYA GAMING peut suspendre ou exclure un compte en cas de manquement, avec possibilité de réclamation."],
    ['Article 16 — Réclamations et contestations', "Toute contestation est adressée à TAMZORYA GAMING dans un délai raisonnable."],
    ['Article 17 — Modification du règlement', "Le règlement est versionné. Une modification importante peut exiger une nouvelle acceptation."],
    ['Article 18 — Contact et dispositions finales', "Pour toute question, contactez TAMZORYA GAMING via la plateforme."],
  ] },
  { slug: 'conditions-utilisation', title: "Conditions générales d'utilisation", version: 1, articles: [
    ['Objet', "Les présentes conditions encadrent l'accès et l'usage de la plateforme TAMZORYA GAMING."],
    ['Accès et sécurité', "L'utilisateur s'engage à ne pas perturber le service ni tenter d'accéder à des données non autorisées."],
    ['Propriété intellectuelle', "Les marques, logos et contenus de TAMZORYA GAMING restent sa propriété. KING ARENA désigne une compétition et GAMES CITY un partenaire : ce ne sont pas des noms de l'entreprise."],
    ['Contact', 'Pour toute question, contactez TAMZORYA GAMING via la plateforme.'],
  ] },
  { slug: 'conditions-joueurs', title: 'Conditions spécifiques aux joueurs', version: 1, articles: [
    ["Inscription et réservation", "Conditions d'inscription, de réservation, paiement au guichet et confirmation définitive de participation."],
    ['Comportement', "Respect des horaires, des adversaires, des arbitres et des organisateurs ; interdiction de tricher."],
    ['Annulation, litiges et récompenses', "Conditions d'annulation, gestion des litiges, attribution des récompenses et usage personnel du compte."],
  ] },
  { slug: 'conditions-partenaires', title: 'Conditions spécifiques aux partenaires', version: 1, articles: [
    ['Adhésion et accès', "Adhésion sur invitation, vérification de l'identité du partenaire, usage strictement personnel des accès et gestion des comptes du personnel."],
    ['Compétitions', "Toute compétition proposée doit être validée par TAMZORYA GAMING avant publication. Le partenaire ne publie jamais directement."],
    ['Réservations et paiements', "Gestion des réservations, confirmation des paiements au guichet par le personnel autorisé, transmission des résultats."],
    ['Suspension ou résiliation', "TAMZORYA GAMING peut suspendre ou résilier le partenariat en cas de manquement."],
  ] },
  { slug: 'reglement-competitions', title: 'Règlement particulier des compétitions', version: 1, articles: [
    ['Modèle', "Chaque compétition dispose de son propre règlement : conditions de participation, places, frais, récompenses, format, durée, règles du jeu, disqualification, égalités, contestations et publication des résultats."],
  ] },
  { slug: 'confidentialite', title: 'Politique de confidentialité', version: 1, articles: [
    ['Données collectées', "Identité et pseudo, e-mail, historique de réservations, de participations et de performances, acceptations des documents."],
    ['Finalités et utilisation', "Gestion des comptes, des compétitions, des classements, sécurité et communications (promotionnelles uniquement avec consentement séparé)."],
    ['Accès, protection et conservation', "Accès limité selon les rôles ; protection par contrôle d'accès en base de données. Les données sont conservées le temps nécessaire aux finalités décrites."],
    ['Vos droits et contact', "Accès, rectification, suppression selon la loi applicable. Contact : via la plateforme."],
  ] },
  { slug: 'cookies', title: 'Politique relative aux cookies', version: 1, articles: [
    ['Cookies', "La plateforme utilise le stockage local nécessaire à la session. Aucun traceur publicitaire n'est utilisé."],
  ] },
];

(function () {
  'use strict';
  const { sb, esc, fmt, state, routes, ACT, FORMS, q, view } = TZ;

  async function getComps() {
    if (!sb) return { items: [], demo: false };
    const { data } = await sb.from('competitions').select('*, partners(name)').eq('status', 'published').order('starts_at');
    return { items: data || [], demo: false };
  }
  const orga = (c) => `Organisé par TAMZORYA GAMING${c.partners && c.partners.name ? ' en partenariat avec ' + esc(c.partners.name) : ''}`;
  const money = (c) => c.fee > 0 ? esc(c.fee) + ' ' + esc(c.currency) : 'Gratuit';
  const card = (c) => { TZ.cache[c.id] = c; return `<a class="card tcard" href="#/competition/${esc(c.id)}">${TZ.poster(c.poster_url)}<h3>${esc(c.name)}</h3>
    <div class="chips"><span class="chip">🎮 ${esc(c.game)}</span><span class="chip">📅 ${new Date(c.starts_at).toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' })}</span><span class="chip">💵 ${money(c)}</span></div><div class="ok small">⏳ ${TZ.cd(c.starts_at)}</div></a>`; };
  const vsCard = (m) => `<div class="card"><p class="muted small">${esc(m.competition)} • ${esc(m.game)} • ${m.scheduled_at ? new Date(m.scheduled_at).toLocaleTimeString('fr-FR', { timeStyle: 'short' }) : ''}</p>
    <p class="vs">${esc(m.player1 || '?')} <i>VS</i> ${esc(m.player2 || '?')}</p>${m.score1 != null ? `<p class="center ok">${m.score1} : ${m.score2}${m.winner ? ' • 🏆 ' + esc(m.winner) : ''}</p>` : `<p class="center muted small">${TZ.MSTAT[m.status] || ''}</p>`}</div>`;
  const podium = (t) => !t.length ? '<div class="card center muted">Le classement démarre bientôt 🔥</div>'
    : `<div class="podium">${[1, 0, 2].map((i) => t[i] ? `<div class="p${i + 1}"><b>${['🥇', '🥈', '🥉'][i]}</b>${esc(t[i].player)}<div class="muted small">${esc(t[i].points)} pts</div></div>` : '<div></div>').join('')}</div>`;
  const today = () => { const a = new Date(); a.setHours(0, 0, 0, 0); return [a.toISOString(), new Date(a.getTime() + 864e5).toISOString()]; };

  routes[''] = async () => {
    const { items } = await getComps(); const up = items.filter((c) => new Date(c.starts_at) > Date.now() - 6 * 36e5);
    let vs = [], top = [];
    if (sb) {
      const [a, b] = today();
      vs = (await sb.from('public_matches').select('*').gte('scheduled_at', a).lt('scheduled_at', b).order('scheduled_at').limit(3)).data || [];
      top = (await sb.from('rankings_general').select('*').order('points', { ascending: false }).limit(3)).data || [];
    }
    view(`<section class="hero2"><img src="logo.png" alt="TAMZORYA GAMING"><h1>Joue. Gagne. <span class="ok">Domine.</span></h1>
      <div class="cta"><a class="btn primary xl" href="${state.session ? '#/competitions' : '#/register'}">🎮 Jouer maintenant</a><a class="btn xl" href="#/competitions">🏆 Rejoindre un tournoi</a></div></section>
      <div class="sec"><h2><span class="live">LIVE</span>Tournois</h2><a href="#/competitions">Tout voir ›</a></div>
      ${up.length ? `<div class="hscroll">${up.map(card).join('')}</div>` : '<div class="card center muted">Les prochains tournois arrivent 🔥</div>'}
      <div class="sec"><h2>⚔️ VS du jour</h2><a href="#/vs">Voir ›</a></div>${vs.length ? vs.map(vsCard).join('') : '<div class="card center muted">Pas de match aujourd\'hui</div>'}
      <div class="sec"><h2>🏆 Top 3</h2><a href="#/rankings">Classement ›</a></div>${podium(top)}<a class="card center glow" href="#/feed" style="margin-top:18px"><h3>🔥 Rejoins la communauté</h3><span class="muted small">Poste • Like • Suis les meilleurs gamers</span></a>`);
  };

  routes.competitions = async () => {
    const { items, demo } = await getComps(); const games = [...new Set(items.map((c) => c.game))];
    view(`<h1>🎮 Tournois</h1>${demo ? TZ.DEMO : ''}<div class="row" style="margin-top:12px"><input id="fq" placeholder="Rechercher…" style="flex:1;min-width:160px"><select id="fg" style="width:auto"><option value="">Tous les jeux</option>${games.map((g) => `<option>${esc(g)}</option>`).join('')}</select>
      <select id="fs" style="width:auto"><option value="up">À venir</option><option value="past">Terminées / passées</option><option value="all">Toutes</option></select></div><div id="list" class="grid"></div>`);
    const draw = () => {
      const t = TZ.$('#fq').value.toLowerCase(), g = TZ.$('#fg').value, s = TZ.$('#fs').value;
      const r = items.filter((c) => (!t || (c.name + c.venue_name + c.game).toLowerCase().includes(t)) && (!g || c.game === g) && (s === 'all' || (s === 'up') === (new Date(c.starts_at) > Date.now())));
      TZ.$('#list').innerHTML = r.map((c) => card(c, demo)).join('') || '<p class="muted">Aucun résultat.</p>';
    };
    ['fq', 'fg', 'fs'].forEach((i) => TZ.$('#' + i).addEventListener('input', draw)); draw();
  };

  routes.competition = async (id) => {
    const { items } = await getComps(); const c = items.find((x) => x.id === id);
    if (!c) return view('<div class="card center">Tournoi introuvable 🤷</div>'); TZ.cache[c.id] = c;
    let hasBr = false, taken = 0, parts = [], mine = null, rules = null, results = [];
    if (sb) {
      taken = (await TZ.rpc('competition_taken', { p_competition: id }).catch(() => 0)) || 0;
      parts = (await TZ.rpc('competition_participants', { p_competition: id }).catch(() => [])) || [];
      rules = (await sb.from('competition_rules').select('*').eq('competition_id', id).maybeSingle()).data;
      results = (await sb.from('public_competition_results').select('*').eq('competition_id', id).order('rank')).data || [];
      hasBr = ((await sb.from('public_matches').select('id', { count: 'exact', head: true }).eq('competition_id', id).not('round_no', 'is', null)).count || 0) > 0;
      if (state.session) mine = (await sb.from('reservations').select('*').eq('competition_id', id).eq('user_id', state.session.user.id).maybeSingle()).data;
    }
    const left = Math.max(0, c.max_players - taken), past = new Date(c.starts_at) < Date.now(), active = mine && !['cancelled', 'expired'].includes(mine.status);
    let box;
    if (active) box = `<div class="center"><span class="badge cy">${TZ.RES[mine.status]}</span><a class="btn primary block" href="#/ticket/${mine.id}">🎟️ Mon ticket QR</a><p class="code">${TZ.code(mine.id)}</p>${mine.status === 'confirmed' ? '<p class="ok">✅ Tu es dans le tournoi !</p>' : '<p class="muted small">💵 Paie au guichet avec ce code</p>'}${mine.status !== 'confirmed' ? `<button class="btn danger sm" data-act="cancelRes" data-id="${mine.id}">Annuler</button>` : ''}</div>`;
    else if (past) box = '<p class="center muted">Tournoi terminé</p>';
    else if (!state.session) box = `<button class="btn primary xl block" data-act="needLogin" data-id="${esc(c.id)}">🎟️ Réserver ma place</button>`;
    else box = `<form data-form="reserve" data-id="${id}"><button class="btn primary xl block">${left ? '🎟️ Réserver ma place' : '⏳ Liste d\'attente'}</button><p class="small muted center">En réservant, tu acceptes le <a href="#/legal/reglement-competitions">règlement</a>.</p></form>`;
    view(`<div class="poster big">${c.poster_url ? `<img src="${esc(c.poster_url)}" alt="">` : '<img class="ph" src="logo-icon.png" alt="">'}</div>
      <h1>${esc(c.name)}</h1><p class="muted small">${orga(c)}</p>
      <div class="chips"><span class="chip">🎮 ${esc(c.game)}</span><span class="chip">📅 ${fmt(c.starts_at)}</span><span class="chip">📍 ${esc(c.venue_name)}${c.city ? ', ' + esc(c.city) : ''}</span><span class="chip">💵 ${money(c)}</span><span class="chip">🎁 ${esc(c.rewards || '—')}</span><span class="chip">👥 ${left}/${esc(c.max_players)}</span></div>
      <p class="ok">⏳ ${TZ.cd(c.starts_at)}</p>${c.description ? `<p class="muted">${esc(c.description)}</p>` : ''}
      <div class="card glow">${box}</div>
      <div class="row"><button class="btn sm" data-act="share" data-id="${esc(c.id)}" data-name="${esc(c.name)}">📣 Partager</button><button class="btn sm" data-act="copyLink" data-id="${esc(c.id)}">🔗 Lien</button><button class="btn sm" data-act="ics" data-id="${esc(c.id)}">📅 Agenda</button>${hasBr ? `<a class="btn sm" href="#/bracket/${esc(c.id)}">🗂️ Tableau</a>` : ''}</div>
      ${rules ? `<details class="card"><summary>📜 Règlement</summary>${['content', 'format', 'duration', 'tiebreak', 'disqualification'].filter((k) => rules[k]).map((k) => `<p class="small muted">${esc(rules[k])}</p>`).join('')}</details>` : ''}
      ${parts.length ? `<div class="card"><h3>👥 Participants (${parts.length})</h3><p class="small muted">${parts.map((p) => esc(p.display_name)).join(' • ')}</p></div>` : ''}
      ${results.length ? `<div class="card"><h3>🏆 Résultats</h3><table>${results.map((r) => `<tr><td>${['🥇', '🥈', '🥉'][r.rank - 1] || '#' + r.rank}</td><td>${esc(r.player)}</td></tr>`).join('')}</table></div>` : ''}`);
  };
  ACT.needLogin = (d) => { TZ.LS.set('tz_next', '#/competition/' + d.id); TZ.go('#/register'); };
  FORMS.reserve = async (f) => { try { const r = await TZ.rpc('reserve_place', { p_competition: f.dataset.id }); TZ.toast('Place réservée 🎉'); TZ.go('#/ticket/' + r.id); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };
  ACT.cancelRes = (d) => { if (confirm('Annuler cette réservation ?')) TZ.run(() => TZ.rpc('cancel_reservation', { p_reservation: d.id }), 'Réservation annulée'); };

  routes.partners = async () => {
    let list = null;
    if (sb) list = (await sb.from('partners').select('*').order('name')).data;
    list = list || [];
    view(`<div class="sec"><h1>🏢 Salles</h1><a class="btn sm primary" href="#/partner-request">Devenir partenaire</a></div>${list.length ? '' : '<p class="muted">Les salles partenaires arrivent bientôt.</p>'}<div class="grid" style="margin-top:12px">${list.map((p) => `<div class="card">${p.logo_url ? `<img src="${esc(p.logo_url)}" alt="" height="48">` : ''}<h2>${esc(p.name)}</h2>
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
    const cfg = sb ? ((await sb.from('points_config').select('*').order('points', { ascending: false })).data || []) : [];
    view(`<div class="row"><h1>Classements</h1>${demo ? TZ.DEMO : ''}</div>${TZ.tabs('rankings', T, tab)}${extra}<div class="card scroll"><table><tr><th>#</th><th>Joueur</th><th>Points</th></tr>
      ${rows.map((r, i) => `<tr><td>${['🥇', '🥈', '🥉'][i] || i + 1}</td><td>${esc(r.player)}</td><td>${esc(r.points)}</td></tr>`).join('') || '<tr><td colspan="3" class="muted">Aucun classement pour le moment.</td></tr>'}</table></div>
      <div class="card"><h2>Barème (public)</h2><p class="small muted">${cfg.length ? cfg.map((c) => `${esc(c.label || c.key)} : ${c.points} pts`).join(' • ') : 'Défini par TAMZORYA GAMING.'}</p></div>`);
  };

  routes.vs = async () => {
    let rows = [];
    if (sb) { const [a, b] = today(); rows = (await sb.from('public_matches').select('*').gte('scheduled_at', a).lt('scheduled_at', b).order('scheduled_at')).data || []; }
    view(`<h1>⚔️ VS du jour</h1>${rows.length ? `<div class="grid" style="margin-top:12px">${rows.map(vsCard).join('')}</div>` : '<div class="card center muted" style="margin-top:12px">Pas de match aujourd\'hui</div>'}`);
  };

  routes.road = async () => {
    let cfg = null, qs = [];
    if (sb) { cfg = (await sb.from('grand_tournament_config').select('*').eq('published', true).order('season', { ascending: false }).limit(1).maybeSingle()).data; if (cfg) qs = (await sb.from('public_qualifications').select('*').eq('season', cfg.season).order('rank')).data || []; }
    view(`<h1>👑 ROAD TO GRAND TOURNAMENT</h1>
      <div class="card"><h2>Critères de qualification</h2><p>${cfg ? `Saison ${cfg.season} — ${cfg.slots} places.<br>${esc(cfg.criteria)}` : 'Seront publiés par TAMZORYA GAMING.'}</p></div>
      <div class="card"><h2>Liste des qualifiés</h2>${qs.length ? `<table>${qs.map((r) => `<tr><td>#${r.rank ?? '-'}</td><td>${esc(r.player)}</td><td>${esc(TZ.QSTAT[r.status] || r.status)}</td></tr>`).join('')}</table>` : '<p class="muted">Pas encore publiée.</p>'}</div>
      <a class="btn" href="#/rankings/annual">Voir le classement annuel</a>`);
  };

  // --- Authentification, partage, partenariat ---
  routes.login = () => view(`<div class="narrow"><h1>🔑 Connexion</h1>${sb ? '' : TZ.NOSB}<form class="card" data-form="login"><input name="email" type="email" required placeholder="E-mail" autocomplete="email"><input name="password" type="password" required placeholder="Mot de passe" autocomplete="current-password">
    <button class="btn primary xl block">Se connecter</button><p class="center"><button type="button" class="btn sm" data-act="forgot">Mot de passe oublié ?</button></p></form><p class="muted center">Pas encore de compte ? <a href="#/register">S'inscrire</a></p></div>`);
  FORMS.login = (f, d) => TZ.run(async () => {
    const { error } = await sb.auth.signInWithPassword({ email: d.get('email'), password: d.get('password') }); if (error) throw error;
    await TZ.afterLogin();
  });
  ACT.forgot = async () => {
    const email = TZ.$('[name=email]') && TZ.$('[name=email]').value; if (!email) return TZ.toast('Saisis d\'abord ton e-mail.', true);
    await sb.auth.resetPasswordForEmail(email, { redirectTo: location.href.split('#')[0] }); TZ.toast('E-mail envoyé si le compte existe 📩');
  };
  routes.reset = () => view('<div class="narrow"><h1>🔒 Nouveau mot de passe</h1><form class="card" data-form="reset"><input name="p" type="password" minlength="8" required placeholder="Nouveau mot de passe"><button class="btn primary block">Enregistrer</button></form></div>');
  FORMS.reset = (f, d) => TZ.run(async () => { const { error } = await sb.auth.updateUser({ password: d.get('p') }); if (error) throw error; TZ.go('#/'); }, 'Mot de passe modifié ✅');

  const BAD_MAIL = ['mailinator.com', 'yopmail.com', 'guerrillamail.com', '10minutemail.com', 'tempmail.com', 'trashmail.com', 'sharklasers.com', 'getnada.com', 'throwawaymail.com', 'fakeinbox.com'];
  routes.register = () => {
    const invited = TZ.getRef(), next = TZ.LS.get('tz_next') || ''; TZ._t0 = Date.now();
    view(`<div class="narrow"><h1>✨ Rejoindre</h1>${invited ? '<p class="ok center">Tu as été invité(e) 🎉</p>' : ''}${next.startsWith('#/competition/') ? '<p class="ok center">🎟️ Crée ton compte pour réserver ta place</p>' : ''}${sb ? '' : TZ.NOSB}
    <form class="card" data-form="register"><input name="name" required maxlength="40" placeholder="Pseudo"><input class="hp" name="website" tabindex="-1" autocomplete="off" aria-hidden="true"><input name="email" type="email" required placeholder="E-mail" autocomplete="email"><input name="password" type="password" minlength="8" required placeholder="Mot de passe (8+ caractères)" autocomplete="new-password">
    <label class="chk"><input type="checkbox" name="terms"><span>En créant mon compte, je reconnais avoir lu et j’accepte le <a href="#/legal/reglement-general" target="_blank">Règlement général</a> et les <a href="#/legal/conditions-utilisation" target="_blank">Conditions d’utilisation</a> de TAMZORYA GAMING ainsi que sa <a href="#/legal/confidentialite" target="_blank">Politique de confidentialité</a>.</span></label>
    <label class="chk muted"><input type="checkbox" name="marketing"><span>(Facultatif) Recevoir les actus et promos</span></label><div id="cf"></div><p id="rerr" class="err small"></p><button class="btn primary xl block">Créer mon compte</button></form>
    <p class="muted center">Déjà inscrit ? <a href="#/login">Connexion</a></p></div>`);
    const key = (window.TZ_CONFIG || {}).TURNSTILE_SITEKEY;
    if (key) { const go = () => window.turnstile && window.turnstile.render('#cf', { sitekey: key }); if (window.turnstile) go(); else TZ.loadScript('https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit').then(go, () => {}); }
  };
  FORMS.register = async (f, d) => {
    const err = (m) => { TZ.$('#rerr').textContent = m; };
    if (d.get('website')) return;                                                    // piège à robots (champ invisible)
    if (Date.now() - (TZ._t0 || 0) < 3000) return err('Un instant… réessaie dans quelques secondes.');
    if (!d.get('terms')) return err('Vous devez accepter les conditions d\'utilisation et la politique de confidentialité pour créer votre compte.');
    const email = String(d.get('email')).trim().toLowerCase();
    if (BAD_MAIL.includes(email.split('@')[1])) return err('Utilise une adresse e-mail valide (pas une adresse jetable).');
    const key = (window.TZ_CONFIG || {}).TURNSTILE_SITEKEY, captchaToken = key ? d.get('cf-turnstile-response') : undefined;
    if (key && !captchaToken) return err('Vérification en cours… réessaie dans un instant.');
    const ref = TZ.getRef();
    const { error } = await sb.auth.signUp({ email, password: d.get('password'), options: { captchaToken, emailRedirectTo: location.href.split('#')[0], data: { display_name: d.get('name'), accepted_terms: true, marketing_consent: !!d.get('marketing'), ref_code: ref ? ref.code : '', ref_competition: ref && ref.cid ? ref.cid : '' } } });
    if (error) err(TZ.errMsg(error)); else f.innerHTML = '<p class="ok center">🎉 Compte créé ! Vérifie ton e-mail, puis connecte-toi.</p>';
  };

  routes.join = async (cid, code) => {
    const id = cid && cid !== '-' ? cid : null, target = id ? '#/competition/' + id : '#/competitions';
    if (code) {
      TZ.LS.set('tz_ref', JSON.stringify({ code, cid: id, at: Date.now() }));
      if (sb) sb.rpc('track_referral', { p_code: code, p_competition: id, p_visitor: TZ.visitor() }).then(() => {}, () => {});
    }
    if (state.session) return TZ.go(target);
    TZ.LS.set('tz_next', target); TZ.go('#/register');
  };

  routes['partner-request'] = async () => {
    if (!state.session) { TZ.LS.set('tz_next', '#/partner-request'); return TZ.go('#/register'); }
    if (!sb) return view(TZ.NOSB);
    const mine = (await sb.from('partner_requests').select('*').eq('user_id', state.session.user.id).order('created_at', { ascending: false }).limit(1)).data;
    const last = mine && mine[0];
    if (last && last.status === 'pending') return view(`<div class="narrow card center"><h1>⏳ Demande envoyée</h1><p class="muted">${esc(last.venue_name)}</p></div>`);
    view(`<div class="narrow"><h1>🏢 Devenir partenaire</h1>${last && last.status === 'rejected' ? '<p class="err small center">Ta dernière demande n\'a pas été retenue.</p>' : ''}
      <form class="card" data-form="preq"><input name="venue" required placeholder="Nom de la salle"><input name="city" required placeholder="Ville"><input name="phone" required placeholder="Téléphone"><textarea name="msg" rows="3" placeholder="Un mot sur ta salle (facultatif)"></textarea><button class="btn primary xl block">Envoyer ma demande</button></form></div>`);
  };
  FORMS.preq = (f, d) => TZ.run(() => q(sb.from('partner_requests').insert({ user_id: state.session.user.id, venue_name: d.get('venue'), city: d.get('city'), phone: d.get('phone'), message: d.get('msg') || null })), 'Demande envoyée ✅');

  routes.ticket = async (id) => {
    if (!state.session) { TZ.LS.set('tz_next', '#/ticket/' + id); return TZ.go('#/login'); }
    if (!sb) return view(TZ.NOSB);
    const r = (await sb.from('reservations').select('*, competitions(name, starts_at, venue_name, city, fee, currency)').eq('id', id).maybeSingle()).data;
    if (!r) return view('<div class="card center">Ticket introuvable 🤷</div>');
    const c = r.competitions || {};
    view(`<div class="narrow"><div class="card glow center"><h1>🎟️ ${esc(c.name)}</h1><p class="muted small">${fmt(c.starts_at)} • ${esc(c.venue_name)}</p>
      ${['payment_pending', 'confirmed'].includes(r.status) ? '<div id="qr" class="qr"></div>' : ''}<p class="code">${TZ.code(r.id)}</p><span class="badge cy">${TZ.RES[r.status]}</span>
      ${r.status === 'payment_pending' ? `<p class="muted small">💵 ${esc(c.fee)} ${esc(c.currency)} au guichet — montre ce QR</p>` : ''}${r.status === 'confirmed' ? '<p class="ok">✅ Tu es dans le tournoi !</p>' : ''}</div>
      <a class="btn block" href="#/competition/${r.competition_id}">‹ Retour au tournoi</a></div>`);
    if (TZ.$('#qr')) TZ.qr(TZ.$('#qr'), 'TZ:' + r.id);
  };
  const bm = (m) => `<div class="bm"><div class="${m.winner && m.winner === m.player1 ? 'win' : ''}"><span>${esc(m.player1 || '⏳')}</span><b>${m.score1 ?? ''}</b></div><div class="${m.winner && m.winner === m.player2 ? 'win' : ''}"><span>${m.player2 ? esc(m.player2) : (m.status === 'finished' ? 'Exempt' : '⏳')}</span><b>${m.score2 ?? ''}</b></div>${m.scheduled_at ? `<small class="muted">${fmt(m.scheduled_at)}</small>` : ''}</div>`;
  routes.bracket = async (id) => {
    const rows = sb ? ((await sb.from('public_matches').select('*').eq('competition_id', id).not('round_no', 'is', null).order('round_no').order('slot')).data || []) : [];
    const c = (await getComps()).items.find((x) => x.id === id), rounds = {};
    rows.forEach((m) => { (rounds[m.round_no] = rounds[m.round_no] || []).push(m); });
    view(`<div class="sec"><h1>🗂️ ${esc(c ? c.name : 'Tableau')}</h1><a class="btn sm" href="#/competition/${esc(id)}">‹</a></div>${rows.length ? `<div class="bracket">${Object.values(rounds).map((rs) => `<div class="rnd"><h3>${esc(rs[0].round)}</h3>${rs.map(bm).join('')}</div>`).join('')}</div>` : '<div class="card center muted">Le tirage au sort arrive bientôt 🎲</div>'}`);
  };

  routes.legal = async (slug) => {
    let doc = (window.LEGAL_DOCS || []).find((x) => x.slug === slug); if (!doc) return view('<p class="center">Document introuvable.</p>');
    let ver = doc.version, eff = '', arts = doc.articles;
    if (sb) { const v = (await sb.from('legal_document_versions').select('*').eq('slug', slug).not('published_at', 'is', null).order('version', { ascending: false }).limit(1)).data?.[0];
      if (v) { ver = v.version; eff = v.effective_at ? fmt(v.effective_at) : eff; if (v.content?.articles?.length) arts = v.content.articles; } }
    view(`<article class="narrow" style="max-width:760px">
      <h1>${esc(doc.title)}</h1><p class="muted small">Version ${ver}${eff ? ' • En vigueur depuis le ' + eff : ''}</p>${arts.map(([t, b]) => `<h3 class="ok">${esc(t)}</h3><p class="small" style="color:#cbd5e1">${esc(b)}</p>`).join('')}
      <p class="small">${window.LEGAL_DOCS.filter((x) => x.slug !== slug).map((x) => `<a href="#/legal/${x.slug}">${esc(x.title)}</a>`).join(' • ')}</p></article>`);
  };
})();
