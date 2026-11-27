/* Matchs amicaux, résultats avec preuves, VS du jour / passés, QR des salles, défis. Tout est invisible tant que l'admin n'active pas. */
(function () {
  'use strict';
  const { sb, esc, fmt, state, routes, ACT, FORMS, q, view, LS } = TZ;
  TZ.FEATROUTES.matches = 'friendly'; TZ.FEATROUTES.match = 'friendly'; TZ.FEATROUTES.invite = 'friendly'; TZ.FEATROUTES.s = 'venue_qr'; TZ.FEATROUTES.challenges = 'challenges';
  const me = () => state.session && state.session.user.id;
  const login = (h) => { LS.set('tz_next', h); TZ.go('#/login'); };
  const av = (u, n) => u ? `<img class="av" src="${esc(u)}" alt="">` : `<span class="av">${esc(String(n || '?').slice(0, 1).toUpperCase())}</span>`;
  const ST = { scheduled: ['Programmé', 'cy'], live: ['En cours', 'cy'], finished: ['Terminé', ''], cancelled: ['Annulé', 'red'], disputed: ['Résultat contesté', 'gold'] };
  const IST = { pending: 'En attente de réponse', countered: 'Nouvelle date proposée', declined: 'Refusée', cancelled: 'Annulée', accepted: 'Acceptée' };
  const badge = (s) => `<span class="badge ${s[1]}">${s[0]}</span>`;
  const typeB = (t) => t === 'friendly' ? '<span class="badge cy">🤝 Amical</span>' : '<span class="badge gold">🏆 Compétitif</span>';
  const when = (d) => d ? fmt(d) : 'Date à définir';
  const day = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });
  const PLATFORMS = ['PS5', 'PS4', 'Xbox Series', 'Xbox One', 'PC', 'Switch', 'Mobile', 'Autre'];
  const GAMES = ['EA Sports FC 27', 'EA Sports FC 26', 'eFootball', 'Tekken 8', 'Mortal Kombat', 'NBA 2K', 'Call of Duty', 'Fortnite'];
  const sheet = (h) => { const s = TZ.$('#sheet'); s.innerHTML = `<div class="sheet-in">${h}<button class="btn block" data-act="sheetClose">Fermer</button></div>`; s.hidden = false; };
  const sha = async (file) => { const h = await crypto.subtle.digest('SHA-256', await file.arrayBuffer()); return [...new Uint8Array(h)].map((x) => x.toString(16).padStart(2, '0')).join(''); };
  ACT.proofView = async (d) => { const { data } = await sb.storage.from('proofs').createSignedUrl(d.p, 300); if (!data) return TZ.toast('Preuve inaccessible', true); sheet(`<img src="${esc(data.signedUrl)}" alt="Preuve" style="max-width:100%;max-height:68vh;border-radius:14px;display:block;margin:0 auto 10px">`); };
  const fdate = (d) => d ? new Date(new Date(d) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';

  // ---------- Recherche d'un gamer par pseudonyme ----------
  let pst = null;
  TZ.playerPick = (v, boxId, act) => { clearTimeout(pst); pst = setTimeout(async () => { const t = String(v).trim().replace(/[%_,()]/g, ''), box = TZ.$('#' + boxId); if (t.length < 2) { box.innerHTML = ''; return; }
    const rows = (await sb.from('public_profiles').select('id,name,avatar_url').ilike('name', '%' + t + '%').neq('id', me()).limit(10)).data || [];
    box.innerHTML = rows.map((g) => `<button class="conv" data-act="${act}" data-id="${g.id}">${av(g.avatar_url, g.name)}<div class="cmid"><b>${esc(g.name)}</b></div></button>`).join('') || '<p class="muted center">Aucun gamer trouvé</p>'; }, 300); };
  ACT.duel = () => { if (!me()) return login('#/matches'); sheet('<h2 class="center">⚔️ Défier un gamer</h2><input id="dq" placeholder="Pseudonyme…" oninput="TZ.playerPick(this.value,\'dqr\',\'duelGo\')" autocomplete="off"><div id="dqr"></div>'); const i = TZ.$('#dq'); if (i && i.focus) i.focus(); };
  ACT.duelGo = (d) => { TZ.$('#sheet').hidden = true; TZ.go('#/invite/' + d.id); };

  // ---------- Mes matchs ----------
  const mrow = (x) => {
    const meta = `${esc(x.game || '')}${x.platform ? ' • ' + esc(x.platform) : ''} • ${when(x.at)}${x.venue ? ' • 🏢 ' + esc(x.venue) : ''}`;
    let stat = '', act = '';
    if (x.kind === 'invite_in') { stat = `<span class="badge ${x.status === 'pending' ? 'gold' : ''}">${IST[x.status] || x.status}</span>`; if (x.status === 'pending') act = `<button class="btn sm primary" data-act="invAccept" data-id="${x.id}">✅ Accepter</button><button class="btn sm" data-act="invCounter" data-id="${x.id}">🗓️ Autre date</button><button class="btn sm danger" data-act="invDecline" data-id="${x.id}">✖ Refuser</button>`; }
    else if (x.kind === 'invite_out') { stat = `<span class="badge">${x.status === 'pending' ? 'Invitation envoyée' : IST[x.status] || x.status}</span>`; if (x.status === 'pending') act = `<button class="btn sm danger" data-act="invCancel" data-id="${x.id}">Annuler</button>`; }
    else { stat = badge(ST[x.status] || [x.status, '']) + (x.result ? ` <span class="badge ${x.result === 'win' ? 'cy' : x.result === 'loss' ? 'red' : ''}">${{ win: 'Victoire', loss: 'Défaite', draw: 'Nul' }[x.result]} ${x.my_score}-${x.opp_score}</span>` : ''); act = `<a class="btn sm ${x.needs_confirm ? 'primary' : ''}" href="#/match/${x.id}">${x.needs_confirm ? '⏳ Confirmer le résultat' : 'Détails'}</a>`; }
    return `<div class="mrow"><div class="mhead"><a class="row nowrap" href="#/u/${x.opp_id}">${av(x.opp_avatar, x.opp_name)}<b>${esc(x.opp_name)}</b></a><span>${stat}</span></div><small class="muted">${meta}</small>${x.note ? `<small>« ${esc(x.note)} »</small>` : ''}<div class="row">${act}</div></div>`;
  };
  routes.matches = async (tab = 'upcoming') => {
    if (!state.session) return login('#/matches');
    const rows = await TZ.rpc('my_matches');
    const up = rows.filter((x) => (x.kind === 'match' && ['scheduled', 'live', 'disputed'].includes(x.status)) || (x.kind === 'invite_out' && x.status === 'pending'));
    const inv = rows.filter((x) => x.kind.startsWith('invite')), hist = rows.filter((x) => x.kind === 'match' && ['finished', 'cancelled'].includes(x.status));
    const nconf = rows.filter((x) => x.needs_confirm).length, ninv = rows.filter((x) => x.kind === 'invite_in' && x.status === 'pending').length;
    const T = [['upcoming', 'À venir'], ['invites', 'Invitations' + (ninv ? ' (' + ninv + ')' : '')], ['history', 'Historique'], ['calendar', 'Calendrier']];
    let list;
    if (tab === 'invites') list = inv; else if (tab === 'history') list = hist; else if (tab === 'calendar') list = rows.filter((x) => x.at && ((x.kind === 'match' && ['scheduled', 'live'].includes(x.status)) || (x.kind.startsWith('invite') && ['pending', 'countered'].includes(x.status)))).sort((a, b) => new Date(a.at) - new Date(b.at)); else list = up;
    let body;
    if (tab === 'calendar') { let last = ''; body = list.map((x) => { const d = day(x.at), h = d !== last ? `<div class="dsep left">${d}</div>` : ''; last = d; return h + mrow(x); }).join(''); } else body = list.map(mrow).join('');
    TZ.fview('friendly', `<div class="sec"><h1>⚔️ Mes matchs</h1><button class="btn primary sm" data-act="duel">＋ Défier</button></div>
      ${nconf ? `<div class="notice">⏳ ${nconf} résultat${nconf > 1 ? 's' : ''} à confirmer — ouvre le match concerné.</div>` : ''}${TZ.tabs('matches', T.map(([k, l]) => [k, l]), tab)}
      ${body || '<div class="card center muted">Rien ici pour le moment.<br>Lance un défi à un gamer !</div>'}`);
  };
  ACT.invAccept = async (d) => { try { const mid = await TZ.rpc('respond_invite', { p_invite: d.id, p_action: 'accept' }); TZ.toast('Match créé ✅'); TZ.go('#/match/' + mid); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };
  ACT.invDecline = (d) => { if (confirm('Refuser cette invitation ?')) TZ.run(() => TZ.rpc('respond_invite', { p_invite: d.id, p_action: 'decline' }), 'Invitation refusée'); };
  ACT.invCancel = (d) => TZ.run(() => TZ.rpc('cancel_invite', { p_invite: d.id }), 'Invitation annulée');
  ACT.invCounter = (d) => sheet(`<h2 class="center">🗓️ Proposer une autre date</h2><form data-form="counter" data-id="${d.id}"><input type="datetime-local" name="at" required><button class="btn primary block">Envoyer</button></form>`);
  FORMS.counter = (f, d) => { TZ.$('#sheet').hidden = true; TZ.run(() => TZ.rpc('respond_invite', { p_invite: f.dataset.id, p_action: 'counter', p_at: new Date(d.get('at')).toISOString() }), 'Nouvelle date envoyée'); };

  // ---------- Envoyer une demande de match ----------
  routes.invite = async (uid) => {
    if (!state.session) return login('#/invite/' + uid);
    const opp = (await sb.from('public_profiles').select('id,name,avatar_url').eq('id', uid).maybeSingle()).data;
    if (!opp) return TZ.fview('friendly', '<div class="card center">Gamer introuvable 🤷</div>');
    const venues = (await sb.from('partners').select('id,name,city').eq('status', 'active').order('name')).data || [];
    let pre = ''; try { const p = (await TZ.rpc('my_presence'))[0]; if (p) pre = p.partner_id; } catch (e) { /* ignore */ }
    if (!pre) { try { const v = JSON.parse(LS.get('tz_venue') || 'null'); if (v && Date.now() - v.at < 12 * 36e5) pre = v.id; } catch (e) { /* ignore */ } }
    TZ.fview('friendly', `<div class="row"><a class="btn sm" href="#/u/${uid}">‹</a>${av(opp.avatar_url, opp.name)}<h1 style="margin:0">Défier ${esc(opp.name)}</h1></div>
      <form class="card" data-form="duel" data-to="${uid}" style="margin-top:12px"><input name="game" list="gl" required placeholder="Jeu (ex : EA Sports FC 27)"><datalist id="gl">${GAMES.map((g) => `<option value="${g}">`).join('')}</datalist>
        <select name="platform"><option value="">Plateforme</option>${PLATFORMS.map((p) => `<option>${p}</option>`).join('')}</select><label class="f">Date et heure<input type="datetime-local" name="at" required></label>
        <select name="venue"><option value="">Salle (facultatif)</option>${venues.map((v) => `<option value="${v.id}" ${v.id === pre ? 'selected' : ''}>${esc(v.name)}${v.city ? ' — ' + esc(v.city) : ''}</option>`).join('')}</select>
        <textarea name="msg" rows="2" maxlength="300" placeholder="Message (facultatif)"></textarea><button class="btn primary xl block">⚔️ Envoyer la demande</button></form>`);
  };
  FORMS.duel = async (f, d) => { try { await TZ.rpc('invite_match', { p_to: f.dataset.to, p_game: d.get('game'), p_platform: d.get('platform') || null, p_at: new Date(d.get('at')).toISOString(), p_partner: d.get('venue') || null, p_message: d.get('msg') || null }); TZ.toast('Demande envoyée ✅'); TZ.go('#/matches/invites'); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };

  // ---------- Détail d'un match, résultat et preuves ----------
  const reviewBtns = (rp, admin) => `<div class="row"><button class="btn sm primary" data-act="rvValidate" data-id="${rp.id}">✅ Valider</button>${admin ? `<button class="btn sm" data-act="rvSet" data-id="${rp.id}">✏️ Corriger le score</button>` : ''}<button class="btn sm danger" data-act="rvReject" data-id="${rp.id}">✖ Refuser</button><button class="btn sm" data-act="rvFlag" data-id="${rp.id}">🚩 Anomalie</button></div>`;
  routes.match = async (id) => {
    const d = await TZ.rpc('match_detail', { p_match: id });
    if (!d) return TZ.fview('friendly', '<div class="card center">Match introuvable 🤷</div>');
    const my = d.me, mine = my && ((d.p1 && d.p1.id === my) || (d.p2 && d.p2.id === my)), r = d.result, rp = d.report, fr = d.type === 'friendly';
    const xp = (u) => d.xp.filter((x) => x.user_id === u).reduce((s, x) => s + x.xp, 0), pl = (p) => p ? `<a class="pl" href="#/u/${p.id}">${av(p.avatar, p.name)}<span>${esc(p.name)}</span>${r ? `<small class="ok">+${xp(p.id)} XP</small>` : ''}</a>` : '<div class="pl"><span class="muted">À déterminer</span></div>';
    const ready = d.at && new Date(d.at) <= Date.now() + 15 * 6e4;
    let act = '';
    if (mine && fr) {
      if (d.status === 'scheduled') act += `<div class="row"><button class="btn sm" data-act="mLive" data-id="${d.id}">▶ Commencer</button><button class="btn sm danger" data-act="mCancel" data-id="${d.id}">🚫 Annuler le match</button></div>`;
      if (['scheduled', 'live'].includes(d.status) && !(rp && ['pending', 'disputed'].includes(rp.status))) {
        act += ready ? `<form class="card" data-form="declare" data-id="${d.id}"><h3>📝 Déclarer le résultat</h3><div class="row nowrap"><input name="me" type="number" min="0" max="99" required placeholder="Mon score" style="flex:1"><b>:</b><input name="opp" type="number" min="0" max="99" required placeholder="Adversaire" style="flex:1"></div>
          <label class="f">Preuve (capture d'écran ou photo)<input type="file" name="proof" accept="image/*"></label><input name="note" maxlength="300" placeholder="Note (facultatif)"><button class="btn primary block">Envoyer le résultat</button></form>` : '<p class="muted small center">Le résultat pourra être déclaré à l\'heure du match.</p>';
      }
      if (rp && rp.status === 'pending') act += rp.reporter === my ? '<div class="notice">⏳ Résultat envoyé. Ton adversaire doit le confirmer.</div>'
        : `<div class="card glow"><h3>⏳ Résultat à confirmer</h3><p>Score déclaré : <b>${rp.s1} : ${rp.s2}</b></p>${rp.proof ? `<button class="btn sm" data-act="proofView" data-p="${esc(rp.proof)}">🖼️ Voir la preuve</button>` : ''}<div class="row" style="margin-top:8px"><button class="btn primary" data-act="rConfirm" data-id="${rp.id}">✅ Confirmer</button><button class="btn danger" data-act="rDispute" data-id="${rp.id}">⚠️ Contester</button></div></div>`;
      if (rp && rp.status === 'disputed') act += `<div class="notice">⚠️ Résultat contesté — en vérification par TAMZORYA GAMING${d.venue ? ' et la salle' : ''}.</div>`;
      if (TZ.feat('messaging')) { const o = d.p1.id === my ? d.p2 : d.p1; if (o) act += `<a class="btn sm" href="#/chat/new/${o.id}">💬 Écrire à ${esc(o.name)}</a>`; }
    }
    if (d.authz && !mine && rp && ['pending', 'disputed'].includes(rp.status)) act += `<div class="card"><h3>🔎 Vérification</h3><p class="small">Score déclaré : <b>${rp.s1} : ${rp.s2}</b>${rp.dispute ? `<br>Contestation : ${esc(rp.dispute)}` : ''}</p>${rp.proof ? `<button class="btn sm" data-act="proofView" data-p="${esc(rp.proof)}">🖼️ Preuve</button>` : ''}${reviewBtns(rp, d.admin)}</div>`;
    if (d.admin && fr) act += `<button class="btn sm" data-act="admSet" data-id="${d.id}">✏️ Corriger / fixer le résultat (admin)</button>`;
    TZ.fview('friendly', `<div class="row"><a class="btn sm" href="#/matches">‹</a>${typeB(d.type)}${badge(ST[d.status] || [d.status, ''])}</div>
      <div class="vsbox">${pl(d.p1)}<div class="sc">${r ? `${r.s1} : ${r.s2}` : 'VS'}</div>${pl(d.p2)}</div>
      <div class="chips"><span class="chip">🎮 ${esc(d.game || '')}</span>${d.platform ? `<span class="chip">🕹️ ${esc(d.platform)}</span>` : ''}<span class="chip">📅 ${when(d.at)}</span>${d.venue ? `<span class="chip">🏢 ${esc(d.venue)}</span>` : ''}${d.competition ? `<span class="chip">🏆 ${esc(d.competition)}</span>` : ''}</div>
      ${r ? `<p class="center ok">${r.winner ? '🏆 Vainqueur : ' + esc(r.winner === (d.p1 && d.p1.id) ? d.p1.name : d.p2.name) : 'Match nul'} • validé (${{ players: 'par les joueurs', partner: 'par la salle', admin: 'par l\'administration' }[r.source] || ''})</p>` : ''}
      ${act}${d.actions && d.actions.length ? `<details class="card"><summary>🕘 Historique</summary>${d.actions.map((a) => `<p class="small"><b>${esc(a.action)}</b> • ${esc(a.actor)} • ${fmt(a.at)}${a.note ? '<br><span class="muted">' + esc(a.note) + '</span>' : ''}</p>`).join('')}</details>` : ''}`);
  };
  FORMS.declare = async (f, d) => {
    const btn = f.querySelector('.primary'); btn.disabled = true; btn.textContent = '⏳ Envoi…';
    try {
      const file = d.get('proof'); let path = null, hash = null;
      if (file && file.size) { if (file.size > 8 * 1048576) throw new Error('Image trop lourde (8 Mo max)'); hash = await sha(file); path = me() + '/' + Date.now() + '-' + hash.slice(0, 8) + '.' + (file.name.split('.').pop() || 'jpg').toLowerCase().replace(/[^a-z0-9]/g, '');
        const { error } = await sb.storage.from('proofs').upload(path, file, { contentType: file.type }); if (error) throw error; }
      await TZ.rpc('declare_result', { p_match: f.dataset.id, p_score_me: +d.get('me'), p_score_opp: +d.get('opp'), p_proof: path, p_hash: hash, p_note: d.get('note') || null });
      TZ.toast('Résultat envoyé ✅'); TZ.route();
    } catch (e) { TZ.toast(TZ.errMsg(e), true); btn.disabled = false; btn.textContent = 'Envoyer le résultat'; }
  };
  ACT.mLive = (d) => TZ.run(() => TZ.rpc('match_live', { p_match: d.id }), 'Match démarré');
  ACT.mCancel = (d) => { if (confirm('Annuler ce match ?')) TZ.run(() => TZ.rpc('cancel_match', { p_match: d.id }), 'Match annulé'); };
  ACT.rConfirm = (d) => TZ.run(() => TZ.rpc('confirm_result', { p_report: d.id }), 'Résultat validé ✅');
  ACT.rDispute = (d) => { const r = prompt('Pourquoi contestes-tu ce résultat ? (preuve insuffisante, score faux…)'); if (r === null) return; TZ.run(() => TZ.rpc('dispute_result', { p_report: d.id, p_reason: r }), 'Résultat contesté'); };
  ACT.rvValidate = (d) => TZ.run(() => TZ.rpc('review_report', { p_report: d.id, p_action: 'validate' }), 'Résultat validé ✅');
  ACT.rvReject = (d) => { const n = prompt('Motif du refus :'); if (n === null) return; TZ.run(() => TZ.rpc('review_report', { p_report: d.id, p_action: 'reject', p_note: n }), 'Résultat refusé'); };
  ACT.rvFlag = (d) => { const n = prompt('Décris l\'anomalie :'); if (n === null) return; TZ.run(() => TZ.rpc('review_report', { p_report: d.id, p_action: 'flag', p_note: n }), 'Anomalie signalée'); };
  ACT.rvSet = (d) => { const s = prompt('Score final (ex : 3-1) :'); const m = s && s.match(/^\s*(\d+)\s*[-:]\s*(\d+)\s*$/); if (!m) return; TZ.run(() => TZ.rpc('review_report', { p_report: d.id, p_action: 'set', p_s1: +m[1], p_s2: +m[2] }), 'Score fixé'); };
  ACT.admSet = (d) => { const s = prompt('Score final (joueur 1 - joueur 2), ex : 2-0 :'); const m = s && s.match(/^\s*(\d+)\s*[-:]\s*(\d+)\s*$/); if (!m) return; TZ.run(() => TZ.rpc('admin_set_match_result', { p_match: d.id, p_s1: +m[1], p_s2: +m[2], p_note: 'Correction administrative' }), 'Résultat enregistré'); };

  // ---------- VS du jour et VS passés ----------
  const vsRow = (m) => {
    const past = m.scheduled_at && new Date(m.scheduled_at) < Date.now(), st = m.validated ? 'Terminé' : (m.status === 'scheduled' && past) ? 'En attente de résultat' : (ST[m.status] || [m.status])[0];
    const t = m.scheduled_at ? new Date(m.scheduled_at).toLocaleString('fr-FR', { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' }) : 'Heure à confirmer';
    return `<a class="vsrow" href="#/match/${m.id}"><div class="vs-top">${typeB(m.match_type)}<small>${esc(m.game || '')}${m.platform ? ' • ' + esc(m.platform) : ''}</small><small class="muted">${t}</small></div>
      <div class="vs-mid"><div class="pl">${av(m.avatar1, m.player1)}<span>${esc(m.player1 || '?')}</span></div><div class="sc">${m.validated ? m.score1 + ' : ' + m.score2 : 'VS'}</div><div class="pl">${av(m.avatar2, m.player2)}<span>${esc(m.player2 || '?')}</span></div></div>
      <div class="vs-bot"><small>${esc(st)}</small>${m.venue ? `<small>🏢 ${esc(m.venue)}</small>` : ''}${m.match_type !== 'friendly' && m.competition ? `<small>${esc(m.competition)}</small>` : ''}</div></a>`;
  };
  const oldVs = routes.vs;
  routes.vs = async (tab = 'today', f = 'all') => {
    if (!TZ.feat('friendly')) return oldVs();
    const a = new Date(); a.setHours(0, 0, 0, 0); const b = new Date(a.getTime() + 864e5);
    let r = sb.from('public_matches').select('*').order('scheduled_at', { ascending: tab === 'today' }).limit(40);
    r = tab === 'today' ? r.gte('scheduled_at', a.toISOString()).lt('scheduled_at', b.toISOString()) : r.lt('scheduled_at', a.toISOString());
    if (f !== 'all') r = r.eq('match_type', f);
    const rows = (await r).data || [];
    TZ.fview('friendly', `<h1>⚔️ VS</h1>${TZ.tabs('vs', [['today', "Aujourd'hui"], ['past', 'Passés']].map(([k, l]) => [k, l]), tab).replace(/href="#\/vs\/(\w+)"/g, `href="#/vs/$1/${f}"`)}
      <div class="scr">${[['all', 'Tous'], ['friendly', '🤝 Amicaux'], ['competitive', '🏆 Compétitifs']].map(([k, l]) => `<a class="chip2 ${f === k ? 'on' : ''}" href="#/vs/${tab}/${k}">${l}</a>`).join('')}</div>
      ${rows.map(vsRow).join('') || `<div class="card center muted">${tab === 'today' ? "Pas de match aujourd'hui" : 'Aucun match passé'}</div>`}`);
  };

  // ---------- Profil d'un gamer : défier + historique des confrontations ----------
  const oldU = routes.u;
  routes.u = async (id) => {
    await oldU(id); if (!TZ.feat('friendly') || !me() || me() === id) return;
    const box = TZ.$('#posts'); if (!box || !box.insertAdjacentHTML) return;
    let h = `<div class="row" style="margin-bottom:12px"><a class="btn primary" href="#/invite/${id}">⚔️ Défier</a></div>`;
    try { const x = await TZ.rpc('head_to_head', { p_a: me(), p_b: id }); if (x && x.total > 0) h += `<div class="card"><h3>🤜🤛 Face-à-face</h3><div class="tiles"><div class="tile"><b>${x.total}</b><span>Matchs</span></div><div class="tile"><b>${x.wins_a}</b><span>Mes victoires</span></div><div class="tile"><b>${x.wins_b}</b><span>Ses victoires</span></div></div>
      ${x.history.slice(0, 5).map((m) => `<a class="conv" href="#/match/${m.id}"><div class="cmid"><b>${m.a} : ${m.b}</b><small>${esc(m.game)} • ${m.type === 'friendly' ? 'Amical' : 'Compétitif'} • ${m.at ? fmt(m.at) : ''}</small></div></a>`).join('')}</div>`; } catch (e) { /* ignore */ }
    box.insertAdjacentHTML('beforebegin', h);
  };

  // ---------- Salle partenaire : page ouverte par QR code ----------
  routes.s = async (code) => {
    const v = ((await TZ.rpc('resolve_venue_code', { p_code: code })) || [])[0];
    if (!v) return TZ.fview('venue_qr', '<div class="card center">Code invalide ou désactivé</div>');
    LS.set('tz_venue', JSON.stringify({ id: v.partner_id, name: v.name, code, at: Date.now() }));
    let present = false, list = [];
    if (state.session) { try { const mp = (await TZ.rpc('my_presence'))[0]; present = !!(mp && mp.partner_id === v.partner_id); if (present) list = await TZ.rpc('venue_present', { p_partner: v.partner_id }); } catch (e) { /* ignore */ } }
    TZ.fview('venue_qr', `<div class="card glow center">${v.logo ? `<img src="${esc(v.logo)}" alt="" height="56" style="border-radius:12px">` : '<div style="font-size:2.4rem">🏢</div>'}<h1>${esc(v.name)}</h1><p class="muted small">${esc(v.address || v.city || '')}${v.phone ? '<br>📞 ' + esc(v.phone) : ''}</p>
      ${!state.session ? `<button class="btn primary xl block" data-act="venueLogin" data-c="${esc(code)}">Se connecter pour signaler ma présence</button>` : present ? `<p class="ok">✅ Tu es dans la salle</p><div class="row center"><button class="btn primary" data-act="duel">🔎 Chercher un adversaire</button><button class="btn sm" data-act="venueLeave">Quitter</button></div>` : `<button class="btn primary xl block" data-act="checkin" data-c="${esc(code)}">📍 Je suis ici</button>`}</div>
      ${present ? `<div class="sec"><h2>👥 Gamers présents</h2></div>${list.map((g) => `<div class="conv">${av(g.avatar, g.name)}<div class="cmid"><b>${esc(g.name)}</b><small>${g.available ? '🟢 Disponible' : ''}</small></div><a class="btn sm primary" href="#/invite/${g.id}">⚔️ Défier</a></div>`).join('') || '<div class="card center muted">Personne d\'autre pour le moment</div>'}` : ''}
      ${TZ.feat('ux_plus') ? `<a class="btn block" href="#/venue/${v.partner_id}">🏢 Voir la salle</a>` : ''}`);
  };
  ACT.venueLogin = (d) => { LS.set('tz_next', '#/s/' + d.c); TZ.go('#/login'); };
  ACT.checkin = (d) => TZ.run(() => TZ.rpc('venue_checkin', { p_code: d.c }), 'Présence enregistrée 📍');
  ACT.venueLeave = () => TZ.run(() => TZ.rpc('venue_leave'), 'À bientôt !');

  // ---------- Défis publics et recherche d'adversaires ----------
  routes.challenges = async (tab = 'open') => {
    if (!state.session) return login('#/challenges');
    const T = [['open', 'Défis ouverts'], ['find', 'Trouver un adversaire']];
    let body;
    if (tab === 'find') {
      const p = state.profile || {};
      body = `<form class="card" data-form="find"><div class="row nowrap"><input name="game" placeholder="Jeu" style="flex:1"><select name="platform" style="flex:1"><option value="">Plateforme</option>${PLATFORMS.map((x) => `<option>${x}</option>`).join('')}</select></div>
        <div class="row nowrap"><select name="level" style="flex:1"><option value="">Niveau</option>${['Débutant', 'Amateur', 'Pro', 'Elite', 'Légende'].map((x) => `<option>${x}</option>`).join('')}</select><input name="city" placeholder="Ville" style="flex:1"></div><button class="btn primary block">🔎 Chercher</button></form><div id="fres"></div>
        <details class="card"><summary>🎮 Mon profil de joueur</summary><form data-form="myplay" style="margin-top:10px"><div class="chips">${PLATFORMS.map((x) => `<label class="chk"><input type="checkbox" name="pf" value="${x}" ${(p.platforms || []).includes(x) ? 'checked' : ''}>${x}</label>`).join('')}</div>
        <input name="games" placeholder="Mes jeux (séparés par des virgules)" value="${esc((p.favorite_games || []).join(', '))}"><label class="chk"><input type="checkbox" name="available" ${p.available ? 'checked' : ''}>Disponible maintenant</label><label class="chk"><input type="checkbox" name="disc" ${p.discoverable ? 'checked' : ''}>Apparaître dans la recherche d'adversaires</label><button class="btn primary">Enregistrer</button></form></details>`;
    } else {
      const rows = await TZ.rpc('open_challenges');
      body = `<details class="card"><summary>＋ Publier un défi</summary><form data-form="postch" style="margin-top:10px"><input name="game" list="gl2" required placeholder="Jeu (ex : EA Sports FC 27)"><datalist id="gl2">${GAMES.map((g) => `<option value="${g}">`).join('')}</datalist>
        <select name="platform"><option value="">Plateforme</option>${PLATFORMS.map((x) => `<option>${x}</option>`).join('')}</select><label class="f">Quand ? (facultatif)<input type="datetime-local" name="at"></label><input name="msg" maxlength="300" placeholder="Je cherche un adversaire pour…"><button class="btn primary block">Publier</button></form></details>
        ${rows.map((c) => `<div class="mrow"><div class="mhead"><a class="row nowrap" href="#/u/${c.user_id}">${av(c.avatar, c.name)}<b>${esc(c.name)}</b></a>${c.mine ? `<button class="btn sm danger" data-act="chCancel" data-id="${c.id}">Retirer</button>` : `<button class="btn sm primary" data-act="chAccept" data-id="${c.id}">⚔️ Relever</button>`}</div>
        <small class="muted">${esc(c.game)}${c.platform ? ' • ' + esc(c.platform) : ''}${c.available_at ? ' • ' + fmt(c.available_at) : ''}${c.venue ? ' • 🏢 ' + esc(c.venue) : ''}</small>${c.message ? `<small>« ${esc(c.message)} »</small>` : ''}</div>`).join('') || '<div class="card center muted">Aucun défi ouvert pour le moment</div>'}`;
    }
    TZ.fview('challenges', `<h1>🎯 Défis</h1>${TZ.tabs('challenges', T, tab)}${body}`);
  };
  FORMS.postch = (f, d) => TZ.run(() => TZ.rpc('post_challenge', { p_game: d.get('game'), p_platform: d.get('platform') || null, p_message: d.get('msg') || null, p_partner: null, p_at: d.get('at') ? new Date(d.get('at')).toISOString() : null }), 'Défi publié 🎯');
  ACT.chAccept = async (d) => { try { await TZ.rpc('accept_challenge', { p_id: d.id }); TZ.toast('Demande envoyée ✅'); TZ.go('#/matches/invites'); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };
  ACT.chCancel = (d) => TZ.run(() => TZ.rpc('cancel_challenge', { p_id: d.id }), 'Défi retiré');
  FORMS.find = async (f, d) => { try { const rows = await TZ.rpc('find_opponents', { p_game: d.get('game') || null, p_platform: d.get('platform') || null, p_level: d.get('level') || null, p_city: d.get('city') || null });
    TZ.$('#fres').innerHTML = rows.map((g) => `<div class="conv">${av(g.avatar, g.name)}<div class="cmid"><b>${esc(g.name)}</b><small>${esc(g.level || '')}${g.city ? ' • ' + esc(g.city) : ''}${g.available ? ' • 🟢' : ''}</small></div><a class="btn sm primary" href="#/invite/${g.id}">⚔️ Défier</a></div>`).join('') || '<div class="card center muted">Aucun adversaire compatible pour le moment</div>'; } catch (e) { TZ.toast(TZ.errMsg(e), true); } };
  FORMS.myplay = (f, d) => TZ.run(async () => { await q(sb.from('profiles').update({ platforms: d.getAll('pf'), favorite_games: String(d.get('games') || '').split(',').map((x) => x.trim()).filter(Boolean).slice(0, 8), available: !!d.get('available'), discoverable: !!d.get('disc') }).eq('id', me())); await TZ.loadProfile(); }, 'Profil enregistré ✅');

  // ---------- Espace partenaire : matchs de la salle + QR ----------
  const venueMatches = async (pid) => {
    const rows = await TZ.rpc('venue_matches', { p_partner: pid });
    return '<h1>⚔️ Matchs de la salle</h1>' + (rows.map((m) => `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(m.p1 || '?')} <span class="ok">VS</span> ${esc(m.p2 || '?')}</b>${typeB(m.match_type)}</div><small class="muted">${esc(m.game || '')} • ${when(m.at)} • ${badge(ST[m.status] || [m.status, '']).replace(/<[^>]+>/g, '')}${m.score1 != null ? ' • ' + m.score1 + ':' + m.score2 : ''}</small>
      ${m.report_id && ['pending', 'disputed'].includes(m.report_status) ? `<p class="small">${m.report_status === 'disputed' ? '⚠️ Contesté : ' + esc(m.dispute || '') : '⏳ En attente de confirmation'}${m.proof ? ` <button class="btn sm" data-act="proofView" data-p="${esc(m.proof)}">🖼️ Preuve</button>` : ''}</p>${reviewBtns({ id: m.report_id }, false)}` : ''}</div>`).join('') || '<div class="card center muted">Aucun match dans ta salle</div>');
  };
  const oldPartner = routes.partner;
  routes.partner = async (tab, arg) => {
    await oldPartner(tab, arg); const side = TZ.$('.side'), main = TZ.$('.main'), m = state.members[0]; if (!side || !main || !m || !side.insertAdjacentHTML) return;
    if (TZ.features.has('friendly')) { side.insertAdjacentHTML('beforeend', `<a href="#/partner/vmatches" class="${tab === 'vmatches' ? 'on' : ''}"><span class="i">⚔️</span><span>Matchs</span></a>`); if (tab === 'vmatches') { try { main.innerHTML = await venueMatches(m.partner_id); } catch (e) { main.innerHTML = `<p class="err center">${esc(TZ.errMsg(e))}</p>`; } } }
    if (tab === 'info' && TZ.features.has('venue_qr') && main.insertAdjacentHTML) {
      const c = ((await sb.from('venue_codes').select('code').eq('partner_id', m.partner_id).eq('status', 'active').order('created_at', { ascending: false }).limit(1)).data || [])[0];
      main.insertAdjacentHTML('beforeend', `<div class="card center"><h2>📲 QR de ma salle</h2>${c ? `<div id="pqr" class="qr"></div><p class="code small">${esc(c.code)}</p><p class="muted small">Affiche ce QR dans ta salle : les gamers le scannent pour signaler leur présence.</p>` : '<p class="muted small">Aucun code actif. Contacte TAMZORYA GAMING pour en recevoir un.</p>'}</div>`);
      if (c) TZ.qr(TZ.$('#pqr'), TZ.baseUrl() + '#/s/' + c.code);
    }
  };

  // ---------- Administration ----------
  const names = async (ids) => { const M = {}; if (ids.length) ((await sb.from('profiles').select('id,display_name,gamer_tag').in('id', ids)).data || []).forEach((p) => { M[p.id] = p.gamer_tag || p.display_name; }); return M; };
  TZ.adminFriendly = async () => {
    let reps; try { reps = await q(sb.from('match_reports').select('*').in('status', ['pending', 'disputed']).order('created_at', { ascending: false }).limit(50)); } catch (e) { return '<div class="card center muted">Exécute d\'abord la migration 010</div>'; }
    const ms = (await sb.from('matches').select('*').in('id', reps.length ? reps.map((r) => r.match_id) : ['00000000-0000-0000-0000-000000000000'])).data || [], M = Object.fromEntries(ms.map((m) => [m.id, m]));
    const recent = (await sb.from('matches').select('*, match_results(*)').eq('match_type', 'friendly').order('created_at', { ascending: false }).limit(15)).data || [];
    const N = await names([...new Set([...ms, ...recent].flatMap((m) => [m.player1_id, m.player2_id]))]);
    const card = (r) => { const m = M[r.match_id] || {}; return `<div class="card ${r.status === 'disputed' ? 'glow' : ''}"><div class="row" style="justify-content:space-between"><b>${esc(N[m.player1_id])} VS ${esc(N[m.player2_id])}</b><span class="badge ${r.status === 'disputed' ? 'gold' : ''}">${r.status === 'disputed' ? 'Contesté' : 'À confirmer'}</span></div>
      <p class="small">Déclaré : <b>${r.score1}:${r.score2}</b> par ${esc(N[r.reporter_id] || '?')}${r.dispute_reason ? `<br>Contestation : ${esc(r.dispute_reason)}` : ''}</p><div class="row">${r.proof_url ? `<button class="btn sm" data-act="proofView" data-p="${esc(r.proof_url)}">🖼️ Preuve</button>` : ''}<a class="btn sm" href="#/match/${r.match_id}">Détails</a></div>${reviewBtns(r, true)}</div>`; };
    return `<h1>🤝 Matchs amicaux</h1><h3 class="sechead">⚠️ Contestations & résultats à vérifier</h3>${reps.sort((a, b) => (b.status === 'disputed') - (a.status === 'disputed')).map(card).join('') || '<div class="card center muted">Rien à vérifier 🎉</div>'}
      <h3 class="sechead">🕘 Derniers matchs amicaux</h3>${recent.map((m) => { const r = Array.isArray(m.match_results) ? m.match_results[0] : m.match_results; return `<a class="conv" href="#/match/${m.id}"><div class="cmid"><b>${esc(N[m.player1_id])} VS ${esc(N[m.player2_id])}</b><small>${esc(m.game || '')} • ${badge(ST[m.status] || [m.status, '']).replace(/<[^>]+>/g, '')}${r && r.validated_at ? ' • ' + r.score1 + ':' + r.score2 : ''}</small></div></a>`; }).join('') || '<div class="card center muted">Aucun match amical</div>'}`;
  };
  const FK = { repeat_score: 'Même score répété', pair_abuse: 'Mêmes joueurs trop souvent', reused_proof: 'Preuve réutilisée', velocity: 'Trop de résultats en peu de temps', anomaly: 'Anomalie signalée' };
  TZ.adminFraud = async () => {
    let rows; try { rows = await q(sb.from('fraud_flags').select('*').order('created_at', { ascending: false }).limit(60)); } catch (e) { return '<div class="card center muted">Exécute d\'abord la migration 010</div>'; }
    const N = await names([...new Set(rows.flatMap((r) => [r.user_id, r.other_id]).filter(Boolean))]);
    return `<h1>🚨 Anti-fraude</h1>${rows.map((r) => `<div class="card ${r.status === 'open' ? 'glow' : ''}"><div class="row" style="justify-content:space-between"><b>${esc(FK[r.kind] || r.kind)}</b><span class="badge ${r.status === 'open' ? 'gold' : ''}">${r.status === 'open' ? 'Ouvert' : 'Clos'}</span></div><p class="small">${esc(r.detail || '')}<br><span class="muted">${esc(N[r.user_id] || '')}${r.other_id ? ' ⇄ ' + esc(N[r.other_id] || '') : ''} • ${fmt(r.created_at)}</span></p>
      <div class="row">${r.match_id ? `<a class="btn sm" href="#/match/${r.match_id}">Voir le match</a>` : ''}${r.status === 'open' ? `<button class="btn sm" data-act="fraudClose" data-id="${r.id}">Clore</button>` : ''}${r.user_id && r.status === 'open' ? `<button class="btn sm danger" data-act="fraudBan" data-u="${r.user_id}" data-id="${r.id}">Suspendre</button>` : ''}</div></div>`).join('') || '<div class="card center muted">Aucune alerte 🎉</div>'}`;
  };
  ACT.fraudClose = (d) => TZ.run(() => q(sb.from('fraud_flags').update({ status: 'closed' }).eq('id', d.id)), 'Alerte close');
  ACT.fraudBan = (d) => { if (confirm('Suspendre ce compte ?')) TZ.run(async () => { await q(sb.from('profiles').update({ is_suspended: true }).eq('id', d.u)); await q(sb.from('fraud_flags').update({ status: 'closed' }).eq('id', d.id)); }, 'Compte suspendu'); };

  TZ.adminQr = async () => {
    let codes; try { codes = await q(sb.from('venue_codes').select('*, partners(name)').order('created_at', { ascending: false })); } catch (e) { return '<div class="card center muted">Exécute d\'abord la migration 010</div>'; }
    const partners = (await sb.from('partners').select('id,name').order('name')).data || [], uses = (await sb.from('venue_code_uses').select('*').order('created_at', { ascending: false }).limit(200)).data || [];
    const N = await names([...new Set(uses.map((u) => u.user_id).filter(Boolean))]), cnt = {}; uses.forEach((u) => { cnt[u.code_id] = (cnt[u.code_id] || 0) + 1; });
    const SB = { active: ['Actif', 'cy'], disabled: ['Désactivé', 'gold'], revoked: ['Révoqué', 'red'] };
    return `<h1>📲 Codes des salles</h1><form class="card row nowrap" data-form="genCode"><select name="p" style="flex:1" required><option value="">Salle…</option>${partners.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}</select><button class="btn primary">＋ Générer</button></form>
      ${codes.map((c) => `<div class="card"><div class="row" style="justify-content:space-between"><b>${esc(c.partners && c.partners.name)}</b>${badge(SB[c.status])}</div><p class="code small">${esc(c.code)}</p><small class="muted">Créé ${fmt(c.created_at)} • ${cnt[c.id] || 0} utilisation(s)</small>
        <div class="row" style="margin-top:8px">${c.status === 'active' ? `<button class="btn sm" data-act="qrShow" data-c="${esc(c.code)}">📲 QR</button><button class="btn sm" data-act="codeSet" data-id="${c.id}" data-s="disabled">⏸ Désactiver</button>` : ''}${c.status === 'disabled' ? `<button class="btn sm" data-act="codeSet" data-id="${c.id}" data-s="active">▶ Réactiver</button>` : ''}
        ${c.status !== 'revoked' ? `<button class="btn sm danger" data-act="codeSet" data-id="${c.id}" data-s="revoked">🚫 Révoquer</button><button class="btn sm" data-act="codeRegen" data-id="${c.id}">♻️ Régénérer</button>` : ''}</div></div>`).join('') || '<div class="card center muted">Aucun code</div>'}
      <details class="card"><summary>🕘 Historique des utilisations</summary>${uses.slice(0, 40).map((u) => `<p class="small">${fmt(u.created_at)} • ${u.action === 'checkin' ? '📍 présence' : '👀 scan'} • ${esc(N[u.user_id] || 'visiteur')}</p>`).join('') || '<p class="muted small">Aucune</p>'}</details>
      <p class="muted small">Un QR code identifie seulement la salle : il ne donne jamais de droits d'administration.</p>`;
  };
  FORMS.genCode = (f, d) => TZ.run(() => TZ.rpc('admin_generate_code', { p_partner: d.get('p') }), 'Code généré');
  ACT.codeSet = (d) => { if (d.s !== 'active' && !confirm('Confirmer ?')) return; TZ.run(() => TZ.rpc('admin_set_code_status', { p_id: d.id, p_status: d.s }), 'Code mis à jour'); };
  ACT.codeRegen = (d) => { if (confirm('Révoquer ce code et en créer un nouveau ?')) TZ.run(() => TZ.rpc('admin_regenerate_code', { p_id: d.id }), 'Nouveau code généré'); };
  ACT.qrShow = (d) => { sheet(`<h2 class="center">QR de la salle</h2><div id="bq" class="qr"></div><p class="code small center">${esc(d.c)}</p><div class="row center"><button class="btn" data-act="qrCopy" data-c="${esc(d.c)}">🔗 Copier le lien</button><button class="btn" data-act="qrPng" data-c="${esc(d.c)}">⬇️ Télécharger</button></div>`); TZ.qr(TZ.$('#bq'), TZ.baseUrl() + '#/s/' + d.c); };
  ACT.qrCopy = (d) => TZ.copy(TZ.baseUrl() + '#/s/' + d.c);
  ACT.qrPng = async (d) => { try { if (!window.qrcode) await TZ.loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js'); const qr = window.qrcode(0, 'M'); qr.addData(TZ.baseUrl() + '#/s/' + d.c); qr.make(); const n = qr.getModuleCount(), cell = 12, m = 3, S = (n + 2 * m) * cell, cv = document.createElement('canvas'); cv.width = S; cv.height = S + 60; const x = cv.getContext('2d');
    x.fillStyle = '#fff'; x.fillRect(0, 0, cv.width, cv.height); x.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let c = 0; c < n; c++) if (qr.isDark(r, c)) x.fillRect((c + m) * cell, (r + m) * cell, cell, cell); x.font = '700 28px sans-serif'; x.textAlign = 'center'; x.fillText(d.c, S / 2, S + 40);
    const a = document.createElement('a'); a.href = cv.toDataURL('image/png'); a.download = 'qr-' + d.c + '.png'; a.click(); } catch (e) { TZ.toast('Téléchargement impossible', true); } };

  // ---------- Mon espace : page plus légère (sections repliables) ----------
  const oldMe = routes.me;
  routes.me = async () => {
    await oldMe(); const app = TZ.$('#app'); if (!app || !app.insertAdjacentHTML) return;
    document.querySelectorAll('#app .card').forEach((c) => { const h = c.querySelector(':scope > h2'); if (!h) return; const t = (h.firstChild ? h.firstChild.textContent : '').trim();
      if (!['Notifications', 'Historique des points', 'Qualifications', 'Mon profil'].some((n) => t.startsWith(n))) return;
      const dt = document.createElement('details'); dt.className = 'card'; dt.innerHTML = '<summary>' + esc(t) + '</summary>' + c.innerHTML.replace(h.outerHTML, ''); c.replaceWith(dt); });
    if (state.profile && state.profile.login_phone) app.insertAdjacentHTML('beforeend', '<details class="card"><summary>🔐 Sécurité</summary><p class="small muted">Ton code de récupération permet de retrouver ton compte si tu oublies ton mot de passe.</p><button class="btn" data-act="newRecovery">Générer un nouveau code</button></details>');
  };
})();
