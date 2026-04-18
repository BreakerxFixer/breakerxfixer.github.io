(function () {
    const RANKS = [
        { name: 'SCRIPT_KIDDIE', min: 0, color: '#888' },
        { name: 'GHOST_USER', min: 100, color: '#00ffff' },
        { name: 'NETWORK_WANDERER', min: 500, color: '#7b2cbf' },
        { name: 'CYBER_ENTITY', min: 1500, color: '#f38ba8' },
        { name: 'DATA_BREACHER', min: 3000, color: '#ff8c00' },
        { name: 'VOID_WALKER', min: 6000, color: '#9ef01a' },
        { name: 'OMNISCIENT_BREAKER', min: 10000, color: '#ffffff' }
    ];

    function getRankInfo(pts) {
        let current = RANKS[0];
        for (let i = 0; i < RANKS.length; i++) {
            if (pts >= RANKS[i].min) {
                current = RANKS[i];
            } else break;
        }
        return current;
    }

    function esc(s) {
        const d = document.createElement('div');
        d.textContent = s == null ? '' : String(s);
        return d.innerHTML;
    }

    function fmtDate(iso) {
        if (!iso) return '—';
        try {
            return new Date(iso).toLocaleString();
        } catch (e) {
            return String(iso);
        }
    }

    function fmtShort(iso) {
        if (!iso) return '—';
        try {
            const d = new Date(iso);
            return d.toLocaleDateString(undefined, { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
        } catch (e) {
            return '—';
        }
    }

    function contestAvatarHtml(label) {
        const ch = String(label || '?').trim().slice(0, 1).toUpperCase() || '?';
        return '<span class="contest-lb-initial">' + esc(ch) + '</span>';
    }

    const CUP_SVG =
        '<svg class="podium-rank-cup-icon" viewBox="0 0 24 24" aria-hidden="true" focusable="false">' +
        '<path d="M18 4h2a1 1 0 0 1 1 1v2a5 5 0 0 1-5 5h-.12A6.002 6.002 0 0 1 13 15.91V18h3a1 1 0 0 1 0 2H8a1 1 0 0 1 0-2h3v-2.09A6.002 6.002 0 0 1 8.12 12H8a5 5 0 0 1-5-5V5a1 1 0 0 1 1-1h2V3a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v1Zm-2 0H8v2a4 4 0 1 0 8 0V4ZM6 6H5v1a3 3 0 0 0 3 3h.13A5.98 5.98 0 0 1 6 6Zm12 0a5.98 5.98 0 0 1-2.13 4H16a3 3 0 0 0 3-3V6h-1Z"></path>' +
        '</svg>';

    function paintContestPodium(podiumEl, rows, t) {
        if (!podiumEl) return;
        podiumEl.innerHTML = '';
        const top3 = rows.slice(0, 3);
        if (!top3.length) {
            podiumEl.style.display = 'none';
            return;
        }
        podiumEl.style.display = '';
        const classes = ['p2', 'p1', 'p3'];
        const visualOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

        visualOrder.forEach(function (row, vi) {
            const realIdx = top3.indexOf(row);
            const h = realIdx === 0 ? 300 : realIdx === 1 ? 262 : 236;
            const pts = Number(row.points) || 0;
            const rankInfo = getRankInfo(pts);
            const solves = row.solves != null ? Number(row.solves) : 0;
            const lastShort = fmtShort(row.last_solve_at);
            const card = document.createElement('div');
            card.className = 'podium-card ' + classes[vi];
            card.style.height = h + 'px';
            card.innerHTML =
                '<div class="podium-rank-badge" aria-label="rank ' + (realIdx + 1) + '">' +
                '<span class="podium-rank-cup" aria-hidden="true">' +
                CUP_SVG +
                '</span>' +
                '<span class="podium-rank-num">#' +
                (realIdx + 1) +
                '</span>' +
                '</div>' +
                '<div class="podium-avatar">' +
                contestAvatarHtml(row.label) +
                '</div>' +
                '<div class="podium-name">' +
                esc(row.label) +
                '</div>' +
                '<div class="podium-pts">' +
                pts.toLocaleString() +
                ' PTS</div>' +
                '<div class="podium-meta"><span class="podium-tier" style="color:' +
                rankInfo.color +
                '">' +
                esc(rankInfo.name) +
                '</span> · <span class="podium-momentum">⚡ ' +
                solves +
                '</span> · ' +
                esc(lastShort) +
                '</div>';
            podiumEl.appendChild(card);
        });
    }

    function paintContestTable(bodyEl, rows, t) {
        if (!bodyEl) return;
        bodyEl.innerHTML = '';
        const rest = rows.slice(3);
        const maxPts = rows[0] ? Math.max(1, Number(rows[0].points) || 1) : 1;

        if (!rest.length) {
            return;
        }

        rest.forEach(function (row, i) {
            const rank = i + 4;
            const pts = Number(row.points) || 0;
            const rankInfo = getRankInfo(pts);
            const solves = row.solves != null ? String(row.solves) : '—';
            const mo = '—';
            const pct = Math.round((pts / maxPts) * 100);
            const tr = document.createElement('tr');
            tr.innerHTML =
                '<td class="lb-rank">#' +
                rank +
                '</td>' +
                '<td>' +
                '<div class="lb-user">' +
                '<div class="lb-avatar-sm">' +
                contestAvatarHtml(row.label) +
                '</div>' +
                '<div class="lb-user__name"><span class="lb-username">' +
                esc(row.label) +
                '</span></div>' +
                '</div>' +
                '</td>' +
                '<td class="lb-tier-cell" style="color:' +
                rankInfo.color +
                '">' +
                esc(rankInfo.name) +
                '</td>' +
                '<td class="lb-score-cell">' +
                pts.toLocaleString() +
                '</td>' +
                '<td class="lb-flags-cell">' +
                esc(solves) +
                '</td>' +
                '<td class="lb-momo">' +
                esc(mo) +
                '</td>' +
                '<td class="lb-delta-cell"><span class="lb-delta lb-delta--eq">·</span></td>' +
                '<td class="lb-bar-cell">' +
                '<div class="lb-bar-bg"><div class="lb-bar-fill" style="width:' +
                pct +
                '%"></div></div>' +
                '</td>' +
                '<td class="lb-action"></td>';
            bodyEl.appendChild(tr);
        });
    }

    function waitForSupabase(cb, tries) {
        const n = tries || 0;
        if (window._sbClient) {
            cb(window._sbClient);
            return;
        }
        if (n > 120) return;
        setTimeout(function () { waitForSupabase(cb, n + 1); }, 50);
    }

    document.addEventListener('DOMContentLoaded', function () {
        waitForSupabase(async function (supabase) {
            const lang = localStorage.getItem('lang') || 'en';
            const t = function (es, en) { return lang === 'es' ? es : en; };
            const qp = new URLSearchParams(window.location.search);
            const idParam = qp.get('id');
            const slugParam = qp.get('slug');
            const titleEl = document.getElementById('contest-lb-title');
            const subEl = document.getElementById('contest-lb-sub');
            const bannerEl = document.getElementById('contest-lb-banner');
            const tbody = document.getElementById('contest-lb-body');
            const podiumEl = document.getElementById('contest-lb-podium');

            function setBanner(msg, isErr) {
                if (!bannerEl) return;
                bannerEl.textContent = msg || '';
                bannerEl.style.display = msg ? 'block' : 'none';
                bannerEl.classList.toggle('contest-lb-banner--err', !!isErr);
            }

            function emptyBody(msg) {
                if (!tbody) return;
                tbody.innerHTML =
                    '<tr><td colspan="9" class="contest-lb-empty">' + esc(msg) + '</td></tr>';
            }

            if (!titleEl || !subEl || !tbody) return;

            if (!idParam && !slugParam) {
                titleEl.textContent = t('Concurso no especificado', 'No contest specified');
                subEl.textContent = t('Falta ?id=… o ?slug=… en la URL.', 'Missing ?id=… or ?slug=… in the URL.');
                setBanner(t('Parámetro requerido.', 'Required parameter.'), true);
                if (podiumEl) podiumEl.style.display = 'none';
                emptyBody(t('Sin parámetro de concurso.', 'Missing contest parameter.'));
                return;
            }

            let contestId = idParam;
            let contestRow = null;

            if (!contestId && slugParam) {
                const { data: bySlug, error: errSlug } = await supabase
                    .from('contests')
                    .select('id,slug,title,description,mode,status,starts_at,ends_at')
                    .eq('slug', slugParam)
                    .maybeSingle();
                if (errSlug || !bySlug) {
                    titleEl.textContent = t('Concurso no encontrado', 'Contest not found');
                    subEl.textContent = '';
                    setBanner(esc(errSlug && errSlug.message ? errSlug.message : t('Sin datos.', 'No data.')), true);
                    if (podiumEl) podiumEl.style.display = 'none';
                    emptyBody(t('No hay concurso con ese slug.', 'No contest with that slug.'));
                    return;
                }
                contestRow = bySlug;
                contestId = bySlug.id;
            } else {
                const { data: byId, error: errId } = await supabase
                    .from('contests')
                    .select('id,slug,title,description,mode,status,starts_at,ends_at')
                    .eq('id', contestId)
                    .maybeSingle();
                if (errId || !byId) {
                    titleEl.textContent = t('Concurso no encontrado', 'Contest not found');
                    subEl.textContent = '';
                    setBanner(esc(errId && errId.message ? errId.message : t('Sin datos.', 'No data.')), true);
                    if (podiumEl) podiumEl.style.display = 'none';
                    emptyBody(t('Concurso no encontrado o sin acceso.', 'Contest not found or access denied.'));
                    return;
                }
                contestRow = byId;
            }

            titleEl.textContent = '🏆 ' + (contestRow.title || 'Contest');
            subEl.textContent =
                (contestRow.mode || 'solo') +
                ' · ' +
                (contestRow.status || '—') +
                ' · ' +
                fmtDate(contestRow.starts_at) +
                ' → ' +
                fmtDate(contestRow.ends_at);
            document.title = (contestRow.title || 'Contest') + ' – ' + t('Ranking', 'Ranking') + ' – BREAKER_X_FIXER';

            const { data: rows, error: lbErr } = await supabase.rpc('get_contest_leaderboard', {
                p_contest_id: contestId
            });
            if (lbErr) {
                setBanner(t('Error: ', 'Error: ') + (lbErr.message || ''), true);
                if (podiumEl) podiumEl.style.display = 'none';
                emptyBody(t('No se pudo cargar el ranking.', 'Could not load ranking.'));
                return;
            }
            setBanner('', false);

            const list = rows || [];
            if (!list.length) {
                if (podiumEl) podiumEl.style.display = 'none';
                emptyBody(t('Sin puntuaciones todavía.', 'No scores yet.'));
                return;
            }

            paintContestPodium(podiumEl, list, t);
            paintContestTable(tbody, list, t);
        });
    });
})();
