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

    document.addEventListener('DOMContentLoaded', function () {
        waitForSupabase(async function (supabase) {
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

                const { data: ok, error: adminErr } = await supabase.rpc('is_admin', { p_uid: session.user.id });
                if (adminErr || !ok) {
                    if (authState) authState.textContent = 'Usuario autenticado sin permisos de admin.';
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
                    });
                });

                const seasonsList = document.getElementById('admin-seasons-list');
                const ctfList = document.getElementById('admin-ctf-list');
                const contestsList = document.getElementById('admin-contests-list');
                const contestChallengesList = document.getElementById('admin-contest-challenges-list');
                const writeupsList = document.getElementById('admin-writeups-list');
                const auditList = document.getElementById('admin-audit-list');
                const supportThreads = document.getElementById('admin-support-threads');
                const supportThreadView = document.getElementById('admin-support-thread-view');
                const supportReplyForm = document.getElementById('admin-support-reply-form');
                let supportMessages = [];
                let supportProfileMap = new Map();
                let activeSupportUserId = null;

                async function loadSeasons() {
                    const { data, error } = await supabase.from('seasons').select('*').order('id', { ascending: true });
                    if (error) {
                        seasonsList.innerHTML = '<div class="admin-row">Error cargando temporadas</div>';
                        return;
                    }
                    seasonsList.innerHTML = (data || []).map(function (s) {
                        return '<div class="admin-row"><div><strong>' + esc(s.id + ' · ' + s.name) + '</strong><div class="admin-row__meta">' + esc(s.description || '') + ' · ' + esc(s.is_active ? 'active' : 'inactive') + '</div></div></div>';
                    }).join('') || '<div class="admin-row">Sin temporadas</div>';
                }

                async function loadChallenges() {
                    const { data, error } = await supabase.from('challenges').select('id,title,category,difficulty,points,season_id').order('id', { ascending: true }).limit(120);
                    if (error) {
                        ctfList.innerHTML = '<div class="admin-row">Error cargando retos</div>';
                        return;
                    }
                    ctfList.innerHTML = (data || []).map(function (c) {
                        return '<div class="admin-row"><div><strong>' + esc(c.id + ' · ' + c.title) + '</strong><div class="admin-row__meta">' + esc(c.category + ' · ' + c.difficulty + ' · ' + c.points + ' pts · S' + c.season_id) + '</div></div></div>';
                    }).join('') || '<div class="admin-row">Sin retos</div>';
                }

                async function loadContests() {
                    const { data, error } = await supabase.from('contests').select('*').order('created_at', { ascending: false });
                    if (error) {
                        contestsList.innerHTML = '<div class="admin-row">Error cargando concursos</div>';
                        return;
                    }
                    contestsList.innerHTML = (data || []).map(function (c) {
                        return '<div class="admin-row"><div><strong>' + esc(c.title) + '</strong><div class="admin-row__meta">' + esc(c.slug + ' · ' + c.mode + ' · ' + c.status) + '</div></div><div class="admin-actions"><button data-fill-contest="' + esc(c.id) + '">Editar</button><button class="admin-danger" data-del-contest="' + esc(c.id) + '">Borrar</button></div></div>';
                    }).join('') || '<div class="admin-row">Sin concursos</div>';

                    contestsList.querySelectorAll('[data-fill-contest]').forEach(function (btn) {
                        btn.addEventListener('click', function () {
                            const id = btn.getAttribute('data-fill-contest');
                            const row = (data || []).find(function (x) { return x.id === id; });
                            if (!row) return;
                            document.getElementById('contest-id').value = row.id || '';
                            document.getElementById('contest-season-id').value = row.season_id == null ? '' : row.season_id;
                            document.getElementById('contest-slug').value = row.slug || '';
                            document.getElementById('contest-title').value = row.title || '';
                            document.getElementById('contest-description').value = row.description || '';
                            document.getElementById('contest-mode').value = row.mode || 'solo';
                            document.getElementById('contest-status').value = row.status || 'draft';
                            document.getElementById('contest-starts-at').value = row.starts_at ? String(row.starts_at).slice(0, 16) : '';
                            document.getElementById('contest-ends-at').value = row.ends_at ? String(row.ends_at).slice(0, 16) : '';
                            document.getElementById('contest-challenge-contest-id').value = row.id || '';
                            loadContestChallenges(row.id);
                        });
                    });

                    contestsList.querySelectorAll('[data-del-contest]').forEach(function (btn) {
                        btn.addEventListener('click', async function () {
                            const id = btn.getAttribute('data-del-contest');
                            if (!window.confirm('Eliminar concurso y sus retos dedicados?')) return;
                            const { data: out, error: err } = await supabase.rpc('admin_only_delete_contest', { p_contest_id: id });
                            if (err || !out || out.ok !== true) {
                                window.alert((err && err.message) || (out && out.error) || 'Error al borrar');
                                return;
                            }
                            loadContests();
                            contestChallengesList.innerHTML = '';
                        });
                    });
                }

                async function loadContestChallenges(contestId) {
                    if (!contestId) {
                        contestChallengesList.innerHTML = '<div class="admin-row">Selecciona concurso</div>';
                        return;
                    }
                    const { data, error } = await supabase.from('contest_challenges').select('id,contest_id,code,title,category,difficulty,points,position,is_enabled').eq('contest_id', contestId).order('position', { ascending: true });
                    if (error) {
                        contestChallengesList.innerHTML = '<div class="admin-row">Error cargando retos del concurso</div>';
                        return;
                    }
                    contestChallengesList.innerHTML = (data || []).map(function (c) {
                        return '<div class="admin-row"><div><strong>' + esc(c.code + ' · ' + c.title) + '</strong><div class="admin-row__meta">' + esc(c.category + ' · ' + c.difficulty + ' · ' + c.points + ' pts') + '</div></div><div class="admin-actions"><button data-fill-contest-ch="' + esc(c.id) + '">Editar</button></div></div>';
                    }).join('') || '<div class="admin-row">Sin retos dedicados</div>';

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
                        });
                    });
                }

                async function loadWriteupsModeration() {
                    const sel = 'id,title,slug,status,created_at,author_id,profiles(username)';
                    const { data, error } = await supabase.from('community_writeups').select(sel).order('created_at', { ascending: false }).limit(250);
                    if (error) {
                        writeupsList.innerHTML = '<div class="admin-row">Error cargando writeups</div>';
                        return;
                    }

                    writeupsList.innerHTML = (data || []).map(function (w) {
                        const un = w.profiles && w.profiles.username ? w.profiles.username : 'unknown';
                        return '<div class="admin-row"><div><strong>' + esc(w.title) + '</strong><div class="admin-row__meta">' + esc(un + ' · ' + w.status + ' · ' + String(w.created_at || '').slice(0, 10)) + '</div></div><div class="admin-actions"><button data-w-act="approved" data-w-id="' + esc(w.id) + '">Aprobar</button><button data-w-act="rejected" data-w-id="' + esc(w.id) + '">Rechazar</button><button data-w-act="hidden" data-w-id="' + esc(w.id) + '">Ocultar</button><button class="admin-danger" data-w-del="' + esc(w.id) + '">Borrar</button></div></div>';
                    }).join('') || '<div class="admin-row">Sin writeups</div>';

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
                        return;
                    }
                    const rows = supportMessages
                        .filter(function (m) {
                            return m.sender_id === activeSupportUserId || m.receiver_id === activeSupportUserId;
                        })
                        .sort(function (a, b) {
                            return String(a.created_at).localeCompare(String(b.created_at));
                        });
                    if (!rows.length) {
                        supportThreadView.innerHTML = '<div class="admin-row">Sin mensajes todavía</div>';
                    } else {
                        supportThreadView.innerHTML = rows.map(function (m) {
                            const mine = m.sender_id === session.user.id;
                            const who = mine ? 'Admin' : (supportProfileMap.get(m.sender_id) || m.sender_id);
                            return '<div class="admin-row"><div><strong>' + esc(who) + '</strong><div class="admin-row__meta">' + esc(m.content || '') + '</div><div class="admin-row__meta">' + esc(String(m.created_at || '').replace('T', ' ').slice(0, 19)) + '</div></div></div>';
                        }).join('');
                    }
                    const targetInput = document.getElementById('admin-support-target');
                    if (targetInput) targetInput.value = activeSupportUserId;
                }

                async function loadSupportInbox() {
                    const { data, error } = await supabase
                        .from('messages')
                        .select('id,sender_id,receiver_id,content,created_at,read_at')
                        .or('receiver_id.eq.' + session.user.id + ',sender_id.eq.' + session.user.id)
                        .order('created_at', { ascending: false })
                        .limit(500);
                    if (error) {
                        supportThreads.innerHTML = '<div class="admin-row">Error cargando soporte</div>';
                        return;
                    }
                    supportMessages = data || [];
                    const peerSet = new Set();
                    supportMessages.forEach(function (m) {
                        const other = m.sender_id === session.user.id ? m.receiver_id : m.sender_id;
                        if (other && other !== session.user.id) peerSet.add(other);
                    });
                    const peers = Array.from(peerSet);
                    supportProfileMap = new Map();
                    if (peers.length) {
                        const { data: profs } = await supabase.from('profiles').select('id,username').in('id', peers);
                        (profs || []).forEach(function (p) { supportProfileMap.set(p.id, p.username); });
                    }

                    const byPeer = new Map();
                    supportMessages.forEach(function (m) {
                        const other = m.sender_id === session.user.id ? m.receiver_id : m.sender_id;
                        if (!other || other === session.user.id) return;
                        if (!byPeer.has(other)) byPeer.set(other, m);
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

                document.getElementById('admin-season-form').addEventListener('submit', async function (e) {
                    e.preventDefault();
                    const payload = {
                        p_id: (() => { const v = document.getElementById('season-id').value.trim(); return v ? parseInt(v, 10) : null; })(),
                        p_name: document.getElementById('season-name').value.trim(),
                        p_description: document.getElementById('season-description').value.trim() || null,
                        p_is_active: document.getElementById('season-active').checked
                    };
                    const { data: out, error } = await supabase.rpc('admin_only_upsert_season', payload);
                    if (error || !out || out.ok !== true) {
                        window.alert((error && error.message) || (out && out.error) || 'Error guardando temporada');
                        return;
                    }
                    this.reset();
                    loadSeasons();
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
                        p_desc_es: document.getElementById('ctf-desc-es').value.trim() || null
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
                    const { data: out, error } = await supabase.rpc('send_message', {
                        p_receiver_id: target,
                        p_content: reply
                    });
                    if (error || !out || !out.ok) {
                        window.alert((error && error.message) || (out && out.hint) || 'Error enviando respuesta');
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
