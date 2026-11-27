/* Tournois : groupes, aller-retour, tableau éliminatoire (administration + affichage public). */
(function () {
  'use strict';
  const { sb, esc, fmt, state, routes, ACT, FORMS, q, view } = TZ;
  const TB = [['', '—'], ['goal_diff', 'Différence de buts'], ['goals_for', 'Buts marqués'], ['head_to_head', 'Confrontation directe'], ['wins', 'Victoires']];
  const RULE = { extra_time: 'Prolongation', penalties: 'Tirs au but', replay: 'Match d\'appui', admin: 'Décision administrative' };

  const groupsHtml = (rows, cfg, fixtures) => {
    const G = {}; rows.forEach((r) => { (G[r.group_name] = G[r.group_name] || []).push(r); });
    return Object.entries(G).map(([g, list]) => `<div class="card"><h3>Groupe ${esc(g)}</h3><div class="scroll"><table class="gt"><tr><th>#</th><th>Joueur</th><th>J</th><th>V</th><th>N</th><th>D</th><th>+/−</th><th>Pts</th></tr>
      ${list.map((r) => `<tr class="${r.pos <= cfg.qualifiers_per_group ? 'qual' : ''}"><td>${r.pos}</td><td>${esc(r.name)}</td><td>${r.played}</td><td>${r.wins}</td><td>${r.draws}</td><td>${r.losses}</td><td>${r.gd > 0 ? '+' : ''}${r.gd}</td><td><b>${r.points}</b></td></tr>`).join('')}</table></div>
      ${fixtures ? `<details><summary class="small">Rencontres</summary>${fixtures.filter((m) => m.group_name === g).map((m) => `<div class="fx"><span>${esc(m.player1 || '?')}</span><b>${m.validated ? m.score1 + ' : ' + m.score2 : '—'}</b><span>${esc(m.player2 || '?')}</span></div>`).join('')}</details>` : ''}</div>`).join('') || '<div class="card center muted">Les groupes arrivent après le tirage</div>';
  };
  const tiesHtml = (ties, ms) => {
    const R = {}; ties.forEach((t) => { (R[t.round_no] = R[t.round_no] || []).push(t); });
    return Object.entries(R).map(([r, list]) => {
      const first = ms.find((m) => m.round_no === +r), name = first ? String(first.round).split(' — ')[0] : 'Tour ' + r;
      return `<div class="rnd2"><h3>${esc(name)}</h3>${list.sort((a, b) => a.slot - b.slot).map((t) => {
        const legs = ms.filter((m) => m.round_no === t.round_no && m.slot === t.slot).sort((a, b) => a.leg - b.leg), l1 = legs[0] || {}, a = l1.player1, b = l1.player2;
        let ga = 0, gb = 0, done = 0; legs.forEach((m) => { if (m.validated) { done++; if (m.player1 === a) { ga += m.score1; gb += m.score2; } else { ga += m.score2; gb += m.score1; } } });
        return `<div class="tie ${t.status === 'tiebreak' ? 'tb' : ''}"><div class="${t.winner_id && done >= t.legs && ga > gb ? 'win' : ''}"><span>${esc(a || '⏳')}</span><b>${done ? ga : ''}</b></div><div class="${t.winner_id && done >= t.legs && gb > ga ? 'win' : ''}"><span>${b ? esc(b) : (t.status === 'bye' ? 'Exempt' : '⏳')}</span><b>${done ? gb : ''}</b></div>
          ${t.legs === 2 ? legs.map((m) => `<small class="muted">${m.leg === 1 ? 'Aller' : 'Retour'} : ${m.validated ? (m.leg === 1 ? m.score1 + '-' + m.score2 : m.score2 + '-' + m.score1) : '—'}</small>`).join('') : ''}
          ${t.status === 'tiebreak' ? '<small class="warnt">⚖️ Égalité — départage en cours</small>' : ''}</div>`; }).join('')}</div>`; }).join('');
  };

  const oldBracket = routes.bracket;
  routes.bracket = async (id, tab) => {
    const cfg = sb ? (await sb.from('competition_formats').select('*').eq('competition_id', id).maybeSingle()).data : null;
    if (!cfg || cfg.status === 'draft') return oldBracket(id);
    const hasG = cfg.format === 'groups', t = tab || (['knockout', 'finished'].includes(cfg.status) || !hasG ? 'knockout' : 'groups');
    const c = (await TZ.getComps()).items.find((x) => x.id === id);
    const ms = (await sb.from('public_matches').select('*').eq('competition_id', id).order('matchday').order('scheduled_at')).data || [];
    let body;
    if (t === 'groups') { const rows = await TZ.rpc('group_table', { p_comp: id }); body = groupsHtml(rows, cfg, ms.filter((m) => m.stage === 'group')); }
    else { const ties = (await sb.from('bracket_ties').select('*').eq('competition_id', id)).data || []; body = ties.length ? `<div class="bracket">${tiesHtml(ties, ms.filter((m) => m.stage === 'knockout' || m.round_no))}</div>` : `<div class="card center muted">${hasG ? 'Le tableau sera généré après la phase de groupes' : 'Le tirage arrive bientôt 🎲'}</div>`; }
    view(`<div class="sec"><h1>🏟️ ${esc(c ? c.name : 'Tournoi')}</h1><a class="btn sm" href="#/competition/${esc(id)}">‹</a></div>${hasG ? TZ.tabs('bracket/' + id, [['groups', 'Groupes'], ['knockout', 'Éliminatoires']], t).replace(/href="#\/bracket\/[^/"]+\/([a-z]+)"/g, 'href="#/bracket/' + id + '/$1"') : ''}${body}`);
  };
  const oldComp = routes.competition;
  routes.competition = async (id) => {
    await oldComp(id); if (!sb) return;
    try { const f = (await sb.from('competition_formats').select('status').eq('competition_id', id).maybeSingle()).data; const b = document.querySelector('[data-act=ics]');
      if (f && f.status !== 'draft' && b && b.insertAdjacentHTML && !document.querySelector('a[href^="#/bracket/"]')) b.insertAdjacentHTML('afterend', `<a class="btn sm" href="#/bracket/${esc(id)}">🏟️ Tournoi</a>`); } catch (e) { /* ignore */ }
  };

  // ---------- Administration ----------
  TZ.adminFormats = async (arg) => {
    let comps; try { comps = await q(sb.from('competitions').select('id,name,status').order('starts_at', { ascending: false })); } catch (e) { return '<div class="card center muted">Erreur de chargement</div>'; }
    const pick = `<select onchange="location.hash='#/admin/formats/'+this.value"><option value="">Choisir une compétition…</option>${comps.map((c) => `<option value="${c.id}" ${c.id === arg ? 'selected' : ''}>${esc(c.name)}</option>`).join('')}</select>`;
    if (!arg) return '<h1>🏟️ Formats de compétition</h1>' + pick + '<p class="muted center">Choisis une compétition pour configurer son format.</p>';
    let fmt0; try { fmt0 = (await sb.from('competition_formats').select('*').eq('competition_id', arg).maybeSingle()).data; } catch (e) { return '<div class="card center muted">Exécute d\'abord la migration 011</div>'; }
    const n = (await sb.from('reservations').select('id', { count: 'exact', head: true }).eq('competition_id', arg).eq('status', 'confirmed')).count || 0;
    const c = fmt0 || { format: 'groups', status: 'draft', groups_count: null, qualifiers_per_group: 2, points_win: 3, points_draw: 1, points_loss: 0, tiebreakers: ['goal_diff', 'goals_for', 'head_to_head'], group_double_round: false, two_legs: true, final_two_legs: false, tiebreak_rule: 'extra_time', seeding: 'random', has_goals: true, allow_draws: true };
    const locked = ['started', 'knockout', 'finished'].includes(c.status), plan = await TZ.rpc('plan_preview', { p_n: n, p_groups: c.groups_count, p_qual: c.qualifiers_per_group, p_format: c.format }).catch(() => null);
    const sel = (i) => `<select name="tb${i}">${TB.map(([k, l]) => `<option value="${k}" ${(c.tiebreakers || [])[i] === k ? 'selected' : ''}>${l}</option>`).join('')}</select>`;
    const chk = (nm, lbl, v) => `<label class="chk"><input type="checkbox" name="${nm}" ${v ? 'checked' : ''}>${lbl}</label>`;
    const planHtml = (p) => !p ? '' : p.error ? `<div class="notice">${esc(p.error)}</div>` : `<div class="notice">👥 ${p.participants} participants${c.format === 'groups' ? ` • ${p.groups} groupes de ${p.size_min}${p.size_max !== p.size_min ? '–' + p.size_max : ''} • ${p.qualified} qualifiés` : ''} • tableau de ${p.bracket}</div>${(p.warnings || []).map((w) => `<div class="notice warnn">⚠️ ${esc(w)}</div>`).join('')}`;
    let html = `<h1>🏟️ Formats de compétition</h1>${pick}<div class="row" style="margin:10px 0"><span class="badge ${c.status === 'draft' ? 'gold' : 'cy'}">${{ draft: 'Brouillon', drawn: 'Tirage effectué', started: 'Démarrée', knockout: 'Phase éliminatoire', finished: 'Terminée' }[c.status]}</span><span class="muted small">${n} participant(s) confirmé(s)</span></div><div id="fmtplan">${planHtml(plan)}</div>
      <form class="card" data-form="fmtcfg" data-comp="${arg}"><fieldset ${locked ? 'disabled' : ''} style="border:0;padding:0;margin:0"><label class="f">Format<select name="format"><option value="groups" ${c.format === 'groups' ? 'selected' : ''}>Phase de groupes puis élimination directe</option><option value="direct" ${c.format === 'direct' ? 'selected' : ''}>Élimination directe (16 participants)</option></select></label>
        <div class="row nowrap"><label class="f" style="flex:1">Nombre de groupes<input type="number" name="groups_count" min="1" max="32" value="${c.groups_count ?? ''}" placeholder="auto"></label><label class="f" style="flex:1">Qualifiés par groupe<input type="number" name="qualifiers_per_group" min="1" max="8" value="${c.qualifiers_per_group}"></label></div>
        <div class="row nowrap"><label class="f" style="flex:1">Victoire<input type="number" name="points_win" value="${c.points_win}"></label><label class="f" style="flex:1">Nul<input type="number" name="points_draw" value="${c.points_draw}"></label><label class="f" style="flex:1">Défaite<input type="number" name="points_loss" value="${c.points_loss}"></label></div>
        <label class="f">Départage des groupes (dans l'ordre)${sel(0)}${sel(1)}${sel(2)}</label>
        ${chk('group_double_round', 'Matchs aller-retour dans les groupes', c.group_double_round)}${chk('two_legs', 'Éliminatoires en aller-retour (sauf finale)', c.two_legs)}${chk('final_two_legs', 'Finale en aller-retour', c.final_two_legs)}${chk('has_goals', 'Le jeu a des buts / points marqués', c.has_goals)}${chk('allow_draws', 'Matchs nuls autorisés', c.allow_draws)}
        <label class="f">Règle de départage (éliminatoires)<select name="tiebreak_rule">${Object.entries(RULE).map(([k, l]) => `<option value="${k}" ${c.tiebreak_rule === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
        <label class="f">Tirage<select name="seeding"><option value="random" ${c.seeding === 'random' ? 'selected' : ''}>Aléatoire</option><option value="level" ${c.seeding === 'level' ? 'selected' : ''}>Réparti selon le niveau</option></select></label></fieldset>
        <div class="row"><button type="button" class="btn" data-act="fmtPreview">🔍 Vérifier</button>${locked ? '' : '<button class="btn primary">Enregistrer</button>'}</div></form>`;
    if (fmt0) {
      const rowBtns = [];
      if (['draft', 'drawn'].includes(c.status)) rowBtns.push(`<button class="btn" data-act="fmtDraw" data-comp="${arg}" data-m="random" data-re="${c.status === 'drawn' ? 1 : ''}">🎲 Tirage aléatoire</button><button class="btn" data-act="fmtDraw" data-comp="${arg}" data-m="level" data-re="${c.status === 'drawn' ? 1 : ''}">📊 Tirage par niveau</button>`);
      if (c.status === 'drawn') rowBtns.push(`<button class="btn primary" data-act="fmtStart" data-comp="${arg}">▶ Démarrer la compétition</button>`);
      if (c.format === 'groups' && ['started', 'knockout'].includes(c.status)) rowBtns.push(`<button class="btn" data-act="fmtQual" data-comp="${arg}">🧮 Calculer les qualifiés</button>`);
      html += `<div class="card"><h3>⚙️ Actions</h3><div class="row">${rowBtns.join('') || '<span class="muted small">Aucune action disponible</span>'}</div></div>`;
      const quals = (await sb.from('qualifications').select('*').eq('competition_id', arg).order('position')).data || [];
      if (quals.length) {
        const N = {}; ((await sb.from('profiles').select('id,display_name,gamer_tag').in('id', quals.map((x) => x.user_id))).data || []).forEach((p) => { N[p.id] = p.gamer_tag || p.display_name; });
        const validated = quals.every((x) => x.status === 'validated');
        html += `<div class="card"><h3>🏟️ Qualifiés (${quals.length}) ${validated ? '<span class="badge cy">validés</span>' : '<span class="badge gold">à valider</span>'}</h3><p class="small">${quals.map((x) => esc(N[x.user_id]) + ' (' + x.position + 'e)').join(' • ')}</p>
          <div class="row">${validated ? `<button class="btn primary" data-act="fmtKo" data-comp="${arg}">🏁 Générer le tableau éliminatoire</button>` : `<button class="btn primary" data-act="fmtValQ" data-comp="${arg}">✅ Valider les qualifications</button>`}</div></div>`;
      }
      const ties = ((await sb.from('bracket_ties').select('*').eq('competition_id', arg).eq('status', 'tiebreak')).data || []);
      if (ties.length) {
        const legs = (await sb.from('matches').select('round_no,slot,player1_id,player2_id,leg').eq('competition_id', arg).eq('leg', 1).in('round_no', ties.map((t) => t.round_no))).data || [];
        const N = {}; ((await sb.from('profiles').select('id,display_name,gamer_tag').in('id', legs.flatMap((m) => [m.player1_id, m.player2_id]).filter(Boolean))).data || []).forEach((p) => { N[p.id] = p.gamer_tag || p.display_name; });
        html += `<div class="card glow"><h3>⚖️ Égalités à départager (${RULE[c.tiebreak_rule]})</h3>${ties.map((t) => { const m = legs.find((x) => x.round_no === t.round_no && x.slot === t.slot) || {}; return `<div class="row" style="margin-bottom:6px"><button class="btn sm" data-act="fmtTie" data-comp="${arg}" data-r="${t.round_no}" data-s="${t.slot}" data-w="${m.player1_id}">🏆 ${esc(N[m.player1_id])}</button><span class="muted">ou</span><button class="btn sm" data-act="fmtTie" data-comp="${arg}" data-r="${t.round_no}" data-s="${t.slot}" data-w="${m.player2_id}">🏆 ${esc(N[m.player2_id])}</button></div>`; }).join('')}</div>`;
      }
      if (c.format === 'groups' && c.status !== 'draft') { const rows = await TZ.rpc('group_table', { p_comp: arg }).catch(() => []); html += '<h3 class="sechead">📊 Groupes</h3>' + groupsHtml(rows, c, null) + `<a class="btn block" href="#/admin/matches/${arg}">⚔️ Programmer / saisir les résultats</a>`; }
      else if (c.status !== 'draft') html += `<a class="btn block" href="#/admin/matches/${arg}">⚔️ Programmer / saisir les résultats</a>`;
      const log = (await sb.from('competition_log').select('*').eq('competition_id', arg).order('created_at', { ascending: false }).limit(15)).data || [];
      html += `<details class="card"><summary>🕘 Historique des opérations</summary>${log.map((l) => `<p class="small"><b>${esc(l.action)}</b> • ${fmt(l.created_at)}<br><span class="muted">${esc(l.detail || '')}</span></p>`).join('') || '<p class="muted small">Aucune</p>'}</details>`;
    }
    return html;
  };
  const cfgOf = (f) => { const d = new FormData(f), tb = [...new Set([d.get('tb0'), d.get('tb1'), d.get('tb2')].filter(Boolean))];
    return { format: d.get('format'), groups_count: d.get('groups_count') || null, qualifiers_per_group: d.get('qualifiers_per_group'), points_win: d.get('points_win'), points_draw: d.get('points_draw'), points_loss: d.get('points_loss'), tiebreakers: tb, group_double_round: !!d.get('group_double_round'),
      two_legs: !!d.get('two_legs'), final_two_legs: !!d.get('final_two_legs'), has_goals: !!d.get('has_goals'), allow_draws: !!d.get('allow_draws'), tiebreak_rule: d.get('tiebreak_rule'), seeding: d.get('seeding') }; };
  FORMS.fmtcfg = (f) => TZ.run(() => TZ.rpc('save_format', { p_comp: f.dataset.comp, p_cfg: cfgOf(f) }), 'Configuration enregistrée ✅');
  ACT.fmtPreview = async () => {
    const f = TZ.$('form[data-form=fmtcfg]'); if (!f) return; const c = cfgOf(f);
    const n = (await sb.from('reservations').select('id', { count: 'exact', head: true }).eq('competition_id', f.dataset.comp).eq('status', 'confirmed')).count || 0;
    try { const p = await TZ.rpc('plan_preview', { p_n: n, p_groups: c.groups_count ? +c.groups_count : null, p_qual: +c.qualifiers_per_group, p_format: c.format });
      TZ.$('#fmtplan').innerHTML = p.error ? `<div class="notice">${esc(p.error)}</div>` : `<div class="notice">👥 ${p.participants} participants${c.format === 'groups' ? ` • ${p.groups} groupes de ${p.size_min}${p.size_max !== p.size_min ? '–' + p.size_max : ''} • ${p.qualified} qualifiés` : ''} • tableau de ${p.bracket}</div>${(p.warnings || []).map((w) => `<div class="notice warnn">⚠️ ${esc(w)}</div>`).join('') || '<div class="notice">✅ Configuration cohérente</div>'}`; } catch (e) { TZ.toast(TZ.errMsg(e), true); }
  };
  ACT.fmtDraw = async (d) => { if (d.re && !confirm('Refaire le tirage ? Les rencontres actuelles seront remplacées.')) return;
    try { const p = await TZ.rpc('draw_competition', { p_comp: d.comp, p_method: d.m }); if (p && (p.warnings || []).length && !confirm('Avertissements :\n' + p.warnings.join('\n') + '\n\nContinuer ?')) { /* tirage déjà effectué : l'admin peut recommencer */ } TZ.toast('Tirage effectué 🎲'); TZ.route(); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };
  ACT.fmtStart = (d) => { if (confirm('Démarrer la compétition ? Le tirage sera verrouillé.')) TZ.run(() => TZ.rpc('start_competition', { p_comp: d.comp }), 'Compétition démarrée ▶'); };
  ACT.fmtQual = async (d) => { try { await TZ.rpc('compute_qualifiers', { p_comp: d.comp, p_force: false }); TZ.toast('Qualifiés calculés 🧮'); TZ.route(); } catch (e) { if (/restent à valider/.test(e.message) && confirm(e.message + '\n\nCalculer quand même ?')) TZ.run(() => TZ.rpc('compute_qualifiers', { p_comp: d.comp, p_force: true }), 'Qualifiés calculés'); else TZ.toast(TZ.errMsg(e), true); } };
  ACT.fmtValQ = (d) => TZ.run(() => TZ.rpc('validate_qualifications', { p_comp: d.comp }), 'Qualifications validées ✅');
  ACT.fmtKo = (d) => { if (confirm('Générer le tableau éliminatoire ?')) TZ.run(() => TZ.rpc('generate_knockout', { p_comp: d.comp }), 'Tableau généré 🏁'); };
  ACT.fmtTie = (d) => { const n = prompt('Note du départage (facultatif) :'); if (n === null) return; TZ.run(() => TZ.rpc('decide_tie', { p_comp: d.comp, p_round: +d.r, p_slot: +d.s, p_winner: d.w, p_note: n || null }), 'Départage enregistré ⚖️'); };
})();
