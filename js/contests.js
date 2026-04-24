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
            const idleWrap = document.getElementById('contest-detail-idle');
            const idleTitleEl = document.getElementById('contest-detail-idle-title');
            const idleTextEl = document.getElementById('contest-detail-idle-text');

            function hideDetailIdle() {
                if (idleWrap) idleWrap.hidden = true;
            }

            function showDetailIdle(title, body) {
                if (idleTitleEl) idleTitleEl.textContent = title == null ? '' : String(title);
                if (idleTextEl) idleTextEl.textContent = body == null ? '' : String(body);
                if (idleWrap) idleWrap.hidden = false;
                if (detailWrap) detailWrap.hidden = true;
            }

            function contestStatusClassToken(s) {
                var x = String(s || '').toLowerCase().replace(/[^a-z0-9_-]+/g, '');
                return x || 'unknown';
            }

            function setContestEmptyMessage(msg) {
                if (!detailEmpty) return;
                const line = detailEmpty.querySelector('.contests-catalog-hint__text');
                if (line) line.textContent = msg == null ? '' : String(msg);
                else detailEmpty.textContent = msg == null ? '' : String(msg);
            }
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
            let focusedChallengeEl = null;
            let hasEarlyScheduledAccess = false;

            function toBool(v) {
                return v === true || v === 't' || v === 'true' || v === 1;
            }

            function canBypassScheduledGate() {
                return hasEarlyScheduledAccess === true;
            }

            async function detectScheduledBypassAccess() {
                hasEarlyScheduledAccess = false;
                try {
                    const sess = await supabase.auth.getSession();
                    const uid = sess && sess.data && sess.data.session && sess.data.session.user
                        ? sess.data.session.user.id
                        : null;
                    if (!uid) return;
                    const [adminRes, betaRes] = await Promise.all([
                        supabase.rpc('is_admin'),
                        supabase.rpc('is_beta_tester')
                    ]);
                    const isAdmin = !adminRes.error && toBool(adminRes.data);
                    const isBeta = !betaRes.error && toBool(betaRes.data);
                    hasEarlyScheduledAccess = isAdmin || isBeta;
                } catch (_) {
                    hasEarlyScheduledAccess = false;
                }
            }
            let currentUserId = 'guest';

            async function resolveCurrentUserId() {
                try {
                    const sres = await supabase.auth.getSession();
                    const uid = sres && sres.data && sres.data.session && sres.data.session.user
                        ? sres.data.session.user.id
                        : null;
                    currentUserId = uid ? String(uid) : 'guest';
                } catch (_) {
                    currentUserId = 'guest';
                }
                return currentUserId;
            }

            function getContestsTutorialSteps() {
                if (lang === 'es') {
                    return [
                        {
                            title: 'Panel de concursos',
                            desc: 'Este apartado concentra todos los concursos. Empieza eligiendo uno del catalogo.',
                            target: null
                        },
                        {
                            title: 'Catalogo (izquierda)',
                            desc: 'Haz click en una fila para cargar su detalle, estado y retos.',
                            target: '.contests-list-pane'
                        },
                        {
                            title: 'Detalle del concurso',
                            desc: 'Aqui veras descripcion, progreso y el enunciado fijado del reto seleccionado.',
                            target: '.contest-detail-pane'
                        },
                        {
                            title: 'Retos y entrada a terminal',
                            desc: 'Selecciona una tarjeta y "Abrir en terminal". En la terminal: script en el editor izquierdo, SUBMIT arriba a la derecha; los args de validacion se inyectan solos (usa $1 si aplica).',
                            target: '#contest-ch-focus-open-terminal, .contest-ch-enter-btn'
                        },
                        {
                            title: 'Scripts con menu',
                            desc: 'Si el script tiene menu, ejecuta acciones validas antes de salir. Dentro del reto tendras una guia paso a paso.',
                            target: '#contest-challenge-focus, .contest-challenges-section'
                        }
                    ];
                }
                return [
                    { title: 'Contests panel', desc: 'This section contains all contests. Start by picking one from the catalog.', target: null },
                    { title: 'Catalog (left)', desc: 'Click a row to load details, status and challenge list.', target: '.contests-list-pane' },
                    { title: 'Contest detail', desc: 'Here you will see description, progress and focused challenge statement.', target: '.contest-detail-pane' },
                    { title: 'Challenges and terminal', desc: 'Pick a card and "Open in terminal". In the terminal: script in the left editor, SUBMIT top right; validation args are injected for you (use $1 when needed).', target: '#contest-ch-focus-open-terminal, .contest-ch-enter-btn' },
                    { title: 'Menu-driven scripts', desc: 'For menu scripts, run valid actions before exit. You will also get an in-terminal guided tour.', target: '#contest-challenge-focus, .contest-challenges-section' }
                ];
            }

            function queryFirstVisible(selectorList) {
                var chunks = String(selectorList || '').split(',').map(function (s) { return s.trim(); }).filter(Boolean);
                for (var i = 0; i < chunks.length; i++) {
                    var el = document.querySelector(chunks[i]);
                    if (!el) continue;
                    var r = el.getBoundingClientRect();
                    if (r.width > 4 && r.height > 4) return el;
                }
                return null;
            }

            async function maybeShowContestsTutorial() {
                const uid = await resolveCurrentUserId();
                const key = 'bxf_contests_tutorial_seen_v2_' + uid;
                let seen = false;
                try { seen = localStorage.getItem(key) === '1'; } catch (_) {}
                if (seen) return;

                const steps = getContestsTutorialSteps();
                if (!steps.length) return;

                const overlay = document.createElement('div');
                overlay.className = 'contests-guided-overlay';
                const panes = [0, 1, 2, 3].map(function () {
                    var p = document.createElement('div');
                    p.className = 'contests-guided-overlay-pane';
                    overlay.appendChild(p);
                    return p;
                });
                const highlight = document.createElement('div');
                highlight.className = 'contests-guided-highlight';
                const card = document.createElement('div');
                card.className = 'contests-guided-card';
                document.body.appendChild(overlay);
                document.body.appendChild(highlight);
                document.body.appendChild(card);

                let idx = 0;
                var onResize = null;

                function cleanup(remember) {
                    try {
                        if (onResize) window.removeEventListener('resize', onResize);
                        if (overlay.parentNode) overlay.parentNode.removeChild(overlay);
                        if (highlight.parentNode) highlight.parentNode.removeChild(highlight);
                        if (card.parentNode) card.parentNode.removeChild(card);
                    } catch (_) { /* ignore */ }
                    if (remember) {
                        try { localStorage.setItem(key, '1'); } catch (_) { /* ignore */ }
                    }
                }

                function placeHighlight(target) {
                    if (!target) {
                        highlight.style.display = 'none';
                        return;
                    }
                    var rect = target.getBoundingClientRect();
                    var pad = 7;
                    highlight.style.display = 'block';
                    highlight.style.top = (rect.top - pad) + 'px';
                    highlight.style.left = (rect.left - pad) + 'px';
                    highlight.style.width = (rect.width + pad * 2) + 'px';
                    highlight.style.height = (rect.height + pad * 2) + 'px';
                }

                function placeOverlayPanes(target) {
                    var w = window.innerWidth;
                    var h = window.innerHeight;
                    if (!target) {
                        panes[0].style.display = 'block';
                        panes[0].style.left = '0px';
                        panes[0].style.top = '0px';
                        panes[0].style.width = w + 'px';
                        panes[0].style.height = h + 'px';
                        panes[1].style.display = 'none';
                        panes[2].style.display = 'none';
                        panes[3].style.display = 'none';
                        return;
                    }
                    var r = target.getBoundingClientRect();
                    var pad = 10;
                    var x1 = Math.max(0, Math.floor(r.left - pad));
                    var y1 = Math.max(0, Math.floor(r.top - pad));
                    var x2 = Math.min(w, Math.ceil(r.right + pad));
                    var y2 = Math.min(h, Math.ceil(r.bottom + pad));
                    panes.forEach(function (p) { p.style.display = 'block'; });
                    panes[0].style.left = '0px';
                    panes[0].style.top = '0px';
                    panes[0].style.width = w + 'px';
                    panes[0].style.height = y1 + 'px';
                    panes[1].style.left = '0px';
                    panes[1].style.top = y1 + 'px';
                    panes[1].style.width = x1 + 'px';
                    panes[1].style.height = Math.max(0, y2 - y1) + 'px';
                    panes[2].style.left = x2 + 'px';
                    panes[2].style.top = y1 + 'px';
                    panes[2].style.width = Math.max(0, w - x2) + 'px';
                    panes[2].style.height = Math.max(0, y2 - y1) + 'px';
                    panes[3].style.left = '0px';
                    panes[3].style.top = y2 + 'px';
                    panes[3].style.width = w + 'px';
                    panes[3].style.height = Math.max(0, h - y2) + 'px';
                }

                function placeCard(target) {
                    var cardWidth = Math.min(420, Math.max(280, Math.floor(window.innerWidth * 0.34)));
                    var cardHeight = card.offsetHeight || 180;
                    var pad = 16;
                    var top;
                    var left;
                    card.style.transform = 'none';
                    if (!target) {
                        top = Math.max(pad, Math.floor((window.innerHeight - cardHeight) / 2));
                        left = Math.max(pad, Math.floor((window.innerWidth - cardWidth) / 2));
                    } else {
                        var rect = target.getBoundingClientRect();
                        left = rect.left + Math.max(0, (rect.width - cardWidth) / 2);
                        top = rect.bottom + 14;
                        if (top + cardHeight > window.innerHeight - pad) top = rect.top - cardHeight - 14;
                        if (left + cardWidth > window.innerWidth - pad) left = window.innerWidth - cardWidth - pad;
                        if (left < pad) left = pad;
                        if (top < pad) top = pad;
                    }
                    card.style.maxWidth = cardWidth + 'px';
                    card.style.top = top + 'px';
                    card.style.left = left + 'px';
                }

                function renderStep() {
                    var step = steps[idx];
                    var target = queryFirstVisible(step.target);
                    if (target) target.scrollIntoView({ behavior: 'smooth', block: 'center' });
                    card.innerHTML =
                        '<h3>' + esc(step.title) + '</h3>' +
                        '<p>' + esc(step.desc) + '</p>' +
                        '<div class="contests-guided-actions">' +
                        '<button type="button" class="contests-guided-btn" data-act="prev"' + (idx === 0 ? ' disabled' : '') + '>' + esc(lang === 'es' ? 'Anterior' : 'Previous') + '</button>' +
                        '<button type="button" class="contests-guided-btn contests-guided-btn--primary" data-act="next">' + esc(idx >= steps.length - 1 ? (lang === 'es' ? 'Entendido' : 'Done') : (lang === 'es' ? 'Siguiente' : 'Next')) + '</button>' +
                        '<button type="button" class="contests-guided-btn" data-act="skip">' + esc(lang === 'es' ? 'Omitir' : 'Skip') + '</button>' +
                        '</div>' +
                        '<div class="contests-guided-step">' + esc((lang === 'es' ? 'Paso ' : 'Step ') + (idx + 1) + ' / ' + steps.length) + '</div>';

                    setTimeout(function () {
                        placeOverlayPanes(target);
                        placeHighlight(target);
                        placeCard(target);
                    }, target ? 280 : 20);
                }

                card.addEventListener('click', function (ev) {
                    var btn = ev.target && ev.target.closest ? ev.target.closest('button[data-act]') : null;
                    if (!btn) return;
                    var act = btn.getAttribute('data-act');
                    if (act === 'prev') {
                        if (idx > 0) idx--;
                        renderStep();
                        return;
                    }
                    if (act === 'next') {
                        if (idx < steps.length - 1) {
                            idx++;
                            renderStep();
                            return;
                        }
                        cleanup(true);
                        return;
                    }
                    cleanup(true);
                });

                onResize = function () { renderStep(); };
                window.addEventListener('resize', onResize, { passive: true });
                renderStep();
            }

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

            const focusWrap = document.getElementById('contest-challenge-focus');
            const focusTitleEl = document.getElementById('contest-challenge-focus-title');
            const focusBodyEl = document.getElementById('contest-challenge-focus-body');
            const focusHintEl = document.getElementById('contest-challenge-focus-hint');
            const focusOpenBtn = document.getElementById('contest-ch-focus-open-terminal');

            function hideChallengeFocusPanel() {
                focusedChallengeEl = null;
                if (challengesEl) {
                    challengesEl.querySelectorAll('.contest-ch.is-selected').forEach(function (a) {
                        a.classList.remove('is-selected');
                    });
                }
                if (!focusWrap) return;
                focusWrap.hidden = true;
                if (focusTitleEl) focusTitleEl.textContent = '';
                if (focusBodyEl) focusBodyEl.innerHTML = '';
                if (focusHintEl) focusHintEl.hidden = false;
                if (focusOpenBtn) focusOpenBtn.disabled = true;
            }

            function resetChallengeFocusPanel() {
                focusedChallengeEl = null;
                if (challengesEl) {
                    challengesEl.querySelectorAll('.contest-ch.is-selected').forEach(function (a) {
                        a.classList.remove('is-selected');
                    });
                }
                if (!focusWrap || !focusTitleEl || !focusBodyEl || !focusOpenBtn) return;
                focusTitleEl.textContent = '';
                focusBodyEl.innerHTML = '';
                if (focusHintEl) focusHintEl.hidden = false;
                focusOpenBtn.disabled = true;
                focusWrap.hidden = false;
            }

            function applyChallengeFocusFromArticle(article) {
                if (!article || !focusWrap || !focusTitleEl || !focusBodyEl || !focusOpenBtn) return;
                const titleNode = article.querySelector('.contest-ch__title');
                const bodyNode = article.querySelector('.contest-ch__body');
                focusedChallengeEl = article;
                challengesEl.querySelectorAll('.contest-ch.is-selected').forEach(function (a) {
                    a.classList.remove('is-selected');
                });
                article.classList.add('is-selected');
                focusTitleEl.textContent = titleNode ? titleNode.textContent : '';
                focusBodyEl.innerHTML = bodyNode ? bodyNode.innerHTML : '';
                if (focusHintEl) focusHintEl.hidden = true;
                var innerEnter = article.querySelector('.contest-ch-enter-btn');
                focusOpenBtn.disabled = !innerEnter || innerEnter.disabled;
                focusWrap.hidden = false;
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

            function renderContestChallenges(challenges, allowSubmit) {
                var submitOk = allowSubmit !== false;
                const solvedCount = challenges.reduce(function (acc, c) {
                    return acc + (solvedChallengeIds.has(String(c.id || '')) ? 1 : 0);
                }, 0);
                if (progressEl) {
                    progressEl.textContent = t('Progreso', 'Progress') + ': ' + solvedCount + ' / ' + challenges.length;
                }
                challengesEl.innerHTML = challenges.map(function (c) {
                    var cid = String(c.id || '');
                    var solved = solvedChallengeIds.has(cid);
                    var stateCls = solved ? 'is-solved' : 'is-unlocked';
                    var enterDisabled = !solved && !submitOk;
                    var enterLabel = enterDisabled
                        ? t('Plazo cerrado', 'Deadline passed')
                        : (solved
                            ? t('Revisar', 'Review')
                            : t('Entrar en terminal', 'Open in terminal'));
                    var stateChip = solved
                        ? '<span class="contest-ch__chip contest-ch__chip--solved">' + esc(t('Resuelto', 'Solved')) + '</span>'
                        : '<span class="contest-ch__chip contest-ch__chip--open">' + esc(t('Activo', 'Open')) + '</span>';
                    var bodyBlock = '<div class="contest-ch__body">' + escNl(c.description || '') + '</div>';
                    return (
                        '<article class="contest-ch contest-ch--selectable ' + stateCls + '" data-challenge-id="' + esc(cid) + '" data-challenge-code="' + esc(c.code) + '" data-challenge-title-raw="' + esc(c.title || "") + '" data-challenge-solve-mode="' + esc(String(c.solve_mode || "flag")) + '" data-challenge-points="' + esc(String(c.points || 0)) + '">' +
                        '<div class="contest-ch__surface">' +
                        '<header class="contest-ch__head">' +
                        '<div class="contest-ch__toolbar">' +
                        '<span class="contest-ch__chip contest-ch__chip--bash">Bash</span>' +
                        '<span class="contest-ch__chip contest-ch__chip--pts">' + esc(String(c.points)) + ' pts</span>' +
                        stateChip +
                        '</div>' +
                        '<h4 class="contest-ch__title">' + esc(c.code) + ' · ' + esc(c.title) + '</h4>' +
                        '</header>' +
                        bodyBlock +
                        '<div class="contest-ch__actions">' +
                        '<button type="button" class="contest-ch-enter-btn"' + (enterDisabled ? ' disabled' : '') + '>' + esc(enterLabel) + '</button>' +
                        '</div>' +
                        '</div></article>'
                    );
                }).join('');

                if (!challenges.length) {
                    hideChallengeFocusPanel();
                } else {
                    resetChallengeFocusPanel();
                    if (typeof window.refreshBxfI18n === 'function') window.refreshBxfI18n();
                }
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

            /** Alineado con public.submit_contest_flag: ventana horaria + fin por ends_at. */
            function canContestAcceptSubmissions(contest) {
                if (!contest) return false;
                const st = String(contest.status || '').toLowerCase();
                if (st === 'archived' || st === 'draft') return false;
                if (contest.ends_at) {
                    const endMs = new Date(contest.ends_at).getTime();
                    if (!Number.isNaN(endMs) && Date.now() > endMs) return false;
                }
                if (st === 'active' || st === 'closed') return true;
                if (st === 'scheduled' && contest.starts_at) {
                    if (canBypassScheduledGate()) return true;
                    const startMs = new Date(contest.starts_at).getTime();
                    return !Number.isNaN(startMs) && Date.now() >= startMs;
                }
                return false;
            }

            async function openContest(contest) {
                clearCountdownTimer();
                hideChallengeFocusPanel();
                activeContestId = contest.id;
                activeContest = contest;
                detailEmpty.hidden = true;
                detailWrap.hidden = false;
                hideDetailIdle();
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
                const privilegedBypass = canBypassScheduledGate();
                const mustStayLocked = !privilegedBypass && ((isScheduled && !isContestAutoOpenNow(contest)) || isPreOpenWindow);
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
                    hideChallengeFocusPanel();
                } else {
                    const chRows = (challenges || []).filter(function (c) {
                        var mode = String(c.solve_mode || 'flag');
                        return mode === 'flag' || mode === 'bash_checker' || mode === 'terminal';
                    });
                    if (!chRows.length) {
                        challengesEl.innerHTML = '<div class="contest-ch contest-ch--empty">Sin retos cargados.</div>';
                        hideChallengeFocusPanel();
                    } else {
                        await loadSolvedChallengeIds(contest.id);
                        currentChallengeRows = chRows;
                        renderContestChallenges(chRows, canContestAcceptSubmissions(contest));
                    }
                }
            }

            async function loadContests() {
                await detectScheduledBypassAccess();
                const qp = new URLSearchParams(window.location.search);
                const idFromUrl = qp.get('id');
                const slugFromUrl = qp.get('slug');

                if (idleTitleEl) idleTitleEl.textContent = t('Sincronizando catálogo', 'Syncing catalog');
                if (idleTextEl) idleTextEl.textContent = t('Conectando con el grid BXF.', 'Connecting to the BXF grid.');
                if (idleWrap) idleWrap.hidden = false;
                if (detailWrap) detailWrap.hidden = true;

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
                    showDetailIdle(
                        t('Error de red / permisos', 'Network or permission error'),
                        t('No se pudo leer el catálogo. Reintenta en unos segundos.', 'Could not read the catalog. Try again shortly.')
                    );
                    return;
                }
                let rows = data || [];
                if (urlContest && !rows.some(function (r) { return r.id === urlContest.id; })) {
                    rows = [urlContest].concat(rows);
                }

                listEl.innerHTML = rows.length
                    ? rows.map(function (c) {
                        const rowStatus = isContestAutoOpenNow(c) ? 'active' : c.status;
                        const stCls = contestStatusClassToken(rowStatus);
                        return (
                            '<article class="contest-list-item contest-list-item--status-' + esc(stCls) + '" data-contest-id="' + esc(c.id) + '">' +
                            '<span class="contest-list-item__rail" aria-hidden="true"></span>' +
                            '<div class="contest-list-item__inner">' +
                            '<strong class="contest-list-item__title">' + esc(c.title) + '</strong>' +
                            '<div class="contest-list-item__meta">' + esc(c.mode + ' · ' + rowStatus) + '</div>' +
                            '<div class="contest-list-item__meta contest-list-item__meta--date">' + esc(fmtDate(c.starts_at)) + '</div>' +
                            '</div></article>'
                        );
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

                const defaultEmpty = t('Selecciona un concurso en el catálogo para cargar el panel derecho.', 'Pick a contest in the catalog to load the detail panel.');

                let first = null;
                if (idFromUrl) {
                    if (!urlContest) {
                        detailEmpty.hidden = false;
                        setContestEmptyMessage(t('Concurso no encontrado o sin acceso.', 'Contest not found or access denied.'));
                        showDetailIdle(
                            t('Concurso no encontrado', 'Contest not found'),
                            t('Revisa el enlace o pide acceso al operador del grid.', 'Check the link or ask the grid operator for access.')
                        );
                        return;
                    }
                    first = urlContest;
                } else if (slugFromUrl) {
                    first = rows.find(function (r) { return r.slug === slugFromUrl; }) || null;
                    if (!first) {
                        detailEmpty.hidden = false;
                        setContestEmptyMessage(t('No hay un concurso con ese slug.', 'No contest with that slug.'));
                        showDetailIdle(
                            t('Slug inválido', 'Invalid slug'),
                            t('No existe un concurso con ese identificador en el catálogo.', 'No contest in the catalog matches that slug.')
                        );
                        return;
                    }
                } else {
                    first = rows[0] || null;
                }

                if (first) {
                    detailEmpty.hidden = true;
                    setContestEmptyMessage(defaultEmpty);
                    const n = listEl.querySelector('[data-contest-id="' + first.id + '"]');
                    if (n) n.classList.add('is-active');
                    await openContest(first);
                } else {
                    detailEmpty.hidden = false;
                    setContestEmptyMessage(t('No hay concursos en el catálogo.', 'No contests in the catalog.'));
                    showDetailIdle(
                        t('Catálogo vacío', 'Empty catalog'),
                        t('Cuando publiquen un concurso aparecerá aquí.', 'When a contest is published it will show up here.')
                    );
                }
            }

            challengesEl.addEventListener('click', function (e) {
                if (e.target && e.target.closest && !e.target.closest('.contest-ch-enter-btn')) {
                    var artPick = e.target.closest('.contest-ch');
                    if (artPick && artPick.getAttribute('data-challenge-id') && !artPick.classList.contains('contest-ch--empty')) {
                        applyChallengeFocusFromArticle(artPick);
                    }
                }
                var enterBtn = e.target && e.target.closest ? e.target.closest('.contest-ch-enter-btn') : null;
                if (enterBtn) {
                    if (enterBtn.disabled) return;
                    var rowEnter = enterBtn.closest('.contest-ch');
                    if (!rowEnter) return;
                    var challengeId = rowEnter.getAttribute('data-challenge-id') || '';
                    var challengeCode = rowEnter.getAttribute('data-challenge-code') || '';
                    var challengeSolveMode = rowEnter.getAttribute('data-challenge-solve-mode') || 'flag';
                    var challengePoints = rowEnter.getAttribute('data-challenge-points') || '0';
                    var titleNode = rowEnter.querySelector('.contest-ch__title');
                    var bodyNode = rowEnter.querySelector('.contest-ch__body');
                    var rawTitle = rowEnter.getAttribute('data-challenge-title-raw') || '';
                    var payload = {
                        contestId: activeContestId,
                        contestTitle: activeContest && activeContest.title ? activeContest.title : '',
                        challengeId: challengeId,
                        challengeCode: challengeCode,
                        challengeSolveMode: challengeSolveMode,
                        challengePoints: challengePoints,
                        challengeTitle: rawTitle || (titleNode ? titleNode.textContent : challengeCode),
                        challengeDescription: bodyNode ? bodyNode.textContent : '',
                        returnUrl: '/contests.html?id=' + encodeURIComponent(activeContestId || '')
                    };
                    if (activeContest && activeContest.title && String(activeContest.title).toLowerCase().indexOf('lunes 27/04/2026') >= 0) {
                        payload.harnessCodeShift = 2;
                    }
                try {
                        localStorage.setItem('bxf_contest_terminal_ctx', JSON.stringify(payload));
                } catch (_) { /* ignore */ }
                    window.location.href = '/terminal.html?contest=1&v=2.6.53';
                    return;
                }
            });

            if (focusOpenBtn) {
                focusOpenBtn.addEventListener('click', function () {
                    if (!focusedChallengeEl) return;
                    var innerBtn = focusedChallengeEl.querySelector('.contest-ch-enter-btn');
                    if (innerBtn) innerBtn.click();
                });
            }

            await loadContests();
            await maybeShowContestsTutorial();

            window.addEventListener('beforeunload', clearCountdownTimer);
        });
    });
})();
