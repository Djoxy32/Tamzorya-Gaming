/* Nouveautés : interrupteurs, notifications, messagerie, recherche. Tout reste invisible tant que l'admin n'active pas. */
(function () {
  'use strict';
  const { sb, esc, fmt, state, routes, ACT, FORMS, q, view } = TZ;
  TZ.FEATROUTES.notifications = 'notifications'; TZ.FEATROUTES.chat = 'messaging'; TZ.FEATROUTES.search = 'search';
  const login = (h) => { TZ.LS.set('tz_next', h); TZ.go('#/login'); };
  const av = (u, n) => u ? `<img class="av" src="${esc(u)}" alt="">` : `<span class="av">${esc(String(n || '?').slice(0, 1).toUpperCase())}</span>`;
  const ago = (d) => { const s = (Date.now() - new Date(d)) / 1000; return s < 60 ? 'maintenant' : s < 3600 ? Math.floor(s / 60) + ' min' : s < 86400 ? Math.floor(s / 3600) + ' h' : Math.floor(s / 86400) + ' j'; };
  const hm = (d) => new Date(d).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
  const day = (d) => new Date(d).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' });

  // Interrupteurs : seul le serveur décide (my_features ne renvoie que les fonctions activées)
  TZ.loadFeatures = async () => { TZ.features = new Set(); if (!sb) return; try { TZ.features = new Set((await TZ.rpc('my_features')) || []); } catch (e) { /* migration absente : tout reste masqué */ } };
  TZ.fview = (key, html) => view((TZ.isAdmin() && !TZ.features.has(key) ? '<div class="notice">👁️ Aperçu administrateur — non visible du public. <a href="#/admin/features">‹ Retour</a></div>' : '') + html);
  TZ.navExtra = async () => {
    let h = '';
    if (TZ.feat('messaging')) { let n = 0; try { n = await TZ.rpc('dm_unread'); } catch (e) { /* ignore */ } h += `<a class="btn" href="#/chat" aria-label="Messages">💬${n ? ` <span class="badge cy">${n}</span>` : ''}</a>`; }
    if (TZ.feat('notifications')) { let n = 0; try { n = (await sb.from('notifications').select('id', { count: 'exact', head: true }).eq('read', false)).count || 0; } catch (e) { /* ignore */ } h += `<a class="btn" href="#/notifications" aria-label="Notifications">🔔${n ? ` <span class="badge cy">${n}</span>` : ''}</a>`; }
    return h;
  };

  // ---------- Centre de notifications ----------
  const CAT = { tournament: '🎟️', match: '⚔️', social: '👥', message: '💬', reward: '🏅', announcement: '📢', system: '🔔' };
  const GROUPS = [['all', 'Tout'], ['match', 'Matchs'], ['tournament', 'Tournois'], ['social', 'Social'], ['message', 'Messages'], ['reward', 'Récompenses'], ['announcement', 'Annonces'], ['system', 'Système']];
  const inGroup = (n, g) => g === 'all' || n.category === g;
  routes.notifications = async (tab = 'all') => {
    if (!state.session) return login('#/notifications');
    const rows = await q(sb.from('notifications').select('*').order('created_at', { ascending: false }).limit(100));
    const list = rows.filter((n) => inGroup(n, tab)), unread = rows.filter((n) => !n.read).length, cnt = (g) => rows.filter((n) => !n.read && inGroup(n, g)).length;
    TZ.fview('notifications', `<div class="sec"><h1>🔔 Notifications</h1>${unread ? '<button class="btn sm" data-act="nReadAll">✓ Tout marquer lu</button>' : ''}</div>
      <div class="tabs">${GROUPS.map(([k, l]) => `<a href="#/notifications/${k}" class="${k === tab ? 'on' : ''}">${l}${cnt(k) ? ` <span class="badge cy">${cnt(k)}</span>` : ''}</a>`).join('')}</div>
      ${list.map((n) => `<div class="nitem ${n.read ? '' : 'unread'}"><button class="nmain" data-act="nOpen" data-id="${n.id}" data-link="${esc(n.link || '')}"><span class="nico">${CAT[n.category] || '🔔'}</span><span class="ntxt"><b>${esc(n.title)}</b>${n.body ? `<small>${esc(n.body)}</small>` : ''}<em>${fmt(n.created_at)}</em></span></button>
        <span class="nside">${n.read ? '' : `<button class="btn sm" data-act="nRead" data-id="${n.id}" aria-label="Marquer comme lu">✓</button>`}<button class="btn sm danger" data-act="nDel" data-id="${n.id}" aria-label="Supprimer">✕</button></span></div>`).join('') || '<div class="card center muted">Aucune notification pour le moment</div>'}`);
  };
  const refreshNav = () => TZ.renderNav();
  ACT.nOpen = async (d) => { await sb.from('notifications').update({ read: true }).eq('id', d.id); refreshNav(); if (d.link && d.link.startsWith('#/')) TZ.go(d.link); else TZ.route(); };
  ACT.nRead = (d) => TZ.run(async () => { await q(sb.from('notifications').update({ read: true }).eq('id', d.id)); refreshNav(); });
  ACT.nReadAll = () => TZ.run(async () => { await q(sb.from('notifications').update({ read: true }).eq('read', false)); refreshNav(); }, 'Tout est lu ✓');
  ACT.nDel = (d) => TZ.run(async () => { await q(sb.from('notifications').delete().eq('id', d.id)); refreshNav(); });

  // ---------- Messagerie privée ----------
  const prev = (c) => c.last_kind === 'tournament' ? '🎮 Tournoi partagé' : c.last_kind === 'match_invite' ? '⚔️ Invitation à un match' : esc(String(c.last_body || 'Nouvelle conversation').slice(0, 70));
  routes.chat = async (a, b) => {
    if (!state.session) return login('#/chat');
    if (a === 'new') { try { TZ.go('#/chat/' + await TZ.rpc('dm_open', { p_other: b })); } catch (e) { TZ.toast(TZ.errMsg(e), true); TZ.go('#/chat'); } return; }
    if (a) return thread(a);
    const rows = await TZ.rpc('my_conversations');
    TZ.fview('messaging', `<div class="sec"><h1>💬 Messages</h1><button class="btn primary sm" data-act="chatNew">＋ Nouveau</button></div>
      ${rows.map((c) => `<a class="conv ${c.unread ? 'unread' : ''}" href="#/chat/${c.conversation_id}">${av(c.other_avatar, c.other_name)}<div class="cmid"><b>${esc(c.other_name)}</b><small>${c.last_mine ? 'Toi : ' : ''}${prev(c)}</small></div><div class="cend"><em>${ago(c.last_at)}</em>${c.unread ? `<span class="badge cy">${c.unread}</span>` : ''}</div></a>`).join('')
        || '<div class="card center muted">Aucune conversation.<br>Cherche un gamer pour commencer 👋</div>'}`);
  };
  const bubble = (m, mine) => {
    const t = `<em>${hm(m.created_at)}</em>`;
    if (m.kind === 'tournament') return `<div class="msg ${mine ? 'mine' : 'theirs'}"><a class="mcard" href="#/competition/${m.ref_id}">🎮 <b>${esc((m.meta && m.meta.name) || 'Tournoi')}</b><small>Voir le tournoi ›</small></a>${t}</div>`;
    if (m.kind === 'match_invite') { const x = m.meta || {}; return `<div class="msg ${mine ? 'mine' : 'theirs'}"><div class="mcard">⚔️ <b>Match amical</b><small>${esc(x.game || '')}${x.at ? ' • ' + fmt(x.at) : ''}</small>${x.note ? `<small>${esc(x.note)}</small>` : ''}
      ${mine ? '' : '<div class="row"><button class="btn sm primary" data-act="dmQuick" data-t="✅ Match accepté !">Accepter</button><button class="btn sm" data-act="dmQuick" data-t="❌ Désolé, pas dispo">Refuser</button></div>'}</div>${t}</div>`; }
    return `<div class="msg ${mine ? 'mine' : 'theirs'}"><span>${esc(m.body).replace(/\n/g, '<br>')}</span>${t}</div>`;
  };
  const paint = (msgs) => { let last = ''; return msgs.map((m) => { const d = day(m.created_at), sep = d !== last ? `<div class="dsep">${d}</div>` : ''; last = d; return sep + bubble(m, m.sender_id === state.session.user.id); }).join('') || '<div class="center muted small">Dis bonjour 👋</div>'; };
  const thread = async (id) => {
    const convs = await TZ.rpc('my_conversations'), c = convs.find((x) => x.conversation_id === id);
    if (!c) return TZ.fview('messaging', '<div class="card center">Conversation introuvable</div>');
    const load = async () => (await sb.from('dm_messages').select('*').eq('conversation_id', id).order('created_at').limit(200)).data || [];
    let msgs = await load(), lastId = msgs.length ? msgs[msgs.length - 1].id : null; TZ._conv = { id, other: c.other_id, name: c.other_name, blocked: c.blocked_by_me };
    TZ.fview('messaging', `<div class="chat"><div class="chead"><a class="btn sm" href="#/chat" aria-label="Retour">‹</a>${av(c.other_avatar, c.other_name)}<a class="cname" href="#/u/${c.other_id}"><b>${esc(c.other_name)}</b></a><button class="btn sm" data-act="chatMenu" aria-label="Options">⋯</button></div>
      <div class="cbody" id="cbody">${paint(msgs)}</div>
      ${c.blocked_by_me ? `<div class="cblock">🚫 Tu as bloqué ce gamer <button class="btn sm" data-act="chatUnblock">Débloquer</button></div>`
        : `<form class="cbar" data-form="dm" data-conv="${id}"><button type="button" class="btn" data-act="chatPlus" aria-label="Plus">＋</button><input name="body" maxlength="1000" placeholder="Écrire un message…" autocomplete="off" required><button class="btn primary" aria-label="Envoyer">➤</button></form>`}</div>`);
    const body = TZ.$('#cbody'); if (body && body.scrollTo) body.scrollTo(0, body.scrollHeight);
    sb.rpc('dm_mark_read', { p_conversation: id }).then(refreshNav, () => {});
    TZ._refresh = async () => { msgs = await load(); const nl = msgs.length ? msgs[msgs.length - 1].id : null; if (nl !== lastId) { lastId = nl; const b = TZ.$('#cbody'); if (b) { b.innerHTML = paint(msgs); b.scrollTo && b.scrollTo(0, b.scrollHeight); } sb.rpc('dm_mark_read', { p_conversation: id }).then(refreshNav, () => {}); } };
    const t = setInterval(() => { if (location.hash === '#/chat/' + id) TZ._refresh(); }, 4000); TZ.cleanup = () => clearInterval(t);
  };
  const send = async (conv, body, kind, ref, meta) => { try { await TZ.rpc('send_dm', { p_conversation: conv, p_body: body, p_kind: kind || 'text', p_ref: ref || null, p_meta: meta || null }); await TZ._refresh(); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };
  FORMS.dm = async (f, d) => { const b = String(d.get('body') || '').trim(); if (!b) return; f.reset(); await send(f.dataset.conv, b); };
  ACT.dmQuick = (d) => send(TZ._conv.id, d.t);
  const sheet = (h) => { const s = TZ.$('#sheet'); s.innerHTML = `<div class="sheet-in">${h}<button class="btn block" data-act="sheetClose">Fermer</button></div>`; s.hidden = false; };
  ACT.chatMenu = () => sheet(`<h2 class="center">${esc(TZ._conv.name)}</h2><a class="btn block" href="#/u/${TZ._conv.other}" data-act="sheetClose">👤 Voir le profil</a>
    ${TZ._conv.blocked ? '<button class="btn block" data-act="chatUnblock">✅ Débloquer</button>' : '<button class="btn block danger" data-act="chatBlock">🚫 Bloquer</button>'}<button class="btn block danger" data-act="chatReport">⚑ Signaler</button>`);
  ACT.chatBlock = () => { if (!confirm('Bloquer ce gamer ? Plus aucun message possible dans les deux sens.')) return; TZ.run(async () => { await q(sb.from('user_blocks').insert({ blocker_id: state.session.user.id, blocked_id: TZ._conv.other })); TZ.$('#sheet').hidden = true; }, 'Gamer bloqué'); };
  ACT.chatUnblock = () => TZ.run(async () => { await q(sb.from('user_blocks').delete().eq('blocker_id', state.session.user.id).eq('blocked_id', TZ._conv.other)); TZ.$('#sheet').hidden = true; }, 'Gamer débloqué');
  ACT.chatReport = async () => { const r = prompt('Pourquoi signaler ce gamer ?'); if (r === null) return; try { await TZ.rpc('report_user', { p_user: TZ._conv.other, p_conversation: TZ._conv.id, p_reason: r }); TZ.$('#sheet').hidden = true; TZ.toast('Signalement transmis à TAMZORYA GAMING 🙏'); } catch (e) { TZ.toast(TZ.errMsg(e), true); } };
  ACT.chatPlus = () => sheet('<h2 class="center">＋ Partager</h2><button class="btn block" data-act="dmPickTournoi">🎮 Partager un tournoi</button><button class="btn block" data-act="dmInviteForm">⚔️ Proposer un match amical</button>');
  ACT.dmPickTournoi = async () => { const items = (await TZ.getComps()).items; sheet(`<h2 class="center">Quel tournoi ?</h2>${items.map((c) => `<button class="btn block" data-act="dmShare" data-id="${esc(c.id)}" data-name="${esc(c.name)}">${esc(c.name)}</button>`).join('') || '<p class="muted center">Aucun tournoi publié</p>'}`); };
  ACT.dmShare = (d) => { TZ.$('#sheet').hidden = true; send(TZ._conv.id, '🎮 ' + d.name, 'tournament', d.id, { name: d.name }); };
  ACT.dmInviteForm = () => sheet('<h2 class="center">⚔️ Match amical</h2><form data-form="invite"><input name="game" required placeholder="Jeu (ex : EA FC)"><input name="at" type="datetime-local"><input name="note" placeholder="Un mot (facultatif)"><button class="btn primary block">Envoyer l\'invitation</button></form>');
  FORMS.invite = (f, d) => { TZ.$('#sheet').hidden = true; send(TZ._conv.id, '⚔️ Match amical : ' + d.get('game'), 'match_invite', null, { game: d.get('game'), at: d.get('at') ? new Date(d.get('at')).toISOString() : null, note: d.get('note') || null }); };
  ACT.chatNew = () => { sheet('<h2 class="center">＋ Nouvelle conversation</h2><input id="cs" placeholder="Rechercher un gamer…" oninput="TZ.chatSearch(this.value)" autocomplete="off"><div id="csr"></div>'); const i = TZ.$('#cs'); if (i && i.focus) i.focus(); };
  let cst = null;
  TZ.chatSearch = (v) => { clearTimeout(cst); cst = setTimeout(async () => { const t = String(v).trim().replace(/[%_,()]/g, ''); const box = TZ.$('#csr'); if (t.length < 2) { box.innerHTML = ''; return; } const rows = (await sb.from('public_profiles').select('id,name,avatar_url').ilike('name', '%' + t + '%').neq('id', state.session.user.id).limit(10)).data || [];
    box.innerHTML = rows.map((g) => `<button class="conv" data-act="chatOpen" data-id="${g.id}">${av(g.avatar_url, g.name)}<div class="cmid"><b>${esc(g.name)}</b></div></button>`).join('') || '<p class="muted center">Aucun gamer trouvé</p>'; }, 300); };
  ACT.chatOpen = (d) => { TZ.$('#sheet').hidden = true; TZ.go('#/chat/new/' + d.id); };

  // ---------- Recherche globale ----------
  routes.search = (q0 = '') => {
    TZ.fview('search', `<h1>🔎 Recherche</h1><input id="sq" placeholder="Joueurs, salles, tournois…" value="${esc(q0)}" autocomplete="off"><div id="sres"></div>`);
    const inp = TZ.$('#sq'), out = TZ.$('#sres'); let t = null;
    const run = async () => {
      const v = inp.value.trim(); if (v.length < 2) { out.innerHTML = '<p class="muted center">Tape au moins 2 lettres</p>'; return; }
      out.innerHTML = '<div class="skel"></div>';
      try {
        const rows = await TZ.rpc('global_search', { p_q: v }), G = { gamer: ['👤 Joueurs', (r) => '#/u/' + r.id], venue: ['🏢 Salles', (r) => TZ.feat('ux_plus') ? '#/venue/' + r.id : '#/partners'], competition: ['🎮 Compétitions', (r) => '#/competition/' + r.id] };
        out.innerHTML = Object.entries(G).map(([k, [lbl, href]]) => { const part = rows.filter((r) => r.kind === k); return part.length ? `<h3 class="sechead">${lbl}</h3>${part.map((r) => `<a class="conv" href="${href(r)}">${av(r.image, r.title)}<div class="cmid"><b>${esc(r.title)}</b><small>${esc(r.subtitle || '')}</small></div></a>`).join('')}` : ''; }).join('') || '<div class="card center muted">Aucun résultat</div>';
      } catch (e) { out.innerHTML = `<p class="center err">${esc(TZ.errMsg(e))}</p>`; }
    };
    inp.addEventListener('input', () => { clearTimeout(t); t = setTimeout(run, 300); }); if (q0) run(); else out.innerHTML = '<p class="muted center">Cherche un gamer, une salle ou un tournoi</p>';
    if (inp.focus) inp.focus();
  };
})();
