(function () {
  'use strict';

  const { sb, esc, fmt, state, routes, ACT, FORMS, q, view } = TZ;

  const T = [
    ['stats', '📊 Stats'],
    ['comps', '🎮 Compétitions'],
    ['partners', '🏢 Partenaires'],
    ['players', '👥 Joueurs'],
    ['pay', '💰 Paiements'],
    ['matches', '⚔️ Matchs'],
    ['results', '🏆 Résultats'],
    ['points', '⭐ Barème'],
    ['grand', '👑 Grand Tournoi'],
    ['docs', '📄 Documents'],
    ['msgs', '💬 Messages'],
    ['mod', '🛡️ Modération'],
    ['features', '🧪 Nouveautés'],
    ['audit', '🧾 Audit']
  ];

  const picker = (tab, arg, items) =>
    `<select onchange="location.hash='#/admin/${tab}/'+this.value">
      <option value="">Choisir une compétition…</option>
      ${items.map((c) =>
        `<option value="${c.id}" ${c.id === arg ? 'selected' : ''}>
          ${esc(c.name)} (${TZ.COMP[c.status]})
        </option>`
      ).join('')}
    </select>`;

  const name = (r) => esc(r.gamer_tag || r.display_name || r.user_id);

  routes.admin = async (tab = 'stats', arg = '') => {
    if (!state.session) return TZ.go('#/login');
    if (!sb) return view(TZ.NOSB);

    if (!TZ.isAdmin()) {
      return view('<p class="err center">Accès réservé à l\'administration (contrôlé aussi côté base de données).</p>');
    }

    const comps = await q(
      sb.from('competitions')
        .select('*, partners(name), competition_rules(content)')
        .order('starts_at', { ascending: false })
    );

    const partners = await q(
      sb.from('partners').select('*').order('name')
    );

    let body = '';

    if (tab === 'settings') tab = 'points';

    const reqs = (
      await sb.from('partner_requests')
        .select('*, profiles(display_name)')
        .eq('status', 'pending')
        .order('created_at')
    ).data || [];

    const pendPay = (
      await sb.from('reservations')
        .select('id', { count: 'exact', head: true })
        .eq('status', 'payment_pending')
    ).count || 0;

    const toValidate = comps.filter(
      (c) => ['submitted', 'in_review'].includes(c.status)
    ).length;

    const todo = `
      <div class="grid2">
        <a class="card stat" href="#/admin/partners"><b>${reqs.length}</b>📥 Demandes</a>
        <a class="card stat" href="#/admin/comps"><b>${toValidate}</b>🎮 À valider</a>
        <a class="card stat" href="#/admin/pay"><b>${pendPay}</b>💰 À encaisser</a>
        <a class="card stat" href="#/admin/share"><b>📣</b>Partages</a>
      </div>`;

    const reqHtml = reqs.length
      ? `<div class="card glow">
          <h2>📥 Demandes de partenariat</h2>
          ${reqs.map((r) => `
            <div class="row" style="justify-content:space-between;border-top:1px solid var(--line);padding-top:8px;margin-top:8px">
              <div>
                <b>${esc(r.venue_name)}</b><br>
                <span class="muted small">
                  ${esc(r.city)} • ${esc(r.phone)} • ${esc(r.profiles && r.profiles.display_name)}
                </span>
                ${r.message ? `<br><span class="small">${esc(r.message)}</span>` : ''}
              </div>
              <div class="row">
                <button class="btn sm primary" data-act="reqOk" data-id="${r.id}">Accepter</button>
                <button class="btn sm danger" data-act="reqNo" data-id="${r.id}">Refuser</button>
              </div>
            </div>
          `).join('')}
        </div>`
      : '';

    if (tab === 'stats') {
      const cnt = async (t, f) => {
        let r = sb.from(t).select('*', { count: 'exact', head: true });
        if (f) r = f(r);
        return (await r).count || 0;
      };

      const S = {
        Joueurs: await cnt('profiles', (r) => r.eq('role', 'player')),
        Partenaires: partners.length,
        Compétitions: comps.length,
        Réservations: await cnt('reservations'),
        'Participants confirmés': await cnt('reservations', (r) => r.eq('status', 'confirmed')),
        'Compétitions terminées': comps.filter(
          (c) => c.status === 'published' && new Date(c.starts_at) < Date.now()
        ).length,
        'Matchs joués': await cnt('match_results', (r) => r.not('validated_at', 'is', null)),
        'À valider': comps.filter((c) => ['submitted', 'in_review'].includes(c.status)).length
      };

      body = todo + `
        <div class="grid" style="grid-template-columns:repeat(auto-fit,minmax(150px,1fr));margin-top:12px">
          ${Object.entries(S).map(([k, v]) =>
            `<div class="card stat"><b>${v}</b>${k}</div>`
          ).join('')}
        </div>`;

    } else if (tab === 'comps') {
      body = `
        <a class="btn primary" href="#/admin/newcomp">+ Compétition officielle TAMZORYA</a>
        <div style="margin-top:12px">
          ${comps.map((c) => {
            const b = (to, l, cls = '') =>
              `<button class="btn sm ${cls}" data-act="cstatus" data-id="${c.id}" data-to="${to}" data-by="${c.created_by || ''}" data-name="${esc(c.name)}">${l}</button>`;

            return `
              <div class="card">
                <div class="row">
                  <h3>${esc(c.name)}</h3>
                  <span class="badge cy">${TZ.COMP[c.status]}</span>
                  <span class="muted small">${esc(c.partners?.name || 'TAMZORYA GAMING')} • ${fmt(c.starts_at)}</span>
                </div>
                ${c.review_note ? `<p class="small muted">Note : ${esc(c.review_note)}</p>` : ''}
                <div class="row">
                  ${['submitted'].includes(c.status) ? b('in_review', 'Examiner') : ''}
                  ${['submitted', 'in_review'].includes(c.status)
                    ? b('approved', 'Approuver', 'primary') +
                      b('changes_requested', 'Demander modifs') +
                      b('rejected', 'Refuser', 'danger')
                    : ''}
                  ${['draft', 'approved'].includes(c.status) ? b('published', 'Publier', 'primary') : ''}
                  ${c.status === 'published' ? b('archived', 'Archiver') : ''}
                  <a class="btn sm" href="#/admin/editcomp/${c.id}">✏️ Modifier</a>
                  ${c.status === 'published'
                    ? `<button class="btn sm" data-act="copyLink" data-id="${c.id}" data-ref="0">🔗 Lien</button>
                       <button class="btn sm" data-act="featured" data-id="${c.id}" data-v="${!c.featured}">${c.featured ? '⭐ Retirer' : '☆ À la une'}</button>`
                    : ''}
                </div>
              </div>`;
          }).join('')}
        </div>`;

    } else if (tab === 'newcomp') {
      body = TZ.compForm({}, '', true);

    } else if (tab === 'editcomp') {
      const c = comps.find((x) => x.id === arg);
      body = c
        ? TZ.compForm({ ...c, rules: c.competition_rules?.content }, c.partner_id || '', true)
        : '';

    } else if (tab === 'partners') {
      body = reqHtml + `
        <div class="card">
          <h2>Nouveau partenaire</h2>
          <form data-form="newpartner">
            <input name="name" required placeholder="Nom (ex : GAMES CITY)">
            <input name="city" placeholder="Ville">
            <button class="btn primary">Créer</button>
          </form>
        </div>

        <div class="card">
          <h2>Donner accès à une personne</h2>
          <form data-form="addmember">
            <select name="partner">
              ${partners.map((p) => `<option value="${p.id}">${esc(p.name)}</option>`).join('')}
            </select>
            <input name="email" type="email" required placeholder="E-mail du compte (déjà inscrit)">
            <label class="chk">
              <input type="checkbox" name="confirm">
              Peut confirmer les paiements au guichet
            </label>
            <button class="btn primary">Autoriser</button>
          </form>
        </div>

        ${partners.map((p) => `
          <div class="card">
            <div class="row">
              <h3>${esc(p.name)}</h3>
              <span class="badge cy">${esc(TZ.PSTAT[p.status] || p.status)}</span>
              <span class="badge ${p.is_public_validated ? 'cy' : 'gold'}">
                ${p.is_public_validated ? 'Fiche validée' : 'Fiche à valider'}
              </span>
            </div>
            <div class="row">
              <button class="btn sm" data-act="pstate" data-id="${p.id}" data-f="status" data-v="${p.status === 'active' ? 'suspended' : 'active'}">
                ${p.status === 'active' ? 'Suspendre' : 'Activer / réactiver'}
              </button>
              <button class="btn sm" data-act="pstate" data-id="${p.id}" data-f="is_public_validated" data-v="${!p.is_public_validated}">
                ${p.is_public_validated ? 'Retirer validation' : 'Valider la fiche publique'}
              </button>
            </div>
          </div>
        `).join('')}`;

    } else if (tab === 'players') {
      let r = sb.from('profiles')
        .select('*')
        .order('created_at', { ascending: false })
        .limit(50);

      if (arg) {
        r = r.or(
          `display_name.ilike.%${arg.replace(/[%,()]/g, '')}%,gamer_tag.ilike.%${arg.replace(/[%,()]/g, '')}%`
        );
      }

      const rows = await q(r);

      body = `
        <form data-form="psearch" class="row">
          <input name="s" placeholder="Rechercher un joueur" value="${esc(arg)}" style="flex:1">
          <button class="btn">Rechercher</button>
        </form>

        <div class="card scroll">
          <table>
            ${rows.map((u) => `
              <tr>
                <td>
                  ${name(u)}<br>
                  <span class="muted small">${esc(u.role)} • ${esc(u.city)} ${esc(u.phone)}</span>
                </td>
                <td>${u.is_suspended ? '<span class="badge red">Suspendu</span>' : ''}</td>
                <td>
                  ${u.role === 'player'
                    ? `<button class="btn sm ${u.is_suspended ? '' : 'danger'}" data-act="suspend" data-id="${u.id}" data-v="${!u.is_suspended}">
                        ${u.is_suspended ? 'Réactiver' : 'Suspendre'}
                       </button>`
                    : ''}
                </td>
              </tr>
            `).join('')}
          </table>
        </div>
      ` + (TZ.adminRecovery ? await TZ.adminRecovery() : '');

    } else if (tab === 'pay') {
      body = picker('pay', arg, comps.filter((c) => c.status === 'published')) +
        (arg ? await TZ.roster(arg, true, true) : '');

    } else if (tab === 'scan') {
      body = '<h1>📷 Scanner</h1><div id="scanbox"></div>';

    } else if (tab === 'matches') {
      body = picker('matches', arg, comps.filter((c) => c.status === 'published'));

      if (arg) {
        const ro = (await TZ.rpc('reservation_roster', {
          p_competition: arg
        })).filter((r) => r.status === 'confirmed');

        const nm = Object.fromEntries(
          ro.map((r) => [r.user_id, r.gamer_tag || r.display_name])
        );

        const ms = await q(
          sb.from('matches')
            .select('*, match_results(*)')
            .eq('competition_id', arg)
            .order('round_no', { nullsFirst: false })
            .order('slot')
            .order('scheduled_at')
        );

        const opts = ro.map((r) =>
          `<option value="${r.user_id}">${esc(nm[r.user_id])}</option>`
        ).join('');

        body += `
          <div class="row">
            <button class="btn primary" data-act="genBracket" data-id="${arg}">
              🎲 Tirage au sort & tableau
            </button>
            <a class="btn" href="#/bracket/${arg}">🗂️ Voir</a>
          </div>

          <details class="card">
            <summary>＋ Match manuel</summary>
            <form data-form="newmatch" data-comp="${arg}">
              <select name="p1" required>
                <option value="">Joueur 1</option>${opts}
              </select>
              <select name="p2" required>
                <option value="">Joueur 2</option>${opts}
              </select>
              <input name="round" placeholder="Tour (ex : Quart de finale)">
              <input type="datetime-local" name="at" required>
              <button class="btn primary">Programmer</button>
            </form>
          </details>

          ${ms.map((m) => {
            const r = Array.isArray(m.match_results)
              ? m.match_results[0]
              : m.match_results;

            return `
              <div class="card">
                <p class="vs">
                  ${esc(nm[m.player1_id] || '?')}
                  <i>VS</i>
                  ${esc(nm[m.player2_id] || '?')}
                </p>

                <p class="center muted small">
                  ${esc(m.round)} • ${fmt(m.scheduled_at)} • ${TZ.MSTAT[m.status] || m.status}
                </p>

                ${!m.player1_id || !m.player2_id
                  ? '<p class="center muted small">⏳ En attente des qualifiés</p>'
                  : ''}

                <form class="row center" data-form="sched" data-id="${m.id}">
                  <input
                    type="datetime-local"
                    name="at"
                    value="${m.scheduled_at
                      ? new Date(new Date(m.scheduled_at) - new Date().getTimezoneOffset() * 6e4).toISOString().slice(0, 16)
                      : ''}"
                    style="flex:1;margin:0"
                    required
                  >
                  <button class="btn sm">🕒</button>
                </form>

                <form
                  ${!m.player1_id || !m.player2_id ? 'hidden' : ''}
                  data-form="score"
                  data-match="${m.id}"
                  data-p1="${m.player1_id}"
                  data-p2="${m.player2_id}"
                  class="row center"
                >
                  <input name="s1" type="number" min="0" value="${r?.score1 ?? ''}" style="width:80px" required>
                  <b>:</b>
                  <input name="s2" type="number" min="0" value="${r?.score2 ?? ''}" style="width:80px" required>
                  <button class="btn sm">Enregistrer score</button>

                  ${r && !r.validated_at
                    ? `<button type="button" class="btn sm primary" data-act="valMatch" data-id="${m.id}">Valider le résultat</button>`
                    : ''}

                  ${r?.validated_at ? '<span class="badge cy">Validé</span>' : ''}
                </form>
              </div>`;
          }).join('')}`;
      }

    } else if (tab === 'results') {
      body = picker('results', arg, comps);

      if (arg) {
        const ro = (await TZ.rpc('reservation_roster', {
          p_competition: arg
        })).filter((r) => r.status === 'confirmed');

        const cr = await q(
          sb.from('competition_results').select('*').eq('competition_id', arg)
        );

        const rk = Object.fromEntries(cr.map((x) => [x.user_id, x]));

        body += `
          <div class="card">
            <h2>Classement final</h2>
            <form data-form="finalrank" data-comp="${arg}">
              ${ro.map((r) => `
                <label class="f">
                  ${name(r)}
                  ${rk[r.user_id]?.validated_at ? '<span class="badge cy">validé</span>' : ''}
                  <input
                    type="number"
                    min="1"
                    name="${r.user_id}"
                    value="${rk[r.user_id]?.rank ?? ''}"
                    placeholder="Rang (laisser vide si hors classement)"
                  >
                </label>
              `).join('') || '<p class="muted">Aucun participant confirmé.</p>'}
              <button class="btn">Enregistrer</button>
            </form>

            <div class="row">
              <button class="btn primary" data-act="valResults" data-id="${arg}">
                1. Valider officiellement les résultats
              </button>
              <button class="btn primary" data-act="award" data-id="${arg}">
                2. Attribuer les points
              </button>
            </div>
          </div>

          <div class="card">
            <h2>Correction de points (tracée)</h2>
            <form data-form="correct" data-comp="${arg}">
              <select name="u">
                ${ro.map((r) => `<option value="${r.user_id}">${name(r)}</option>`).join('')}
              </select>
              <input name="pts" type="number" required placeholder="Points (+/-)">
              <input name="why" required placeholder="Motif obligatoire">
              <button class="btn danger">Appliquer la correction</button>
            </form>
          </div>`;
      }

    } else if (tab === 'points') {
      const cfg = await q(
        sb.from('points_config').select('*').order('points', { ascending: false })
      );

      body = `
        <div class="card">
          <h2>Barème des points</h2>
          <form data-form="pcfg">
            ${cfg.map((c) => `
              <label class="f">
                ${esc(c.label || c.key)}
                <input type="number" min="0" name="${c.key}" value="${c.points}">
              </label>
            `).join('')}
            <button class="btn primary">Enregistrer</button>
          </form>
        </div>`;

    } else if (tab === 'grand') {
      const y = new Date().getFullYear();

      const g = (
        await sb.from('grand_tournament_config')
          .select('*')
          .eq('season', y)
          .maybeSingle()
      ).data || {};

      const qs = await q(
        sb.from('annual_qualifications')
          .select('*, profiles(display_name,gamer_tag)')
          .eq('season', y)
          .order('rank')
      );

      body = `
        <div class="card">
          <h2>Grand Tournoi ${y}</h2>
          <form data-form="grand" data-season="${y}">
            <label class="f">
              Nombre de places
              <input type="number" name="slots" min="2" value="${g.slots || 16}">
            </label>

            <label class="f">
              Critères (publics)
              <textarea name="criteria" rows="3">${esc(g.criteria)}</textarea>
            </label>

            <label class="chk">
              <input type="checkbox" name="pub" ${g.published ? 'checked' : ''}>
              Publier les règles et la liste
            </label>

            <button class="btn primary">Enregistrer</button>
          </form>

          <button class="btn" data-act="qualify" data-season="${y}">
            Calculer les qualifiés (top du classement annuel)
          </button>
        </div>

        <div class="card">
          <h2>Qualifiés</h2>
          <table>
            ${qs.map((x) => `
              <tr>
                <td>#${x.rank}</td>
                <td>${esc(x.profiles?.gamer_tag || x.profiles?.display_name)}</td>
                <td>${esc(TZ.QSTAT[x.status] || x.status)}</td>
              </tr>
            `).join('') || '<tr><td class="muted">Aucun.</td></tr>'}
          </table>
        </div>`;

    } else if (tab === 'share') {
      const camps = await q(
        sb.from('share_campaigns')
          .select('*')
          .order('created_at', { ascending: false })
      ).catch(() => []);

      const cur = camps.find((c) => c.id === arg);

      const lb = await TZ.rpc('share_leaderboard', {
        p_campaign: cur ? cur.id : null
      }).catch(() => []);

      body = `
        <h1>📣 Partages</h1>

        <details class="card">
          <summary>🎁 Nouveau défi</summary>

          <form data-form="newcamp" style="margin-top:10px">
            <input name="title" required placeholder="Titre (ex : Partage & gagne un ticket)">

            <select name="comp">
              <option value="">Tous les tournois</option>
              ${comps.map((c) => `<option value="${c.id}">${esc(c.name)}</option>`).join('')}
            </select>

            <div class="row">
              <input name="target" type="number" min="1" value="50" style="flex:1" required>
              <select name="metric" style="flex:1">
                <option value="visits">👀 Personnes touchées</option>
                <option value="signups">🙋 Inscriptions</option>
              </select>
            </div>

            <input name="reward" required value="Ticket gratuit">

            <label class="f">
              Fin (facultatif)
              <input type="datetime-local" name="ends">
            </label>

            <button class="btn primary">Créer le défi</button>
          </form>
        </details>

        <div class="tabs">
          <a href="#/admin/share" class="${cur ? '' : 'on'}">🏆 Général</a>
          ${camps.map((c) => `
            <a href="#/admin/share/${c.id}" class="${cur && cur.id === c.id ? 'on' : ''}">
              ${c.active ? '🟢' : '⚪'} ${esc(c.title)}
            </a>
          `).join('')}
        </div>

        ${cur ? `
          <div class="row" style="justify-content:space-between">
            <span class="muted small">🎯 ${cur.target} • 🎁 ${esc(cur.reward)}</span>
            <button class="btn sm" data-act="campToggle" data-id="${cur.id}" data-v="${!cur.active}">
              ${cur.active ? 'Désactiver' : 'Activer'}
            </button>
          </div>
        ` : ''}

        <div class="card scroll">
          <table>
            <tr>
              <th>#</th><th>Joueur</th><th>👀</th><th>🙋</th><th>🎟️</th>
              ${cur ? '<th>🎯</th><th></th>' : ''}
            </tr>

            ${lb.map((r, i) => `
              <tr>
                <td>${['🥇', '🥈', '🥉'][i] || i + 1}</td>
                <td>
                  ${name(r)}<br>
                  <span class="muted small">${esc(r.code)}</span>
                </td>
                <td>${r.visits}</td>
                <td>${r.signups}</td>
                <td>${r.confirmed}</td>

                ${cur ? `
                  <td>${r.progress}/${cur.target}</td>
                  <td>
                    ${r.rewarded
                      ? '✅'
                      : r.progress >= cur.target
                        ? `<button class="btn sm primary" data-act="grant" data-c="${cur.id}" data-u="${r.user_id}">Attribuer</button>`
                        : ''}
                  </td>
                ` : ''}
              </tr>
            `).join('') || '<tr><td class="muted">Aucun partage pour le moment</td></tr>'}
          </table>
        </div>`;

    } else if (tab === 'mod') {
      const reps = await q(
        sb.from('post_reports')
          .select('*, posts(id, body, media_url, media_type, hidden)')
          .order('created_at', { ascending: false })
          .limit(50)
      ).catch(() => []);

      body = '<h1>🛡️ Modération</h1>' + (
        reps.map((r) => `
          <div class="card">
            <p class="small muted">⚑ ${esc(r.reason || 'Sans motif')} • ${fmt(r.created_at)}</p>

            ${r.posts ? `<p>${esc(r.posts.body)}</p>` : ''}

            ${r.posts?.media_type === 'image'
              ? `<img src="${esc(r.posts.media_url)}" alt="" style="max-width:100%;border-radius:12px">`
              : r.posts?.media_type === 'video'
                ? '<p class="muted small">🎬 Vidéo</p>'
                : ''}

            <div class="row">
              <button class="btn sm" data-act="modHide" data-id="${r.post_id}" data-r="${r.id}">🙈 Masquer</button>
              <button class="btn sm danger" data-act="modDel" data-id="${r.post_id}">🗑️ Supprimer</button>
              <button class="btn sm" data-act="modOk" data-r="${r.id}">✔ Ignorer</button>
            </div>
          </div>
        `).join('') || '<div class="card center muted">Aucun signalement de post 🎉</div>'
      ) + (TZ.adminDmReports ? await TZ.adminDmReports() : '');

    } else if (tab === 'formats') {
      body = await TZ.adminFormats(arg);

    } else if (tab === 'friendly') {
      body = await TZ.adminFriendly();

    } else if (tab === 'fraud') {
      body = await TZ.adminFraud();

    } else if (tab === 'qr') {
      body = await TZ.adminQr();

    } else if (tab === 'features') {
      body = await TZ.adminFeatures();

    } else if (tab === 'docs') {
      const vs = await q(
        sb.from('legal_document_versions')
          .select('*')
          .order('slug')
          .order('version', { ascending: false })
      );

      const ac = await q(
        sb.from('user_legal_acceptances')
          .select('*')
          .order('accepted_at', { ascending: false })
          .limit(40)
      );

      body = `
        <div class="card">
          <h2>Versions des documents</h2>

          <div class="scroll">
            <table>
              ${vs.map((v) => `
                <tr>
                  <td>${esc(v.slug)} v${v.version}</td>
                  <td>
                    ${v.published_at
                      ? 'Publiée ' + fmt(v.published_at)
                      : '<span class="badge gold">Brouillon</span>'}
                  </td>
                  <td>
                    ${v.published_at
                      ? ''
                      : `<button class="btn sm primary" data-act="pubDoc" data-id="${v.id}">Publier</button>`}
                  </td>
                </tr>
              `).join('')}
            </table>
          </div>

          <form data-form="newver" class="row">
            <select name="slug">
              ${(window.LEGAL_DOCS || []).map((d) =>
                `<option value="${d.slug}">${esc(d.title)}</option>`
              ).join('')}
            </select>
            <button class="btn sm">Créer une nouvelle version (copie du texte actuel)</button>
          </form>
        </div>

        <div class="card">
          <h2>Preuves d'acceptation (40 dernières)</h2>
          <div class="scroll">
            <table>
              ${ac.map((a) => `
                <tr>
                  <td>${fmt(a.accepted_at)}</td>
                  <td>${esc(a.document_type)} v${a.document_version}</td>
                  <td>${esc(a.context)}</td>
                  <td class="muted small">${a.user_id.slice(0, 8)}</td>
                </tr>
              `).join('')}
            </table>
          </div>
        </div>`;

    } else if (tab === 'msgs') {
      body = `
        <select onchange="location.hash='#/admin/msgs/'+this.value">
          <option value="">Choisir un partenaire…</option>
          ${partners.map((p) =>
            `<option value="${p.id}" ${p.id === arg ? 'selected' : ''}>${esc(p.name)}</option>`
          ).join('')}
        </select>
        ${arg ? await TZ.messages(arg, true) : ''}`;

    } else if (tab === 'audit') {
      const rows = await q(
        sb.from('audit_logs')
          .select('*')
          .order('created_at', { ascending: false })
          .limit(100)
      );

      body = `
        <div class="card scroll">
          <table>
            <tr><th>Date</th><th>Action</th><th>Table</th><th>Acteur</th></tr>
            ${rows.map((a) => `
              <tr>
                <td>${fmt(a.created_at)}</td>
                <td>${TZ.ACTION[a.action] || a.action}</td>
                <td>${esc(a.table_name)}</td>
                <td class="muted small">${esc(String(a.actor_id || 'système').slice(0, 8))}</td>
              </tr>
            `).join('')}
          </table>
        </div>`;
    }

    const group =
      ['newcomp', 'editcomp'].includes(tab) ? 'comps' :
      tab === 'scan' ? 'pay' :
      ['matches', 'results', 'formats', 'friendly', 'fraud'].includes(tab) ? 'matches' :
      ['partners', 'qr'].includes(tab) ? 'partners' :
      ['points', 'grand', 'docs', 'msgs', 'mod', 'features', 'audit'].includes(tab) ? 'settings' :
      tab;

    const sub =
      group === 'partners'
        ? TZ.tabs('admin', [
            ['partners', '🏢 Salles'],
            ['qr', '📲 Codes QR']
          ], tab)

      : group === 'pay'
        ? TZ.tabs('admin', [
            ['pay', '💰 Liste'],
            ['scan', '📷 Scanner']
          ], tab)

      : group === 'matches'
        ? TZ.tabs('admin', [
            ['matches', '⚔️ Matchs'],
            ['results', '🏆 Résultats'],
            ['formats', '🏟️ Formats'],
            ['friendly', '🤝 Amicaux'],
            ['fraud', '🚨 Fraude']
          ], tab)

      : group === 'settings'
        ? TZ.tabs('admin', [
            ['points', '⭐ Barème'],
            ['grand', '👑 Grand Tournoi'],
            ['docs', '📄 Documents'],
            ['features', '🧪 Nouveautés'],
            ['msgs', '💬 Messages'],
            ['audit', '🧾 Audit']
          ], tab)

      : '';

    const NAV = [
      ['stats', '📊', 'Tableau'],
      ['comps', '🎮', 'Tournois', toValidate],
      ['partners', '🏢', 'Partenaires', reqs.length],
      ['players', '👥', 'Joueurs'],
      ['pay', '💰', 'Paiements', pendPay],
      ['matches', '⚔️', 'Matchs'],
      ['share', '📣', 'Partages'],
      ['settings', '⚙️', 'Réglages']
    ];

    view(TZ.shell('admin', NAV, group, sub + body));

    if (tab === 'scan') {
      TZ.scanner(TZ.$('#scanbox'));
    }
  };

  ACT.cstatus = (d) => {
    let note = null;

    if (['changes_requested', 'rejected'].includes(d.to)) {
      note = prompt('Message pour le partenaire :');
      if (note === null) return;
    }

    TZ.run(async () => {
      const row = { status: d.to };

      if (note !== null) row.review_note = note;

      if (d.to === 'published') {
        row.published_at = new Date().toISOString();
      }

      await q(sb.from('competitions').update(row).eq('id', d.id));

      if (d.by) {
        await q(sb.from('notifications').insert({
          user_id: d.by,
          title: 'Compétition ' + TZ.COMP[d.to].toLowerCase(),
          body: d.name + (note ? ' — ' + note : '')
        }));
      }
    }, 'Statut mis à jour');
  };

  FORMS.newpartner = (f, d) =>
    TZ.run(
      () => q(sb.from('partners').insert({
        name: d.get('name'),
        city: d.get('city'),
        slug: d.get('name').toLowerCase()
          .replace(/[^a-z0-9]+/g, '-')
          .replace(/^-|-$/g, '') + '-' + Math.random().toString(36).slice(2, 6),
        status: 'active'
      })),
      'Partenaire créé'
    );

  FORMS.addmember = (f, d) =>
    TZ.run(
      () => TZ.rpc('add_partner_member', {
        p_partner: d.get('partner'),
        p_email: d.get('email'),
        p_can_confirm: !!d.get('confirm')
      }),
      'Accès accordé'
    );

  ACT.pstate = (d) =>
    TZ.run(
      () => q(sb.from('partners').update({
        [d.f]: d.v === 'true' ? true : d.v === 'false' ? false : d.v
      }).eq('id', d.id)),
      'Partenaire mis à jour'
    );

  FORMS.psearch = (f, d) =>
    TZ.go('#/admin/players/' + encodeURIComponent(d.get('s') || ''));

  ACT.suspend = (d) =>
    TZ.run(
      () => q(sb.from('profiles').update({
        is_suspended: d.v === 'true'
      }).eq('id', d.id)),
      'Compte mis à jour'
    );

  FORMS.newmatch = (f, d) =>
    TZ.run(
      () => q(sb.from('matches').insert({
        competition_id: f.dataset.comp,
        player1_id: d.get('p1'),
        player2_id: d.get('p2'),
        round: d.get('round'),
        scheduled_at: new Date(d.get('at')).toISOString()
      })),
      'Match programmé'
    );

  FORMS.score = (f, d) =>
    TZ.run(async () => {
      const s1 = +d.get('s1');
      const s2 = +d.get('s2');

      await q(sb.from('match_results').upsert({
        match_id: f.dataset.match,
        score1: s1,
        score2: s2,
        winner_id: s1 > s2
          ? f.dataset.p1
          : s2 > s1
            ? f.dataset.p2
            : null,
        entered_by: state.session.user.id,
        validated_by: null,
        validated_at: null
      }));
    }, 'Score enregistré (à valider)');

  ACT.valMatch = (d) =>
    TZ.run(async () => {
      await q(
        sb.from('match_results')
          .update({
            validated_by: state.session.user.id,
            validated_at: new Date().toISOString()
          })
          .eq('match_id', d.id)
      );

      await q(
        sb.from('matches')
          .update({ status: 'finished' })
          .eq('id', d.id)
      );
    }, 'Résultat validé');

  FORMS.finalrank = (f, d) =>
    TZ.run(async () => {
      const rows = [...d.entries()]
        .filter(([, v]) => v)
        .map(([u, v]) => ({
          competition_id: f.dataset.comp,
          user_id: u,
          rank: +v,
          validated_by: null,
          validated_at: null
        }));

      await q(
        sb.from('competition_results')
          .delete()
          .eq('competition_id', f.dataset.comp)
      );

      if (rows.length) {
        await q(sb.from('competition_results').insert(rows));
      }
    }, 'Classement enregistré (non validé)');

  ACT.valResults = (d) =>
    TZ.run(
      () => TZ.rpc('validate_competition_results', {
        p_competition: d.id
      }),
      'Résultats validés'
    );

  ACT.award = (d) => {
    if (confirm('Attribuer les points ? (une seule fois par joueur)')) {
      TZ.run(
        () => TZ.rpc('award_points', { p_competition: d.id }),
        'Points attribués'
      );
    }
  };

  FORMS.correct = (f, d) =>
    TZ.run(
      () => TZ.rpc('correct_points', {
        p_user: d.get('u'),
        p_competition: f.dataset.comp,
        p_points: +d.get('pts'),
        p_reason: d.get('why')
      }),
      'Correction enregistrée'
    );

  FORMS.pcfg = (f, d) =>
    TZ.run(async () => {
      for (const [k, v] of d.entries()) {
        await q(
          sb.from('points_config')
            .update({ points: +v })
            .eq('key', k)
        );
      }
    }, 'Barème enregistré');

  FORMS.grand = (f, d) =>
    TZ.run(
      () => q(sb.from('grand_tournament_config').upsert({
        season: +f.dataset.season,
        slots: +d.get('slots'),
        criteria: d.get('criteria'),
        published: !!d.get('pub')
      })),
      'Configuration enregistrée'
    );

  ACT.qualify = (d) =>
    TZ.run(async () => {
      const g = (
        await sb.from('grand_tournament_config')
          .select('slots')
          .eq('season', +d.season)
          .maybeSingle()
      ).data;

      if (!g) {
        throw new Error('Enregistrez d\'abord la configuration.');
      }

      const top = await q(
        sb.from('rankings_annual')
          .select('user_id,points')
          .eq('season', +d.season)
          .order('points', { ascending: false })
          .limit(g.slots)
      );

      await q(
        sb.from('annual_qualifications')
          .delete()
          .eq('season', +d.season)
      );

      if (top.length) {
        await q(
          sb.from('annual_qualifications').insert(
            top.map((r, i) => ({
              season: +d.season,
              user_id: r.user_id,
              rank: i + 1,
              status: 'qualified'
            }))
          )
        );
      }
    }, 'Qualifiés calculés');

  ACT.pubDoc = (d) => {
    const re = confirm('Exiger une nouvelle acceptation par les utilisateurs ?');

    TZ.run(
      () => q(sb.from('legal_document_versions').update({
        published_at: new Date().toISOString(),
        effective_at: new Date().toISOString(),
        requires_reacceptance: re
      }).eq('id', d.id)),
      'Version publiée'
    );
  };

  FORMS.newver = (f, d) =>
    TZ.run(async () => {
      const slug = d.get('slug');
      const doc = window.LEGAL_DOCS.find((x) => x.slug === slug);

      const last = (
        await sb.from('legal_document_versions')
          .select('version')
          .eq('slug', slug)
          .order('version', { ascending: false })
          .limit(1)
      ).data?.[0]?.version || 0;

      await q(
        sb.from('legal_document_versions').insert({
          slug,
          version: last + 1,
          content: { articles: doc.articles }
        })
      );
    }, 'Nouvelle version créée (brouillon)');

  ACT.reqOk = (d) =>
    TZ.run(
      () => TZ.rpc('approve_partner_request', { p_request: d.id }),
      'Partenaire validé ✅'
    );

  ACT.reqNo = (d) => {
    const n = prompt('Motif (facultatif) :');
    if (n === null) return;

    TZ.run(
      () => TZ.rpc('reject_partner_request', {
        p_request: d.id,
        p_note: n || null
      }),
      'Demande refusée'
    );
  };

  FORMS.newcamp = (f, d) =>
    TZ.run(
      () => q(sb.from('share_campaigns').insert({
        title: d.get('title'),
        competition_id: d.get('comp') || null,
        target: +d.get('target'),
        metric: d.get('metric'),
        reward: d.get('reward'),
        ends_at: d.get('ends')
          ? new Date(d.get('ends')).toISOString()
          : null
      })),
      'Défi créé 🎁'
    );

  ACT.campToggle = (d) =>
    TZ.run(
      () => q(sb.from('share_campaigns').update({
        active: d.v === 'true'
      }).eq('id', d.id)),
      'Mis à jour'
    );

  ACT.grant = (d) =>
    TZ.run(
      () => TZ.rpc('grant_reward', {
        p_campaign: d.c,
        p_user: d.u
      }),
      'Récompense attribuée 🎁'
    );

  ACT.genBracket = (d) => {
    if (confirm('Tirer au sort les participants confirmés et créer le tableau ?')) {
      TZ.run(async () => {
        const n = await TZ.rpc('generate_bracket', {
          p_competition: d.id
        });

        TZ.toast(n + ' joueurs tirés au sort 🎲');
      });
    }
  };

  FORMS.sched = (f, d) =>
    TZ.run(
      () => q(sb.from('matches').update({
        scheduled_at: new Date(d.get('at')).toISOString()
      }).eq('id', f.dataset.id)),
      'Heure enregistrée'
    );

  ACT.modHide = (d) =>
    TZ.run(async () => {
      await q(
        sb.from('posts')
          .update({ hidden: true })
          .eq('id', d.id)
      );

      await q(
        sb.from('post_reports')
          .delete()
          .eq('id', d.r)
      );
    }, 'Post masqué');

  ACT.modDel = (d) => {
    if (confirm('Supprimer définitivement ?')) {
      TZ.run(
        () => q(sb.from('posts').delete().eq('id', d.id)),
        'Supprimé'
      );
    }
  };

  ACT.modOk = (d) =>
    TZ.run(
      () => q(sb.from('post_reports').delete().eq('id', d.r)),
      'Signalement ignoré'
    );

})();
