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
            const lang = localStorage.getItem('lang') || 'en';
            const t = function (es, en) { return lang === 'es' ? es : en; };
            const listEl = document.getElementById('contests-list');
            const detailWrap = document.getElementById('contest-detail');
            const detailEmpty = document.getElementById('contest-detail-empty');
            const titleEl = document.getElementById('contest-title');
            const metaEl = document.getElementById('contest-meta');
            const descEl = document.getElementById('contest-description');
            const challengesEl = document.getElementById('contest-challenges');
            const rankingLinkEl = document.getElementById('contest-ranking-link');
            const detailLeadEl = document.getElementById('contest-detail-lead');
            const challengesHeadingEl = document.getElementById('contest-challenges-heading');
            let activeContestId = null;
            let activeContest = null;
            let countdownTimer = null;

            function clearCountdownTimer() {
                if (countdownTimer) {
                    clearInterval(countdownTimer);
                    countdownTimer = null;
                }
            }

            function fmtCountdown(msLeft) {
                const total = Math.max(0, Math.floor(msLeft / 1000));
                const d = Math.floor(total / 86400);
                const h = Math.floor((total % 86400) / 3600);
                const m = Math.floor((total % 3600) / 60);
                const s = total % 60;
                const pad = function (n) { return String(n).padStart(2, '0'); };
                if (d > 0) return d + 'd ' + pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
                return pad(h) + 'h ' + pad(m) + 'm ' + pad(s) + 's';
            }

            function escNl(s) {
                return esc(s).replace(/\r\n|\r|\n/g, '<br>');
            }

            function paintRowMsg(el, text, kind) {
                if (!el) return;
                el.textContent = text;
                el.style.color = kind === 'ok'
                    ? '#8ef7be'
                    : kind === 'err'
                        ? '#ff8ea7'
                        : '#9db4cf';
            }

            function isContestAutoOpenNow(contest) {
                if (!contest) return false;
                const status = String(contest.status || '').toLowerCase();
                if (status === 'active' || status === 'closed') return true;
                if (status !== 'scheduled') return false;
                if (!contest.starts_at) return false;
                const startMs = new Date(contest.starts_at).getTime();
                if (Number.isNaN(startMs)) return false;
                return Date.now() >= startMs;
            }

            async function openContest(contest) {
                clearCountdownTimer();
                activeContestId = contest.id;
                activeContest = contest;
                detailEmpty.hidden = true;
                detailWrap.hidden = false;
                titleEl.textContent = contest.title;
                const effectiveStatus = isContestAutoOpenNow(contest) ? 'active' : (contest.status || '-');
                metaEl.textContent = (contest.mode || 'solo') + ' · ' + effectiveStatus + ' · ' + fmtDate(contest.starts_at) + ' -> ' + fmtDate(contest.ends_at);
                descEl.textContent = contest.description || '';
                if (rankingLinkEl) {
                    rankingLinkEl.href = 'contest-leaderboard.html?id=' + encodeURIComponent(contest.id);
                    rankingLinkEl.hidden = false;
                }

                const startsAt = contest.starts_at ? new Date(contest.starts_at).getTime() : null;
                const nowMs = Date.now();
                const isScheduled = String(contest.status || '').toLowerCase() === 'scheduled';
                const isPreOpenWindow = startsAt && startsAt > nowMs;
                const mustStayLocked = (isScheduled && !isContestAutoOpenNow(contest)) || isPreOpenWindow;
                if (mustStayLocked) {
                    if (detailLeadEl) detailLeadEl.hidden = true;
                    if (challengesHeadingEl) challengesHeadingEl.hidden = true;
                    if (rankingLinkEl) rankingLinkEl.hidden = true;
                    const renderGate = function () {
                        const left = startsAt ? Math.max(0, startsAt - Date.now()) : 0;
                        const countdown = startsAt
                            ? fmtCountdown(left)
                            : t('Pendiente de programación', 'Pending schedule');
                        challengesEl.innerHTML =
                            '<div class="contest-gate">' +
                            '<p class="contest-gate__label">' + esc(t('Concurso programado', 'Scheduled contest')) + '</p>' +
                            '<p class="contest-gate__countdown">' + esc(countdown) + '</p>' +
                            '<p class="contest-gate__note">' +
                            esc(t(
                                'Los retos y respuestas permanecerán ocultos hasta la fecha de apertura.',
                                'Challenges and answer inputs stay hidden until opening time.'
                            )) +
                            '</p>' +
                            '</div>';
                    };
                    renderGate();
                    if (startsAt) {
                        countdownTimer = setInterval(function () {
                            if (!activeContest || activeContest.id !== contest.id) {
                                clearCountdownTimer();
                                return;
                            }
                            if (Date.now() >= startsAt) {
                                clearCountdownTimer();
                                openContest(contest);
                                return;
                            }
                            renderGate();
                        }, 1000);
                    }
                    return;
                }

                if (detailLeadEl) detailLeadEl.hidden = false;
                if (challengesHeadingEl) challengesHeadingEl.hidden = false;

                const { data: challenges, error } = await supabase
                    .from('contest_challenges')
                    .select('id,code,title,description,category,difficulty,points,position,is_enabled,content_focus,solve_mode')
                    .eq('contest_id', contest.id)
                    .eq('is_enabled', true)
                    .order('position', { ascending: true });
                if (error) {
                    challengesEl.innerHTML = '<div class="contest-ch">No se pudieron cargar los retos.</div>';
                } else {
                    function badgeFocus(f) {
                        if (f === 'linux') return '<span class="contest-badge contest-badge--linux">Linux</span>';
                        if (f === 'bash') return '<span class="contest-badge contest-badge--bash">Bash</span>';
                        return '<span class="contest-badge contest-badge--ctf">CTF</span>';
                    }
                    function badgeMode(m) {
                        if (m === 'terminal') return '<span class="contest-badge contest-badge--term">' + esc(t('Terminal / externo', 'Terminal / external')) + '</span>';
                        if (m === 'bash_checker') return '<span class="contest-badge contest-badge--bashc">' + esc(t('Corrector bash', 'Bash checker')) + '</span>';
                        return '<span class="contest-badge contest-badge--flag">' + esc(t('Respuesta aquí', 'Answer here')) + '</span>';
                    }
                    challengesEl.innerHTML = (challenges || []).length
                        ? challenges.map(function (c) {
                            var sm = c.solve_mode || 'flag';
                            var ff = c.content_focus || 'hacking';
                            var flagBlock = '';
                            if (sm === 'flag') {
                                var fid = 'ctf-flag-' + String(c.id || '').replace(/[^a-zA-Z0-9-]/g, '');
                                flagBlock =
                                    '<form class="contest-ch-flag-form" novalidate>' +
                                    '<label class="contest-ch-flag-label" for="' + esc(fid) + '">' + esc(t('Tu respuesta', 'Your answer')) + '</label>' +
                                    '<div class="contest-ch-flag-row">' +
                                    '<input type="text" id="' + esc(fid) + '" class="contest-ch-flag-input" placeholder="pwd, ls, echo …" inputmode="text" autocomplete="off" spellcheck="false">' +
                                    '<button type="submit" class="contest-ch-flag-btn">' + esc(t('Enviar', 'Submit')) + '</button>' +
                                    '</div>' +
                                    '</form>' +
                                    '<p class="contest-ch-flash-msg" role="status"></p>';
                            } else {
                                flagBlock = '<p class="contest-ch-offline">' + esc(t('Este reto no se valida en esta página.', 'This task is not validated on this page.')) + '</p>';
                            }
                            return (
                                '<article class="contest-ch" data-challenge-code="' + esc(c.code) + '">' +
                                '<div class="contest-ch__head">' +
                                '<div class="contest-ch__badges">' + badgeFocus(ff) + badgeMode(sm) + '</div>' +
                                '<h4 class="contest-ch__title">' + esc(c.code) + ' · ' + esc(c.title) + '</h4>' +
                                '<div class="contest-ch__meta">' + esc(c.category + ' · ' + c.difficulty + ' · ' + c.points + ' pts') + '</div>' +
                                '</div>' +
                                '<div class="contest-ch__body">' + escNl(c.description || '') + '</div>' +
                                '<div class="contest-ch__submit">' + flagBlock + '</div>' +
                                '</article>'
                            );
                        }).join('')
                        : '<div class="contest-ch contest-ch--empty">Sin retos cargados.</div>';
                }
            }

            async function loadContests() {
                const qp = new URLSearchParams(window.location.search);
                const idFromUrl = qp.get('id');
                const slugFromUrl = qp.get('slug');

                let urlContest = null;
                if (idFromUrl) {
                    const { data: one } = await supabase
                        .from('contests')
                        .select('id,slug,title,description,mode,status,starts_at,ends_at')
                        .eq('id', idFromUrl)
                        .maybeSingle();
                    if (one) urlContest = one;
                }

                const { data, error } = await supabase
                    .from('contests')
                    .select('id,slug,title,description,mode,status,starts_at,ends_at')
                    .in('status', ['scheduled', 'active', 'closed', 'archived'])
                    .order('starts_at', { ascending: false, nullsFirst: false });
                if (error) {
                    listEl.innerHTML = '<div class="contest-list-item">' + esc(t('Error cargando concursos', 'Error loading contests')) + '</div>';
                    return;
                }
                let rows = data || [];
                if (urlContest && !rows.some(function (r) { return r.id === urlContest.id; })) {
                    rows = [urlContest].concat(rows);
                }

                listEl.innerHTML = rows.length
                    ? rows.map(function (c) {
                        const rowStatus = isContestAutoOpenNow(c) ? 'active' : c.status;
                        return '<article class="contest-list-item" data-contest-id="' + esc(c.id) + '"><strong>' + esc(c.title) + '</strong><div class="contest-list-item__meta">' + esc(c.mode + ' · ' + rowStatus) + '</div><div class="contest-list-item__meta">' + esc(fmtDate(c.starts_at)) + '</div></article>';
                    }).join('')
                    : '<div class="contest-list-item">' + esc(t('No hay concursos visibles.', 'No visible contests right now.')) + '</div>';

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

                const defaultEmpty = t('Selecciona un concurso para ver detalles.', 'Select a contest to see details.');
                detailEmpty.textContent = defaultEmpty;

                let first = null;
                if (idFromUrl) {
                    if (!urlContest) {
                        detailEmpty.hidden = false;
                        detailEmpty.textContent = t('Concurso no encontrado o sin acceso.', 'Contest not found or access denied.');
                        detailWrap.hidden = true;
                        return;
                    }
                    first = urlContest;
                } else if (slugFromUrl) {
                    first = rows.find(function (r) { return r.slug === slugFromUrl; }) || null;
                    if (!first) {
                        detailEmpty.hidden = false;
                        detailEmpty.textContent = t('No hay un concurso con ese slug.', 'No contest with that slug.');
                        detailWrap.hidden = true;
                        return;
                    }
                } else {
                    first = rows[0] || null;
                }

                if (first) {
                    detailEmpty.hidden = true;
                    detailEmpty.textContent = defaultEmpty;
                    const n = listEl.querySelector('[data-contest-id="' + first.id + '"]');
                    if (n) n.classList.add('is-active');
                    await openContest(first);
                }
            }

            challengesEl.addEventListener('submit', async function (e) {
                var form = e.target && e.target.closest ? e.target.closest('.contest-ch-flag-form') : null;
                if (!form) return;
                e.preventDefault();
                if (!activeContestId) {
                    return;
                }
                if (!activeContest || !isContestAutoOpenNow(activeContest)) {
                    var rowGuard = form.closest('.contest-ch');
                    var msgGuard = rowGuard ? rowGuard.querySelector('.contest-ch-flash-msg') : null;
                    paintRowMsg(msgGuard, t('Este concurso aún no está abierto.', 'This contest is not open yet.'), 'err');
                    return;
                }
                var row = form.closest('.contest-ch');
                if (!row) return;
                var code = row.getAttribute('data-challenge-code') || '';
                var input = form.querySelector('.contest-ch-flag-input');
                var msgEl = row.querySelector('.contest-ch-flash-msg');
                var flag = input ? input.value.trim() : '';
                if (!flag) {
                    paintRowMsg(msgEl, t('Escribe una respuesta.', 'Enter an answer.'), 'err');
                    return;
                }
                const submitRes = await supabase.rpc('submit_contest_flag', {
                    p_contest_id: activeContestId,
                    p_challenge_code: code,
                    p_flag: flag
                });
                var data = submitRes.data;
                var error = submitRes.error;
                if (error) {
                    paintRowMsg(msgEl, t('Error: ', 'Error: ') + (error.message || t('desconocido', 'unknown')), 'err');
                    return;
                }
                if (!data || data.success !== true) {
                    if (data && data.error === 'NOT_ONLINE_VALIDATION') {
                        var sm = data.solve_mode || '';
                        var msg = sm === 'terminal'
                            ? t('Este reto no se valida por flag en la web.', 'Not validated by flag on this site.')
                            : t('Corrector externo.', 'External checker.');
                        paintRowMsg(msgEl, msg, 'err');
                        return;
                    }
                    if (data && data.error === 'ALREADY_SOLVED') {
                        paintRowMsg(msgEl, t('Ya resuelto.', 'Already solved.'), 'err');
                        return;
                    }
                    paintRowMsg(msgEl, t('Respuesta incorrecta.', 'Incorrect answer.'), 'err');
                    return;
                }
                paintRowMsg(msgEl, t('Correcto: +', 'OK: +') + data.points + t(' pts', ' pts'), 'ok');
            });

            await loadContests();

            window.addEventListener('beforeunload', clearCountdownTimer);
        });
    });
})();
