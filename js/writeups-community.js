/**
 * Writeups de comunidad: lista desde Supabase + formulario (requiere sesión).
 */
(function () {
    const LIST_ID = 'communityWriteupsList';
    const FORM_ID = 'community-writeup-form';
    const HINT_ID = 'community-writeup-auth-hint';
    const MSG_ID = 'community-writeup-msg';
    const PANEL_ID = 'community-writeup-create-panel';
    const TOGGLE_ID = 'community-writeup-toggle';
    const SEARCH_ID = 'communitySearchInput';
    const INFO_ID = 'communityWriteupsInfo';
    const PAGINATION_ID = 'communityWriteupsPagination';
    const PAGE_SIZE = 12;

    const state = {
        rows: [],
        filteredRows: [],
        likesById: new Map(),
        likedByMe: new Set(),
        page: 1,
        session: null
    };

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function diffClass(d) {
        const m = { Easy: 'diff-easy', Medium: 'diff-medium', Hard: 'diff-hard', Insane: 'diff-insane' };
        return m[d] || 'diff-medium';
    }

    function getUiLang() {
        return localStorage.getItem('lang') || document.documentElement.lang || 'es';
    }

    function t(en, es) {
        return getUiLang() === 'en' ? en : es;
    }

    function buildSearch(row, username) {
        const parts = [
            row.title,
            row.summary || '',
            row.slug,
            row.difficulty,
            row.platform,
            row.lang,
            (row.tags || []).join(' '),
            username || ''
        ];
        return parts.join(' ').toLowerCase();
    }

    function normalizeUsername(value) {
        var v = value == null ? '' : String(value).trim();
        return v || null;
    }

    function pickProfileUsername(profilesField) {
        if (Array.isArray(profilesField)) {
            if (!profilesField.length) return null;
            return normalizeUsername(profilesField[0] && profilesField[0].username);
        }
        if (profilesField && typeof profilesField === 'object') {
            return normalizeUsername(profilesField.username);
        }
        return null;
    }

    function waitForSupabase(cb, tries) {
        const t = tries || 0;
        if (window._sbClient) {
            cb(window._sbClient);
            return;
        }
        if (t > 200) {
            var ul = document.getElementById(LIST_ID);
            var errLang = getUiLang();
            if (ul && ul.children.length === 0) {
                ul.innerHTML =
                    '<li class="community-writeups-loading" style="color:#f38ba8" data-postlang="' +
                    errLang +
                    '">' +
                    (errLang === 'en'
                        ? 'Supabase client not ready. Reload the page or check main.js / network.'
                        : 'Cliente Supabase no disponible. Recarga la página o revisa main.js / red.') +
                    '</li>';
            }
            console.error('[community_writeups] window._sbClient missing after wait');
            return;
        }
        setTimeout(function () { waitForSupabase(cb, t + 1); }, 50);
    }

    function setCreatePanelOpen(open) {
        const panel = document.getElementById(PANEL_ID);
        const btn = document.getElementById(TOGGLE_ID);
        if (!panel) return;
        panel.hidden = !open;
        if (btn) btn.setAttribute('aria-expanded', open ? 'true' : 'false');
    }

    function setAuthHintVisible(session) {
        const hint = document.getElementById(HINT_ID);
        if (!hint) return;
        hint.hidden = !!session;
    }

    function showMsg(el, text, kind) {
        if (!el) return;
        el.textContent = text || '';
        el.className = 'community-writeup-msg' + (kind === 'ok' ? ' community-writeup-msg--ok' : kind === 'err' ? ' community-writeup-msg--err' : '');
    }

    function sortRowsByLikes(rows) {
        rows.sort(function (a, b) {
            var likesA = state.likesById.get(a.id) || 0;
            var likesB = state.likesById.get(b.id) || 0;
            if (likesA !== likesB) return likesB - likesA;
            return String(b.created_at || '').localeCompare(String(a.created_at || ''));
        });
    }

    function renderInfo(totalMatches) {
        var info = document.getElementById(INFO_ID);
        if (!info) return;
        var totalPages = Math.max(1, Math.ceil(totalMatches / PAGE_SIZE));
        if (totalMatches === 0) {
            info.textContent = t('No matches in community writeups.', 'No hay coincidencias en writeups de comunidad.');
            return;
        }
        info.textContent =
            t('Top likes · showing page ', 'Top likes · mostrando página ') +
            state.page +
            t(' of ', ' de ') +
            totalPages +
            ' · ' +
            totalMatches +
            t(' results', ' resultados');
    }

    function renderPagination() {
        var wrap = document.getElementById(PAGINATION_ID);
        if (!wrap) return;
        var total = state.filteredRows.length;
        var totalPages = Math.ceil(total / PAGE_SIZE);
        if (!totalPages || totalPages <= 1) {
            wrap.innerHTML = '';
            return;
        }

        var html = '';
        var prevDisabled = state.page <= 1 ? ' disabled' : '';
        var nextDisabled = state.page >= totalPages ? ' disabled' : '';
        html += '<button class="community-page-btn" data-page="' + (state.page - 1) + '"' + prevDisabled + '>&larr;</button>';
        for (var p = 1; p <= totalPages; p++) {
            if (p === 1 || p === totalPages || Math.abs(p - state.page) <= 2) {
                html +=
                    '<button class="community-page-btn' +
                    (p === state.page ? ' active' : '') +
                    '" data-page="' +
                    p +
                    '">' +
                    p +
                    '</button>';
            } else if (p === state.page - 3 || p === state.page + 3) {
                html += '<span class="community-page-dots">…</span>';
            }
        }
        html += '<button class="community-page-btn" data-page="' + (state.page + 1) + '"' + nextDisabled + '>&rarr;</button>';
        wrap.innerHTML = html;

        wrap.querySelectorAll('[data-page]').forEach(function (btn) {
            btn.addEventListener('click', function () {
                if (btn.disabled) return;
                var p = Number(btn.getAttribute('data-page') || '1');
                if (!p) return;
                state.page = Math.max(1, Math.min(totalPages, p));
                renderList();
            });
        });
    }

    function renderList() {
        const ul = document.getElementById(LIST_ID);
        if (!ul) return;
        ul.innerHTML = '';

        var uiLang = getUiLang();
        var rows = state.filteredRows;
        renderInfo(rows.length);
        renderPagination();

        if (!rows || rows.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'community-writeups-loading';
            empty.setAttribute('data-postlang', uiLang);
            empty.textContent =
                uiLang === 'en'
                    ? 'No matching community writeups. Try another search.'
                    : 'No hay writeups de comunidad que coincidan. Prueba otra búsqueda.';
            ul.appendChild(empty);
            return;
        }

        var start = (state.page - 1) * PAGE_SIZE;
        var pageRows = rows.slice(start, start + PAGE_SIZE);
        pageRows.forEach(function (row) {
            const username =
                normalizeUsername(row._author_username) ||
                pickProfileUsername(row.profiles) ||
                'ENTITY';
            const search = buildSearch(row, username);
            const href = '/writeup-community.html?slug=' + encodeURIComponent(row.slug);
            const summaryText = (row.summary || '').trim();
            const snippet = summaryText
                ? esc(summaryText.slice(0, 160)) + (summaryText.length > 160 ? '…' : '')
                : '';
            var byLabel = uiLang === 'en' ? 'By ' : 'Por ';
            var likes = state.likesById.get(row.id) || 0;
            var liked = state.likedByMe.has(row.id);
            var likeLabel = uiLang === 'en' ? 'Like this writeup' : 'Dar like a este writeup';

            const li = document.createElement('li');
            li.className = 'writeup-item writeup-item--community';
            li.classList.add('reveal-active');
            li.setAttribute('data-postlang', row.lang || 'es');
            li.setAttribute('data-search', search);
            li.innerHTML =
                '<a href="' +
                esc(href) +
                '" class="writeup-link">' +
                '<div class="writeup-title">' + esc(row.title) + '</div>' +
                (snippet ? '<div class="writeup-community-snippet">' + snippet + '</div>' : '') +
                '<div class="writeup-community-by">' + esc(byLabel + username) + '</div>' +
                '</a>' +
                '<div class="writeup-community-footer">' +
                '<div class="writeup-meta">' +
                '<span class="badge ' + diffClass(row.difficulty) + '">' + esc(row.difficulty) + '</span>' +
                '<span class="badge plat-community">' + esc(row.platform || 'Other') + '</span>' +
                '</div>' +
                '<button type="button" class="community-like-btn' +
                (liked ? ' is-liked' : '') +
                '" data-like-id="' +
                esc(row.id) +
                '" aria-label="' +
                esc(likeLabel) +
                '">' +
                '<span class="community-like-btn__icon">❤</span>' +
                '<span class="community-like-btn__count">' +
                String(likes) +
                '</span>' +
                '</button>' +
                '</div>';
            ul.appendChild(li);
        });

        ul.querySelectorAll('[data-like-id]').forEach(function (btn) {
            btn.addEventListener('click', function (e) {
                e.preventDefault();
                e.stopPropagation();
                handleToggleLike(btn.getAttribute('data-like-id'));
            });
        });
    }

    function applyCommunitySearch() {
        var input = document.getElementById(SEARCH_ID);
        var term = ((input && input.value) || '').toLowerCase().trim();
        state.filteredRows = state.rows.filter(function (row) {
            var username =
                normalizeUsername(row._author_username) ||
                pickProfileUsername(row.profiles) ||
                'ENTITY';
            var search = buildSearch(row, username);
            return term === '' || search.indexOf(term) !== -1;
        });
        sortRowsByLikes(state.filteredRows);
        var totalPages = Math.max(1, Math.ceil(state.filteredRows.length / PAGE_SIZE));
        state.page = Math.max(1, Math.min(state.page, totalPages));
        renderList();
    }

    async function loadLikesState(supabase, rows) {
        state.likesById = new Map();
        state.likedByMe = new Set();
        var ids = rows.map(function (r) { return r.id; });
        if (!ids.length) return;

        var likesRes = await supabase
            .from('community_writeup_likes')
            .select('writeup_id')
            .in('writeup_id', ids);
        if (!likesRes.error && Array.isArray(likesRes.data)) {
            likesRes.data.forEach(function (likeRow) {
                var id = likeRow.writeup_id;
                state.likesById.set(id, (state.likesById.get(id) || 0) + 1);
            });
        }

        if (state.session && state.session.user && state.session.user.id) {
            var meRes = await supabase
                .from('community_writeup_likes')
                .select('writeup_id')
                .eq('user_id', state.session.user.id)
                .in('writeup_id', ids);
            if (!meRes.error && Array.isArray(meRes.data)) {
                meRes.data.forEach(function (row) {
                    state.likedByMe.add(row.writeup_id);
                });
            }
        }
    }

    async function handleToggleLike(writeupId) {
        if (!writeupId) return;
        var sb = window._sbClient;
        if (!sb) return;
        if (!state.session) {
            var authBtn = document.getElementById('auth-btn');
            if (authBtn) authBtn.click();
            return;
        }

        var res = await sb.rpc('toggle_community_writeup_like', { p_writeup_id: writeupId });
        if (res.error || !res.data || res.data.ok !== true) {
            console.error('[community_writeup_like]', res.error || res.data);
            return;
        }

        var liked = !!res.data.liked;
        var likesCount = Number(res.data.likes_count || 0);
        state.likesById.set(writeupId, likesCount);
        if (liked) state.likedByMe.add(writeupId);
        else state.likedByMe.delete(writeupId);
        applyCommunitySearch();
    }

    async function loadList(supabase) {
        const ul = document.getElementById(LIST_ID);
        if (!ul) return;

        var loadLang = getUiLang();
        ul.innerHTML =
            '<li class="community-writeups-loading" data-postlang="' +
            loadLang +
            '">' +
            (loadLang === 'en' ? 'Loading community writeups…' : 'Cargando writeups de la comunidad…') +
            '</li>';

        var sel =
            'id, title, slug, summary, difficulty, platform, tags, lang, status, created_at, author_id, profiles(username)';
        var res = await supabase
            .from('community_writeups')
            .select(sel)
            .eq('status', 'approved')
            .order('created_at', { ascending: false })
            .limit(1000);
        var data = res.data;
        var error = res.error;

        if (error && error.message && String(error.message).indexOf('profiles') !== -1) {
            res = await supabase
                .from('community_writeups')
                .select('id, title, slug, summary, difficulty, platform, tags, lang, status, created_at, author_id')
                .eq('status', 'approved')
                .order('created_at', { ascending: false })
                .limit(1000);
            data = res.data;
            error = res.error;
        }

        if (error) {
            var errLang = getUiLang();
            ul.innerHTML =
                '<li class="community-writeups-loading" style="color:#f38ba8" data-postlang="' +
                errLang +
                '">' +
                (errLang === 'en'
                    ? 'Could not load the list. Check the console or Supabase configuration.'
                    : 'No se pudo cargar la lista. Revisa la consola o la configuración de Supabase.') +
                '</li>';
            console.error('[community_writeups]', error);
            return;
        }

        state.rows = data || [];
        var missingAuthorIds = [];
        state.rows.forEach(function (row) {
            var hasName = normalizeUsername(row._author_username) || pickProfileUsername(row.profiles);
            if (!hasName && row.author_id) missingAuthorIds.push(row.author_id);
        });
        if (missingAuthorIds.length) {
            var ids = Array.from(new Set(missingAuthorIds));
            var profRes = await supabase.from('profiles').select('id,username').in('id', ids);
            var profileRows = profRes.data || [];
            var byId = new Map();
            profileRows.forEach(function (p) {
                var un = normalizeUsername(p.username);
                if (un) byId.set(p.id, un);
            });
            state.rows.forEach(function (row) {
                if (!normalizeUsername(row._author_username) && row.author_id && byId.has(row.author_id)) {
                    row._author_username = byId.get(row.author_id);
                }
            });
        }

        await loadLikesState(supabase, state.rows);
        state.page = 1;
        applyCommunitySearch();
    }

    function parseTags(str) {
        return String(str || '')
            .split(/[,]+/)
            .map(function (t) {
                return t.trim();
            })
            .filter(Boolean)
            .slice(0, 12);
    }

    function wireForm(supabase) {
        const form = document.getElementById(FORM_ID);
        const msgEl = document.getElementById(MSG_ID);
        if (!form) return;

        form.addEventListener('submit', async function (e) {
            e.preventDefault();
            showMsg(msgEl, '', '');

            const fd = new FormData(form);
            const title = (fd.get('title') || '').toString().trim();
            const summary = (fd.get('summary') || '').toString().trim();
            const body = (fd.get('body') || '').toString();
            const difficulty = (fd.get('difficulty') || 'Medium').toString();
            const platform = (fd.get('platform') || 'Other').toString().trim() || 'Other';
            const lang = (fd.get('lang') || 'es').toString();
            const tags = parseTags(fd.get('tags'));

            if (title.length < 3) {
                showMsg(msgEl, 'El título debe tener al menos 3 caracteres.', 'err');
                return;
            }
            if (body.trim().length < 20) {
                showMsg(msgEl, 'El cuerpo debe tener al menos 20 caracteres.', 'err');
                return;
            }

            const btn = form.querySelector('.community-writeup-submit');
            if (btn) btn.disabled = true;

            const { data, error } = await supabase.rpc('submit_community_writeup', {
                p_title: title,
                p_summary: summary || null,
                p_body: body,
                p_difficulty: difficulty,
                p_platform: platform,
                p_tags: tags,
                p_lang: lang === 'en' ? 'en' : 'es'
            });

            if (btn) btn.disabled = false;

            if (error) {
                console.error(error);
                showMsg(msgEl, error.message || 'Error al publicar.', 'err');
                return;
            }

            const result = data;
            if (!result || result.success !== true) {
                const code = result && result.error;
                if (code === 'NOT_AUTHENTICATED') {
                    showMsg(msgEl, 'Debes iniciar sesión para publicar.', 'err');
                } else if (code === 'VALIDATION') {
                    showMsg(msgEl, 'Revisa título y cuerpo (longitudes mínimas).', 'err');
                } else {
                    showMsg(msgEl, 'No se pudo publicar. Inténtalo de nuevo.', 'err');
                }
                return;
            }

            const st = String(result.status || 'pending').toLowerCase();
            if (st === 'pending') {
                showMsg(
                    msgEl,
                    t(
                        'Sent for moderation. It will appear here after an admin approves it.',
                        'Enviado a moderación. Aparecerá en esta lista cuando un admin lo apruebe.'
                    ),
                    'ok'
                );
                form.reset();
                setCreatePanelOpen(false);
                loadList(supabase);
            } else {
                showMsg(msgEl, '¡Publicado! Redirigiendo…', 'ok');
                const slug = result.slug;
                if (slug) {
                    setTimeout(function () {
                        window.location.href = '/writeup-community.html?slug=' + encodeURIComponent(slug);
                    }, 600);
                } else {
                    loadList(supabase);
                    form.reset();
                    showMsg(msgEl, '¡Publicado!', 'ok');
                }
            }
        });
    }

    function wireCreateToggle(supabase) {
        const toggle = document.getElementById(TOGGLE_ID);
        if (!toggle) return;
        toggle.addEventListener('click', function () {
            supabase.auth.getSession().then(function (r) {
                const session = r.data && r.data.session;
                if (!session) {
                    var authBtn = document.getElementById('auth-btn');
                    if (authBtn) authBtn.click();
                    return;
                }
                var panel = document.getElementById(PANEL_ID);
                var willOpen = !!(panel && panel.hidden);
                setCreatePanelOpen(willOpen);
            });
        });
    }

    function wireCommunitySearch() {
        var input = document.getElementById(SEARCH_ID);
        if (!input) return;
        input.addEventListener('input', function () {
            state.page = 1;
            applyCommunitySearch();
        });
    }

    function initAuthUi(supabase) {
        supabase.auth.getSession().then(function (_ref) {
            const session = _ref.data && _ref.data.session;
            state.session = session || null;
            setAuthHintVisible(session);
            setCreatePanelOpen(false);
        });

        supabase.auth.onAuthStateChange(function (_event, session) {
            state.session = session || null;
            setAuthHintVisible(session);
            if (!session) setCreatePanelOpen(false);
            loadList(supabase);
        });
    }

    function boot(sb) {
        initAuthUi(sb);
        wireCreateToggle(sb);
        wireCommunitySearch();
        wireForm(sb);
        loadList(sb);

        var authBtn = document.getElementById('auth-btn');
        var hint = document.getElementById(HINT_ID);
        if (authBtn && hint) {
            var cta = hint.querySelector('.community-writeup-hint-cta');
            if (cta) {
                cta.addEventListener('click', function (e) {
                    e.preventDefault();
                    authBtn.click();
                });
            }
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        if (window._sbClient) {
            boot(window._sbClient);
        } else {
            waitForSupabase(boot);
        }
    });
})();
