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
            const progressEl = document.getElementById('contest-progress');
            let activeContestId = null;
            let activeContest = null;
            let countdownTimer = null;
            let solvedChallengeIds = new Set();
            let currentChallengeRows = [];

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

            async function loadSolvedChallengeIds(contestId) {
                solvedChallengeIds = new Set();
                const sessionRes = await supabase.auth.getSession();
                const uid = sessionRes && sessionRes.data && sessionRes.data.session && sessionRes.data.session.user
                    ? sessionRes.data.session.user.id
                    : null;
                if (!uid || !contestId) return;
                const r = await supabase
                    .from('contest_solves')
                    .select('challenge_id')
                    .eq('contest_id', contestId)
                    .eq('user_id', uid);
                if (r.error || !Array.isArray(r.data)) return;
                r.data.forEach(function (x) {
                    if (x && x.challenge_id) solvedChallengeIds.add(String(x.challenge_id));
                });
            }

            function getFirstPendingIndex(challenges) {
                for (var i = 0; i < challenges.length; i++) {
                    if (!solvedChallengeIds.has(String(challenges[i].id || ''))) return i;
                }
                return -1;
            }

            function renderContestChallenges(challenges) {
                const firstPendingIdx = getFirstPendingIndex(challenges);
                const solvedCount = challenges.reduce(function (acc, c) {
                    return acc + (solvedChallengeIds.has(String(c.id || '')) ? 1 : 0);
                }, 0);
                if (progressEl) {
                    progressEl.textContent = t('Progreso', 'Progress') + ': ' + solvedCount + ' / ' + challenges.length;
                }
                challengesEl.innerHTML = challenges.map(function (c, idx) {
                    var cid = String(c.id || '');
                    var solved = solvedChallengeIds.has(cid);
                    var unlocked = solved || firstPendingIdx < 0 || idx <= firstPendingIdx;
                    var stateCls = solved ? 'is-solved' : (unlocked ? 'is-unlocked' : 'is-locked');
                    var enterLabel = solved
                        ? t('Revisar', 'Review')
                        : unlocked
                            ? t('Entrar en terminal', 'Open in terminal')
                            : t('Bloqueado', 'Locked');
                    var bodyBlock = unlocked
                        ? '<div class="contest-ch__body">' + escNl(c.description || '') + '</div>'
                        : '';
                    return (
                        '<article class="contest-ch ' + stateCls + '" data-challenge-id="' + esc(cid) + '" data-challenge-code="' + esc(c.code) + '">' +
                        '<div class="contest-ch__head">' +
                        '<h4 class="contest-ch__title">' + esc(c.code) + ' · ' + esc(c.title) + '</h4>' +
                        '<div class="contest-ch__meta">' + esc('Bash · ' + c.points + ' pts') + '</div>' +
                        '</div>' +
                        bodyBlock +
                        '<div class="contest-ch__actions">' +
                        '<button type="button" class="contest-ch-enter-btn" ' + (unlocked ? '' : 'disabled') + '>' + esc(enterLabel) + '</button>' +
                        '</div>' +
                        '</article>'
                    );
                }).join('');
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
                    if (progressEl) progressEl.hidden = true;
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
                if (progressEl) progressEl.hidden = false;

                const { data: challenges, error } = await supabase
                    .from('contest_challenges')
                    .select('id,code,title,description,category,difficulty,points,position,is_enabled,content_focus,solve_mode')
                    .eq('contest_id', contest.id)
                    .eq('is_enabled', true)
                    .order('position', { ascending: true });
                if (error) {
                    challengesEl.innerHTML = '<div class="contest-ch">No se pudieron cargar los retos.</div>';
                } else {
                    const chRows = (challenges || []).filter(function (c) {
                        return String(c.solve_mode || 'flag') === 'flag';
                    });
                    if (!chRows.length) {
                        challengesEl.innerHTML = '<div class="contest-ch contest-ch--empty">Sin retos cargados.</div>';
                    } else {
                        await loadSolvedChallengeIds(contest.id);
                        currentChallengeRows = chRows;
                        renderContestChallenges(chRows);
                    }
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

            challengesEl.addEventListener('click', function (e) {
                var enterBtn = e.target && e.target.closest ? e.target.closest('.contest-ch-enter-btn') : null;
                if (enterBtn) {
                    var rowEnter = enterBtn.closest('.contest-ch');
                    if (!rowEnter || rowEnter.classList.contains('is-locked')) return;
                    var challengeId = rowEnter.getAttribute('data-challenge-id') || '';
                    var challengeCode = rowEnter.getAttribute('data-challenge-code') || '';
                    var titleNode = rowEnter.querySelector('.contest-ch__title');
                    var bodyNode = rowEnter.querySelector('.contest-ch__body');
                    var payload = {
                        contestId: activeContestId,
                        challengeId: challengeId,
                        challengeCode: challengeCode,
                        challengeTitle: titleNode ? titleNode.textContent : challengeCode,
                        challengeDescription: bodyNode ? bodyNode.textContent : '',
                        returnUrl: '/contests.html?id=' + encodeURIComponent(activeContestId || '')
                    };
                try {
                        localStorage.setItem('bxf_contest_terminal_ctx', JSON.stringify(payload));
                } catch (_) { /* ignore */ }
                    window.location.href = '/terminal.html?contest=1';
                    return;
                }
            });

            await loadContests();

            window.addEventListener('beforeunload', clearCountdownTimer);
        });
    });
})();
