/**
 * Vista de un writeup de comunidad (?slug= o ?id=).
 */
(function () {
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function diffClass(d) {
        const m = { Easy: 'diff-easy', Medium: 'diff-medium', Hard: 'diff-hard', Insane: 'diff-insane' };
        return m[d] || 'diff-medium';
    }

    function fmtDate(iso, lang) {
        if (!iso) return '';
        try {
            const dt = new Date(iso);
            return dt.toLocaleDateString(lang === 'en' ? 'en-US' : 'es-ES', {
                year: 'numeric',
                month: 'short',
                day: 'numeric'
            });
        } catch (e) {
            return '';
        }
    }

    function waitForSupabase(cb, tries) {
        const t = tries || 0;
        if (window._sbClient) {
            cb(window._sbClient);
            return;
        }
        if (t > 120) {
            var err = document.getElementById('wv-status');
            if (err) err.textContent = 'Supabase no disponible.';
            return;
        }
        setTimeout(function () {
            waitForSupabase(cb, t + 1);
        }, 50);
    }

    function renderMarkdown(md) {
        if (typeof marked === 'undefined' || typeof DOMPurify === 'undefined') return '<p>Error: librerías de Markdown no cargadas.</p>';
        const raw = marked.parse(md || '', { breaks: true, gfm: true });
        return DOMPurify.sanitize(raw, {
            USE_PROFILES: { html: true },
            ADD_ATTR: ['target', 'rel', 'loading', 'decoding']
        });
    }

    document.addEventListener('DOMContentLoaded', function () {
        var params = new URLSearchParams(window.location.search);
        var slug = params.get('slug');
        var id = params.get('id');

        if (!slug && !id) {
            var st = document.getElementById('wv-status');
            if (st) st.textContent = 'Falta ?slug= o ?id= en la URL.';
            return;
        }

        waitForSupabase(async function (supabase) {
            var sel =
                'id, title, slug, summary, body, difficulty, platform, tags, lang, status, created_at, profiles(username)';
            var q = supabase.from('community_writeups').select(sel);
            if (slug) q = q.eq('slug', slug);
            else q = q.eq('id', id);

            var res = await q.maybeSingle();
            var row = res.data;
            var err = res.error;

            if (err && err.message && err.message.indexOf('profiles') !== -1) {
                q = supabase.from('community_writeups').select('id, title, slug, summary, body, difficulty, platform, tags, lang, status, created_at, author_id');
                if (slug) q = q.eq('slug', slug);
                else q = q.eq('id', id);
                res = await q.maybeSingle();
                row = res.data;
                err = res.error;
            }

            var statusEl = document.getElementById('wv-status');
            var hero = document.getElementById('wv-hero');
            var bodyEl = document.getElementById('wv-body');

            if (err && err.code !== 'PGRST116') {
                if (statusEl) {
                    statusEl.textContent =
                        (localStorage.getItem('lang') || 'es') === 'en'
                            ? 'Could not load this writeup.'
                            : 'No se pudo cargar este writeup.';
                }
                document.title = 'Writeup — Breaker x Fixer';
                console.error(err);
                return;
            }
            if (!row) {
                if (statusEl) {
                    statusEl.textContent =
                        (localStorage.getItem('lang') || 'es') === 'en'
                            ? 'Writeup not found.'
                            : 'No se encontró el writeup.';
                }
                document.title = 'Writeup — Breaker x Fixer';
                return;
            }

            if (statusEl) statusEl.style.display = 'none';
            if (hero) hero.hidden = false;
            if (bodyEl) bodyEl.hidden = false;

            var lang = row.lang || 'es';
            document.documentElement.lang = lang;

            var prof = row.profiles;
            var username = prof && prof.username ? prof.username : '—';
            if (username === '—' && row.author_id) {
                try {
                    const { data: p } = await supabase
                        .from('profiles')
                        .select('username')
                        .eq('id', row.author_id)
                        .maybeSingle();
                    if (p && p.username) username = p.username;
                } catch (_) {
                    /* keep fallback */
                }
            }
            var uiLang = localStorage.getItem('lang') || lang || 'es';

            document.title = row.title + ' — Breaker x Fixer';

            var titleEl = document.getElementById('wv-title');
            if (titleEl) titleEl.textContent = row.title;

            var metaEl = document.getElementById('wv-meta');
            if (metaEl) {
                metaEl.innerHTML =
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
                    '<span class="sep">·</span>' +
                    '<span>' +
                    (uiLang === 'en' ? 'By ' : 'Por ') +
                    esc(username) +
                    '</span>' +
                    '<span class="sep">·</span>' +
                    '<time datetime="' +
                    esc(row.created_at) +
                    '">' +
                    esc(fmtDate(row.created_at, uiLang)) +
                    '</time>';
            }

            var tagsEl = document.getElementById('wv-tags');
            if (tagsEl && row.tags && row.tags.length) {
                tagsEl.hidden = false;
                tagsEl.innerHTML = row.tags
                    .map(function (t) {
                        return '<span class="badge" style="opacity:0.85">' + esc(t) + '</span>';
                    })
                    .join(' ');
            }

            if (bodyEl) bodyEl.innerHTML = renderMarkdown(row.body);
        });
    });
})();
