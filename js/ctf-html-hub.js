/**
 * Lista global de misiones en ctf.html (usa window.BXF_CTF_ALL_CHALLENGES).
 * Misma lógica que season0/season1: filtros, búsqueda (incl. ID), paginación.
 */
(function () {
    function diffEs(d) {
        return String(d)
            .replace('Easy', 'Fácil')
            .replace('Medium', 'Media')
            .replace('Hard', 'Difícil')
            .replace('Insane', 'Insane');
    }

    document.addEventListener('DOMContentLoaded', function () {
        try {
            const listContainer = document.getElementById('ctf-list-container');
            const searchInput = document.getElementById('ctfSearch');
            const catButtons = document.querySelectorAll('.cat-btn');
            const diffButtons = document.querySelectorAll('.ctf-diff-btn');

            if (!listContainer) return;

            const challenges = window.BXF_CTF_ALL_CHALLENGES;
            if (!Array.isArray(challenges) || challenges.length === 0) {
                listContainer.innerHTML =
                    '<li class="ctf-item" style="padding:24px;color:#f38ba8;font-family:monospace;">[!] BXF_CTF_ALL_CHALLENGES not loaded. Check js/bxf-ctf-all-challenges.js</li>';
                return;
            }

            let currentCategory = 'all';
            let currentDifficulty = 'all';
            let currentSearch = '';
            const CTF_PAGE_SIZE = 5;
            let ctfPage = 1;

            window.submitFlagSafe = function (id, btn) {
                if (typeof window.submitFlag === 'function') window.submitFlag(id, btn);
                else alert('submitFlag engine not fully loaded yet. Please wait a second.');
            };

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
                        ? 'Pág. ' + page + ' / ' + totalPages + ' · misiones ' + startN + '–' + endN + ' de ' + total
                        : 'Page ' + page + ' / ' + totalPages + ' · missions ' + startN + '–' + endN + ' of ' + total;
                nav.innerHTML =
                    '<button type="button" class="ctf-pager__btn" ' +
                    (prevDis ? 'disabled' : '') +
                    ' data-ctf-pager="-1" aria-label="' +
                    (lang === 'es' ? 'Anterior' : 'Previous') +
                    '">←</button>' +
                    '<span class="ctf-pager__meta">' +
                    meta +
                    '</span>' +
                    '<button type="button" class="ctf-pager__btn" ' +
                    (nextDis ? 'disabled' : '') +
                    ' data-ctf-pager="1" aria-label="' +
                    (lang === 'es' ? 'Siguiente' : 'Next') +
                    '">→</button>';
                nav.querySelectorAll('[data-ctf-pager]').forEach(function (btn) {
                    btn.addEventListener('click', function () {
                        const dir = parseInt(btn.getAttribute('data-ctf-pager'), 10);
                        ctfPage += dir;
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
                catButtons.forEach(function (b) {
                    b.classList.toggle('is-active', b.getAttribute('data-cat') === 'all');
                });
                diffButtons.forEach(function (b) {
                    b.classList.toggle('is-active', b.getAttribute('data-diff') === 'all');
                });
                renderChallenges();
            }

            function renderChallenges() {
                listContainer.innerHTML = '';
                const filtered = challenges.filter(function (c) {
                    const matchCat = currentCategory === 'all' || c.category.toLowerCase() === currentCategory;
                    const matchDiff =
                        currentDifficulty === 'all' || c.difficulty.toLowerCase() === currentDifficulty;
                    const term = currentSearch.trim().toLowerCase();
                    const ptsStr = String(c.points);
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
                        ptsStr.includes(term) ||
                        tags.some(function (t) {
                            return t.toLowerCase().includes(term);
                        });
                    return matchCat && matchDiff && matchSearch;
                });

                const totalPages = Math.max(1, Math.ceil(filtered.length / CTF_PAGE_SIZE));
                ctfPage = Math.min(totalPages, Math.max(1, ctfPage));
                const start = (ctfPage - 1) * CTF_PAGE_SIZE;
                const pageSlice = filtered.slice(start, start + CTF_PAGE_SIZE);

                if (filtered.length === 0) {
                    listContainer.innerHTML =
                        '<li class="ctf-item" style="cursor:default;border-style:dashed;">' +
                        '<div class="ctf-link" style="padding:24px;text-align:center;">' +
                        '<div class="ctf-title" data-en="No missions match your filters." data-es="Ninguna misión coincide con los filtros.">No missions match your filters.</div>' +
                        '<p style="margin-top:12px;font-size:0.85rem;color:var(--text-dim);" data-en="Clear search or set Category / Difficulty to «All»." data-es="Borra la búsqueda o pon Categoría / Dificultad en «Todas».">Clear search or set Category / Difficulty to «All».</p>' +
                        '</div></li>';
                    renderCtfPager(0, 1, 1);
                } else {
                    pageSlice.forEach(function (m) {
                        const tags = m.tags || [];
                        const tagsHtml = tags
                            .map(function (t) {
                                return (
                                    '<span class="badge" style="background-color:rgba(0, 255, 255, 0.1); color:#00ffff; border-color:rgba(0, 255, 255, 0.3);">#' +
                                    t +
                                    '</span>'
                                );
                            })
                            .join(' ');
                        let assetsHtml = '';
                        if (m.assets) {
                            assetsHtml =
                                '<div style="margin-top: 15px; font-size: 0.8rem; border-top: 1px dashed rgba(203, 166, 247, 0.35); padding-top: 10px;">' +
                                '<strong style="color: #00ff3c;">[📥] ASSETS:</strong><br>' +
                                m.assets
                                    .map(function (a) {
                                        return (
                                            '<a href="' +
                                            a.path +
                                            '" download class="asset-link" style="color:var(--accent); text-decoration:none; margin-right:10px;">> ' +
                                            a.name +
                                            '</a>'
                                        );
                                    })
                                    .join('') +
                                '</div>';
                        }
                        const fbLine = (function () {
                            const fb = window.__bxfFbMap && window.__bxfFbMap.get(m.id);
                            if (!fb) return '';
                            const u = String(fb.username || '—')
                                .replace(/&/g, '&amp;')
                                .replace(/</g, '&lt;');
                            return (
                                '<div class="ctf-first-blood has-fb"><span class="ctf-fb-badge">FIRST BLOOD</span><span class="ctf-fb-user">@' +
                                u +
                                '</span></div>'
                            );
                        })();

                        const q = function (s) {
                            return String(s).replace(/"/g, '&quot;');
                        };
                        const html =
                            '<li class="ctf-item" data-id="' +
                            m.id +
                            '" data-category="' +
                            m.category +
                            '" data-difficulty="' +
                            m.difficulty +
                            '">' +
                            '<div class="ctf-link">' +
                            '<div class="ctf-header">' +
                            '<div>' +
                            '<div class="ctf-title" data-en="' +
                            q(m.titleEN) +
                            '" data-es="' +
                            q(m.titleES) +
                            '">' +
                            m.titleEN +
                            '</div>' +
                            '<div style="margin-top:8px;display:flex;flex-wrap:wrap;gap:8px;align-items:center;">' +
                            '<span class="ctf-tag-pill">' +
                            m.category +
                            '</span>' +
                            '<span class="badge points-badge">' +
                            m.points +
                            ' PTS</span>' +
                            '<span class="badge ' +
                            m.diffClass +
                            '" data-en="' +
                            m.difficulty +
                            '" data-es="' +
                            diffEs(m.difficulty) +
                            '">' +
                            m.difficulty +
                            '</span>' +
                            '</div></div></div>' +
                            fbLine +
                            '<div class="mission-details-box" data-en="' +
                            q(m.descEN) +
                            '" data-es="' +
                            q(m.descES) +
                            '">' +
                            m.descEN +
                            '</div>' +
                            assetsHtml +
                            '<div class="ctf-footer" style="margin-top: 15px;">' +
                            tagsHtml +
                            '</div>' +
                            '<div class="flag-submission">' +
                            '<input type="text" placeholder="bxf{...}" class="flag-input">' +
                            '<button class="flag-submit-btn" onclick="window.submitFlagSafe(\'' +
                            m.id +
                            '\', this)">Validate</button>' +
                            '</div><div class="solve-status"></div></div></li>';

                        listContainer.insertAdjacentHTML('beforeend', html);
                    });
                    renderCtfPager(filtered.length, ctfPage, totalPages);
                }

                const lang = localStorage.getItem('lang') || 'en';
                document
                    .querySelectorAll('#ctf-list-container [data-en][data-es], #ctf-hub [data-en][data-es]')
                    .forEach(function (el) {
                        const t = el.getAttribute('data-' + lang);
                        if (t != null && t !== '') el.innerHTML = t;
                    });
            }

            const clearCtfBtn = document.getElementById('ctf-clear-filters');
            if (clearCtfBtn) clearCtfBtn.addEventListener('click', clearCtfFilters);

            if (searchInput) {
                searchInput.addEventListener('input', function (e) {
                    currentSearch = e.target.value.trim();
                    ctfPage = 1;
                    renderChallenges();
                });
            }

            catButtons.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    catButtons.forEach(function (b) {
                        b.classList.remove('is-active');
                    });
                    btn.classList.add('is-active');
                    currentCategory = btn.getAttribute('data-cat');
                    ctfPage = 1;
                    renderChallenges();
                });
            });

            diffButtons.forEach(function (btn) {
                btn.addEventListener('click', function () {
                    diffButtons.forEach(function (b) {
                        b.classList.remove('is-active');
                    });
                    btn.classList.add('is-active');
                    currentDifficulty = btn.getAttribute('data-diff');
                    ctfPage = 1;
                    renderChallenges();
                });
            });

            (async function () {
                if (typeof window.bxfLoadFirstBloodsMap === 'function') {
                    try {
                        await window.bxfLoadFirstBloodsMap();
                    } catch (e) {
                        console.warn('first bloods map', e);
                    }
                }
                renderChallenges();
            })();
        } catch (err) {
            const el = document.getElementById('ctf-list-container');
            if (el) {
                el.innerHTML =
                    '<li style="color:red;font-family:monospace;padding:20px;"><h1>CTF HUB ERROR</h1><p>' +
                    String(err) +
                    '</p></li>';
            }
            console.error(err);
        }
    });
})();
