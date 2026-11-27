/* Nouveautés : réputation, carte gamer, salles (galerie), expérience enrichie, administration des fonctionnalités. */
(function () {
  'use strict';
  const { sb, esc, fmt, state, routes, ACT, FORMS, q, view } = TZ;
  TZ.FEATROUTES.rep = 'reputation'; TZ.FEATROUTES.card = 'gamer_card'; TZ.FEATROUTES.venue = 'ux_plus';
  const login = (h) => { TZ.LS.set('tz_next', h); TZ.go('#/login'); };
  const av = (u, n, big) => u ? `<img class="av${big ? ' big' : ''}" src="${esc(u)}" alt="">` : `<span class="av${big ? ' big' : ''}">${esc(String(n || '?').slice(0, 1).toUpperCase())}</span>`;
  const me = () => state.session && state.session.user.id;

  // ---------- Réputation ----------
  const lvlCard = (r) => { const span = r.next_min ? r.next_min - r.level_min : 1, pct = r.next_min ? Math.max(0, Math.min(100, Math.round((r.xp - r.level_min) * 100 / span))) : 100;
    return `<div class="lvl"><div class="lvl-ico">${esc(r.level_icon)}</div><div class="lvl-txt"><small>NIVEAU</small><h2>${esc(r.level)}</h2><div class="pbar"><i style="width:${pct}%"></i></div><small>${r.xp} XP${r.next_min ? ` • encore ${r.next_min - r.xp} XP pour <b>${esc(r.next_name)}</b>` : ' • niveau maximum 👑'}</small></div></div>`; };
  const tiles = (r) => `<div class="tiles"><div class="tile"><b>${r.total}</b><span>⚔️ Matchs</span></div><div class="tile"><b>${r.wins}</b><span>🏆 Victoires</span></div><div class="tile"><b>${r.losses}</b><span>💔 Défaites</span></div>${r.draws ? `<div class="tile"><b>${r.draws}</b><span>🤝 Nuls</span></div>` : ''}<div class="tile"><b>${r.winrate == null ? '—' : r.winrate + '%'}</b><span>📈 Victoires</span></div><div class="tile"><b>${r.xp}</b><span>⭐ XP</span></div><div class="tile"><b>${r.played}</b><span>🎮 Compétitions</span></div><div class="tile"><b>${r.rank ? '#' + r.rank : '—'}</b><span>🥇 Classement</span></div></div>`;
  routes.rep = async (id) => {
    if (!state.session && !id) return login('#/rep');
    const uid = id || me(), r = await TZ.rpc('gamer_reputation', { p_user: uid });
    if (!r) return TZ.fview('reputation', '<div class="card center">Profil introuvable 🤷</div>');
    const pr = (await sb.from('public_profiles').select('name,avatar_url').eq('id', uid).maybeSingle()).data || { name: (state.profile && (state.profile.gamer_tag || state.profile.display_name)) || 'Moi' };
    const tr = r.badges.filter((b) => b.kind === 'trophy'), bd = r.badges.filter((b) => b.kind !== 'trophy');
    const tile = (b) => `<div class="bdg" title="${esc(b.description || '')}"><span>${esc(b.icon)}</span><b>${esc(b.name)}</b>${b.competition ? `<small>${esc(b.competition)}</small>` : ''}</div>`;
    TZ.fview('reputation', `<div class="row"><a class="btn sm" href="${id ? '#/u/' + id : '#/me'}">‹</a>${av(pr.avatar_url, pr.name)}<h1 style="margin:0">${esc(pr.name)}</h1></div>
      <section class="rsec">${lvlCard(r)}</section><section class="rsec"><h3 class="sechead">📊 Statistiques</h3>${tiles(r)}</section>
      <section class="rsec"><h3 class="sechead">🏆 Trophées</h3><div class="bgrid">${tr.map(tile).join('') || '<div class="card center muted">Aucun trophée pour l\'instant</div>'}</div></section>
      <section class="rsec"><h3 class="sechead">🏅 Badges</h3><div class="bgrid">${bd.map(tile).join('') || '<div class="card center muted">Aucun badge pour l\'instant</div>'}</div></section>
      <section class="rsec"><h3 class="sechead">📜 Historique des compétitions</h3>${r.history.map((h) => `<a class="conv" href="#/competition/${h.competition_id}"><div class="cmid"><b>${esc(h.competition)}</b><small>${esc(h.game)} • ${fmt(h.date)}</small></div><div class="cend">${h.rank ? `<span class="badge cy">${['🥇', '🥈', '🥉'][h.rank - 1] || '#' + h.rank}</span>` : ''}</div></a>`).join('') || '<div class="card center muted">Aucune compétition jouée</div>'}</section>
      <section class="rsec"><h3 class="sechead">⚡ Derniers XP</h3>${r.recent_xp.map((x) => `<div class="conv"><div class="cmid"><b>+${x.xp} XP</b><small>${esc(x.label)}${x.source ? ' • ' + esc(x.source) : ''}</small></div><div class="cend"><em>${fmt(x.at)}</em></div></div>`).join('') || '<div class="card center muted">Aucun XP gagné pour l\'instant</div>'}</section>`);
  };

  // Profil public : ajoute réputation / carte / message quand les fonctions sont activées
  const oldU = routes.u;
  routes.u = async (id) => {
    await oldU(id);
    const box = TZ.$('#posts'); if (!box || !box.insertAdjacentHTML) return;
    let h = '';
    if (TZ.feat('reputation')) { try { const r = await TZ.rpc('gamer_reputation', { p_user: id }); if (r) h += `<div class="card"><div class="lvlmini">${lvlCard(r)}</div>${tiles(r)}<div class="row" style="margin-top:10px"><a class="btn sm" href="#/rep/${id}">🏅 Réputation complète</a></div></div>`; } catch (e) { /* ignore */ } }
    const acts = [];
    if (TZ.feat('gamer_card')) acts.push(`<a class="btn sm" href="#/card/${id}">🪪 Carte gamer</a>`);
    if (TZ.feat('messaging') && me() && me() !== id) acts.push(`<a class="btn sm primary" href="#/chat/new/${id}">💬 Message</a>`, `<button class="btn sm danger" data-act="reportUser" data-id="${id}">⚑ Signaler</button>`);
    if (acts.length) h += `<div class="row" style="margin-bottom:12px">${acts.join('')}</div>`;
    if (h) box.insertAdjacentHTML('beforebegin', h);
  };
  ACT.reportUser = async (d) => { const r = prompt('Pourquoi signaler ce gamer ?'); if (r === null) return; try { await TZ.rpc('report_user', { p_user: d.id, p_conversation: null, p_reason: r }); TZ.toast('Signalement transmis 🙏'); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };

  // ---------- Carte gamer ----------
  const profileUrl = (c) => TZ.baseUrl() + '#/u/' + c.id;
  routes.card = async (id) => {
    if (!state.session && !id) return login('#/card');
    const c = await TZ.rpc('gamer_card', { p_user: id || me() });
    if (!c) return TZ.fview('gamer_card', '<div class="card center">Carte introuvable 🤷</div>');
    TZ._card = c;
    TZ.fview('gamer_card', `<div class="sec"><h1>🪪 ${id && id !== me() ? 'Carte gamer' : 'Ma carte gamer'}</h1></div>
      <div class="gcard"><div class="gc-top"><img src="logo-icon.png" alt="" width="34" height="34"><span>TAMZORYA GAMING</span><em>${esc(c.level_icon)} ${esc(c.level)}</em></div>
        <div class="gc-main">${av(c.avatar, c.name, true)}<div><h2>${esc(c.name)}</h2><div class="gid">${esc(c.gamer_id)}</div></div></div>
        <div class="gc-stats"><div><b>${c.wins}</b>Victoires</div><div><b>${c.winrate == null ? '—' : c.winrate + '%'}</b>Win rate</div><div><b>${c.trophies}</b>Trophées</div><div><b>${c.rank ? '#' + c.rank : '—'}</b>Classement</div></div>
        <div class="gc-bot"><div><small>XP</small><b>${c.xp}</b><small>Play • Compete • Win</small></div><div class="gc-qr" id="gqr"></div></div></div>
      <div class="row center" style="margin-top:14px"><button class="btn primary" data-act="cardShare">📣 Partager</button><button class="btn" data-act="cardDl">⬇️ Télécharger l'image</button><button class="btn" data-act="cardQr">📲 Faire scanner</button></div>`);
    TZ.qr(TZ.$('#gqr'), profileUrl(c));
  };
  ACT.cardShare = () => TZ.shareSheet(profileUrl(TZ._card), '🎮 Ma carte gamer TAMZORYA GAMING');
  ACT.cardQr = () => { const s = TZ.$('#sheet'); s.innerHTML = `<div class="sheet-in center"><h2>${esc(TZ._card.name)}</h2><div id="bigqr" class="qr"></div><p class="muted small">Scanne pour ouvrir mon profil</p><button class="btn block" data-act="sheetClose">Fermer</button></div>`; s.hidden = false; TZ.qr(TZ.$('#bigqr'), profileUrl(TZ._card)); };
  const loadImg = (u) => new Promise((ok) => { if (!u) return ok(null); const i = new Image(); i.crossOrigin = 'anonymous'; i.onload = () => ok(i); i.onerror = () => ok(null); i.src = u; });
  ACT.cardDl = async () => {
    const c = TZ._card; TZ.toast('Création de l\'image…');
    try {
      if (!window.qrcode) await TZ.loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js');
      const W = 1080, H = 1350, cv = document.createElement('canvas'); cv.width = W; cv.height = H; const x = cv.getContext('2d');
      const g = x.createLinearGradient(0, 0, W, H); g.addColorStop(0, '#07102a'); g.addColorStop(1, '#0b2a6b'); x.fillStyle = g; x.fillRect(0, 0, W, H);
      x.strokeStyle = '#22D3EE'; x.lineWidth = 6; x.strokeRect(24, 24, W - 48, H - 48);
      const logo = await loadImg('logo-icon.png'); if (logo) x.drawImage(logo, 70, 70, 110, 110);
      x.fillStyle = '#fff'; x.font = '800 44px sans-serif'; x.fillText('TAMZORYA GAMING', 200, 140);
      x.fillStyle = '#22D3EE'; x.font = '700 40px sans-serif'; x.textAlign = 'right'; x.fillText(c.level_icon + ' ' + c.level, W - 70, 140); x.textAlign = 'left';
      const a = await loadImg(c.avatar); x.save(); x.beginPath(); x.arc(220, 380, 130, 0, Math.PI * 2); x.closePath(); x.clip();
      if (a) x.drawImage(a, 90, 250, 260, 260); else { x.fillStyle = '#2563EB'; x.fillRect(90, 250, 260, 260); x.fillStyle = '#fff'; x.font = '800 120px sans-serif'; x.textAlign = 'center'; x.fillText(String(c.name).slice(0, 1).toUpperCase(), 220, 420); x.textAlign = 'left'; } x.restore();
      x.fillStyle = '#fff'; x.font = '800 72px sans-serif'; x.fillText(String(c.name).slice(0, 16), 390, 370); x.fillStyle = '#22D3EE'; x.font = '700 44px monospace'; x.fillText(c.gamer_id, 390, 440);
      const st = [[c.wins, 'Victoires'], [c.winrate == null ? '—' : c.winrate + '%', 'Win rate'], [c.trophies, 'Trophées'], [c.rank ? '#' + c.rank : '—', 'Classement']];
      st.forEach((s, i) => { const bx = 70 + i * 240; x.fillStyle = 'rgba(255,255,255,.08)'; x.fillRect(bx, 600, 220, 190); x.fillStyle = '#fff'; x.font = '800 64px sans-serif'; x.textAlign = 'center'; x.fillText(String(s[0]), bx + 110, 690); x.fillStyle = '#94a3b8'; x.font = '500 30px sans-serif'; x.fillText(s[1], bx + 110, 745); x.textAlign = 'left'; });
      x.fillStyle = '#94a3b8'; x.font = '500 34px sans-serif'; x.fillText('XP', 70, 940); x.fillStyle = '#fff'; x.font = '800 90px sans-serif'; x.fillText(String(c.xp), 70, 1030); x.fillStyle = '#94a3b8'; x.font = '500 34px sans-serif'; x.fillText('Play • Compete • Win', 70, 1130);
      const qr = window.qrcode(0, 'M'); qr.addData(profileUrl(c)); qr.make(); const n = qr.getModuleCount(), cell = Math.floor(380 / (n + 4)), size = cell * (n + 4), ox = W - 70 - size, oy = 880;
      x.fillStyle = '#fff'; x.fillRect(ox, oy, size, size); x.fillStyle = '#000'; for (let r = 0; r < n; r++) for (let k = 0; k < n; k++) if (qr.isDark(r, k)) x.fillRect(ox + (k + 2) * cell, oy + (r + 2) * cell, cell, cell);
      const blob = await new Promise((res) => cv.toBlob(res, 'image/png')), file = new File([blob], 'carte-gamer-' + c.gamer_id + '.png', { type: 'image/png' });
      if (navigator.canShare && navigator.canShare({ files: [file] })) { try { await navigator.share({ files: [file], title: 'Ma carte gamer' }); return; } catch (e) { /* annulé : on télécharge */ } }
      const l = document.createElement('a'); l.href = URL.createObjectURL(blob); l.download = file.name; l.click();
    } catch (e) { TZ.toast('Impossible de créer l\'image', true); }
  };

  // ---------- Expérience enrichie ----------
  TZ.places = {};
  TZ.loadPlaces = async () => { TZ.places = {}; if (!sb || !TZ.features.has('ux_plus') && !TZ.isAdmin()) return; try { ((await sb.from('competition_places').select('*')).data || []).forEach((p) => { TZ.places[p.competition_id] = p; }); } catch (e) { /* ignore */ } };
  TZ.placeBar = (id, max, taken) => { if (!TZ.feat('ux_plus')) return ''; const t = taken != null ? taken : (TZ.places[id] && TZ.places[id].taken); if (t == null) return ''; const pct = Math.min(100, Math.round(t * 100 / (max || 1))); return `<div class="pbar${pct >= 90 ? ' hot' : ''}"><i style="width:${pct}%"></i></div><small class="muted">${t} / ${max} places • ${Math.max(0, max - t)} restantes</small>`; };

  const oldHome = routes[''];
  routes[''] = async () => {
    await oldHome(); if (!TZ.feat('ux_plus')) return;
    try {
      const st = TZ.$('.stories'); if (!st || !st.insertAdjacentHTML) return;
      const items = (await TZ.getComps()).items.filter((c) => new Date(c.starts_at) > Date.now()), feat = items.filter((c) => c.featured || !c.partner_id).slice(0, 4), soon = items.slice(0, 3);
      const wk = new Date(Date.now() - 7 * 864e5).toISOString();
      const [tags, pop] = await Promise.all([sb.from('trending_tags').select('*').then((r) => r.data || []), sb.from('feed_posts').select('id,name,body,likes,comments').gte('created_at', wk).order('likes', { ascending: false }).limit(4).then((r) => r.data || [])]);
      let h = '';
      if (feat.length) h += `<div class="sec"><h2>⭐ À la une</h2></div><div class="hscroll">${feat.map((c) => TZ.compCard(c)).join('')}</div>`;
      if (soon.length) h += `<div class="sec"><h2>📅 À venir</h2></div>${soon.map((c) => `<a class="conv" href="#/competition/${esc(c.id)}"><div class="datebox"><b>${new Date(c.starts_at).getDate()}</b><small>${new Date(c.starts_at).toLocaleDateString('fr-FR', { month: 'short' })}</small></div><div class="cmid"><b>${esc(c.name)}</b><small>${esc(c.game)} • ${esc(c.venue_name || '')}</small></div></a>`).join('')}`;
      if (tags.length) h += `<div class="sec"><h2>🔥 Tendances</h2></div><div class="scr">${tags.map((t) => `<a class="chip2" href="#/feed/tag/${esc(t.tag)}">#${esc(t.tag)} <small>${t.uses}</small></a>`).join('')}</div>`;
      if (pop.length) h += `<div class="sec"><h2>📈 Populaires</h2></div>${pop.map((p) => `<a class="conv" href="#/post/${p.id}"><div class="cmid"><b>${esc(p.name)}</b><small>${esc(String(p.body || '📷 Média').slice(0, 80))}</small></div><div class="cend">❤️ ${p.likes} • 💬 ${p.comments}</div></a>`).join('')}`;
      if (h) st.insertAdjacentHTML('beforebegin', h);
    } catch (e) { /* section optionnelle */ }
  };

  const oldRank = routes.rankings;
  routes.rankings = async (tab, game) => {
    await oldRank(tab, game); if (!TZ.feat('ux_plus') || (tab && tab !== 'general')) return;
    try {
      const rows = (await sb.from('rankings_trend').select('player,pos,prev_pos,trend')).data || []; if (!rows.length) return;
      const by = {}; rows.forEach((r) => { by[r.player] = r; });
      document.querySelectorAll('#app table tr').forEach((tr, i) => { if (!i) return; const td = tr.children; const r = td[1] && by[td[1].textContent]; if (!r) return;
        const d = r.prev_pos ? Math.abs(r.prev_pos - r.pos) : 0; td[1].insertAdjacentHTML('beforeend', ` <span class="trend ${r.trend}">${r.trend === 'up' ? '▲ ' + d : r.trend === 'down' ? '▼ ' + d : r.trend === 'same' ? '＝' : '★ new'}</span>`); });
    } catch (e) { /* ignore */ }
  };

  // ---------- Salles : localisation + galerie ----------
  routes.venue = async (id) => {
    const p = (await sb.from('partners').select('*').eq('id', id).maybeSingle()).data;
    if (!p) return TZ.fview('ux_plus', '<div class="card center">Salle introuvable 🤷</div>');
    const photos = ((await sb.from('partner_photos').select('*').eq('partner_id', id).order('created_at', { ascending: false })).data || []).concat((p.photos || []).map((u) => ({ url: u, album: 'Salle' })));
    const albums = [...new Set(photos.map((x) => x.album))], items = (await TZ.getComps()).items.filter((c) => c.partner_id === id && new Date(c.starts_at) > Date.now());
    const addr = [p.avenue, p.quartier, p.commune, p.city, p.province, p.country].filter(Boolean).join(', ');
    const hasGeo = p.lat != null && p.lng != null, map = hasGeo ? `https://www.openstreetmap.org/export/embed.html?bbox=${p.lng - 0.006}%2C${p.lat - 0.004}%2C${+p.lng + 0.006}%2C${+p.lat + 0.004}&layer=mapnik&marker=${p.lat}%2C${p.lng}` : '';
    const dir = hasGeo ? `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}` : `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(addr || p.name)}`;
    TZ.fview('ux_plus', `<div class="row"><a class="btn sm" href="#/partners">‹</a><h1 style="margin:0">${esc(p.name)}</h1></div>${p.description ? `<p class="muted">${esc(p.description)}</p>` : ''}
      <section class="rsec"><h3 class="sechead">📍 Localisation</h3><div class="card"><p>${esc(addr) || 'Adresse bientôt disponible'}</p>${p.landmark ? `<p class="muted small">Repère : ${esc(p.landmark)}</p>` : ''}${p.phone ? `<p class="small">📞 ${esc(p.phone)}</p>` : ''}
        ${hasGeo ? `<iframe class="mapf" src="${map}" loading="lazy" title="Carte"></iframe>` : ''}<a class="btn primary block" target="_blank" rel="noopener" href="${dir}">🧭 Itinéraire</a></div></section>
      <section class="rsec"><h3 class="sechead">📸 Galerie</h3>${photos.length ? `<div class="scr">${albums.map((a, i) => `<button class="chip2 ${i ? '' : 'on'}" data-act="album" data-a="${esc(a)}">${esc(a)}</button>`).join('')}</div><div class="gal" id="gal">${photos.map((x) => `<button class="ph3" data-album="${esc(x.album)}" data-act="photoOpen" data-u="${esc(x.url)}"><img src="${esc(x.url)}" alt="${esc(x.caption || '')}" loading="lazy"></button>`).join('')}</div>` : '<div class="card center muted">Pas encore de photos</div>'}</section>
      ${items.length ? `<section class="rsec"><h3 class="sechead">🎮 Prochains tournois ici</h3><div class="hscroll">${items.map((c) => TZ.compCard(c)).join('')}</div></section>` : ''}`);
    if (albums.length) ACT.album({ a: albums[0] });
  };
  ACT.album = (d) => { document.querySelectorAll('#gal .ph3').forEach((b) => { b.hidden = b.dataset.album !== d.a; }); document.querySelectorAll('[data-act=album]').forEach((b) => b.classList.toggle('on', b.dataset.a === d.a)); };
  ACT.photoOpen = (d) => { const s = TZ.$('#sheet'); s.innerHTML = `<div class="sheet-in center"><img src="${esc(d.u)}" alt="" style="max-width:100%;max-height:70vh;border-radius:14px"><button class="btn block" data-act="sheetClose">Fermer</button></div>`; s.hidden = false; };

  // Salles partenaires : lien vers la fiche détaillée (uniquement si activé)
  const oldPartners = routes.partners;
  routes.partners = async () => { await oldPartners(); if (!TZ.feat('ux_plus')) return; try { const ps = (await sb.from('partners').select('id,name')).data || []; document.querySelectorAll('#app .card h2').forEach((h) => { const p = ps.find((x) => x.name === h.textContent); if (p) h.insertAdjacentHTML('afterend', `<a class="btn sm" href="#/venue/${p.id}">📍 Voir la salle</a>`); }); } catch (e) { /* ignore */ } };

  // Espace partenaire : galerie par albums + position GPS (uniquement si activé)
  const oldPartner = routes.partner;
  routes.partner = async (tab, arg) => {
    await oldPartner(tab, arg); if (tab !== 'info' || !TZ.feat('ux_plus')) return;
    const m = state.members[0], main = TZ.$('.main'); if (!m || !main || !main.insertAdjacentHTML) return; const p = m.partners;
    const photos = (await sb.from('partner_photos').select('*').eq('partner_id', p.id).order('created_at', { ascending: false })).data || [];
    main.insertAdjacentHTML('beforeend', `<div class="card"><h2>📸 Galerie</h2><form data-form="pphoto" data-id="${p.id}"><select name="album"><option>Salle</option><option>Événements</option><option>Tournois</option><option>Équipements</option></select><input name="caption" placeholder="Légende (facultatif)"><input type="file" name="file" accept="image/*" required><button class="btn primary">Ajouter</button></form>
      <div class="gal">${photos.map((x) => `<div class="ph3"><img src="${esc(x.url)}" alt=""><button class="btn sm danger" data-act="photoDel" data-id="${x.id}">✕</button></div>`).join('')}</div></div>
      <div class="card"><h2>📍 Position GPS</h2><form data-form="pgeo" data-id="${p.id}"><input name="lat" type="number" step="any" placeholder="Latitude" value="${esc(p.lat)}"><input name="lng" type="number" step="any" placeholder="Longitude" value="${esc(p.lng)}"><div class="row"><button type="button" class="btn" data-act="geoMe">📍 Ma position</button><button class="btn primary">Enregistrer</button></div></form></div>`);
  };
  FORMS.pphoto = (f, d) => TZ.run(async () => { const file = d.get('file'); if (!file || !file.size) throw new Error('Choisis une image'); if (file.size > 6 * 1048576) throw new Error('Image trop lourde (6 Mo max)'); const url = await TZ.upload('partner-media', file); await q(sb.from('partner_photos').insert({ partner_id: f.dataset.id, url, album: d.get('album'), caption: d.get('caption') || null })); }, 'Photo ajoutée ✅');
  ACT.photoDel = (d) => TZ.run(() => q(sb.from('partner_photos').delete().eq('id', d.id)), 'Photo supprimée');
  FORMS.pgeo = (f, d) => TZ.run(() => q(sb.from('partners').update({ lat: d.get('lat') === '' ? null : +d.get('lat'), lng: d.get('lng') === '' ? null : +d.get('lng') }).eq('id', f.dataset.id)), 'Position enregistrée (à valider par TAMZORYA GAMING)');
  ACT.geoMe = () => { if (!navigator.geolocation) return TZ.toast('Position indisponible', true); navigator.geolocation.getCurrentPosition((p) => { TZ.$('[name=lat]').value = p.coords.latitude.toFixed(6); TZ.$('[name=lng]').value = p.coords.longitude.toFixed(6); }, () => TZ.toast('Autorisation refusée', true)); };

  // ---------- Mon espace : accès aux nouveautés activées ----------
  TZ.universe = () => { const L = [['reputation', '🏅', 'Réputation', '#/rep'], ['gamer_card', '🪪', 'Ma carte gamer', '#/card'], ['messaging', '💬', 'Messages', '#/chat'], ['notifications', '🔔', 'Notifications', '#/notifications'], ['search', '🔎', 'Recherche', '#/search']].filter((x) => TZ.feat(x[0]));
    return L.length ? `<div class="grid2" style="margin-bottom:14px">${L.map((x) => `<a class="card stat" href="${x[3]}"><b>${x[1]}</b>${x[2]}</a>`).join('')}</div>` : ''; };

  // ---------- Administration : gestion des nouvelles fonctionnalités ----------
  const PREVIEW = { reputation: '#/rep', notifications: '#/notifications', messaging: '#/chat', gamer_card: '#/card', search: '#/search', ux_plus: '#/partners', friendly: '#/matches', venue_qr: '#/admin/qr', challenges: '#/challenges' };
  TZ.adminFeatures = async () => {
    let flags; try { flags = await q(sb.from('feature_flags').select('*').order('key')); } catch (e) { return '<div class="card center muted">Exécute d\'abord la migration 009_nouveautes.sql</div>'; }
    const st = {}; try { (await TZ.rpc('feature_status')).forEach((r) => { st[r.key] = r.info; }); } catch (e) { /* ignore */ }
    const [rules, lv, badges] = await Promise.all([sb.from('xp_rules').select('*').order('xp', { ascending: false }).then((r) => r.data || []), sb.from('levels').select('*').order('min_xp').then((r) => r.data || []), sb.from('badges').select('key,name,icon').eq('auto', false).then((r) => r.data || [])]);
    const cfg = await sb.from('app_settings').select('*').order('key').then((r) => r.data || []);
    return `<h1>🧪 Nouvelles fonctionnalités</h1><p class="muted small">Invisibles pour les joueurs, visiteurs et partenaires tant qu'elles ne sont pas activées.</p>
      ${flags.map((f) => `<div class="card ${f.enabled ? 'glow' : ''}"><div class="row" style="justify-content:space-between"><h3 style="margin:0">${esc(f.label)}</h3><span class="badge ${f.enabled ? 'cy' : 'gold'}">${f.enabled ? '🟢 Activée' : '⚪ Désactivée'}</span></div><p class="muted small">${esc(f.description)}</p>
        <div class="chips">${Object.entries(st[f.key] || {}).map(([k, v]) => `<span class="chip">${esc(k)} : ${esc(v)}</span>`).join('')}</div>
        <div class="row"><a class="btn sm" href="${PREVIEW[f.key]}">👁️ Aperçu</a><button class="btn sm ${f.enabled ? 'danger' : 'primary'}" data-act="featToggle" data-k="${f.key}" data-v="${!f.enabled}" data-l="${esc(f.label)}">${f.enabled ? 'Désactiver' : 'Activer pour tous'}</button></div></div>`).join('')}
      <details class="card"><summary>⚙️ XP & niveaux</summary><form data-form="xpcfg" style="margin-top:10px"><h3 class="sechead">Points d'expérience</h3>${rules.map((r) => `<label class="f">${esc(r.label)}<input type="number" min="0" name="xp_${esc(r.key)}" value="${r.xp}"></label>`).join('')}
        <h3 class="sechead">Seuils de niveau (XP minimum)</h3>${lv.map((l) => `<label class="f">${esc(l.icon)} ${esc(l.name)}<input type="number" min="0" name="lv_${esc(l.key)}" value="${l.min_xp}"></label>`).join('')}<button class="btn primary">Enregistrer</button></form></details>
      <details class="card"><summary>🤝 Règles des matchs & anti-abus</summary><form data-form="setcfg" style="margin-top:10px">${cfg.map((c) => `<label class="f">${esc(c.label)}<input type="number" min="0" name="${esc(c.key)}" value="${c.value}"></label>`).join('')}<button class="btn primary">Enregistrer</button></form><button class="btn block" style="margin-top:8px" data-act="reconcile">🛠️ Réparer la cohérence XP / victoires</button></details>
      <details class="card"><summary>🎁 Donner XP ou badge</summary><form data-form="gxp" style="margin-top:10px"><input name="gid" required placeholder="Identifiant gamer (TZG-XXXXXX)"><input name="xp" type="number" required placeholder="XP (+/-)"><input name="why" required placeholder="Motif"><button class="btn primary">Donner l'XP</button></form>
        <form data-form="gbadge" style="margin-top:10px"><input name="gid" required placeholder="Identifiant gamer (TZG-XXXXXX)"><select name="badge">${badges.map((b) => `<option value="${esc(b.key)}">${esc(b.icon)} ${esc(b.name)}</option>`).join('')}</select><button class="btn primary">Décerner la distinction</button></form></details>
      <details class="card"><summary>📢 Annonce officielle</summary><form data-form="announce" style="margin-top:10px"><input name="t" required placeholder="Titre"><textarea name="b" rows="2" placeholder="Message"></textarea><input name="l" placeholder="Lien interne (ex : #/competition/…)"><button class="btn primary">Envoyer aux joueurs</button></form></details>
      <div class="card"><h3>📸 Classements</h3><button class="btn" data-act="snap">Figer le classement du jour</button></div>`;
  };
  ACT.featToggle = (d) => { if (!confirm((d.v === 'true' ? 'Activer' : 'Désactiver') + ' « ' + d.l + ' » pour tous les utilisateurs ?')) return; TZ.run(async () => { await TZ.rpc('set_feature', { p_key: d.k, p_enabled: d.v === 'true' }); await TZ.loadFeatures(); }, 'Mis à jour'); };
  FORMS.xpcfg = (f, d) => TZ.run(async () => { for (const [k, v] of d.entries()) { if (k.startsWith('xp_')) await q(sb.from('xp_rules').update({ xp: +v }).eq('key', k.slice(3))); if (k.startsWith('lv_')) await q(sb.from('levels').update({ min_xp: +v }).eq('key', k.slice(3))); } }, 'Configuration enregistrée');
  FORMS.gxp = (f, d) => TZ.run(() => TZ.rpc('admin_grant_xp', { p_gamer_id: d.get('gid'), p_xp: +d.get('xp'), p_reason: d.get('why') }), 'XP attribués');
  FORMS.gbadge = (f, d) => TZ.run(() => TZ.rpc('admin_grant_badge', { p_gamer_id: d.get('gid'), p_badge: d.get('badge'), p_competition: null }), 'Distinction décernée');
  FORMS.announce = (f, d) => TZ.run(async () => { const n = await TZ.rpc('send_announcement', { p_title: d.get('t'), p_body: d.get('b') || null, p_link: d.get('l') || null }); TZ.toast(n + ' joueurs notifiés 📢'); });
  ACT.snap = () => TZ.run(async () => { const n = await TZ.rpc('take_rank_snapshot'); TZ.toast(n + ' positions enregistrées 📸'); });
  ACT.featured = (d) => TZ.run(() => q(sb.from('competitions').update({ featured: d.v === 'true' }).eq('id', d.id)), 'Mis à jour');

  TZ.adminDmReports = async () => {
    const reps = await q(sb.from('dm_reports').select('*').eq('status', 'open').order('created_at', { ascending: false })).catch(() => []); if (!reps.length) return '<h3 class="sechead">💬 Signalements de messagerie</h3><div class="card center muted">Aucun signalement 🎉</div>';
    const ids = [...new Set(reps.flatMap((r) => [r.reporter_id, r.reported_id]))], P = {}; ((await sb.from('profiles').select('id,display_name,gamer_tag').in('id', ids)).data || []).forEach((p) => { P[p.id] = p.gamer_tag || p.display_name; });
    return `<h3 class="sechead">💬 Signalements de messagerie</h3>${reps.map((r) => `<div class="card"><p class="small muted">${esc(P[r.reporter_id])} ➜ <b>${esc(P[r.reported_id])}</b> • ${fmt(r.created_at)}</p><p>${esc(r.reason || 'Sans motif')}</p>${r.excerpt ? `<pre class="excerpt">${esc(r.excerpt)}</pre>` : ''}
      <div class="row"><button class="btn sm danger" data-act="dmSuspend" data-u="${r.reported_id}" data-r="${r.id}">Suspendre le compte</button><button class="btn sm" data-act="dmClose" data-r="${r.id}">Clore</button></div></div>`).join('')}`;
  };
  ACT.dmSuspend = (d) => { if (confirm('Suspendre ce compte ?')) TZ.run(async () => { await q(sb.from('profiles').update({ is_suspended: true }).eq('id', d.u)); await TZ.rpc('resolve_dm_report', { p_id: d.r }); }, 'Compte suspendu'); };
  ACT.dmClose = (d) => TZ.run(() => TZ.rpc('resolve_dm_report', { p_id: d.r }), 'Signalement clos');
  FORMS.setcfg = (f, d) => TZ.run(async () => { for (const [k, v] of d.entries()) await q(sb.from('app_settings').update({ value: +v }).eq('key', k)); }, 'Règles enregistrées');
  ACT.reconcile = () => { if (confirm('Retirer les XP qui ne correspondent à aucun résultat validé et recalculer ?')) TZ.run(async () => { TZ.toast(await TZ.rpc('reconcile_xp')); }); };
  TZ.universe = () => '';   // les accès aux fonctionnalités sont sur le tableau de bord (rubrique « Plus »)
})();
