(function () {
    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
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

    function toIsoOrNull(v) {
        if (!v) return null;
        const dt = new Date(v);
        if (Number.isNaN(dt.getTime())) return null;
        return dt.toISOString();
    }

    function toDatetimeLocalValue(iso) {
        if (!iso) return '';
        const d = new Date(iso);
        if (Number.isNaN(d.getTime())) return '';
        const pad = function (n) { return String(n).padStart(2, '0'); };
        return d.getFullYear() + '-' + pad(d.getMonth() + 1) + '-' + pad(d.getDate()) + 'T' + pad(d.getHours()) + ':' + pad(d.getMinutes());
    }

    document.addEventListener('DOMContentLoaded', function () {
        waitForSupabase(async function (supabase) {
            const lang = localStorage.getItem('lang') || 'es';
            const t = function (es, en) { return lang === 'es' ? es : en; };
            const repaintI18n = function () {
                if (window.refreshBxfI18n) window.refreshBxfI18n();
            };
            const authState = document.getElementById('admin-auth-state');
            const denied = document.getElementById('admin-denied');
            const app = document.getElementById('admin-app');
            const tabsRoot = document.getElementById('admin-tabs');

            try {
                const { data: auth } = await supabase.auth.getSession();
                const session = auth && auth.session;
                if (!session) {
                    if (authState) authState.textContent = 'Debes iniciar sesión.';
                    if (denied) denied.hidden = false;
                    return;
                }

                const { data: ok, error: adminErr } = await supabase.rpc('is_admin');
                if (adminErr || !ok) {
                    if (authState) authState.textContent = t('Usuario autenticado sin permisos de admin.', 'Authenticated user has no admin permissions.');
                    if (denied) denied.hidden = false;
                    return;
                }

                if (authState) authState.textContent = 'Permisos verificados.';
                if (app) app.hidden = false;

                tabsRoot && tabsRoot.querySelectorAll('[data-admin-tab]').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        const id = btn.getAttribute('data-admin-tab');
                        tabsRoot.querySelectorAll('[data-admin-tab]').forEach(function (b) {
                            b.classList.toggle('is-active', b === btn);
                        });
                        document.querySelectorAll('[data-admin-pane]').forEach(function (pane) {
                            pane.hidden = pane.getAttribute('data-admin-pane') !== id;
                        });
                        if (id === 'reports') loadUserReports();
                        if (id === 'seasons') loadSeasons();
                        if (id === 'ctf') loadChallenges();
                        if (id === 'contests') loadContests();
                        repaintI18n();
                    });
                });

                const seasonsList = document.getElementById('admin-seasons-list');
                const ctfList = document.getElementById('admin-ctf-list');
                const contestsList = document.getElementById('admin-contests-list');
                const contestChallengesList = document.getElementById('admin-contest-challenges-list');
                const writeupsList = document.getElementById('admin-writeups-list');
                const writeupsSearch = document.getElementById('admin-writeups-search');
                const reportsList = document.getElementById('admin-reports-list');
                const auditList = document.getElementById('admin-audit-list');
                const supportThreads = document.getElementById('admin-support-threads');
                const supportThreadView = document.getElementById('admin-support-thread-view');
                const supportReplyForm = document.getElementById('admin-support-reply-form');
                const supportReplyHead = document.getElementById('admin-support-reply-head');
                let supportMessages = [];
                let supportProfileMap = new Map();
                let adminSupportIds = new Set();
                let activeSupportUserId = null;

                let seasonsCache = [];
                let challengesCache = [];
                let contestsCache = [];
                let seasonsLoaded = false;

                async function ensureSeasonsLoaded() {
                    if (!seasonsLoaded) await loadSeasons();
                }

                function fillSeasonSelects() {
                    const ctfSel = document.getElementById('ctf-season-id');
                    const conSel = document.getElementById('contest-season-id');
                    const rows = seasonsCache || [];
                    const opts = rows.map(function (s) {
                        return '<option value="' + esc(String(s.id)) + '">S' + esc(String(s.id)) + ' · ' + esc(s.name || '') + '</option>';
                    }).join('');
                    const headCtf = '<option value="0">' + esc(t('Global · temporada 0', 'Global · season 0')) + '</option>';
                    const headCon = '<option value="">' + esc(t('— (sin temporada)', '— (no season)')) + '</option>';
                    if (ctfSel) ctfSel.innerHTML = headCtf + opts;
                    if (conSel) conSel.innerHTML = headCon + opts;
                }

                function bindSeasonFormEdit(s) {
                    document.getElementById('season-id').value = s.id != null ? String(s.id) : '';
                    document.getElementById('season-name').value = s.name || '';
                    document.getElementById('season-description').value = s.description || '';
                    document.getElementById('season-active').checked = !!s.is_active;
                    document.getElementById('admin-season-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
                }

                async function loadSeasons() {
                    let rows = [];
                    const rRpc = await supabase.rpc('get_seasons');
                    if (!rRpc.error && rRpc.data != null) {
                        rows = Array.isArray(rRpc.data) ? rRpc.data.slice() : [];
                        rows.sort(function (a, b) { return (a.id || 0) - (b.id || 0); });
                    } else {
                        const rTbl = await supabase.from('seasons').select('*').order('id', { ascending: true });
                        if (rTbl.error) {
                            seasonsLoaded = false;
                            var hint = (rRpc.error && rRpc.error.message ? rRpc.error.message + ' · ' : '') + (rTbl.error && rTbl.error.message ? rTbl.error.message : '');
                            seasonsList.innerHTML = '<div class="admin-row">' + esc(t('Error cargando temporadas', 'Error loading seasons')) + (hint ? ' <span class="admin-row__meta">' + esc(hint) + '</span>' : '') + '</div>';
                            return;
                        }
                        rows = rTbl.data || [];
                    }
                    seasonsCache = rows;
                    seasonsLoaded = true;
                    fillSeasonSelects();
                    seasonsList.innerHTML = seasonsCache.map(function (s) {
                        return '<div class="admin-row"><div><strong>' + esc('S' + s.id + ' · ' + s.name) + '</strong><div class="admin-row__meta">' + esc((s.description || '—') + ' · ' + (s.is_active ? t('activa', 'active') : t('inactiva', 'inactive'))) + '</div></div><div class="admin-actions"><button type="button" class="admin-season-edit" data-sid="' + esc(String(s.id)) + '">' + esc(t('Editar', 'Edit')) + '</button></div></div>';
                    }).join('') || '<div class="admin-row">' + esc(t('Sin temporadas', 'No seasons')) + '</div>';

                    seasonsList.querySelectorAll('.admin-season-edit').forEach(function (btn) {
                        btn.addEventListener('click', function () {
                            const sid = btn.getAttribute('data-sid');
                            const s = seasonsCache.find(function (x) { return String(x.id) === String(sid); });
                            if (s) bindSeasonFormEdit(s);
                        });
                    });
                    repaintI18n();
                }

                function paintChallengesList() {
                    const q = (document.getElementById('admin-ctf-filter') || {}).value || '';
                    const needle = q.trim().toLowerCase();
                    let rows = challengesCache.slice();
                    if (needle) {
                        rows = rows.filter(function (c) {
                            const blob = [c.id, c.title, c.category, c.difficulty, String(c.season_id), c.description_en, c.description_es, c.content_focus, c.solve_mode].join(' ').toLowerCase();
                            return blob.indexOf(needle) !== -1;
                        });
                    }
                    function focusLabel(f) {
                        if (f === 'linux') return t('Linux', 'Linux');
                        if (f === 'bash') return t('Bash', 'Bash');
                        return t('CTF', 'CTF');
                    }
                    function modeLabel(m) {
                        if (m === 'terminal') return t('Terminal', 'Terminal');
                        if (m === 'bash_checker') return t('Corrector bash', 'Bash checker');
                        return t('Flag web', 'Web flag');
                    }
                    ctfList.innerHTML = rows.map(function (c) {
                        var fm = esc(focusLabel(c.content_focus) + ' · ' + modeLabel(c.solve_mode));
                        return '<div class="admin-row"><div><strong>' + esc(c.id + ' · ' + c.title) + '</strong><div class="admin-row__meta">' + esc(c.category + ' · ' + c.difficulty + ' · ' + c.points + ' pts · S' + (c.season_id != null ? c.season_id : '0')) + '</div><div class="admin-row__meta">' + fm + '</div></div><div class="admin-actions"><button type="button" class="admin-ctf-edit" data-cid="' + esc(c.id) + '">' + esc(t('Editar', 'Edit')) + '</button><a class="admin-link" href="/ctf.html?id=' + encodeURIComponent(c.id) + '" target="_blank" rel="noopener">' + esc(t('Ver en CTF', 'View in CTF')) + '</a></div></div>';
                    }).join('') || '<div class="admin-row">' + esc(rows.length || !needle ? t('Sin retos', 'No challenges') : t('Sin coincidencias', 'No matches')) + '</div>';

                    ctfList.querySelectorAll('.admin-ctf-edit').forEach(function (btn) {
                        btn.addEventListener('click', function () {
                            const cid = btn.getAttribute('data-cid');
                            const c = challengesCache.find(function (x) { return x.id === cid; });
                            if (!c) return;
                            document.getElementById('ctf-id').value = c.id || '';
                            document.getElementById('ctf-title').value = c.title || '';
                            document.getElementById('ctf-category').value = c.category || 'Web';
                            document.getElementById('ctf-difficulty').value = c.difficulty || 'Medium';
                            document.getElementById('ctf-points').value = c.points != null ? c.points : 100;
                            var sid = c.season_id != null ? String(c.season_id) : '0';
                            var cs = document.getElementById('ctf-season-id');
                            if (cs && !Array.prototype.some.call(cs.options, function (o) { return o.value === sid; })) sid = '0';
                            if (cs) cs.value = sid;
                            document.getElementById('ctf-desc-en').value = c.description_en || '';
                            document.getElementById('ctf-desc-es').value = c.description_es || '';
                            var cf = document.getElementById('ctf-content-focus');
                            var sm = document.getElementById('ctf-solve-mode');
                            if (cf) cf.value = c.content_focus && ['hacking', 'linux', 'bash'].indexOf(c.content_focus) !== -1 ? c.content_focus : 'hacking';
                            if (sm) sm.value = c.solve_mode && ['flag', 'terminal', 'bash_checker'].indexOf(c.solve_mode) !== -1 ? c.solve_mode : 'flag';
                            document.getElementById('ctf-flag').value = '';
                            document.getElementById('admin-ctf-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                    });
                    repaintI18n();
                }

                async function loadChallenges() {
                    await ensureSeasonsLoaded();
                    const { data, error } = await supabase.from('challenges').select('id,title,category,difficulty,points,season_id,description_en,description_es,content_focus,solve_mode').order('id', { ascending: true }).limit(200);
                    if (error) {
                        ctfList.innerHTML = '<div class="admin-row">' + esc(t('Error cargando retos', 'Error loading challenges')) + '</div>';
                        return;
                    }
                    challengesCache = data || [];
                    paintChallengesList();
                    var ctfF = document.getElementById('admin-ctf-filter');
                    if (ctfF && !ctfF.dataset.bound) {
                        ctfF.dataset.bound = '1';
                        ctfF.addEventListener('input', function () { paintChallengesList(); });
                    }
                    repaintI18n();
                }

                function paintContestsList() {
                    const q = (document.getElementById('admin-contest-filter') || {}).value || '';
                    const needle = q.trim().toLowerCase();
                    let rows = contestsCache.slice();
                    if (needle) {
                        rows = rows.filter(function (c) {
                            const blob = [c.title, c.slug, c.status, c.mode, String(c.season_id || ''), c.description || ''].join(' ').toLowerCase();
                            return blob.indexOf(needle) !== -1;
                        });
                    }
                    contestsList.innerHTML = rows.map(function (c) {
                        var when = '';
                        if (c.starts_at) when += t('Ini: ', 'Start: ') + String(c.starts_at).slice(0, 16);
                        if (c.ends_at) when += (when ? ' · ' : '') + t('Fin: ', 'End: ') + String(c.ends_at).slice(0, 16);
                        return '<div class="admin-row"><div><strong>' + esc(c.title) + '</strong><div class="admin-row__meta">' + esc(c.slug + ' · ' + c.mode + ' · ' + c.status + (c.season_id != null ? ' · S' + c.season_id : '')) + '</div>' + (when ? '<div class="admin-row__meta">' + esc(when) + '</div>' : '') + '</div><div class="admin-actions"><button type="button" data-fill-contest="' + esc(c.id) + '">' + esc(t('Editar', 'Edit')) + '</button><a class="admin-link" href="/contests.html?id=' + encodeURIComponent(c.id) + '" target="_blank" rel="noopener">' + esc(t('Ver en sitio', 'View on site')) + '</a><button class="admin-danger" data-del-contest="' + esc(c.id) + '">' + esc(t('Borrar', 'Delete')) + '</button></div></div>';
                    }).join('') || '<div class="admin-row">' + esc(rows.length || !needle ? t('Sin concursos', 'No contests') : t('Sin coincidencias', 'No matches')) + '</div>';

                    contestsList.querySelectorAll('[data-fill-contest]').forEach(function (btn) {
                        btn.addEventListener('click', function () {
                            const id = btn.getAttribute('data-fill-contest');
                            const row = contestsCache.find(function (x) { return x.id === id; });
                            if (!row) return;
                            document.getElementById('contest-id').value = row.id || '';
                            var csel = document.getElementById('contest-season-id');
                            if (csel) {
                                var sv = row.season_id == null ? '' : String(row.season_id);
                                if (!Array.prototype.some.call(csel.options, function (o) { return o.value === sv; })) sv = '';
                                csel.value = sv;
                            }
                            document.getElementById('contest-slug').value = row.slug || '';
                            document.getElementById('contest-title').value = row.title || '';
                            document.getElementById('contest-description').value = row.description || '';
                            document.getElementById('contest-mode').value = row.mode || 'solo';
                            document.getElementById('contest-status').value = row.status || 'draft';
                            document.getElementById('contest-starts-at').value = toDatetimeLocalValue(row.starts_at);
                            document.getElementById('contest-ends-at').value = toDatetimeLocalValue(row.ends_at);
                            document.getElementById('contest-challenge-contest-id').value = row.id || '';
                            loadContestChallenges(row.id);
                            document.getElementById('admin-contest-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                    });

                    contestsList.querySelectorAll('[data-del-contest]').forEach(function (btn) {
                        btn.addEventListener('click', async function () {
                            const id = btn.getAttribute('data-del-contest');
                            if (!window.confirm(t('¿Eliminar concurso y sus retos dedicados?', 'Delete contest and its challenges?'))) return;
                            const { data: out, error: err } = await supabase.rpc('admin_only_delete_contest', { p_contest_id: id });
                            if (err || !out || out.ok !== true) {
                                window.alert((err && err.message) || (out && out.error) || 'Error');
                                return;
                            }
                            loadContests();
                            contestChallengesList.innerHTML = '';
                        });
                    });
                    repaintI18n();
                }

                async function loadContests() {
                    await ensureSeasonsLoaded();
                    const { data, error } = await supabase.from('contests').select('*').order('created_at', { ascending: false });
                    if (error) {
                        contestsList.innerHTML = '<div class="admin-row">' + esc(t('Error cargando concursos', 'Error loading contests')) + '</div>';
                        return;
                    }
                    contestsCache = data || [];
                    fillSeasonSelects();
                    paintContestsList();
                    var cf = document.getElementById('admin-contest-filter');
                    if (cf && !cf.dataset.bound) {
                        cf.dataset.bound = '1';
                        cf.addEventListener('input', function () { paintContestsList(); });
                    }
                    repaintI18n();
                }

                async function loadContestChallenges(contestId) {
                    if (!contestId) {
                        contestChallengesList.innerHTML = '<div class="admin-row">' + esc(t('Selecciona un concurso en la lista o en el formulario.', 'Pick a contest from the list or form.')) + '</div>';
                        return;
                    }
                    const { data, error } = await supabase.from('contest_challenges').select('id,contest_id,code,title,description,category,difficulty,points,position,is_enabled,content_focus,solve_mode').eq('contest_id', contestId).order('position', { ascending: true });
                    if (error) {
                        contestChallengesList.innerHTML = '<div class="admin-row">' + esc(t('Error cargando retos del concurso', 'Error loading contest challenges')) + '</div>';
                        return;
                    }
                    function cfL(f) {
                        if (f === 'linux') return 'Linux';
                        if (f === 'bash') return 'Bash';
                        return 'CTF';
                    }
                    function smL(m) {
                        if (m === 'terminal') return t('Terminal', 'Terminal');
                        if (m === 'bash_checker') return t('Bash chk', 'Bash chk');
                        return t('Flag', 'Flag');
                    }
                    contestChallengesList.innerHTML = (data || []).map(function (c) {
                        return '<div class="admin-row"><div><strong>' + esc(c.code + ' · ' + c.title) + '</strong><div class="admin-row__meta">' + esc(c.category + ' · ' + c.difficulty + ' · ' + c.points + ' pts · ' + cfL(c.content_focus) + ' · ' + smL(c.solve_mode)) + '</div></div><div class="admin-actions"><button type="button" data-fill-contest-ch="' + esc(c.id) + '">' + esc(t('Editar', 'Edit')) + '</button></div></div>';
                    }).join('') || '<div class="admin-row">' + esc(t('Sin retos dedicados', 'No dedicated challenges')) + '</div>';

                    contestChallengesList.querySelectorAll('[data-fill-contest-ch]').forEach(function (btn) {
                        btn.addEventListener('click', function () {
                            const id = btn.getAttribute('data-fill-contest-ch');
                            const row = (data || []).find(function (x) { return x.id === id; });
                            if (!row) return;
                            document.getElementById('contest-challenge-id').value = row.id || '';
                            document.getElementById('contest-challenge-contest-id').value = row.contest_id || '';
                            document.getElementById('contest-challenge-code').value = row.code || '';
                            document.getElementById('contest-challenge-title').value = row.title || '';
                            document.getElementById('contest-challenge-description').value = row.description || '';
                            document.getElementById('contest-challenge-category').value = row.category || 'Web';
                            document.getElementById('contest-challenge-difficulty').value = row.difficulty || 'Medium';
                            document.getElementById('contest-challenge-points').value = row.points || 100;
                            document.getElementById('contest-challenge-position').value = row.position || 0;
                            document.getElementById('contest-challenge-flag').value = '';
                            var cff = document.getElementById('contest-challenge-content-focus');
                            var csm = document.getElementById('contest-challenge-solve-mode');
                            if (cff) cff.value = row.content_focus && ['hacking', 'linux', 'bash'].indexOf(row.content_focus) !== -1 ? row.content_focus : 'hacking';
                            if (csm) csm.value = row.solve_mode && ['flag', 'terminal', 'bash_checker'].indexOf(row.solve_mode) !== -1 ? row.solve_mode : 'flag';
                            document.getElementById('admin-contest-challenge-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
                        });
                    });
                    repaintI18n();
                }

                let writeupsModerationCache = { rows: [], authorMap: new Map() };

                function filterWriteupsRows(rows, authorMap, q) {
                    const needle = (q || '').trim().toLowerCase();
                    if (!needle) return rows;
                    return rows.filter(function (w) {
                        const un = (authorMap.get(w.author_id) || '').toLowerCase();
                        const title = (w.title || '').toLowerCase();
                        const tags = Array.isArray(w.tags) ? w.tags.join(' ').toLowerCase() : '';
                        return title.indexOf(needle) !== -1 || un.indexOf(needle) !== -1 || tags.indexOf(needle) !== -1;
                    });
                }

                function bindWriteupsRowActions() {
                    if (!writeupsList) return;
                    writeupsList.querySelectorAll('[data-w-act]').forEach(function (btn) {
                        btn.addEventListener('click', async function () {
                            const id = btn.getAttribute('data-w-id');
                            const status = btn.getAttribute('data-w-act');
                            const reason = window.prompt('Motivo (opcional):') || null;
                            const { data: out, error: err } = await supabase.rpc('admin_only_moderate_writeup', { p_writeup_id: id, p_status: status, p_reason: reason });
                            if (err || !out || out.ok !== true) {
                                window.alert((err && err.message) || (out && out.error) || 'Error moderando');
                                return;
                            }
                            loadWriteupsModeration();
                        });
                    });
                    writeupsList.querySelectorAll('[data-w-del]').forEach(function (btn) {
                        btn.addEventListener('click', async function () {
                            const id = btn.getAttribute('data-w-del');
                            if (!window.confirm('Borrar writeup permanentemente?')) return;
                            const { data: out, error: err } = await supabase.rpc('admin_only_delete_writeup', { p_writeup_id: id });
                            if (err || !out || out.ok !== true) {
                                window.alert((err && err.message) || (out && out.error) || 'Error borrando');
                                return;
                            }
                            loadWriteupsModeration();
                        });
                    });
                }

                function paintWriteupsModerationTable() {
                    if (!writeupsList) return;
                    const q = writeupsSearch ? writeupsSearch.value : '';
                    const rows = filterWriteupsRows(writeupsModerationCache.rows, writeupsModerationCache.authorMap, q);
                    const authorMap = writeupsModerationCache.authorMap;
                    const emptyMsg = writeupsModerationCache.rows.length && !rows.length
                        ? '<div class="admin-row">Sin coincidencias para la búsqueda</div>'
                        : '<div class="admin-row">Sin writeups</div>';
                    writeupsList.innerHTML = rows.map(function (w) {
                        const un = authorMap.get(w.author_id) || 'unknown';
                        const tagStr = Array.isArray(w.tags) && w.tags.length ? esc(w.tags.join(', ')) : '—';
                        return '<div class="admin-row"><div><strong>' + esc(w.title) + '</strong><div class="admin-row__meta">' + esc(un + ' · ' + w.status + ' · ' + String(w.created_at || '').slice(0, 10)) + '</div><div class="admin-row__meta admin-row__tags">tags: ' + tagStr + '</div></div><div class="admin-actions"><a class="admin-link" href="/writeup-community.html?id=' + esc(w.id) + '" target="_blank" rel="noopener">Ver</a><button data-w-act="approved" data-w-id="' + esc(w.id) + '">Aprobar</button><button data-w-act="rejected" data-w-id="' + esc(w.id) + '">Rechazar</button><button data-w-act="hidden" data-w-id="' + esc(w.id) + '">Ocultar</button><button class="admin-danger" data-w-del="' + esc(w.id) + '">Borrar</button></div></div>';
                    }).join('') || emptyMsg;
                    bindWriteupsRowActions();
                }

                async function loadWriteupsModeration() {
                    const sel = 'id,title,slug,status,created_at,author_id,tags';
                    const { data, error } = await supabase.from('community_writeups').select(sel).order('created_at', { ascending: false }).limit(250);
                    if (error) {
                        writeupsList.innerHTML = '<div class="admin-row">Error cargando writeups</div>';
                        return;
                    }
                    const rows = data || [];
                    const authorIds = Array.from(new Set(rows.map(function (w) { return w.author_id; }).filter(Boolean)));
                    const authorMap = new Map();
                    if (authorIds.length) {
                        const { data: profs } = await supabase.from('profiles').select('id,username').in('id', authorIds);
                        (profs || []).forEach(function (p) {
                            authorMap.set(p.id, p.username || 'unknown');
                        });
                    }
                    writeupsModerationCache = { rows: rows, authorMap: authorMap };
                    paintWriteupsModerationTable();
                    if (writeupsSearch && !writeupsSearch.dataset.bound) {
                        writeupsSearch.dataset.bound = '1';
                        writeupsSearch.addEventListener('input', function () {
                            paintWriteupsModerationTable();
                        });
                    }
                }

                async function loadUserReports() {
                    if (!reportsList) return;
                    reportsList.innerHTML = '<div class="admin-row">Cargando…</div>';
                    const { data, error } = await supabase
                        .from('user_reports')
                        .select('id,reporter_id,reported_user_id,reason,details,status,created_at,admin_note,resolved_at')
                        .order('created_at', { ascending: false })
                        .limit(200);
                    if (error) {
                        reportsList.innerHTML = '<div class="admin-row">Error cargando reportes</div>';
                        return;
                    }
                    const rows = data || [];
                    const ids = new Set();
                    rows.forEach(function (r) {
                        ids.add(r.reporter_id);
                        ids.add(r.reported_user_id);
                    });
                    const idList = Array.from(ids).filter(Boolean);
                    const nameMap = new Map();
                    if (idList.length) {
                        const { data: profs } = await supabase.from('profiles').select('id,username').in('id', idList);
                        (profs || []).forEach(function (p) {
                            nameMap.set(p.id, p.username || p.id);
                        });
                    }
                    reportsList.innerHTML = rows.map(function (r) {
                        const rep = nameMap.get(r.reporter_id) || r.reporter_id;
                        const tgt = nameMap.get(r.reported_user_id) || r.reported_user_id;
                        const st = r.status || 'pending';
                        const pending = st === 'pending';
                        const actions = pending
                            ? '<div class="admin-actions"><button type="button" data-r-accept="' + esc(r.id) + '">Aceptar</button><button type="button" class="admin-danger" data-r-reject="' + esc(r.id) + '">Denegar</button></div>'
                            : '<div class="admin-row__meta">' + esc(st) + (r.resolved_at ? ' · ' + String(r.resolved_at).slice(0, 19) : '') + '</div>';
                        return '<div class="admin-row"><div><strong>' + esc(rep) + ' → ' + esc(tgt) + '</strong><div class="admin-row__meta">' + esc(String(r.created_at || '').slice(0, 19)) + ' · ' + esc(st) + '</div><div class="admin-row__meta">' + esc(r.reason || '') + '</div>' + (r.details ? '<div class="admin-row__meta">' + esc(r.details) + '</div>' : '') + (r.admin_note ? '<div class="admin-row__meta">nota: ' + esc(r.admin_note) + '</div>' : '') + '</div>' + actions + '</div>';
                    }).join('') || '<div class="admin-row">Sin reportes</div>';

                    reportsList.querySelectorAll('[data-r-accept]').forEach(function (btn) {
                        btn.addEventListener('click', async function () {
                            const id = btn.getAttribute('data-r-accept');
                            const note = window.prompt('Nota interna (opcional):') || null;
                            const { data: out, error: err } = await supabase.rpc('admin_resolve_user_report', {
                                p_report_id: id,
                                p_status: 'accepted',
                                p_note: note
                            });
                            if (err || !out || out.ok !== true) {
                                window.alert((err && err.message) || (out && out.error) || 'Error');
                                return;
                            }
                            loadUserReports();
                        });
                    });
                    reportsList.querySelectorAll('[data-r-reject]').forEach(function (btn) {
                        btn.addEventListener('click', async function () {
                            const id = btn.getAttribute('data-r-reject');
                            const note = window.prompt('Nota interna (opcional):') || null;
                            const { data: out, error: err } = await supabase.rpc('admin_resolve_user_report', {
                                p_report_id: id,
                                p_status: 'rejected',
                                p_note: note
                            });
                            if (err || !out || out.ok !== true) {
                                window.alert((err && err.message) || (out && out.error) || 'Error');
                                return;
                            }
                            loadUserReports();
                        });
                    });
                }

                async function loadAudit() {
                    const { data, error } = await supabase.from('admin_audit_log').select('id,action,entity_type,entity_id,created_at').order('created_at', { ascending: false }).limit(200);
                    if (error) {
                        auditList.innerHTML = '<div class="admin-row">Error cargando auditoría</div>';
                        return;
                    }
                    auditList.innerHTML = (data || []).map(function (a) {
                        return '<div class="admin-row"><div><strong>' + esc(a.action) + '</strong><div class="admin-row__meta">' + esc((a.entity_type || '-') + ' · ' + (a.entity_id || '-') + ' · ' + String(a.created_at || '').replace('T', ' ').slice(0, 19)) + '</div></div></div>';
                    }).join('') || '<div class="admin-row">Sin eventos</div>';
                }

                function paintSupportThread(peerId) {
                    activeSupportUserId = peerId || activeSupportUserId;
                    if (!activeSupportUserId) {
                        supportThreadView.innerHTML = '<div class="admin-row">Selecciona conversación</div>';
                        if (supportReplyHead) supportReplyHead.textContent = 'Selecciona un ticket para responder.';
                        return;
                    }
                    const rows = supportMessages
                        .filter(function (m) {
                            const userId = adminSupportIds.has(m.sender_id) ? m.receiver_id : m.sender_id;
                            return userId === activeSupportUserId;
                        })
                        .sort(function (a, b) {
                            return String(a.created_at).localeCompare(String(b.created_at));
                        });
                    if (!rows.length) {
                        supportThreadView.innerHTML = '<div class="admin-row">Sin mensajes todavía</div>';
                    } else {
                        supportThreadView.innerHTML = rows.map(function (m) {
                            const mine = adminSupportIds.has(m.sender_id);
                            const who = mine ? 'Soporte' : (supportProfileMap.get(m.sender_id) || m.sender_id);
                            return '<div class="admin-row"><div><strong>' + esc(who) + '</strong><div class="admin-row__meta">' + esc(m.content || '') + '</div><div class="admin-row__meta">' + esc(String(m.created_at || '').replace('T', ' ').slice(0, 19)) + '</div></div></div>';
                        }).join('');
                    }
                    const targetInput = document.getElementById('admin-support-target');
                    if (targetInput) targetInput.value = activeSupportUserId;
                    if (supportReplyHead) {
                        const uname = supportProfileMap.get(activeSupportUserId) || activeSupportUserId;
                        supportReplyHead.textContent = 'Responder a @' + uname;
                    }
                }

                async function loadSupportInbox() {
                    const { data: adminsPub } = await supabase.rpc('get_public_support_admins');
                    adminSupportIds = new Set((adminsPub || []).map(function (a) { return a.id; }));
                    const { data, error } = await supabase
                        .from('support_messages')
                        .select('id,sender_id,receiver_id,content,created_at,read_at')
                        .order('created_at', { ascending: false })
                        .limit(500);
                    if (error) {
                        supportThreads.innerHTML = '<div class="admin-row">Error cargando soporte</div>';
                        return;
                    }
                    supportMessages = data || [];
                    const peerSet = new Set();
                    supportMessages.forEach(function (m) {
                        const userId = adminSupportIds.has(m.sender_id) ? m.receiver_id : m.sender_id;
                        if (userId && !adminSupportIds.has(userId)) peerSet.add(userId);
                    });
                    const peers = Array.from(peerSet);
                    supportProfileMap = new Map();
                    if (peers.length) {
                        const { data: profs } = await supabase.from('profiles').select('id,username').in('id', peers);
                        (profs || []).forEach(function (p) { supportProfileMap.set(p.id, p.username); });
                    }

                    const byPeer = new Map();
                    supportMessages.forEach(function (m) {
                        const userId = adminSupportIds.has(m.sender_id) ? m.receiver_id : m.sender_id;
                        if (!userId || adminSupportIds.has(userId)) return;
                        if (!byPeer.has(userId)) byPeer.set(userId, m);
                    });
                    supportThreads.innerHTML = Array.from(byPeer.entries()).map(function (entry) {
                        const peerId = entry[0];
                        const msg = entry[1];
                        return '<div class="admin-row"><div><strong>' + esc(supportProfileMap.get(peerId) || peerId) + '</strong><div class="admin-row__meta">' + esc(String(msg.content || '').slice(0, 80)) + '</div></div><div class="admin-actions"><button data-open-support="' + esc(peerId) + '">Abrir</button></div></div>';
                    }).join('') || '<div class="admin-row">Sin mensajes de soporte</div>';

                    supportThreads.querySelectorAll('[data-open-support]').forEach(function (btn) {
                        btn.addEventListener('click', function () {
                            paintSupportThread(btn.getAttribute('data-open-support'));
                        });
                    });
                    if (!activeSupportUserId && peers[0]) paintSupportThread(peers[0]);
                    else paintSupportThread(activeSupportUserId);
                }

                document.getElementById('admin-season-clear').addEventListener('click', function () {
                    document.getElementById('admin-season-form').reset();
                    document.getElementById('season-id').value = '';
                    document.getElementById('season-active').checked = false;
                    repaintI18n();
                });

                document.getElementById('admin-ctf-clear').addEventListener('click', function () {
                    document.getElementById('admin-ctf-form').reset();
                    fillSeasonSelects();
                    var cs = document.getElementById('ctf-season-id');
                    if (cs) cs.value = '0';
                    var cf = document.getElementById('ctf-content-focus');
                    var sm = document.getElementById('ctf-solve-mode');
                    if (cf) cf.value = 'hacking';
                    if (sm) sm.value = 'flag';
                    repaintI18n();
                });

                document.getElementById('admin-contest-clear').addEventListener('click', function () {
                    document.getElementById('admin-contest-form').reset();
                    fillSeasonSelects();
                    var csel = document.getElementById('contest-season-id');
                    if (csel) csel.value = '';
                    document.getElementById('contest-starts-at').value = '';
                    document.getElementById('contest-ends-at').value = '';
                    document.getElementById('contest-challenge-contest-id').value = '';
                    var cff = document.getElementById('contest-challenge-content-focus');
                    var csm = document.getElementById('contest-challenge-solve-mode');
                    if (cff) cff.value = 'hacking';
                    if (csm) csm.value = 'flag';
                    contestChallengesList.innerHTML = '';
                    repaintI18n();
                });

                document.getElementById('admin-season-form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const rawId = document.getElementById('season-id').value.trim();
                    var p_id = null;
                    if (rawId !== '') {
                        var n = parseInt(rawId, 10);
                        if (Number.isNaN(n)) {
                            window.alert(t('El ID de temporada debe ser un número.', 'Season ID must be a number.'));
                            return;
                        }
                        p_id = n;
                    }
                    const payload = {
                        p_id: p_id,
                        p_name: document.getElementById('season-name').value.trim(),
                        p_description: document.getElementById('season-description').value.trim() || null,
                        p_is_active: document.getElementById('season-active').checked
                    };
                    const { data: out, error } = await supabase.rpc('admin_only_upsert_season', payload);
                    var ok = out && out.ok === true;
                    if (error || !ok) {
                        window.alert((error && error.message) || (out && out.error) || t('Error guardando temporada', 'Error saving season'));
                        return;
                    }
                    this.reset();
                    document.getElementById('season-id').value = '';
                    await loadSeasons();
                    loadAudit();
                });

                document.getElementById('admin-ctf-form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const id = document.getElementById('ctf-id').value.trim().toUpperCase();
                    const { data: out, error } = await supabase.rpc('admin_only_upsert_challenge', {
                        p_id: id,
                        p_title: document.getElementById('ctf-title').value.trim(),
                        p_category: document.getElementById('ctf-category').value.trim() || 'Web',
                        p_difficulty: document.getElementById('ctf-difficulty').value,
                        p_points: parseInt(document.getElementById('ctf-points').value || '100', 10),
                        p_season_id: parseInt(document.getElementById('ctf-season-id').value || '0', 10),
                        p_desc_en: document.getElementById('ctf-desc-en').value.trim() || null,
                        p_desc_es: document.getElementById('ctf-desc-es').value.trim() || null,
                        p_content_focus: document.getElementById('ctf-content-focus').value,
                        p_solve_mode: document.getElementById('ctf-solve-mode').value
                    });
                    if (error || !out || out.ok !== true) {
                        window.alert((error && error.message) || (out && out.error) || 'Error guardando reto');
                        return;
                    }
                    const fl = document.getElementById('ctf-flag').value.trim();
                    if (fl) {
                        const setFlag = await supabase.rpc('admin_only_set_challenge_flag', { p_challenge_id: id, p_flag_plain: fl });
                        if (setFlag.error) window.alert(setFlag.error.message || 'No se pudo actualizar la flag');
                    }
                    this.reset();
                    loadChallenges();
                    loadAudit();
                });

                document.getElementById('admin-contest-form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const idRaw = document.getElementById('contest-id').value.trim();
                    const { data: out, error } = await supabase.rpc('admin_only_upsert_contest', {
                        p_id: idRaw || null,
                        p_season_id: (() => { const v = document.getElementById('contest-season-id').value.trim(); return v ? parseInt(v, 10) : null; })(),
                        p_slug: document.getElementById('contest-slug').value.trim(),
                        p_title: document.getElementById('contest-title').value.trim(),
                        p_description: document.getElementById('contest-description').value.trim() || null,
                        p_mode: document.getElementById('contest-mode').value,
                        p_status: document.getElementById('contest-status').value,
                        p_starts_at: toIsoOrNull(document.getElementById('contest-starts-at').value),
                        p_ends_at: toIsoOrNull(document.getElementById('contest-ends-at').value)
                    });
                    if (error || !out || out.ok !== true) {
                        window.alert((error && error.message) || (out && out.error) || 'Error guardando concurso');
                        return;
                    }
                    document.getElementById('contest-id').value = out.id || '';
                    document.getElementById('contest-challenge-contest-id').value = out.id || '';
                    loadContests();
                    loadAudit();
                });

                document.getElementById('admin-contest-challenge-form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const contestId = document.getElementById('contest-challenge-contest-id').value.trim();
                    const { data: out, error } = await supabase.rpc('admin_only_upsert_contest_challenge', {
                        p_id: document.getElementById('contest-challenge-id').value.trim() || null,
                        p_contest_id: contestId,
                        p_code: document.getElementById('contest-challenge-code').value.trim(),
                        p_title: document.getElementById('contest-challenge-title').value.trim(),
                        p_description: document.getElementById('contest-challenge-description').value.trim() || null,
                        p_category: document.getElementById('contest-challenge-category').value.trim() || 'Web',
                        p_difficulty: document.getElementById('contest-challenge-difficulty').value,
                        p_points: parseInt(document.getElementById('contest-challenge-points').value || '100', 10),
                        p_position: parseInt(document.getElementById('contest-challenge-position').value || '0', 10),
                        p_content_focus: document.getElementById('contest-challenge-content-focus').value,
                        p_solve_mode: document.getElementById('contest-challenge-solve-mode').value,
                        p_flag_plain: document.getElementById('contest-challenge-flag').value.trim() || null
                    });
                    if (error || !out || out.ok !== true) {
                        window.alert((error && error.message) || (out && out.error) || 'Error guardando reto de concurso');
                        return;
                    }
                    document.getElementById('contest-challenge-id').value = out.id || '';
                    loadContestChallenges(contestId);
                    loadAudit();
                });

                supportReplyForm.addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const target = document.getElementById('admin-support-target').value.trim();
                    const reply = document.getElementById('admin-support-reply').value.trim();
                    if (!target || !reply) return;
                    const { data: out, error } = await supabase.rpc('admin_reply_support', {
                        p_user_id: target,
                        p_content: reply
                    });
                    if (error || !out || !out.ok) {
                        window.alert((error && error.message) || (out && out.error) || 'Error enviando respuesta');
                        return;
                    }
                    document.getElementById('admin-support-reply').value = '';
                    await loadSupportInbox();
                    paintSupportThread(target);
                });

                await loadSeasons();
                await loadChallenges();
                await loadContests();
                await loadWriteupsModeration();
                await loadSupportInbox();
                await loadAudit();
            } catch (e) {
                console.error(e);
                if (authState) authState.textContent = 'Error inicializando panel admin';
                if (denied) denied.hidden = false;
            }
        });
    });
})();
