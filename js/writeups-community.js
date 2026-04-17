/**
 * Writeups de comunidad: lista desde Supabase + formulario (requiere sesión).
 */
(function () {
    const LIST_ID = 'communityWriteupsList';
    const FORM_ID = 'community-writeup-form';
    const HINT_ID = 'community-writeup-auth-hint';
    const MSG_ID = 'community-writeup-msg';

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function diffClass(d) {
        const m = { Easy: 'diff-easy', Medium: 'diff-medium', Hard: 'diff-hard', Insane: 'diff-insane' };
        return m[d] || 'diff-medium';
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

    function waitForSupabase(cb, tries) {
        const t = tries || 0;
        if (window._sbClient) {
            cb(window._sbClient);
            return;
        }
        if (t > 120) return;
        setTimeout(function () { waitForSupabase(cb, t + 1); }, 50);
    }

    function setFormVisible(session) {
        const form = document.getElementById(FORM_ID);
        const hint = document.getElementById(HINT_ID);
        if (!form || !hint) return;
        if (session) {
            form.hidden = false;
            hint.hidden = true;
        } else {
            form.hidden = true;
            hint.hidden = false;
        }
    }

    function showMsg(el, text, kind) {
        if (!el) return;
        el.textContent = text || '';
        el.className = 'community-writeup-msg' + (kind === 'ok' ? ' community-writeup-msg--ok' : kind === 'err' ? ' community-writeup-msg--err' : '');
    }

    function renderList(supabase, rows) {
        const ul = document.getElementById(LIST_ID);
        if (!ul) return;

        ul.innerHTML = '';

        var uiLang = localStorage.getItem('lang') || document.documentElement.lang || 'es';

        if (!rows || rows.length === 0) {
            const empty = document.createElement('li');
            empty.className = 'community-writeups-loading';
            empty.setAttribute('data-postlang', uiLang);
            empty.textContent =
                uiLang === 'en'
                    ? 'No community writeups yet. Be the first to publish!'
                    : 'Aún no hay writeups de la comunidad. ¡Sé el primero en publicar!';
            ul.appendChild(empty);
            if (typeof window.applyWriteupFilters === 'function') {
                window.applyWriteupFilters(uiLang);
            }
            return;
        }

        rows.forEach(function (row) {
            const prof = row.profiles;
            const username = prof && prof.username ? prof.username : '—';
            const search = buildSearch(row, username);
            const href = '/writeup-community.html?slug=' + encodeURIComponent(row.slug);
            const summaryText = (row.summary || '').trim();
            const snippet = summaryText
                ? esc(summaryText.slice(0, 160)) + (summaryText.length > 160 ? '…' : '')
                : '';
            var byLabel = uiLang === 'en' ? 'By ' : 'Por ';

            const li = document.createElement('li');
            li.className = 'writeup-item writeup-item--community';
            li.setAttribute('data-postlang', row.lang || 'es');
            li.setAttribute('data-search', search);
            li.innerHTML =
                '<a href="' +
                esc(href) +
                '" class="writeup-link">' +
                '<div class="writeup-title">' +
                esc(row.title) +
                '</div>' +
                (snippet
                    ? '<div class="writeup-community-snippet">' + snippet + '</div>'
                    : '') +
                '<div class="writeup-community-by">' +
                esc(byLabel + username) +
                '</div>' +
                '<div class="writeup-meta">' +
                '<span class="badge" style="opacity:0.8">' +
                esc((row.status || 'approved').toUpperCase()) +
                '</span>' +
                '<span class="badge ' +
                diffClass(row.difficulty) +
                '">' +
                esc(row.difficulty) +
                '</span>' +
                '<span class="badge plat-community">' +
                esc(row.platform || 'Other') +
                '</span>' +
                '</div>' +
                '</a>';
            ul.appendChild(li);
        });

        if (typeof window.applyWriteupFilters === 'function') {
            window.applyWriteupFilters(localStorage.getItem('lang') || document.documentElement.lang || 'es');
        }
    }

    async function loadList(supabase) {
        const ul = document.getElementById(LIST_ID);
        if (!ul) return;

        var loadLang = localStorage.getItem('lang') || document.documentElement.lang || 'es';
        ul.innerHTML =
            '<li class="community-writeups-loading" data-postlang="' +
            loadLang +
            '">' +
            (loadLang === 'en' ? 'Loading community writeups…' : 'Cargando writeups de la comunidad…') +
            '</li>';

        var sel =
            'id, title, slug, summary, difficulty, platform, tags, lang, status, created_at, profiles(username)';
        var res = await supabase.from('community_writeups').select(sel).order('created_at', { ascending: false }).limit(200);
        var data = res.data;
        var error = res.error;

        if (error && error.message && String(error.message).indexOf('profiles') !== -1) {
            res = await supabase
                .from('community_writeups')
                .select('id, title, slug, summary, difficulty, platform, tags, lang, status, created_at')
                .order('created_at', { ascending: false })
                .limit(200);
            data = res.data;
            error = res.error;
        }

        if (error) {
            var errLang = localStorage.getItem('lang') || document.documentElement.lang || 'es';
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

        renderList(supabase, data || []);
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
                    'Publicado y enviado a moderación. Aparecerá en público cuando un admin lo apruebe.',
                    'ok'
                );
                form.reset();
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

    function initAuthUi(supabase) {
        supabase.auth.getSession().then(function (_ref) {
            const session = _ref.data && _ref.data.session;
            setFormVisible(session);
        });

        supabase.auth.onAuthStateChange(function (_event, session) {
            setFormVisible(session);
            if (session) loadList(supabase);
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        waitForSupabase(function (sb) {
            initAuthUi(sb);
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
        });
    });
})();
