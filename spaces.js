(function () {
  'use strict';
  const { sb, esc, fmt, state, routes, ACT, FORMS, q, view } = TZ;
  const need = () => { if (!state.session) { TZ.go('#/login'); return false; } if (!sb) { view(TZ.NOSB); return false; } return true; };

  // ---------- Espace joueur ----------
  routes.me = async () => {
    if (!need()) return; const uid = state.session.user.id, p = state.profile || {};
    const [res, notes, hist, gen, ms, qual, pend] = await Promise.all([
      q(sb.from('reservations').select('id,status,created_at,competition_id,competitions(name,starts_at)').order('created_at', { ascending: false })),
      q(sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(20)),
      q(sb.from('points_history').select('*').order('created_at', { ascending: false })),
      q(sb.from('rankings_general').select('user_id,points').order('points', { ascending: false }).limit(1000)),
      q(sb.from('matches').select('*, match_results(*)').or(`player1_id.eq.${uid},player2_id.eq.${uid}`)),
      q(sb.from('annual_qualifications').select('*').eq('user_id', uid)), TZ.pendingLegal()]);
    const total = hist.reduce((s, h) => s + h.points, 0), rank = gen.findIndex((r) => r.user_id === uid) + 1;
    const fin = ms.map((m) => ({ m, r: Array.isArray(m.match_results) ? m.match_results[0] : m.match_results })).filter((x) => x.r && x.r.validated_at);
    const wins = fin.filter((x) => x.r.winner_id === uid).length, losses = fin.length - wins;
    view(`<h1>Mon espace</h1><p class="muted">${esc(p.display_name || state.session.user.email)} • ${esc(TZ.ROLE[p.role] || '')}</p>
      ${pend.length ? `<div class="warn"><b>Documents mis à jour : acceptation requise</b><br>${pend.map((d) => `<a href="#/legal/${d.slug}">${esc(d.slug)}</a> (v${d.version}) <button class="btn sm" data-act="acceptLegal" data-slug="${d.slug}" data-version="${d.version}">J'accepte</button>`).join('<br>')}</div>` : ''}
      <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(130px,1fr))"><div class="card stat"><b>${total}</b>Points</div><div class="card stat"><b>${rank || '-'}</b>Classement</div><div class="card stat"><b>${wins}</b>Victoires</div><div class="card stat"><b>${losses}</b>Défaites</div></div>
      <div class="card"><h2>Mes réservations & participations</h2>${res.length ? `<div class="scroll"><table>${res.map((r) => `<tr><td><a href="#/competition/${r.competition_id}">${esc(r.competitions?.name)}</a><br><span class="muted small">${fmt(r.competitions?.starts_at)} • ${TZ.code(r.id)}</span></td><td><span class="badge cy">${TZ.RES[r.status]}</span></td></tr>`).join('')}</table></div>` : '<p class="muted">Aucune réservation.</p>'}</div>
      <div class="card"><h2>Notifications ${notes.some((n) => !n.read) ? '<button class="btn sm" data-act="readAll">Tout marquer lu</button>' : ''}</h2>${notes.map((n) => `<p class="small"><b>${n.read ? '' : '● '}${esc(n.title)}</b> — ${esc(n.body)} <span class="muted">${fmt(n.created_at)}</span></p>`).join('') || '<p class="muted">Aucune notification.</p>'}</div>
      <div class="card"><h2>Historique des points (saisons)</h2>${hist.length ? `<div class="scroll"><table>${hist.map((h) => `<tr><td>${h.season}</td><td>${esc(h.game)}</td><td>${esc(h.reason)}</td><td>${h.points > 0 ? '+' : ''}${h.points}</td></tr>`).join('')}</table></div>` : '<p class="muted">Aucun point pour l\'instant.</p>'}</div>
      <div class="card"><h2>Qualifications Grand Tournoi</h2>${qual.map((x) => `<p>Saison ${x.season} : <span class="badge cy">${esc(x.status)}</span></p>`).join('') || '<p class="muted">Aucune qualification publiée.</p>'}</div>
      <div class="card"><h2>Mon profil</h2><form data-form="profile"><label class="f">Nom affiché<input name="display_name" value="${esc(p.display_name)}" maxlength="40"></label><label class="f">Pseudo gamer (unique)<input name="gamer_tag" value="${esc(p.gamer_tag)}" maxlength="24"></label>
      <label class="f">Téléphone<input name="phone" value="${esc(p.phone)}"></label><label class="f">Ville<input name="city" value="${esc(p.city)}"></label><button class="btn primary">Enregistrer</button></form></div>
      <button class="btn" data-act="logout">Se déconnecter</button>`);
  };
  FORMS.profile = (f, d) => TZ.run(async () => { await q(sb.from('profiles').update({ display_name: d.get('display_name'), gamer_tag: d.get('gamer_tag') || null, phone: d.get('phone') || null, city: d.get('city') || null }).eq('id', state.session.user.id)); await TZ.loadProfile(); }, 'Profil enregistré');
  ACT.readAll = () => TZ.run(() => q(sb.from('notifications').update({ read: true }).eq('read', false)).then(TZ.renderNav));

  // ---------- Composants communs partenaire / admin ----------
  TZ.compForm = (c = {}, partnerId = '', adminMode = false) => {
    const dt = c.starts_at ? new Date(new Date(c.starts_at) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16) : '';
    const L = (t, n, v, x = '') => `<label class="f">${t}<input name="${n}" value="${esc(v)}" ${x}></label>`;
    return `<form class="card" data-form="comp" data-id="${esc(c.id || '')}" data-partner="${esc(partnerId)}" data-admin="${adminMode ? 1 : ''}" data-poster="${esc(c.poster_url || '')}">
      ${c.review_note ? `<div class="warn">Note de l'administration : ${esc(c.review_note)}</div>` : ''}${L('Nom', 'name', c.name, 'required')}${L('Jeu', 'game', c.game, 'required')}
      <label class="f">Description<textarea name="description" rows="3">${esc(c.description)}</textarea></label><label class="f">Date et heure<input type="datetime-local" name="starts_at" value="${dt}" required></label>
      ${L('Lieu (salle)', 'venue_name', c.venue_name)}${L('Ville', 'city', c.city)}${L('Adresse complète', 'address', c.address)}${L('Nombre de places', 'max_players', c.max_players, 'type="number" min="2" required')}
      ${L('Frais de participation', 'fee', c.fee ?? 0, 'type="number" min="0" step="0.01"')}${L('Devise', 'currency', c.currency || 'USD')}${L('Récompenses', 'rewards', c.rewards)}
      <label class="f">Affiche (image)<input type="file" name="poster" accept="image/*"></label>
      <label class="f">Règlement particulier<textarea name="rules" rows="4">${esc(c.rules || '')}</textarea></label>
      <label class="chk"><input type="checkbox" name="req" ${c.requires_rules_acceptance === false ? '' : 'checked'}>Exiger l'acceptation du règlement avant réservation</label>
      <button class="btn primary">Enregistrer ${adminMode ? '' : 'le brouillon'}</button></form>`;
  };
  FORMS.comp = (f, d) => TZ.run(async () => {
    const id = f.dataset.id, adminMode = !!f.dataset.admin; let poster = f.dataset.poster || null; const file = d.get('poster');
    if (file && file.size) poster = await TZ.upload('posters', file);
    const row = { name: d.get('name'), game: d.get('game'), description: d.get('description'), starts_at: new Date(d.get('starts_at')).toISOString(), venue_name: d.get('venue_name'), city: d.get('city'), address: d.get('address'),
      max_players: +d.get('max_players'), fee: +d.get('fee') || 0, currency: d.get('currency') || 'USD', rewards: d.get('rewards'), poster_url: poster, requires_rules_acceptance: !!d.get('req') };
    let cid = id;
    if (id) { if (!adminMode) row.status = 'draft'; await q(sb.from('competitions').update(row).eq('id', id)); }
    else { row.partner_id = f.dataset.partner || null; row.created_by = state.session.user.id; row.status = 'draft'; cid = (await q(sb.from('competitions').insert(row).select('id').single())).id; }
    await q(sb.from('competition_rules').upsert({ competition_id: cid, content: d.get('rules') }));
    TZ.go(adminMode ? '#/admin/comps' : '#/partner/comps');
  }, 'Compétition enregistrée');

  TZ.roster = async (compId, canConfirm, admin) => {
    const rows = await TZ.rpc('reservation_roster', { p_competition: compId }); TZ.cache['roster:' + compId] = rows;
    const c = (await sb.from('competitions').select('fee,currency').eq('id', compId).single()).data || {};
    const n = rows.filter((r) => r.status === 'confirmed').length;
    return `<p class="small muted">${n} confirmé(s) • ${rows.length} réservation(s) <button class="btn sm" data-act="exportCsv" data-id="${compId}">⬇ CSV</button></p><div class="scroll"><table><tr><th>Code</th><th>Joueur</th><th>Statut</th><th></th></tr>
      ${rows.map((r) => `<tr><td>${TZ.code(r.reservation_id)}</td><td>${esc(r.gamer_tag || r.display_name)}<br><span class="muted small">${esc(r.phone)}</span></td><td><span class="badge cy">${TZ.RES[r.status]}</span>${r.paid_amount != null ? `<br><span class="small">${r.paid_amount} ${esc(c.currency)}</span>` : ''}</td>
      <td>${r.status === 'payment_pending' && canConfirm ? `<button class="btn sm primary" data-act="confirmPay" data-id="${r.reservation_id}" data-fee="${c.fee}">Confirmer paiement</button>` : ''}${admin && ['payment_pending', 'confirmed', 'waitlist'].includes(r.status) ? ` <button class="btn sm danger" data-act="cancelRes" data-id="${r.reservation_id}">Annuler</button>` : ''}</td></tr>`).join('')}</table></div>`;
  };
  ACT.confirmPay = (d) => { const a = prompt('Montant reçu au guichet :', d.fee); if (a === null) return; TZ.run(() => TZ.rpc('confirm_payment', { p_reservation: d.id, p_amount: +a, p_note: null }), 'Paiement confirmé'); };

  TZ.messages = async (partnerId, asAdmin) => {
    const rows = await q(sb.from('messages').select('*').eq('partner_id', partnerId).order('created_at', { ascending: false }).limit(50));
    const K = { message: 'Message', change_request: 'Demande de modification', alert: 'Alerte' };
    return `<form data-form="msg" data-partner="${partnerId}"><textarea name="body" rows="2" required placeholder="Votre message…"></textarea>${asAdmin ? '<select name="kind"><option value="message">Message</option><option value="change_request">Demande de modification</option><option value="alert">Alerte administrative</option></select>' : ''}<button class="btn primary sm">Envoyer</button></form>
      ${rows.map((m) => `<p class="small"><span class="badge ${m.kind === 'alert' ? 'red' : 'cy'}">${K[m.kind]}</span> ${esc(m.body)} <span class="muted">${fmt(m.created_at)}</span></p>`).join('') || '<p class="muted small">Aucun message.</p>'}`;
  };
  FORMS.msg = (f, d) => TZ.run(() => q(sb.from('messages').insert({ partner_id: f.dataset.partner, sender_id: state.session.user.id, kind: d.get('kind') || 'message', body: d.get('body') })), 'Message envoyé');

  // ---------- Espace partenaire ----------
  routes.partner = async (tab = 'info', arg = '') => {
    if (!need()) return; const ms = state.members;
    if (!ms.length) return view('<div class="card">Aucun établissement n\'est associé à votre compte. Contactez TAMZORYA GAMING.</div>');
    const m = ms.find((x) => x.partner_id === arg) || ms[0], p = m.partners;
    const T = [['info', 'Ma salle'], ['comps', 'Compétitions'], ['new', 'Proposer'], ['roster', 'Réservations'], ['msgs', 'Messages']];
    const comps = await q(sb.from('competitions').select('*, competition_rules(content)').eq('partner_id', p.id).order('starts_at', { ascending: false }));
    let body = '';
    if (tab === 'info') {
      const L = (t, n) => `<label class="f">${t}<input name="${n}" value="${esc(p[n])}"></label>`;
      body = `<div class="warn">Fiche publique : ${p.is_public_validated ? 'validée ✅' : 'en attente de validation'}</div>
        <form class="card" data-form="pinfo" data-id="${p.id}"><label class="f">Description<textarea name="description" rows="3">${esc(p.description)}</textarea></label>${L('Téléphone', 'phone')}${L('E-mail', 'email')}${L('Province', 'province')}${L('Ville', 'city')}${L('Commune', 'commune')}${L('Quartier', 'quartier')}${L('Avenue', 'avenue')}${L('Référence pour retrouver la salle', 'landmark')}
        <label class="f">Logo<input type="file" name="logo" accept="image/*"></label><label class="f">Ajouter des photos<input type="file" name="photos" accept="image/*" multiple></label><button class="btn primary">Enregistrer</button></form>`;
    } else if (tab === 'comps') {
      body = comps.map((c) => `<div class="card"><div class="row"><h3>${esc(c.name)}</h3><span class="badge cy">${TZ.COMP[c.status]}</span></div><p class="muted small">${esc(c.game)} • ${fmt(c.starts_at)}</p>${c.review_note ? `<p class="warn small">${esc(c.review_note)}</p>` : ''}
        <div class="row">${['draft', 'changes_requested'].includes(c.status) ? `<a class="btn sm" href="#/partner/edit/${c.id}">Modifier</a><button class="btn sm primary" data-act="submitComp" data-id="${c.id}">Soumettre à TAMZORYA GAMING</button>` : ''}<a class="btn sm" href="#/partner/roster/${c.id}">Réservations</a></div></div>`).join('') || '<p class="muted">Aucune compétition.</p>';
    } else if (tab === 'new') body = TZ.compForm({}, p.id);
    else if (tab === 'edit') { const c = comps.find((x) => x.id === arg); body = c ? TZ.compForm({ ...c, rules: c.competition_rules?.content }, p.id) : '<p>Introuvable.</p>'; }
    else if (tab === 'roster') {
      body = `<select onchange="location.hash='#/partner/roster/'+this.value"><option value="">Choisir une compétition…</option>${comps.map((c) => `<option value="${c.id}" ${c.id === arg ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
      if (arg) body += await TZ.roster(arg, m.can_confirm_payments, false);
    } else if (tab === 'msgs') body = await TZ.messages(p.id, false);
    view(`<h1>Espace partenaire — ${esc(p.name)}</h1>${TZ.tabs('partner', T, tab === 'edit' ? 'comps' : tab)}${body}`);
  };
  ACT.submitComp = (d) => TZ.run(() => q(sb.from('competitions').update({ status: 'submitted' }).eq('id', d.id)), 'Soumise à TAMZORYA GAMING');
  FORMS.pinfo = (f, d) => TZ.run(async () => {
    const row = {}; ['description', 'phone', 'email', 'province', 'city', 'commune', 'quartier', 'avenue', 'landmark'].forEach((k) => { row[k] = d.get(k) || null; });
    const logo = d.get('logo'); if (logo && logo.size) row.logo_url = await TZ.upload('partner-media', logo);
    const ph = d.getAll('photos').filter((x) => x.size); if (ph.length) { const cur = state.members[0].partners.photos || []; row.photos = [...cur, ...(await Promise.all(ph.map((x) => TZ.upload('partner-media', x))))]; }
    await q(sb.from('partners').update(row).eq('id', f.dataset.id)); await TZ.loadProfile();
  }, 'Fiche enregistrée (en attente de validation)');
})();
