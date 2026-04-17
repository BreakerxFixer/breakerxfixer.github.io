/**
 * BXF — Centro de notificaciones (nav) + Realtime
 * Requiere: main.js (_sbClient), migración scratch/bxf_notifications_teams_migration.sql
 */
(function () {
    'use strict';

    let sb = null;
    let wrap = null;
    let panel = null;
    let listEl = null;
    let badge = null;
    let btn = null;
    let channel = null;
    let open = false;

    const esc = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    function lang() {
        return localStorage.getItem('lang') || 'es';
    }

    function fmtTime(iso) {
        const d = new Date(iso);
        return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    }

    async function countUnreadMessages() {
        if (!sb) return 0;
        const { data: { session } } = await sb.auth.getSession();
        if (!session) return 0;
        const { count, error } = await sb
            .from('messages')
            .select('id', { count: 'exact', head: true })
            .eq('receiver_id', session.user.id)
            .is('read_at', null);
        if (error) return 0;
        return count || 0;
    }

    async function fetchRpcNotifications() {
        if (!sb) return [];
        const { data, error } = await sb.rpc('get_my_notifications', { p_limit: 50 });
        if (error) return [];
        return data || [];
    }

    function injectBell() {
        if (document.getElementById('bxf-notify-wrap')) return;
        const profile = document.querySelector('.bxf-nav-profile');
        if (!profile) return;

        wrap = document.createElement('div');
        wrap.id = 'bxf-notify-wrap';
        wrap.className = 'bxf-notify-wrap';
        wrap.innerHTML = `
            <button type="button" class="bxf-notify-btn" id="bxf-notify-btn" aria-expanded="false" aria-haspopup="true" title="Notificaciones" aria-label="${lang() === 'es' ? 'Notificaciones' : 'Notifications'}">
                <span class="bxf-notify-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img" focusable="false">
                        <path d="M12 3a5 5 0 0 0-5 5v2.3c0 .63-.2 1.24-.58 1.74L4.4 14.7a1.1 1.1 0 0 0 .87 1.8h13.46a1.1 1.1 0 0 0 .87-1.8l-2.02-2.66A2.9 2.9 0 0 1 17 10.3V8a5 5 0 0 0-5-5Zm-2 15a2 2 0 1 0 4 0h-4Z"></path>
                    </svg>
                </span>
                <span class="bxf-notify-badge" id="bxf-notify-badge">0</span>
            </button>
            <div class="bxf-notify-panel" id="bxf-notify-panel" role="dialog" aria-label="Notificaciones">
                <div class="bxf-notify-panel-header">
                    <span data-en="NOTIFICATIONS" data-es="NOTIFICACIONES">NOTIFICACIONES</span>
                    <div class="bxf-notify-panel-actions">
                        <button type="button" class="bxf-notify-link" id="bxf-notify-mark-all">${lang() === 'es' ? 'Marcar leídas' : 'Mark read'}</button>
                    </div>
                </div>
                <div class="bxf-notify-list" id="bxf-notify-list"></div>
            </div>`;

        profile.insertBefore(wrap, profile.firstChild);
        btn = document.getElementById('bxf-notify-btn');
        panel = document.getElementById('bxf-notify-panel');
        listEl = document.getElementById('bxf-notify-list');
        badge = document.getElementById('bxf-notify-badge');

        if (typeof window.refreshBxfI18n === 'function') window.refreshBxfI18n();

        btn.addEventListener('click', (e) => {
            e.stopPropagation();
            togglePanel();
        });
        document.getElementById('bxf-notify-mark-all').addEventListener('click', (e) => {
            e.stopPropagation();
            markAllRead();
        });
        document.addEventListener('click', (e) => {
            if (wrap && !wrap.contains(e.target)) closePanel();
        });
    }

    function togglePanel() {
        open = !open;
        if (!panel || !btn) return;
        panel.classList.toggle('open', open);
        btn.setAttribute('aria-expanded', open ? 'true' : 'false');
        if (open) refresh();
    }

    function closePanel() {
        open = false;
        if (panel) panel.classList.remove('open');
        if (btn) btn.setAttribute('aria-expanded', 'false');
    }

    async function markAllRead() {
        if (!sb) return;
        const { error } = await sb.rpc('mark_all_notifications_read');
        if (error) await markFallbackRead();
        await refresh();
        window.dispatchEvent(new CustomEvent('bxf-notifications-updated'));
    }

    async function markFallbackRead() {
        const rows = await fetchRpcNotifications();
        const ids = rows.filter((r) => !r.read_at).map((r) => r.id);
        if (ids.length && sb) await sb.rpc('mark_notifications_read', { p_ids: ids });
    }

    async function markIdsRead(ids) {
        if (!sb || !ids.length) return;
        await sb.rpc('mark_notifications_read', { p_ids: ids });
    }

    function renderItem(n) {
        const unread = !n.read_at;
        const isSynth = n._synthetic;
        const typeLabel = {
            friend_request: 'Amistad',
            message: 'Mensajes',
            rank_up: 'Logro',
            team_invite: 'Equipo',
            team_event: 'Equipo',
            system: 'Sistema'
        };
        const tl = typeLabel[n.type] || n.type;
        const div = document.createElement('div');
        div.className = 'bxf-notify-item' + (unread ? ' unread' : '');
        div.dataset.id = n.id != null ? String(n.id) : '';

        let extra = '';
        if (n.type === 'team_invite' && n.payload && n.payload.invite_id && !isSynth) {
            const iid = n.payload.invite_id;
            extra = `
                <div class="bxf-notify-team-actions" onclick="event.stopPropagation()">
                    <button type="button" class="primary" data-action="team-accept" data-invite="${iid}">${lang() === 'es' ? 'Aceptar' : 'Accept'}</button>
                    <button type="button" class="danger" data-action="team-decline" data-invite="${iid}">${lang() === 'es' ? 'Rechazar' : 'Decline'}</button>
                </div>`;
        }

        div.innerHTML = `
            <div class="bxf-notify-type">${esc(tl)}</div>
            <div class="bxf-notify-item-title">${esc(n.title || '')}</div>
            <div class="bxf-notify-item-body">${esc(n.body || '')}</div>
            <div class="bxf-notify-item-meta">${n.created_at ? fmtTime(n.created_at) : ''}</div>
            ${extra}`;

        div.addEventListener('click', () => onItemClick(n));

        if (extra) {
            div.querySelectorAll('[data-action]').forEach((b) => {
                b.addEventListener('click', async (ev) => {
                    ev.stopPropagation();
                    const invite = parseInt(b.getAttribute('data-invite'), 10);
                    const accept = b.getAttribute('data-action') === 'team-accept';
                    const { data } = await sb.rpc('respond_team_invite', {
                        p_invite_id: invite,
                        p_accept: accept
                    });
                    if (data && data.ok) {
                        if (n.id) await markIdsRead([n.id]);
                        await refresh();
                        if (window._bxfRefreshClansPanel) window._bxfRefreshClansPanel();
                    }
                });
            });
        }

        return div;
    }

    async function onItemClick(n) {
        if (n.id && !n._synthetic) {
            try {
                await markIdsRead([n.id]);
                await refresh();
            } catch (_) {
                /* ignore */
            }
        }
        if (n._synthetic && n.type === 'message') {
            if (window._socialOpenChat && n.payload && n.payload.peer_id) {
                window._socialOpenChat(n.payload.peer_id);
            } else if (document.getElementById('social-toggle-btn')) {
                document.getElementById('social-toggle-btn').click();
            }
            closePanel();
            return;
        }
        if (n.type === 'friend_request') {
            if (window._socialFocusRequests) window._socialFocusRequests();
            else if (document.getElementById('social-toggle-btn')) {
                document.getElementById('social-toggle-btn').click();
            }
            closePanel();
            return;
        }
        if (n.type === 'rank_up' || n.type === 'system') {
            closePanel();
            return;
        }
        if (n.type === 'team_invite') {
            return;
        }
        closePanel();
    }

    async function refresh() {
        if (!listEl) return;
        const L = lang();
        listEl.innerHTML = `<div class="bxf-notify-empty">${L === 'es' ? 'Sincronizando…' : 'Syncing…'}</div>`;

        const rpcRows = await fetchRpcNotifications();
        const msgUnread = await countUnreadMessages();

        const synthetic = [];
        if (msgUnread > 0) {
            synthetic.push({
                id: null,
                type: 'message',
                title: L === 'es' ? 'Mensajes sin leer' : 'Unread messages',
                body: L === 'es'
                    ? `Tienes ${msgUnread} mensaje(s) pendiente(s) de leer.`
                    : `You have ${msgUnread} unread message(s).`,
                payload: {},
                read_at: null,
                created_at: new Date().toISOString(),
                _synthetic: true
            });
        }

        const merged = [...rpcRows.map((r) => ({ ...r, _synthetic: false })), ...synthetic].sort(
            (a, b) => new Date(b.created_at) - new Date(a.created_at)
        );

        if (merged.length === 0) {
            listEl.innerHTML = `<div class="bxf-notify-empty" data-en="No activity yet." data-es="Sin actividad reciente.">${L === 'es' ? 'Sin actividad reciente.' : 'No activity yet.'}</div>`;
        } else {
            listEl.innerHTML = '';
            merged.forEach((n) => listEl.appendChild(renderItem(n)));
        }

        const rpcUnread = rpcRows.filter((r) => !r.read_at).length;
        const total = rpcUnread + msgUnread;
        if (badge) {
            badge.textContent = total > 99 ? '99+' : String(total);
            badge.classList.toggle('visible', total > 0);
        }

        window.dispatchEvent(new CustomEvent('bxf-notifications-updated'));
    }

    function subscribeRealtime() {
        if (!sb || channel) return;
        sb.auth.getSession().then(({ data: { session } }) => {
            if (!session) return;
            channel = sb
                .channel(`bxf-notify-${session.user.id}`)
                .on(
                    'postgres_changes',
                    { event: 'INSERT', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${session.user.id}` },
                    () => refresh()
                )
                .on(
                    'postgres_changes',
                    { event: 'UPDATE', schema: 'public', table: 'user_notifications', filter: `user_id=eq.${session.user.id}` },
                    () => refresh()
                )
                .subscribe();
        });
    }

    window.initBxfNotifications = async function () {
        let attempts = 0;
        while (!window._sbClient && attempts < 40) {
            await new Promise((r) => setTimeout(r, 200));
            attempts++;
        }
        sb = window._sbClient;
        if (!sb) return;

        const { data: { session } } = await sb.auth.getSession();
        if (!session) return;

        injectBell();
        await refresh();
        subscribeRealtime();

        window.addEventListener('bxf-social-refresh', () => refresh());
    };

    window._bxfRefreshNotifications = refresh;

    window.addEventListener('bxf-social-refresh', () => {
        if (window._bxfRefreshNotifications) window._bxfRefreshNotifications();
    });
})();
