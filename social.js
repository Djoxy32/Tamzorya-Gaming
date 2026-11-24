(function () {
  'use strict';
  const { sb, esc, state, routes, ACT, FORMS, q, view } = TZ;
  const PAGE = 10, uid = () => state.session ? state.session.user.id : null;
  const need = () => { if (!sb) { view(TZ.NOSB); return false; } return true; };
  const authed = () => { if (state.session) return true; TZ.LS.set('tz_next', location.hash || '#/feed'); TZ.go('#/register'); return false; };
  const av = (u, n, big) => u ? `<img class="av${big ? ' big' : ''}" src="${esc(u)}" alt="">` : `<span class="av${big ? ' big' : ''}">${esc(String(n || '?').slice(0, 1).toUpperCase())}</span>`;
  const tagify = (t) => esc(t).replace(/#(\p{L}[\p{L}\p{N}_]{1,29})/gu, '<a href="#/feed/tag/$1">#$1</a>');
  const ago = (d) => { const s = (Date.now() - new Date(d)) / 1000; return s < 60 ? 'à l\'instant' : s < 3600 ? Math.floor(s / 60) + ' min' : s < 86400 ? Math.floor(s / 3600) + ' h' : Math.floor(s / 86400) + ' j'; };

  const postCard = (p) => `<article class="post">
    <div class="row"><a href="#/u/${p.user_id}" class="row">${av(p.avatar_url, p.name)}<b>${esc(p.name)}</b></a><span class="muted small">${ago(p.created_at)}</span>${p.user_id !== uid() && !p.following ? `<button class="btn sm" style="margin-left:auto" data-act="follow" data-id="${p.user_id}">＋ Suivre</button>` : ''}</div>
    ${p.body ? `<p class="pbody">${tagify(p.body)}</p>` : ''}
    ${p.media_type === 'image' ? `<img class="pmedia" src="${esc(p.media_url)}" alt="" loading="lazy">` : p.media_type === 'video' ? `<video class="pmedia" src="${esc(p.media_url)}" playsinline muted loop controls preload="metadata"></video>` : ''}
    <div class="acts"><button class="act ${p.liked ? 'on' : ''}" data-act="like" data-id="${p.id}">${p.liked ? '❤️' : '🤍'} <span>${p.likes}</span></button><a class="act" href="#/post/${p.id}">💬 ${p.comments}</a><button class="act" data-act="sharePost" data-id="${p.id}">📣 Partager</button>
    ${p.user_id === uid() ? `<button class="act" data-act="delPost" data-id="${p.id}">🗑️</button>` : `<button class="act" data-act="report" data-id="${p.id}">⚑</button>`}</div></article>`;

  TZ.postCard = postCard;
  const fetchPosts = async (tab, arg, before, userId) => {
    let r = sb.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(PAGE);
    if (before) r = r.lt('created_at', before);
    if (userId) r = r.eq('user_id', userId);
    if (tab === 'tag') r = r.ilike('body', `%#${String(arg).replace(/[%_]/g, '')}%`);
    if (tab === 'following') r = r.eq('following', true);
    return (await r).data || [];
  };
  const watch = () => { if (!window.IntersectionObserver) return; const io = new IntersectionObserver((es) => es.forEach((e) => { if (e.isIntersecting) e.target.play().catch(() => {}); else e.target.pause(); }), { threshold: 0.6 }); document.querySelectorAll('video.pmedia').forEach((v) => io.observe(v)); };

  TZ.watchVideos = () => watch();
  routes.feed = async (tab = 'all', arg = '') => {
    if (!need()) return;
    let inner;
    if (tab === 'gamers') {
      const rows = (await sb.from('public_profiles').select('*').order('followers', { ascending: false }).limit(40)).data || [];
      inner = rows.map((g) => `<a class="card row" href="#/u/${g.id}">${av(g.avatar_url, g.name)}<b>${esc(g.name)}</b><span class="muted small" style="margin-left:auto">${g.followers} 👥 • ${g.points} pts</span></a>`).join('') || '<div class="card center muted">Aucun gamer pour le moment</div>';
    } else {
      const rows = await fetchPosts(tab, arg);
      inner = `<div id="posts">${rows.map(postCard).join('') || '<div class="card center muted">Sois le premier à poster 🎮</div>'}</div>${rows.length === PAGE ? `<button class="btn block" data-act="more" data-tab="${tab}" data-arg="${esc(arg)}" data-before="${rows[rows.length - 1].created_at}">Voir plus</button>` : ''}`;
    }
    view(`<div class="sec"><h1>🔥 Communauté</h1><button class="btn primary sm" data-act="compose">＋ Poster</button></div>${TZ.tabs('feed', [['all', '🔥 Pour toi'], ['following', '👥 Abonnements'], ['gamers', '🎮 Gamers']], tab === 'tag' ? '' : tab)}${tab === 'tag' ? `<p class="ok">#${esc(arg)}</p>` : ''}${inner}`);
    watch();
  };
  ACT.more = async (d, el) => {
    el.disabled = true; const rows = await fetchPosts(d.tab, d.arg, d.before);
    TZ.$('#posts').insertAdjacentHTML('beforeend', rows.map(postCard).join('')); watch();
    if (rows.length === PAGE) { el.dataset.before = rows[rows.length - 1].created_at; el.disabled = false; } else el.remove();
  };

  routes.post = async (id) => {
    if (!need()) return;
    const p = (await sb.from('feed_posts').select('*').eq('id', id).maybeSingle()).data;
    if (!p) return view('<div class="card center">Post introuvable 🤷</div>');
    const cs = (await sb.from('feed_comments').select('*').eq('post_id', id).order('created_at')).data || [];
    view(`<a class="btn sm" href="#/feed">‹ Communauté</a><div style="margin-top:10px">${postCard(p)}</div><div class="card"><h3>💬 ${cs.length}</h3>
      ${cs.map((c) => `<div class="row" style="align-items:flex-start;margin-bottom:8px">${av(c.avatar_url, c.name)}<div><a href="#/u/${c.user_id}"><b>${esc(c.name)}</b></a> <span class="muted small">${ago(c.created_at)}</span><br>${tagify(c.body)}</div></div>`).join('') || '<p class="muted small">Sois le premier à commenter</p>'}
      ${state.session ? `<form data-form="comment" data-id="${id}" class="row"><input name="body" maxlength="300" required placeholder="Ajouter un commentaire…" style="flex:1;margin:0"><button class="btn primary">➤</button></form>` : '<button class="btn block" data-act="needAuth">Connecte-toi pour commenter</button>'}</div>`);
    watch();
  };
  FORMS.comment = (f, d) => TZ.run(() => q(sb.from('post_comments').insert({ post_id: f.dataset.id, user_id: uid(), body: String(d.get('body')).trim() })));
  ACT.needAuth = () => authed();

  routes.u = async (id) => {
    if (!need()) return;
    const g = (await sb.from('public_profiles').select('*').eq('id', id).maybeSingle()).data;
    if (!g) return view('<div class="card center">Profil introuvable 🤷</div>');
    const rows = await fetchPosts('all', '', null, id);
    view(`<div class="card center glow">${av(g.avatar_url, g.name, true)}<h1>${esc(g.name)}</h1>${g.bio ? `<p class="muted">${tagify(g.bio)}</p>` : ''}
      <div class="grid2" style="grid-template-columns:repeat(4,1fr)"><div class="stat"><b>${g.posts}</b>Posts</div><div class="stat"><b>${g.followers}</b>Abonnés</div><div class="stat"><b>${g.following}</b>Suivis</div><div class="stat"><b>${g.points}</b>Points</div></div>
      <div style="margin-top:12px">${uid() === id ? '<a class="btn" href="#/me">✏️ Modifier mon profil</a>' : g.followed_by_me ? `<button class="btn" data-act="unfollow" data-id="${id}">✔ Abonné</button>` : `<button class="btn primary" data-act="follow" data-id="${id}">＋ Suivre</button>`}</div></div>
      <div id="posts">${rows.map(postCard).join('') || '<div class="card center muted">Pas encore de post</div>'}</div>`);
    watch();
  };

  ACT.compose = () => {
    if (!authed()) return;
    const s = TZ.$('#sheet');
    s.innerHTML = `<div class="sheet-in"><h2 class="center">＋ Nouveau post</h2><form data-form="post"><textarea name="body" rows="3" maxlength="500" placeholder="Quoi de neuf, gamer ? #tournoi"></textarea>
      <label class="btn block">📷 Photo / 🎬 Vidéo<input type="file" name="media" accept="image/*,video/*" hidden onchange="document.getElementById('fname').textContent=this.files[0]?this.files[0].name:''"></label><p id="fname" class="small muted center"></p>
      <button class="btn primary xl block">🚀 Publier</button><button type="button" class="btn block" data-act="sheetClose">Annuler</button></form></div>`;
    s.hidden = false;
  };
  FORMS.post = async (f, d) => {
    const file = d.get('media'), body = String(d.get('body') || '').trim(), has = file && file.size;
    if (!body && !has) return TZ.toast('Écris quelque chose ou ajoute un média', true);
    const btn = f.querySelector('.primary'); btn.disabled = true; btn.textContent = '⏳ Envoi…';
    try {
      let url = null, type = null;
      if (has) { const isV = file.type.startsWith('video/'); if (file.size > (isV ? 30 : 6) * 1048576) throw new Error(isV ? 'Vidéo trop lourde (30 Mo max)' : 'Image trop lourde (6 Mo max)'); url = await TZ.upload('social', file); type = isV ? 'video' : 'image'; }
      await q(sb.from('posts').insert({ user_id: uid(), body: body || null, media_url: url, media_type: type }));
      TZ.$('#sheet').hidden = true; TZ.toast('Publié 🔥'); TZ.route();
    } catch (e) { TZ.toast(TZ.errMsg(e), true); btn.disabled = false; btn.textContent = '🚀 Publier'; }
  };

  ACT.like = async (d, el) => {
    if (!authed()) return; const on = el.classList.contains('on'), n = +el.querySelector('span').textContent;
    const paint = (v) => { el.classList.toggle('on', v); el.innerHTML = (v ? '❤️' : '🤍') + ' <span>' + (n + (v ? (on ? 0 : 1) : (on ? -1 : 0))) + '</span>'; };
    paint(!on);
    const { error } = on ? await sb.from('post_likes').delete().eq('post_id', d.id).eq('user_id', uid()) : await sb.from('post_likes').insert({ post_id: d.id, user_id: uid() });
    if (error) { paint(on); TZ.toast(TZ.errMsg(error), true); }
  };
  ACT.follow = async (d) => {
    if (!authed()) return; const { error } = await sb.from('follows').insert({ follower_id: uid(), followed_id: d.id });
    if (error && !/duplicate/.test(error.message)) return TZ.toast(TZ.errMsg(error), true);
    TZ.toast('Abonné ✅'); if (location.hash.startsWith('#/u/')) TZ.route(); else document.querySelectorAll('[data-act=follow]').forEach((b) => { if (b.dataset.id === d.id) b.remove(); });
  };
  ACT.unfollow = (d) => TZ.run(() => q(sb.from('follows').delete().eq('follower_id', uid()).eq('followed_id', d.id)));
  ACT.delPost = (d) => { if (confirm('Supprimer ce post ?')) TZ.run(() => q(sb.from('posts').delete().eq('id', d.id)), 'Supprimé'); };
  ACT.report = async (d) => {
    if (!authed()) return; const r = prompt('Pourquoi signaler ce post ?'); if (r === null) return;
    const { error } = await sb.from('post_reports').insert({ post_id: d.id, reporter_id: uid(), reason: r || null });
    TZ.toast(error && !/duplicate/.test(error.message) ? TZ.errMsg(error) : 'Merci, signalement envoyé 🙏', !!(error && !/duplicate/.test(error.message)));
  };
  ACT.sharePost = (d) => TZ.shareSheet(TZ.baseUrl() + '#/post/' + d.id, '🔥 Regarde ça sur TAMZORYA GAMING');
})();

/* ===== ACCUEIL = FIL (structure : recherche, composer, stories, fil) ===== */
(function () {
  'use strict';
  const { sb, esc, state, routes, ACT, view } = TZ;
  const H = { tab: 'all', before: null, end: false, busy: false, comps: [], ci: 0, io: null };
  const PAGE = 8;
  const initial = () => esc(String((state.profile && (state.profile.gamer_tag || state.profile.display_name)) || '?').slice(0, 1).toUpperCase());
  const story = (href, inner, label) => `<a class="story" href="${href}"><div class="ring"><div class="in">${inner}</div></div><span>${esc(label)}</span></a>`;

  const loadMore = async (reset) => {
    if (H.busy || (H.end && !reset) || !sb) return; H.busy = true;
    try {
      let r = sb.from('feed_posts').select('*').order('created_at', { ascending: false }).limit(PAGE);
      if (H.before && !reset) r = r.lt('created_at', H.before);
      if (H.tab === 'following') r = r.eq('following', true);
      const rows = (await r).data || [], box = TZ.$('#posts'); if (!box) return;
      if (reset) { box.innerHTML = ''; H.ci = 0; }
      const html = rows.map((p, i) => {
        const tc = (i % 4 === 2 && H.comps.length) ? TZ.compCard(H.comps[H.ci++ % H.comps.length]) : '';
        return window.TZ.postCard(p) + tc;
      }).join('');
      box.insertAdjacentHTML('beforeend', html);
      if (rows.length) H.before = rows[rows.length - 1].created_at;
      H.end = rows.length < PAGE;
      if (reset && !rows.length) box.innerHTML = `<div class="card center muted">${H.tab === 'following' ? '👥 Tu ne suis personne pour l\'instant.<br>Touche « Suivre » sur un gamer.' : '🎮 Le fil démarre ici.<br>Sois le premier à poster !'}</div>`;
      const m = TZ.$('#more2'); if (m) m.textContent = H.end ? (box.children.length ? '— fin du fil —' : '') : '…';
      TZ.watchVideos();
    } finally { H.busy = false; }
  };

  routes[''] = async () => {
    const comps = (await TZ.getComps()).items.filter((c) => new Date(c.starts_at) > Date.now() - 6 * 36e5); H.comps = comps; H.before = null; H.end = false;
    const stories = story('#/vs', '⚔️', 'VS du jour') + story('#/rankings', '🏆', 'Top') + story('#/road', '👑', 'Grand Tournoi')
      + comps.slice(0, 12).map((c) => story('#/competition/' + esc(c.id), c.poster_url ? `<img src="${esc(c.poster_url)}" alt="">` : '🎮', c.name)).join('');
    const composer = state.session
      ? `<div class="card cmp"><div class="av">${initial()}</div><button class="pill" data-act="compose">Quoi de neuf, gamer ?</button><button class="ph2" data-act="compose" aria-label="Photo">📷</button></div>`
      : `<div class="card cmp"><button class="pill" data-act="needAuth">🎮 Rejoins la communauté — connecte-toi</button></div>`;
    view(`<button class="srch" data-act="gosearch">🔎<span>Rechercher un tournoi, un gamer…</span></button>${composer}
      <div class="stories">${stories}</div>
      <div class="scr"><button class="chip2 ${H.tab === 'all' ? 'on' : ''}" data-act="htab" data-k="all">🔥 Pour toi</button><button class="chip2 ${H.tab === 'following' ? 'on' : ''}" data-act="htab" data-k="following">👥 Abonnements</button><a class="chip2" href="#/feed/gamers">🎮 Gamers</a></div>
      <div id="posts">${sb ? '<div class="skel"></div><div class="skel"></div>' : '<div class="card center muted">Service momentanément indisponible.</div>'}</div><div id="more2" class="more"></div>`);
    await loadMore(true);
    if (H.io) H.io.disconnect();
    const m = TZ.$('#more2'); if (m && window.IntersectionObserver) { H.io = new IntersectionObserver((es) => { if (es[0].isIntersecting) loadMore(false); }, { rootMargin: '500px' }); H.io.observe(m); TZ.cleanup = () => H.io && H.io.disconnect(); }
  };
  ACT.htab = (d) => { H.tab = d.k; TZ.route(); };
  ACT.gosearch = () => { TZ.go('#/competitions'); setTimeout(() => { const i = TZ.$('#fq'); if (i && i.focus) i.focus(); }, 350); };

  // l'ancien onglet « Pour toi » mène désormais à l'accueil
  const oldFeed = routes.feed;
  routes.feed = (tab, arg) => { if (!tab || tab === 'all') return TZ.go('#/'); if (tab === 'following') { H.tab = 'following'; return TZ.go('#/'); } return oldFeed(tab, arg); };
})();
