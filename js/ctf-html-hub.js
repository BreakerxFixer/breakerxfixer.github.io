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

    function getCategoryStarter(cat) {
        const c = String(cat || '').toLowerCase();
        if (c === 'crypto') {
            return {
                en: ['Identify cipher or encoding pattern first.', 'Search examples in CyberChef + Python snippets.', 'Validate partial output before full decrypt.'],
                es: ['Identifica primero el patrón de cifrado o encoding.', 'Busca ejemplos en CyberChef + snippets de Python.', 'Valida salidas parciales antes de descifrar completo.']
            };
        }
        if (c === 'pwn') {
            return {
                en: ['Run binary with checksec / strings / gdb basics.', 'Map input length and crash behavior first.', 'Use Python pwntools script for reproducible exploit.'],
                es: ['Analiza binario con checksec / strings / gdb básico.', 'Mapea longitud de entrada y patrón de crash.', 'Usa script de Python pwntools para exploit reproducible.']
            };
        }
        if (c === 'forensics') {
            return {
                en: ['List files and metadata first (file, exiftool, binwalk).', 'Extract artifacts step by step to isolated folder.', 'Timeline what changed and where secret may hide.'],
                es: ['Lista archivos y metadatos primero (file, exiftool, binwalk).', 'Extrae artefactos paso a paso en carpeta aislada.', 'Haz timeline de cambios y dónde podría estar el secreto.']
            };
        }
        if (c === 'osint') {
            return {
                en: ['Extract every keyword, date and handle from prompt.', 'Pivot with Google dorks and archived sources.', 'Cross-check identity clues before submitting.'],
                es: ['Extrae cada keyword, fecha y handle del enunciado.', 'Pivota con dorks de Google y fuentes archivadas.', 'Cruza pistas de identidad antes de enviar.']
            };
        }
        if (c === 'rev' || c === 'reversing') {
            return {
                en: ['Start with strings + basic static analysis.', 'Rename functions and constants incrementally.', 'Mirror logic in small Python script to verify output.'],
                es: ['Empieza con strings + análisis estático básico.', 'Renombra funciones y constantes por etapas.', 'Replica la lógica en script pequeño de Python para validar.']
            };
        }
        if (c === 'programming') {
            return {
                en: ['Parse input carefully and write tiny test cases.', 'Solve brute-force with pruning or hashing where possible.', 'Automate full solve in one script for repeatability.'],
                es: ['Parsea input con cuidado y crea casos de prueba pequeños.', 'Resuelve fuerza bruta con poda o hashing cuando aplique.', 'Automatiza la resolución completa en un script repetible.']
            };
        }
        return {
            en: ['Read prompt and tags twice before touching tools.', 'Break problem into 3 small verifiable steps.', 'Search exact error/message in Google and adapt solution.'],
            es: ['Lee enunciado y tags dos veces antes de tocar herramientas.', 'Divide el problema en 3 pasos pequeños verificables.', 'Busca error/mensaje exacto en Google y adapta la solución.']
        };
    }

    function getDifficultyExpectation(diff) {
        const d = String(diff || '').toLowerCase();
        if (d === 'easy') return { en: 'Expected time: 15-45 min with basic tooling.', es: 'Tiempo esperado: 15-45 min con tooling básico.' };
        if (d === 'medium') return { en: 'Expected time: 45-120 min, requires chaining clues.', es: 'Tiempo esperado: 45-120 min, requiere encadenar pistas.' };
        if (d === 'hard') return { en: 'Expected time: 2-6 h, requires deep debugging.', es: 'Tiempo esperado: 2-6 h, requiere depuración profunda.' };
        return { en: 'Expected time: long session, script and iterate.', es: 'Tiempo esperado: sesión larga, script y muchas iteraciones.' };
    }

    const WEB_GUIDE_BY_ID = {
        M01: {
            focusEn: 'Find the exposed ledger endpoint without authentication.',
            focusEs: 'Encuentra el endpoint del ledger expuesto sin autenticación.',
            stepsEn: [
                'Spider public routes and watch Network tab for JSON leaks.',
                'Inspect JS bundles for API paths like /manifest, /ledger, /drop.',
                'Replay the exact request in Caido/curl and extract key field values.'
            ],
            stepsEs: [
                'Recorre rutas públicas y vigila la pestaña Network para fugas JSON.',
                'Inspecciona bundles JS buscando paths tipo /manifest, /ledger, /drop.',
                'Repite la petición exacta en Caido/curl y extrae los campos clave.'
            ]
        },
        M02: {
            focusEn: 'Abuse stale session/cookie reuse to access protected route.',
            focusEs: 'Aprovecha reutilización de sesión/cookie caducada para ruta protegida.',
            stepsEn: [
                'Capture a valid and an invalid session response for comparison.',
                'Replay old cookie/token values and test expiration checks.',
                'Diff headers/body to identify bypass condition and recover target data.'
            ],
            stepsEs: [
                'Captura respuesta con sesión válida y no válida para comparar.',
                'Repite valores viejos de cookie/token y prueba checks de expiración.',
                'Compara headers/body para detectar bypass y recuperar datos objetivo.'
            ]
        },
        M03: {
            focusEn: 'Forge trusted internal header to impersonate privileged identity.',
            focusEs: 'Forja cabecera interna confiada para suplantar identidad privilegiada.',
            stepsEn: [
                'Identify upstream trust header (X-Forwarded-*, X-Internal-*, etc).',
                'Replay request adding one header at a time to isolate effect.',
                'Confirm role escalation from response fields and fetch hidden resource.'
            ],
            stepsEs: [
                'Identifica cabecera de confianza upstream (X-Forwarded-*, X-Internal-*).',
                'Repite petición añadiendo una cabecera cada vez para aislar efecto.',
                'Confirma escalada de rol en la respuesta y accede al recurso oculto.'
            ]
        },
        M04: {
            focusEn: 'Exploit time-based blind SQL behavior to infer secret data.',
            focusEs: 'Explota SQL ciego basado en tiempo para inferir datos secretos.',
            stepsEn: [
                'Measure baseline latency (10+ requests) before injection attempts.',
                'Use boolean/time probes (sleep delay) in a single parameter.',
                'Automate character-by-character extraction with a short script.'
            ],
            stepsEs: [
                'Mide latencia base (10+ peticiones) antes de inyectar.',
                'Usa probes boolean/time (sleep delay) en un parámetro.',
                'Automatiza extracción carácter por carácter con script corto.'
            ]
        },
        M05: {
            focusEn: 'Bypass path filter and read local/internal files via traversal.',
            focusEs: 'Bypassea filtro de rutas y lee ficheros locales/internos por traversal.',
            stepsEn: [
                'Test traversal payload variants (../, URL-encoded, double encoded).',
                'Probe harmless files first to validate read primitive.',
                'Pivot to config/secret files hinted by challenge description.'
            ],
            stepsEs: [
                'Prueba variantes de traversal (../, URL-encoded, doble encoded).',
                'Valida primero con ficheros inofensivos para confirmar lectura.',
                'Salta luego a config/secrets sugeridos por el enunciado.'
            ]
        },
        M06: {
            focusEn: 'Turn image fetch/proxy feature into SSRF for metadata access.',
            focusEs: 'Convierte fetch/proxy de imágenes en SSRF para acceder a metadatos.',
            stepsEn: [
                'Map accepted URL schemes/hosts and normalization behavior.',
                'Try localhost/internal ranges/metadata targets with bypass formats.',
                'Use response differences (status/body length/errors) as oracle.'
            ],
            stepsEs: [
                'Mapea esquemas/hosts aceptados y cómo normaliza URLs.',
                'Prueba localhost/rangos internos/metadatos con formatos bypass.',
                'Usa diferencias de estado/tamaño/error como oráculo.'
            ]
        },
        M07: {
            focusEn: 'Abuse JWT verification fallback (none/alg confusion).',
            focusEs: 'Abusa fallback de verificación JWT (none/confusión de algoritmo).',
            stepsEn: [
                'Decode token and inspect alg, kid and payload claims.',
                'Craft alternative token variant and replay protected request.',
                'Verify accepted token path and retrieve privileged challenge artifact.'
            ],
            stepsEs: [
                'Decodifica el token e inspecciona alg, kid y claims.',
                'Crea variante de token y reintenta petición protegida.',
                'Verifica qué token acepta y recupera el artefacto del reto.'
            ]
        },
        M08: {
            focusEn: 'Trigger race condition for duplicate credit/state transition.',
            focusEs: 'Dispara condición de carrera para crédito/estado duplicado.',
            stepsEn: [
                'Find action endpoint with non-atomic update semantics.',
                'Send parallel requests (same payload) with controlled timing.',
                'Check for duplicated side effects and capture proof response.'
            ],
            stepsEs: [
                'Encuentra endpoint de acción con update no atómico.',
                'Lanza peticiones paralelas (mismo payload) con timing controlado.',
                'Comprueba side effects duplicados y guarda respuesta prueba.'
            ]
        }
    };

    function inferWebGuide(m) {
        const byId = WEB_GUIDE_BY_ID[String(m.id || '').toUpperCase()];
        if (byId) return byId;
        const blob = (String(m.titleEN || '') + ' ' + String(m.titleES || '') + ' ' + String(m.descEN || '') + ' ' + String(m.descES || '')).toLowerCase();
        if (blob.includes('sql')) return WEB_GUIDE_BY_ID.M04;
        if (blob.includes('header')) return WEB_GUIDE_BY_ID.M03;
        if (blob.includes('token') || blob.includes('session') || blob.includes('cookie')) return WEB_GUIDE_BY_ID.M02;
        if (blob.includes('jwt') || blob.includes('signature')) return WEB_GUIDE_BY_ID.M07;
        if (blob.includes('path') || blob.includes('local file') || blob.includes('travers')) return WEB_GUIDE_BY_ID.M05;
        if (blob.includes('proxy') || blob.includes('ssrf') || blob.includes('metadata')) return WEB_GUIDE_BY_ID.M06;
        if (blob.includes('race') || blob.includes('queue')) return WEB_GUIDE_BY_ID.M08;
        return WEB_GUIDE_BY_ID.M01;
    }

    function buildEntryGuideHtml(m, lang) {
        const isEs = lang === 'es';
        const eta = getDifficultyExpectation(m.difficulty);
        if (String(m.category || '').toLowerCase() === 'web') {
            const g = inferWebGuide(m);
            const lines = (isEs ? g.stepsEs : g.stepsEn).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
            const title = isEs ? 'Ruta específica de este reto web' : 'Web challenge specific route';
            const focusLabel = isEs ? 'Objetivo técnico:' : 'Technical goal:';
            const etaTxt = isEs ? eta.es : eta.en;
            const toolNote = isEs
                ? 'Herramientas recomendadas: navegador + DevTools, Caido/Burp, curl y script corto.'
                : 'Recommended tools: browser + DevTools, Caido/Burp, curl and a short script.';
            return (
                '<section class="ctf-entry-guide">' +
                '<h4>' + esc(title) + '</h4>' +
                '<p class="ctf-entry-guide__eta">' + esc(etaTxt) + '</p>' +
                '<p class="ctf-entry-guide__focus"><strong>' + esc(focusLabel) + '</strong> ' + esc(isEs ? g.focusEs : g.focusEn) + '</p>' +
                '<ol>' + lines + '</ol>' +
                '<ul class="ctf-entry-guide__bullets"><li>' + esc(toolNote) + '</li></ul>' +
                '</section>'
            );
        }

        const steps = getCategoryStarter(m.category);
        const lines = (isEs ? steps.es : steps.en).map(function (s) { return '<li>' + esc(s) + '</li>'; }).join('');
        const etaTxt = isEs ? eta.es : eta.en;
        const title = isEs ? 'Guía entry-level (completable)' : 'Entry-level guide (completable)';
        const research = isEs
            ? 'Búscalo en Google con: categoría + técnica + error exacto.'
            : 'Google query style: category + technique + exact error message.';
        const cli = isEs
            ? 'Terminal base: curl, grep, strings, file, python3, jq.'
            : 'Terminal baseline: curl, grep, strings, file, python3, jq.';
        const validator = isEs
            ? 'Cuando tengas resultado, envía flag en formato bxf{...}.'
            : 'When you have result, submit flag in bxf{...} format.';
        return (
            '<section class="ctf-entry-guide">' +
            '<h4>' + esc(title) + '</h4>' +
            '<p class="ctf-entry-guide__eta">' + esc(etaTxt) + '</p>' +
            '<ol>' + lines + '</ol>' +
            '<ul class="ctf-entry-guide__bullets">' +
            '<li>' + esc(research) + '</li>' +
            '<li>' + esc(cli) + '</li>' +
            '<li>' + esc(validator) + '</li>' +
            '</ul>' +
            '</section>'
        );
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
                                '<div id="ctf-modal-guide"></div>' +
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
                    if (!overlay) return;
                    overlay.hidden = true;
                    overlay.style.display = 'none';
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
                document.getElementById('ctf-modal-guide').innerHTML = buildEntryGuideHtml(m, lang);

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
                overlay.style.display = 'flex';
                if (window.refreshBxfI18n) window.refreshBxfI18n();
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
