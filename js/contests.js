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

    function fmtDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString();
        } catch (e) {
            return String(iso);
        }
    }

    document.addEventListener('DOMContentLoaded', function () {
        waitForSupabase(async function (supabase) {
            const listEl = document.getElementById('contests-list');
            const detailWrap = document.getElementById('contest-detail');
            const detailEmpty = document.getElementById('contest-detail-empty');
            const titleEl = document.getElementById('contest-title');
            const metaEl = document.getElementById('contest-meta');
            const descEl = document.getElementById('contest-description');
            const challengesEl = document.getElementById('contest-challenges');
            const lbEl = document.getElementById('contest-leaderboard');
            const submitMsg = document.getElementById('contest-submit-msg');
            const form = document.getElementById('contest-submit-form');
            let activeContestId = null;
            let activeContest = null;

            async function loadLeaderboard(contestId) {
                const { data, error } = await supabase.rpc('get_contest_leaderboard', { p_contest_id: contestId });
                if (error) {
                    lbEl.innerHTML = '<div class="contest-lb-row">Error cargando leaderboard</div>';
                    return;
                }
                const rows = data || [];
                lbEl.innerHTML = rows.length
                    ? rows.map(function (r, i) {
                        return '<div class="contest-lb-row"><span>#' + (i + 1) + ' · ' + esc(r.label) + '</span><strong>' + esc(r.points) + ' pts</strong></div>';
                    }).join('')
                    : '<div class="contest-lb-row">Sin puntuaciones todavía.</div>';
            }

            async function openContest(contest) {
                activeContestId = contest.id;
                activeContest = contest;
                detailEmpty.hidden = true;
                detailWrap.hidden = false;
                titleEl.textContent = contest.title;
                metaEl.textContent = (contest.mode || 'solo') + ' · ' + (contest.status || '-') + ' · ' + fmtDate(contest.starts_at) + ' -> ' + fmtDate(contest.ends_at);
                descEl.textContent = contest.description || '';

                const { data: challenges, error } = await supabase
                    .from('contest_challenges')
                    .select('id,code,title,description,category,difficulty,points,position,is_enabled')
                    .eq('contest_id', contest.id)
                    .eq('is_enabled', true)
                    .order('position', { ascending: true });
                if (error) {
                    challengesEl.innerHTML = '<div class="contest-ch">No se pudieron cargar los retos.</div>';
                } else {
                    challengesEl.innerHTML = (challenges || []).length
                        ? challenges.map(function (c) {
                            return '<div class="contest-ch"><strong>' + esc(c.code) + ' · ' + esc(c.title) + '</strong><div class="contest-ch__meta">' + esc(c.category + ' · ' + c.difficulty + ' · ' + c.points + ' pts') + '</div><div>' + esc(c.description || '') + '</div></div>';
                        }).join('')
                        : '<div class="contest-ch">Sin retos cargados.</div>';
                }

                await loadLeaderboard(contest.id);
            }

            async function loadContests() {
                const { data, error } = await supabase
                    .from('contests')
                    .select('id,slug,title,description,mode,status,starts_at,ends_at')
                    .in('status', ['scheduled', 'active', 'closed', 'archived'])
                    .order('starts_at', { ascending: false, nullsFirst: false });
                if (error) {
                    listEl.innerHTML = '<div class="contest-list-item">Error cargando concursos</div>';
                    return;
                }
                const rows = data || [];
                listEl.innerHTML = rows.length
                    ? rows.map(function (c) {
                        return '<article class="contest-list-item" data-contest-id="' + esc(c.id) + '"><strong>' + esc(c.title) + '</strong><div class="contest-list-item__meta">' + esc(c.mode + ' · ' + c.status) + '</div><div class="contest-list-item__meta">' + esc(fmtDate(c.starts_at)) + '</div></article>';
                    }).join('')
                    : '<div class="contest-list-item">No hay concursos visibles.</div>';

                listEl.querySelectorAll('[data-contest-id]').forEach(function (el) {
                    el.addEventListener('click', function () {
                        const id = el.getAttribute('data-contest-id');
                        const contest = rows.find(function (r) { return r.id === id; });
                        if (!contest) return;
                        listEl.querySelectorAll('.contest-list-item').forEach(function (x) { x.classList.remove('is-active'); });
                        el.classList.add('is-active');
                        openContest(contest);
                    });
                });

                const qp = new URLSearchParams(window.location.search);
                const idFromUrl = qp.get('id');
                const first = idFromUrl ? rows.find(function (r) { return r.id === idFromUrl; }) : rows[0];
                if (first) {
                    const n = listEl.querySelector('[data-contest-id="' + first.id + '"]');
                    if (n) n.classList.add('is-active');
                    openContest(first);
                }
            }

            form.addEventListener('submit', async function (e) {
                e.preventDefault();
                if (!activeContestId || !activeContest) {
                    submitMsg.textContent = 'Selecciona un concurso.';
                    return;
                }
                const code = document.getElementById('contest-code').value.trim();
                const flag = document.getElementById('contest-flag').value.trim();
                const { data, error } = await supabase.rpc('submit_contest_flag', {
                    p_contest_id: activeContestId,
                    p_challenge_code: code,
                    p_flag: flag
                });
                if (error) {
                    submitMsg.textContent = 'Error: ' + (error.message || 'desconocido');
                    return;
                }
                if (!data || data.success !== true) {
                    submitMsg.textContent = 'No válido: ' + ((data && data.error) || 'error');
                    return;
                }
                submitMsg.textContent = 'OK: +' + data.points + ' pts';
                await loadLeaderboard(activeContestId);
            });

            await loadContests();
        });
    });
})();
