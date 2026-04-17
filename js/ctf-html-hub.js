/**
 * Dashboard de retos en ctf.html:
 * - Sidebar: búsqueda, progreso, categorías, dificultad.
 * - Main: retos agrupados por categoría con grid.
 * - Conserva paginación y submit de flags.
 */
(function () {
    function diffEs(d) {
        return String(d).replace('Easy', 'Fácil').replace('Medium', 'Media').replace('Hard', 'Difícil');
    }

    function esc(s) {
        return String(s || '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/"/g, '&quot;');
    }

    document.addEventListener('DOMContentLoaded', function () {
        try {
            const listContainer = document.getElementById('ctf-list-container');
            const searchInput = document.getElementById('ctfSearch');
            const diffButtons = document.querySelectorAll('.ctf-diff-btn');
            const categoryList = document.getElementById('ctf-category-list');
            const statTotal = document.getElementById('ctf-stat-total');
            const statFiltered = document.getElementById('ctf-stat-filtered');
            const statSolved = document.getElementById('ctf-stat-solved');
            const statPoints = document.getElementById('ctf-stat-points');
            const CTF_PAGE_SIZE = 8;
            const categoryOrder = ['Web', 'Crypto', 'Pwn', 'Forensics', 'OSINT', 'Rev', 'Programming', 'Hardware'];
            let currentModalChallengeId = null;

            if (!listContainer) return;

            const challenges = window.BXF_CTF_ALL_CHALLENGES;
            const challengeById = new Map((challenges || []).map(function (c) { return [c.id, c]; }));
            if (!Array.isArray(challenges) || challenges.length === 0) {
                listContainer.innerHTML =
                    '<div class="ctf-empty">[!] BXF_CTF_ALL_CHALLENGES not loaded. Check js/bxf-ctf-all-challenges.js</div>';
                return;
            }

            let currentCategory = 'all';
            let currentDifficulty = 'all';
            let currentSearch = '';
            let ctfPage = 1;
            let solvedSet = new Set();

            window.submitFlagSafe = function (id, btn) {
                if (typeof window.submitFlag === 'function') return window.submitFlag(id, btn);
                else alert('submitFlag engine not fully loaded yet. Please wait a second.');
                return Promise.resolve();
            };

            function ensureModalShell() {
                if (document.getElementById('ctf-challenge-modal')) return;
                document.body.insertAdjacentHTML(
                    'beforeend',
                    '<div class="ctf-modal-overlay" id="ctf-challenge-modal" hidden>' +
                        '<div class="ctf-modal">' +
                            '<button type="button" class="ctf-modal-close" id="ctf-modal-close" aria-label="Close">×</button>' +
                            '<div class="ctf-modal-head">' +
                                '<span class="ctf-modal-id" id="ctf-modal-id"></span>' +
                                '<h3 id="ctf-modal-title"></h3>' +
                                '<div class="ctf-card-meta" id="ctf-modal-meta"></div>' +
                            '</div>' +
                            '<div class="ctf-modal-body">' +
                                '<div class="mission-details-box" id="ctf-modal-desc"></div>' +
                                '<div id="ctf-modal-fb"></div>' +
                                '<div class="ctf-card-assets" id="ctf-modal-assets"></div>' +
                                '<div class="ctf-footer" id="ctf-modal-tags"></div>' +
                                '<div class="flag-submission">' +
                                    '<input type="text" placeholder="bxf{...}" class="flag-input" id="ctf-modal-flag-input">' +
                                    '<button class="flag-submit-btn" id="ctf-modal-validate-btn">Validate</button>' +
                                '</div>' +
                                '<div class="solve-status" id="ctf-modal-status"></div>' +
                            '</div>' +
                        '</div>' +
                    '</div>'
                );

                const overlay = document.getElementById('ctf-challenge-modal');
                const close = document.getElementById('ctf-modal-close');
                const closeModal = function () {
                    if (overlay) overlay.hidden = true;
                };
                if (close) {
                    close.addEventListener('click', function (e) {
                        e.preventDefault();
                        e.stopPropagation();
                        closeModal();
                    });
                }
                if (overlay) {
                    overlay.addEventListener('click', function (e) {
                        if (e.target === overlay) closeModal();
                    });
                }
                document.addEventListener('keydown', function (e) {
                    if (e.key === 'Escape' && overlay && !overlay.hidden) closeModal();
                });
                const validateBtn = document.getElementById('ctf-modal-validate-btn');
                if (validateBtn) {
                    validateBtn.addEventListener('click', async function () {
                        if (!currentModalChallengeId) return;
                        await window.submitFlagSafe(currentModalChallengeId, validateBtn);
                        const st = document.getElementById('ctf-modal-status');
                        if (st && st.classList.contains('success')) {
                            solvedSet.add(currentModalChallengeId);
                            const card = document.querySelector('.ctf-item[data-id="' + currentModalChallengeId + '"]');
                            if (card) card.classList.add('solved');
                            if (statSolved) {
                                statSolved.textContent = String(
                                    challenges.filter(function (c) {
                                        const matchCat = currentCategory === 'all' || c.category.toLowerCase() === currentCategory;
                                        const matchDiff = currentDifficulty === 'all' || c.difficulty.toLowerCase() === currentDifficulty;
                                        const term = currentSearch.trim().toLowerCase();
                                        const tags = c.tags || [];
                                        const matchSearch =
                                            !term ||
                                            (c.id && c.id.toLowerCase().includes(term)) ||
                                            c.titleEN.toLowerCase().includes(term) ||
                                            c.titleES.toLowerCase().includes(term) ||
                                            c.descEN.toLowerCase().includes(term) ||
                                            c.descES.toLowerCase().includes(term) ||
                                            c.category.toLowerCase().includes(term) ||
                                            c.difficulty.toLowerCase().includes(term) ||
                                            tags.some(function (t) { return t.toLowerCase().includes(term); });
                                        return matchCat && matchDiff && matchSearch && solvedSet.has(c.id);
                                    }).length
                                );
                            }
                        }
                    });
                }
            }

            function openChallengeModal(m) {
                if (!m) return;
                ensureModalShell();
                const overlay = document.getElementById('ctf-challenge-modal');
                const lang = localStorage.getItem('lang') || 'en';
                currentModalChallengeId = m.id;

                const title = lang === 'es' ? m.titleES : m.titleEN;
                const desc = lang === 'es' ? m.descES : m.descEN;

                document.getElementById('ctf-modal-id').textContent = m.id;
                document.getElementById('ctf-modal-title').textContent = title;
                document.getElementById('ctf-modal-meta').innerHTML =
                    '<span class="badge points-badge">' + esc(m.points) + ' PTS</span>' +
                    '<span class="badge ' + esc(m.diffClass) + '">' + esc(lang === 'es' ? diffEs(m.difficulty) : m.difficulty) + '</span>' +
                    '<span class="badge">' + esc(m.category) + '</span>';
                document.getElementById('ctf-modal-desc').innerHTML = esc(desc);

                const fb = window.__bxfFbMap && window.__bxfFbMap.get(m.id);
                document.getElementById('ctf-modal-fb').innerHTML = fb
                    ? '<div class="ctf-first-blood has-fb"><span class="ctf-fb-badge">FIRST BLOOD</span><span class="ctf-fb-user">@' +
                      esc(fb.username || '—') +
                      '</span></div>'
                    : '';
                const tags = (m.tags || [])
                    .map(function (t) { return '<span class="badge ctf-card-tag">#' + esc(t) + '</span>'; })
                    .join('');
                document.getElementById('ctf-modal-tags').innerHTML = tags || '<span class="badge">No tags</span>';
                const assets = (m.assets || [])
                    .map(function (a) {
                        return '<a href="' + esc(a.path) + '" download class="asset-link">> ' + esc(a.name) + '</a>';
                    })
                    .join('');
                document.getElementById('ctf-modal-assets').innerHTML = assets
                    ? '<strong>[📥] ASSETS:</strong> ' + assets
                    : '';

                const status = document.getElementById('ctf-modal-status');
                status.textContent = solvedSet.has(m.id) ? (lang === 'es' ? 'Resuelto por tu entidad.' : 'Solved by your entity.') : '';
                status.className = solvedSet.has(m.id) ? 'solve-status success' : 'solve-status';
                document.getElementById('ctf-modal-flag-input').value = '';
                overlay.hidden = false;
            }

            async function loadSolvedSet() {
                try {
                    const sb = window._sbClient;
                    if (!sb) return;
                    const { data: authData } = await sb.auth.getSession();
                    const session = authData && authData.session;
                    if (!session || !session.user) return;
                    const ids = challenges.map(function (c) { return c.id; });
                    const { data } = await sb
                        .from('solves')
                        .select('challenge_id')
                        .eq('user_id', session.user.id)
                        .in('challenge_id', ids);
                    solvedSet = new Set((data || []).map(function (r) { return r.challenge_id; }));
                } catch (e) {
                    console.warn('ctf solved set', e);
                }
            }

            function renderCategoryList(filtered) {
                if (!categoryList) return;
                const counts = {};
                filtered.forEach(function (c) {
                    counts[c.category] = (counts[c.category] || 0) + 1;
                });
                const ordered = categoryOrder.filter(function (cat) { return counts[cat] || currentCategory === cat.toLowerCase(); });
                const allActive = currentCategory === 'all' ? ' is-active' : '';
                let html =
                    '<button type="button" class="ctf-side-cat' + allActive + '" data-cat="all">' +
                    '<span data-en="All categories" data-es="Todas las categorías">All categories</span>' +
                    '<b>' + filtered.length + '</b></button>';

                ordered.forEach(function (cat) {
                    const active = currentCategory === cat.toLowerCase() ? ' is-active' : '';
                    html +=
                        '<button type="button" class="ctf-side-cat' + active + '" data-cat="' + cat.toLowerCase() + '">' +
                        '<span>' + esc(cat) + '</span><b>' + counts[cat] + '</b></button>';
                });
                categoryList.innerHTML = html;

                categoryList.querySelectorAll('[data-cat]').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        currentCategory = btn.getAttribute('data-cat') || 'all';
                        ctfPage = 1;
                        renderChallenges();
                    });
                });
            }

            function renderCtfPager(total, page, totalPages) {
                const nav = document.getElementById('ctf-pager');
                if (!nav) return;
                const lang = localStorage.getItem('lang') || 'en';
                if (total === 0) {
                    nav.innerHTML = '';
                    nav.hidden = true;
                    return;
                }
                nav.hidden = false;
                const startN = (page - 1) * CTF_PAGE_SIZE + 1;
                const endN = Math.min(page * CTF_PAGE_SIZE, total);
                const prevDis = page <= 1;
                const nextDis = page >= totalPages;
                const meta =
                    lang === 'es'
                        ? 'Pág. ' + page + ' / ' + totalPages + ' · retos ' + startN + '–' + endN + ' de ' + total
                        : 'Page ' + page + ' / ' + totalPages + ' · challenges ' + startN + '–' + endN + ' of ' + total;
                nav.innerHTML =
                    '<button type="button" class="ctf-pager__btn" ' + (prevDis ? 'disabled' : '') + ' data-ctf-pager="-1">←</button>' +
                    '<span class="ctf-pager__meta">' + meta + '</span>' +
                    '<button type="button" class="ctf-pager__btn" ' + (nextDis ? 'disabled' : '') + ' data-ctf-pager="1">→</button>';
                nav.querySelectorAll('[data-ctf-pager]').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        ctfPage += parseInt(btn.getAttribute('data-ctf-pager') || '0', 10);
                        renderChallenges();
                    });
                });
            }

            function clearCtfFilters() {
                currentCategory = 'all';
                currentDifficulty = 'all';
                currentSearch = '';
                ctfPage = 1;
                if (searchInput) searchInput.value = '';
                diffButtons.forEach(function (b) {
                    b.classList.toggle('is-active', b.getAttribute('data-diff') === 'all');
                });
                renderChallenges();
            }

            function renderChallenges() {
                listContainer.innerHTML = '';
                const filtered = challenges.filter(function (c) {
                    const matchCat = currentCategory === 'all' || c.category.toLowerCase() === currentCategory;
                    const matchDiff = currentDifficulty === 'all' || c.difficulty.toLowerCase() === currentDifficulty;
                    const term = currentSearch.trim().toLowerCase();
                    const tags = c.tags || [];
                    const matchSearch =
                        !term ||
                        (c.id && c.id.toLowerCase().includes(term)) ||
                        c.titleEN.toLowerCase().includes(term) ||
                        c.titleES.toLowerCase().includes(term) ||
                        c.descEN.toLowerCase().includes(term) ||
                        c.descES.toLowerCase().includes(term) ||
                        c.category.toLowerCase().includes(term) ||
                        c.difficulty.toLowerCase().includes(term) ||
                        tags.some(function (t) { return t.toLowerCase().includes(term); });
                    return matchCat && matchDiff && matchSearch;
                });

                renderCategoryList(filtered);

                if (statTotal) statTotal.textContent = String(challenges.length);
                if (statFiltered) statFiltered.textContent = String(filtered.length);
                if (statSolved) statSolved.textContent = String(filtered.filter(function (c) { return solvedSet.has(c.id); }).length);
                if (statPoints) {
                    const totalPts = filtered.reduce(function (acc, c) { return acc + Number(c.points || 0); }, 0);
                    statPoints.textContent = totalPts.toLocaleString();
                }

                const totalPages = Math.max(1, Math.ceil(filtered.length / CTF_PAGE_SIZE));
                ctfPage = Math.min(totalPages, Math.max(1, ctfPage));
                const start = (ctfPage - 1) * CTF_PAGE_SIZE;
                const pageSlice = filtered.slice(start, start + CTF_PAGE_SIZE);

                if (filtered.length === 0) {
                    listContainer.innerHTML =
                        '<div class="ctf-empty">' +
                        '<h3 data-en="No challenges match your filters." data-es="Ningún reto coincide con los filtros.">No challenges match your filters.</h3>' +
                        '<p data-en="Clear search or set Category / Difficulty to All." data-es="Borra la búsqueda o pon Categoría / Dificultad en Todas.">Clear search or set Category / Difficulty to All.</p>' +
                        '</div>';
                    renderCtfPager(0, 1, 1);
                } else {
                    const grouped = {};
                    pageSlice.forEach(function (m) {
                        if (!grouped[m.category]) grouped[m.category] = [];
                        grouped[m.category].push(m);
                    });
                    const orderedCats = categoryOrder.filter(function (cat) { return grouped[cat] && grouped[cat].length; });
                    if (orderedCats.length === 0) {
                        Object.keys(grouped).forEach(function (cat) { orderedCats.push(cat); });
                    }

                    orderedCats.forEach(function (cat) {
                        const rows = grouped[cat];
                        let cards = '';
                        rows.forEach(function (m) {
                            const solvedBadge = solvedSet.has(m.id)
                                ? '<span class="ctf-card-solved" data-en="Solved" data-es="Resuelto">Solved</span>'
                                : '';
                            const summaryEn = String(m.descEN || '').slice(0, 120) + (String(m.descEN || '').length > 120 ? '…' : '');
                            const summaryEs = String(m.descES || '').slice(0, 120) + (String(m.descES || '').length > 120 ? '…' : '');

                            cards +=
                                '<article class="ctf-item ctf-card' + (solvedSet.has(m.id) ? ' solved' : '') + '" data-id="' + esc(m.id) + '">' +
                                '<div class="ctf-link">' +
                                '<div class="ctf-card-topline"><span class="ctf-card-id">' + esc(m.id) + '</span>' + solvedBadge + '</div>' +
                                '<div class="ctf-title" data-en="' + esc(m.titleEN) + '" data-es="' + esc(m.titleES) + '">' + esc(m.titleEN) + '</div>' +
                                '<div class="ctf-card-meta">' +
                                '<span class="badge points-badge">' + esc(m.points) + ' PTS</span>' +
                                '<span class="badge ' + esc(m.diffClass) + '" data-en="' + esc(m.difficulty) + '" data-es="' + esc(diffEs(m.difficulty)) + '">' + esc(m.difficulty) + '</span>' +
                                '<span class="badge">' + esc(m.category) + '</span>' +
                                '</div>' +
                                '<p class="ctf-card-summary" data-en="' + esc(summaryEn) + '" data-es="' + esc(summaryEs) + '">' + esc(summaryEn) + '</p>' +
                                '<div class="ctf-card-cta-row">' +
                                '<button type="button" class="ctf-card-open" data-open-challenge="' + esc(m.id) + '" data-en="Open challenge" data-es="Abrir reto">Open challenge</button>' +
                                '</div><div class="solve-status"></div>' +
                                '</div>' +
                                '</article>';
                        });
                        listContainer.insertAdjacentHTML(
                            'beforeend',
                            '<section class="ctf-cat-section">' +
                                '<header class="ctf-cat-section__head"><h3>' + esc(cat) + '</h3><span>' + rows.length + '</span></header>' +
                                '<div class="ctf-card-grid">' + cards + '</div>' +
                            '</section>'
                        );
                    });
                    renderCtfPager(filtered.length, ctfPage, totalPages);
                }

                listContainer.querySelectorAll('[data-open-challenge]').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        const id = btn.getAttribute('data-open-challenge');
                        openChallengeModal(challengeById.get(id));
                    });
                });

                listContainer.querySelectorAll('.ctf-card').forEach(function (card) {
                    card.addEventListener('click', function (e) {
                        if (e.target.closest('.ctf-card-open')) return;
                        const id = card.getAttribute('data-id');
                        openChallengeModal(challengeById.get(id));
                    });
                });

                const lang = localStorage.getItem('lang') || 'en';
                document.querySelectorAll('#ctf-list-container [data-en][data-es], #ctf-hub [data-en][data-es]').forEach(function (el) {
                    const t = el.getAttribute('data-' + lang);
                    if (t != null && t !== '') el.innerHTML = t;
                });
            }

            const clearBtn = document.getElementById('ctf-clear-filters');
            if (clearBtn) clearBtn.addEventListener('click', clearCtfFilters);

            if (searchInput) {
                searchInput.addEventListener('input', function (e) {
                    currentSearch = e.target.value.trim();
                    ctfPage = 1;
                    renderChallenges();
                });
            }

            diffButtons.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    diffButtons.forEach(function (b) { b.classList.remove('is-active'); });
                    btn.classList.add('is-active');
                    currentDifficulty = btn.getAttribute('data-diff') || 'all';
                    ctfPage = 1;
                    renderChallenges();
                });
            });

            (async function () {
                if (typeof window.bxfLoadFirstBloodsMap === 'function') {
                    try { await window.bxfLoadFirstBloodsMap(); } catch (e) { console.warn('first bloods map', e); }
                }
                await loadSolvedSet();
                renderChallenges();
            })();
        } catch (err) {
            const el = document.getElementById('ctf-list-container');
            if (el) el.innerHTML = '<div class="ctf-empty"><h3>CTF HUB ERROR</h3><p>' + esc(String(err)) + '</p></div>';
            console.error(err);
        }
    });
})();
