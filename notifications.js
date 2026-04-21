/**
 * BXF — Centro de notificaciones (nav) + Realtime
 * Cualquier usuario autenticado (incl. beta / admins): misma campana y panel.
 * Clic = seleccionar/deseleccionar (multi). Doble clic (2.º clic) = abrir contexto (chat, etc.).
 * Sin selección: archivar / leído / papelera aplican a TODAS.
 * Con selección: aplican solo a las filas seleccionadas.
 * Requiere: main.js (_sbClient). Opcional: scratch/bxf_notifications_archive_delete.sql
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
    /** 'inbox' | 'archive' */
    let listMode = 'inbox';

    /** Claves: id numérico como string, o "__synth__" para el aviso de DMs */
    const selectedKeys = new Set();

    const LS_DELETED = 'bxf_notify_deleted_ids';
    const LS_ARCHIVED = 'bxf_notify_archived_ids';
    const SEEN_IDS_KEY = 'bxf_notify_seen_ids';

    const esc = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    function lang() {
        return localStorage.getItem('lang') || 'es';
    }

    function rowKey(n) {
        if (n._synthetic) return '__synth__';
        return n.id != null ? String(n.id) : '';
    }

    function loadIdSet(key) {
        try {
            const j = JSON.parse(localStorage.getItem(key) || '[]');
            return new Set(Array.isArray(j) ? j.map(String) : []);
        } catch (_) {
            return new Set();
        }
    }

    function saveIdSet(key, set) {
        try {
            localStorage.setItem(key, JSON.stringify([...set]));
        } catch (_) { /* ignore */ }
    }

    function markSeenLocal(id) {
        if (id == null || id === '') return;
        try {
            const a = JSON.parse(sessionStorage.getItem(SEEN_IDS_KEY) || '[]');
            const s = new Set(Array.isArray(a) ? a.map(String) : []);
            s.add(String(id));
            sessionStorage.setItem(SEEN_IDS_KEY, JSON.stringify([...s]));
        } catch (_) { /* ignore */ }
    }

    function isSeenLocal(id) {
        if (id == null) return false;
        try {
            const a = JSON.parse(sessionStorage.getItem(SEEN_IDS_KEY) || '[]');
            return Array.isArray(a) && a.map(String).includes(String(id));
        } catch (_) {
            return false;
        }
    }

    function isSynthSeenLocal() {
        try {
            return sessionStorage.getItem('bxf_notify_synth_seen') === '1';
        } catch (_) {
            return false;
        }
    }

    function markSynthSeenLocal() {
        try {
            sessionStorage.setItem('bxf_notify_synth_seen', '1');
        } catch (_) { /* ignore */ }
    }

    function fmtTime(iso) {
        const d = new Date(iso);
        return d.toLocaleString([], { dateStyle: 'short', timeStyle: 'short' });
    }

    /** Títulos/cuerpos bilingües guardados en payload (p. ej. report_resolved). */
    function notificationTitleBody(n) {
        const L = lang();
        if (n.type === 'report_resolved' && n.payload && typeof n.payload === 'object') {
            const p = n.payload;
            if (L === 'es' && (p.title_es || p.body_es != null)) {
                return { title: p.title_es || n.title || '', body: p.body_es != null ? p.body_es : (n.body || '') };
            }
            if (L !== 'es' && (p.title_en || p.body_en != null)) {
                return { title: p.title_en || n.title || '', body: p.body_en != null ? p.body_en : (n.body || '') };
            }
        }
        return { title: n.title || '', body: n.body || '' };
    }

    function clearSelection() {
        selectedKeys.clear();
        if (listEl) {
            listEl.querySelectorAll('.bxf-notify-swipe-front.is-selected').forEach((el) => {
                el.classList.remove('is-selected');
            });
        }
        syncToolbarTitles();
    }

    function syncToolbarTitles() {
        const L = lang();
        const nSel = selectedKeys.size;
        const bulk = nSel === 0;

        const setBtn = (id, titleBulkEs, titleBulkEn, titleSelEs, titleSelEn) => {
            const el = document.getElementById(id);
            if (!el) return;
            if (bulk) {
                el.title = L === 'es' ? titleBulkEs : titleBulkEn;
                el.setAttribute('aria-label', el.title);
            } else {
                const t = L === 'es'
                    ? titleSelEs.replace('%n%', String(nSel))
                    : titleSelEn.replace('%n%', String(nSel));
                el.title = t;
                el.setAttribute('aria-label', t);
            }
        };

        if (listMode === 'archive') {
            setBtn(
                'bxf-notify-archive-all',
                'Devolver todas a la bandeja',
                'Restore all to inbox',
                'Devolver %n% a la bandeja',
                'Restore %n% to inbox'
            );
        } else {
            setBtn(
                'bxf-notify-archive-all',
                'Archivar todas las notificaciones',
                'Archive all notifications',
                'Archivar %n% seleccionada(s)',
                'Archive %n% selected'
            );
        }
        setBtn(
            'bxf-notify-mark-all',
            'Marcar todas como leídas',
            'Mark all as read',
            'Marcar %n% como leída(s)',
            'Mark %n% selected as read'
        );
        setBtn(
            'bxf-notify-delete-all',
            'Eliminar todas las notificaciones',
            'Delete all notifications',
            'Eliminar %n% seleccionada(s)',
            'Delete %n% selected'
        );
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

    async function fetchRpcArchivedNotifications() {
        if (!sb) return [];
        const { data, error } = await sb.rpc('get_my_archived_notifications', { p_limit: 50 });
        if (error) return [];
        return data || [];
    }

    function applyBadgeTotal(total) {
        if (!badge) return;
        const t = Math.max(0, Math.floor(Number(total)) || 0);
        badge.textContent = t > 99 ? '99+' : String(t);
        badge.classList.toggle('visible', t > 0);
    }

    /**
     * Bandeja: contador = no leídas en lista + DMs sin leer solo si se muestra la tarjeta sintética.
     * Así no queda un "1" en la campana con lista vacía tras descartar el aviso de DMs.
     */
    async function buildInboxSnapshot() {
        const delSet = loadIdSet(LS_DELETED);
        const archSet = loadIdSet(LS_ARCHIVED);
        const rawRows = await fetchRpcNotifications();
        const rpcRows = rawRows.filter(
            (r) => !delSet.has(String(r.id)) && !archSet.has(String(r.id))
        );
        const msgUnread = await countUnreadMessages();
        if (msgUnread === 0) {
            try {
                sessionStorage.removeItem('bxf_notify_synth_archived');
                sessionStorage.removeItem('bxf_notify_synth_dismissed');
                sessionStorage.removeItem('bxf_notify_synth_seen');
            } catch (_) { /* */ }
        }

        let synthDismissed = false;
        let synthArchived = false;
        try {
            synthDismissed = sessionStorage.getItem('bxf_notify_synth_dismissed') === '1';
            synthArchived = sessionStorage.getItem('bxf_notify_synth_archived') === '1';
        } catch (_) { /* */ }

        const L = lang();
        const synthetic = [];
        if (msgUnread > 0 && !synthDismissed && !synthArchived) {
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

        const rpcUnread = rpcRows.filter((r) => !r.read_at).length;
        const synthVisible = msgUnread > 0 && !synthDismissed && !synthArchived;
        const badgeTotal = rpcUnread + (synthVisible ? msgUnread : 0);

        return { merged, badgeTotal, rpcRows };
    }

    function syncTabStyles() {
        const ti = document.getElementById('bxf-notify-tab-inbox');
        const ta = document.getElementById('bxf-notify-tab-archive');
        if (!ti || !ta) return;
        const inbox = listMode === 'inbox';
        ti.classList.toggle('is-active', inbox);
        ti.setAttribute('aria-selected', inbox ? 'true' : 'false');
        ta.classList.toggle('is-active', !inbox);
        ta.setAttribute('aria-selected', inbox ? 'false' : 'true');
    }

    function syncHintForMode(L) {
        const hint = document.getElementById('bxf-notify-panel-hint');
        if (!hint) return;
        if (listMode === 'archive') {
            hint.setAttribute('data-en', 'Archived items live here — restore to move them back to the inbox.');
            hint.setAttribute('data-es', 'Las archivadas están aquí — Restaurar las devuelve a la bandeja.');
            hint.textContent = L === 'es'
                ? 'Las archivadas están aquí — Restaurar las devuelve a la bandeja.'
                : 'Archived items live here — restore to move them back to the inbox.';
        } else {
            hint.setAttribute('data-en', 'Click to select · Double-click to open');
            hint.setAttribute('data-es', 'Clic para seleccionar · Doble clic para abrir');
            hint.textContent = L === 'es'
                ? 'Clic para seleccionar · Doble clic para abrir'
                : 'Click to select · Double-click to open';
        }
    }

    async function unarchiveIds(ids) {
        if (!sb || !ids.length) return;
        const { error } = await sb.rpc('unarchive_my_notifications', { p_ids: ids });
        if (error) {
            const archSet = loadIdSet(LS_ARCHIVED);
            ids.forEach((id) => archSet.delete(String(id)));
            saveIdSet(LS_ARCHIVED, archSet);
        }
    }

    async function toolbarUnarchive() {
        if (!sb) return;
        const L = lang();
        if (selectedKeys.size === 0) {
            const ok = window.confirm(
                L === 'es'
                    ? '¿Devolver todas las archivadas a la bandeja?'
                    : 'Restore all archived notifications to the inbox?'
            );
            if (!ok) return;
            const { error } = await sb.rpc('unarchive_all_my_notifications');
            if (error) {
                const rows = await fetchRpcArchivedNotifications();
                const delSet = loadIdSet(LS_DELETED);
                const ids = rows.filter((r) => !delSet.has(String(r.id))).map((r) => r.id).filter((x) => x != null);
                if (ids.length) await unarchiveIds(ids);
            }
        } else {
            const numIds = [...selectedKeys]
                .filter((k) => k !== '__synth__')
                .map((k) => parseInt(k, 10))
                .filter((x) => !Number.isNaN(x));
            if (numIds.length) await unarchiveIds(numIds);
        }
        clearSelection();
        await refresh();
        window.dispatchEvent(new CustomEvent('bxf-notifications-updated'));
    }

    async function markAllMyDmMessagesRead() {
        if (!sb) return;
        const { error: dmErr } = await sb.rpc('mark_all_my_dm_messages_read');
        if (dmErr) {
            const { data: { session } } = await sb.auth.getSession();
            if (session?.user?.id) {
                await sb
                    .from('messages')
                    .update({ read_at: new Date().toISOString() })
                    .eq('receiver_id', session.user.id)
                    .is('read_at', null);
            }
        }
    }

    function iconArchive() {
        return '<svg class="bxf-notify-tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M20.54 5.23l-1.39-1.68C18.88 3.21 18.47 3 18 3H6c-.47 0-.88.21-1.16.55L3.46 5.23C3.17 5.57 3 6.02 3 6.5V19c0 1.1.9 2 2 2h14c1.1 0 2-.9 2-2V6.5c0-.48-.17-.93-.46-1.27zM12 17.5c-.83 0-1.5-.67-1.5-1.5s.67-1.5 1.5-1.5 1.5.67 1.5 1.5-.67 1.5-1.5 1.5zM5 8l4.5 4.5L12 9l2.5 3.5L19 8H5z"/></svg>';
    }

    function iconDoubleCheck() {
        return '<svg class="bxf-notify-tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M18 7l-1.41-1.41-6.34 6.34 1.41 1.41L18 7zm4.24-1.41L11.66 16.17 7.48 12l-1.41 1.41L11.66 19l12-12-1.42-1.41zM.41 13.41L6 19l1.41-1.41L1.83 12 .41 13.41z"/></svg>';
    }

    function iconTrash() {
        return '<svg class="bxf-notify-tool-icon" viewBox="0 0 24 24" aria-hidden="true"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    }

    function iconSwipeTrash() {
        return '<svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true"><path fill="currentColor" d="M6 19a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2V7H6v12zM19 4h-3.5l-1-1h-5l-1 1H5v2h14V4z"/></svg>';
    }

    function iconSeenTick() {
        return '<svg class="bxf-notify-seen-tick" viewBox="0 0 24 24" width="12" height="12" aria-hidden="true"><path fill="currentColor" d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41L9 16.17z"/></svg>';
    }

    function injectBell() {
        if (document.getElementById('bxf-notify-wrap')) return;
        const profile = document.querySelector('.bxf-nav-profile');
        if (!profile) return;

        const L = lang();

        wrap = document.createElement('div');
        wrap.id = 'bxf-notify-wrap';
        wrap.className = 'bxf-notify-wrap';
        wrap.innerHTML = `
            <button type="button" class="bxf-notify-btn" id="bxf-notify-btn" aria-expanded="false" aria-haspopup="true" title="Notificaciones" aria-label="${L === 'es' ? 'Notificaciones' : 'Notifications'}">
                <span class="bxf-notify-icon" aria-hidden="true">
                    <svg viewBox="0 0 24 24" role="img" focusable="false">
                        <path d="M12 3a5 5 0 0 0-5 5v2.3c0 .63-.2 1.24-.58 1.74L4.4 14.7a1.1 1.1 0 0 0 .87 1.8h13.46a1.1 1.1 0 0 0 .87-1.8l-2.02-2.66A2.9 2.9 0 0 1 17 10.3V8a5 5 0 0 0-5-5Zm-2 15a2 2 0 1 0 4 0h-4Z"></path>
                    </svg>
                </span>
                <span class="bxf-notify-badge" id="bxf-notify-badge">0</span>
            </button>
            <div class="bxf-notify-panel" id="bxf-notify-panel" role="dialog" aria-label="Notificaciones">
                <div class="bxf-notify-panel-header">
                    <div class="bxf-notify-panel-headtext">
                        <span data-en="NOTIFICATIONS" data-es="NOTIFICACIONES">NOTIFICACIONES</span>
                        <div id="bxf-notify-panel-hint" class="bxf-notify-panel-hint" data-en="Click to select · Double-click to open" data-es="Clic para seleccionar · Doble clic para abrir">${L === 'es' ? 'Clic para seleccionar · Doble clic para abrir' : 'Click to select · Double-click to open'}</div>
                    </div>
                    <div class="bxf-notify-panel-actions">
                        <button type="button" class="bxf-notify-tool" id="bxf-notify-archive-all">${iconArchive()}</button>
                        <button type="button" class="bxf-notify-tool" id="bxf-notify-mark-all">${iconDoubleCheck()}</button>
                        <button type="button" class="bxf-notify-tool bxf-notify-tool--danger" id="bxf-notify-delete-all">${iconTrash()}</button>
                    </div>
                </div>
                <div class="bxf-notify-tabs" role="tablist" aria-label="${L === 'es' ? 'Vista de notificaciones' : 'Notification views'}">
                    <button type="button" role="tab" class="bxf-notify-tab is-active" id="bxf-notify-tab-inbox" data-mode="inbox" aria-selected="true">
                        <span data-en="Inbox" data-es="Bandeja">Bandeja</span>
                    </button>
                    <button type="button" role="tab" class="bxf-notify-tab" id="bxf-notify-tab-archive" data-mode="archive" aria-selected="false">
                        <span data-en="Archive" data-es="Archivo">Archivo</span>
                    </button>
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
            toolbarMarkRead();
        });
        document.getElementById('bxf-notify-archive-all').addEventListener('click', (e) => {
            e.stopPropagation();
            toolbarArchive();
        });
        document.getElementById('bxf-notify-delete-all').addEventListener('click', (e) => {
            e.stopPropagation();
            toolbarDelete();
        });
        document.addEventListener('click', (e) => {
            if (wrap && !wrap.contains(e.target)) closePanel();
        });
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape' && open) clearSelection();
        });
        document.getElementById('bxf-notify-tab-inbox').addEventListener('click', (e) => {
            e.stopPropagation();
            if (listMode === 'inbox') return;
            listMode = 'inbox';
            clearSelection();
            void refresh();
        });
        document.getElementById('bxf-notify-tab-archive').addEventListener('click', (e) => {
            e.stopPropagation();
            if (listMode === 'archive') return;
            listMode = 'archive';
            clearSelection();
            void refresh();
        });
        syncToolbarTitles();
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

    async function markFallbackReadAll() {
        const delSet = loadIdSet(LS_DELETED);
        const archSet = loadIdSet(LS_ARCHIVED);
        const rows = (await fetchRpcNotifications()).filter(
            (r) => !delSet.has(String(r.id)) && !archSet.has(String(r.id))
        );
        const ids = rows.filter((r) => !r.read_at).map((r) => r.id);
        if (ids.length && sb) await sb.rpc('mark_notifications_read', { p_ids: ids });
    }

    async function markIdsRead(ids) {
        if (!sb || !ids.length) return;
        await sb.rpc('mark_notifications_read', { p_ids: ids });
    }

    /** Sin selección: todas. Con selección: solo las elegidas (+ sintética → marcar DMs si aplica). */
    async function toolbarMarkRead() {
        if (!sb) return;
        if (selectedKeys.size === 0) {
            const { error } = await sb.rpc('mark_all_notifications_read');
            if (error) await markFallbackReadAll();
            await markAllMyDmMessagesRead();
            try { sessionStorage.removeItem('bxf_notify_synth_dismissed'); } catch (_) { /* */ }
        } else {
            const numIds = [...selectedKeys]
                .filter((k) => k !== '__synth__')
                .map((k) => parseInt(k, 10))
                .filter((x) => !Number.isNaN(x));
            if (numIds.length) await markIdsRead(numIds);
            if (selectedKeys.has('__synth__')) await markAllMyDmMessagesRead();
        }
        clearSelection();
        await refresh();
        window.dispatchEvent(new CustomEvent('bxf-notifications-updated'));
    }

    async function archiveRpcAll() {
        if (!sb) return;
        const { error } = await sb.rpc('archive_all_my_notifications');
        if (error) {
            const raw = await fetchRpcNotifications();
            const delSet = loadIdSet(LS_DELETED);
            const archSet = loadIdSet(LS_ARCHIVED);
            const rows = raw.filter((r) => !delSet.has(String(r.id)) && !archSet.has(String(r.id)));
            const ids = rows.map((r) => r.id).filter((id) => id != null);
            if (ids.length) {
                const { error: e2 } = await sb.rpc('archive_my_notifications', { p_ids: ids });
                if (e2) ids.forEach((id) => archSet.add(String(id)));
                saveIdSet(LS_ARCHIVED, archSet);
            }
        }
    }

    async function archiveRpcIds(ids) {
        if (!sb || !ids.length) return;
        const { error } = await sb.rpc('archive_my_notifications', { p_ids: ids });
        if (error) {
            const archSet = loadIdSet(LS_ARCHIVED);
            ids.forEach((id) => archSet.add(String(id)));
            saveIdSet(LS_ARCHIVED, archSet);
        }
    }

    async function toolbarArchive() {
        if (!sb) return;
        if (listMode === 'archive') {
            await toolbarUnarchive();
            return;
        }
        if (selectedKeys.size === 0) {
            await archiveRpcAll();
        } else {
            const numIds = [...selectedKeys]
                .filter((k) => k !== '__synth__')
                .map((k) => parseInt(k, 10))
                .filter((x) => !Number.isNaN(x));
            if (numIds.length) await archiveRpcIds(numIds);
            if (selectedKeys.has('__synth__')) {
                try { sessionStorage.setItem('bxf_notify_synth_archived', '1'); } catch (_) { /* */ }
            }
        }
        clearSelection();
        await refresh();
        window.dispatchEvent(new CustomEvent('bxf-notifications-updated'));
    }

    async function deleteRpcAll() {
        if (!sb) return;
        const { error } = await sb.rpc('delete_all_my_notifications');
        if (error) {
            const raw = await fetchRpcNotifications();
            const s = loadIdSet(LS_DELETED);
            raw.forEach((r) => {
                if (r.id != null) s.add(String(r.id));
            });
            saveIdSet(LS_DELETED, s);
        } else {
            try {
                localStorage.removeItem(LS_DELETED);
                localStorage.removeItem(LS_ARCHIVED);
            } catch (_) { /* */ }
        }
    }

    async function deleteRpcIds(ids) {
        if (!sb || !ids.length) return;
        const { error } = await sb.rpc('delete_my_notifications', { p_ids: ids });
        if (error) {
            const s = loadIdSet(LS_DELETED);
            ids.forEach((id) => s.add(String(id)));
            saveIdSet(LS_DELETED, s);
        }
    }

    async function toolbarDelete() {
        const L = lang();
        if (!sb) return;

        if (selectedKeys.size === 0) {
            const ok = window.confirm(
                L === 'es'
                    ? '¿Eliminar todas las notificaciones? Esta acción no se puede deshacer.'
                    : 'Delete all notifications? This cannot be undone.'
            );
            if (!ok) return;
            await deleteRpcAll();
            try { sessionStorage.removeItem('bxf_notify_synth_dismissed'); } catch (_) { /* */ }
        } else {
            const n = selectedKeys.size;
            const ok = window.confirm(
                L === 'es'
                    ? `¿Eliminar ${n} notificación(es) seleccionada(s)?`
                    : `Delete ${n} selected notification(s)?`
            );
            if (!ok) return;
            const numIds = [...selectedKeys]
                .filter((k) => k !== '__synth__')
                .map((k) => parseInt(k, 10))
                .filter((x) => !Number.isNaN(x));
            if (numIds.length) await deleteRpcIds(numIds);
            if (selectedKeys.has('__synth__')) {
                try { sessionStorage.setItem('bxf_notify_synth_dismissed', '1'); } catch (_) { /* */ }
            }
        }
        clearSelection();
        await refresh();
        window.dispatchEvent(new CustomEvent('bxf-notifications-updated'));
    }

    async function deleteOneNotification(n) {
        selectedKeys.delete(rowKey(n));
        if (n._synthetic) {
            try { sessionStorage.setItem('bxf_notify_synth_dismissed', '1'); } catch (_) { /* */ }
            await refresh();
            syncToolbarTitles();
            return;
        }
        if (!sb || !n.id) return;
        const { error } = await sb.rpc('delete_my_notifications', { p_ids: [n.id] });
        if (error) {
            const s = loadIdSet(LS_DELETED);
            s.add(String(n.id));
            saveIdSet(LS_DELETED, s);
        }
        await refresh();
        syncToolbarTitles();
        window.dispatchEvent(new CustomEvent('bxf-notifications-updated'));
    }

    const SWIPE_W = 56;

    function bindSwipeRow(row, front, onToggleSelect, onOpen) {
        let openPx = 0;
        let drag = false;
        let startX = 0;
        let startOpen = 0;
        let maxDelta = 0;

        function syncPeek() {
            row.classList.toggle('bxf-notify-swipe--peek', openPx > 0.5);
        }

        function apply() {
            front.style.transform = `translateX(${openPx}px)`;
            syncPeek();
        }

        front.addEventListener('pointerdown', (e) => {
            if (e.target.closest('button[data-action]') || e.target.closest('.bxf-notify-team-actions')) return;
            if (e.target.closest('.bxf-notify-restore')) return;
            if (e.target.closest('button')) return;
            drag = true;
            maxDelta = 0;
            startX = e.clientX;
            startOpen = openPx;
            try { front.setPointerCapture(e.pointerId); } catch (_) { /* */ }
        });

        front.addEventListener('pointermove', (e) => {
            if (!drag) return;
            const dx = e.clientX - startX;
            maxDelta = Math.max(maxDelta, Math.abs(dx));
            if (Math.abs(dx) > 6) e.preventDefault();
            openPx = Math.max(0, Math.min(SWIPE_W, startOpen + dx));
            apply();
        });

        function endDrag() {
            if (!drag) return;
            drag = false;
            openPx = openPx > SWIPE_W * 0.45 ? SWIPE_W : 0;
            apply();
        }

        front.addEventListener('pointerup', endDrag);
        front.addEventListener('pointercancel', () => {
            drag = false;
            openPx = 0;
            apply();
        });

        syncPeek();

        front.addEventListener('click', (e) => {
            if (e.target.closest('.bxf-notify-team-actions')) return;
            if (e.target.closest('.bxf-notify-restore')) return;
            if (maxDelta > 14) {
                e.preventDefault();
                e.stopPropagation();
                return;
            }
            if (openPx > 18) {
                e.preventDefault();
                e.stopPropagation();
                openPx = 0;
                apply();
                return;
            }
            if (typeof e.detail === 'number' && e.detail >= 2) {
                e.preventDefault();
                e.stopPropagation();
                if (typeof onOpen === 'function') void onOpen();
                return;
            }
            onToggleSelect();
        });
    }

    function toggleSelectForRow(n, front) {
        const k = rowKey(n);
        if (!k && !n._synthetic) return;
        if (selectedKeys.has(k)) {
            selectedKeys.delete(k);
            front.classList.remove('is-selected');
        } else {
            selectedKeys.add(k);
            front.classList.add('is-selected');
        }
        syncToolbarTitles();
    }

    async function openNotificationContext(n) {
        if (n.id && !n._synthetic && n.type !== 'team_invite') {
            markSeenLocal(n.id);
            try {
                await markIdsRead([n.id]);
            } catch (_) { /* ignore */ }
        }

        if (n._synthetic && n.type === 'message') {
            markSynthSeenLocal();
            if (window._socialOpenChat && n.payload && n.payload.peer_id) {
                window._socialOpenChat(n.payload.peer_id);
            } else if (document.getElementById('social-toggle-btn')) {
                document.getElementById('social-toggle-btn').click();
            }
            closePanel();
            await refresh();
            return;
        }
        if (n.type === 'friend_request') {
            if (window._socialFocusRequests) window._socialFocusRequests();
            else if (document.getElementById('social-toggle-btn')) {
                document.getElementById('social-toggle-btn').click();
            }
            closePanel();
            await refresh();
            return;
        }
        if (n.type === 'support_reply') {
            if (typeof window.openBxfUserSupportInbox === 'function') {
                await window.openBxfUserSupportInbox();
            }
            closePanel();
            await refresh();
            return;
        }
        if (n.type === 'rank_up' || n.type === 'system' || n.type === 'report_resolved') {
            closePanel();
            await refresh();
            return;
        }
        if (n.type === 'team_invite') {
            return;
        }
        closePanel();
        await refresh();
    }

    function renderItem(n, inArchive) {
        const inAr = Boolean(inArchive || n._inArchive);
        const unread = !n.read_at;
        const isSynth = n._synthetic;
        const L = lang();
        const seenUi = Boolean(n.read_at)
            || isSeenLocal(n.id)
            || (isSynth && isSynthSeenLocal());
        const seenLabel = L === 'es' ? 'visto' : 'seen';
        const typeLabel = {
            friend_request: 'Amistad',
            message: 'Mensajes',
            rank_up: 'Logro',
            team_invite: 'Equipo',
            team_event: 'Equipo',
            system: 'Sistema',
            support_reply: lang() === 'es' ? 'Soporte' : 'Support',
            report_resolved: L === 'es' ? 'Moderación' : 'Moderation'
        };
        const tl = typeLabel[n.type] || n.type;
        const tb = notificationTitleBody(n);

        const row = document.createElement('div');
        row.className = 'bxf-notify-swipe';
        const k = rowKey(n);
        row.dataset.selKey = k;

        const actions = document.createElement('div');
        actions.className = 'bxf-notify-swipe-actions';
        const delBtn = document.createElement('button');
        delBtn.type = 'button';
        delBtn.className = 'bxf-notify-swipe-del';
        delBtn.setAttribute('aria-label', lang() === 'es' ? 'Eliminar notificación' : 'Delete notification');
        delBtn.innerHTML = iconSwipeTrash();
        delBtn.addEventListener('click', async (e) => {
            e.stopPropagation();
            e.preventDefault();
            await deleteOneNotification(n);
        });
        actions.appendChild(delBtn);

        const front = document.createElement('div');
        front.className = 'bxf-notify-swipe-front bxf-notify-item' + (unread ? ' unread' : '');
        front.style.transform = 'translateX(0)';
        if (k && selectedKeys.has(k)) front.classList.add('is-selected');

        let extra = '';
        if (n.type === 'team_invite' && n.payload && n.payload.invite_id && !isSynth) {
            const iid = n.payload.invite_id;
            extra = `
                <div class="bxf-notify-team-actions" onclick="event.stopPropagation()">
                    <button type="button" class="primary" data-action="team-accept" data-invite="${iid}">${lang() === 'es' ? 'Aceptar' : 'Accept'}</button>
                    <button type="button" class="danger" data-action="team-decline" data-invite="${iid}">${lang() === 'es' ? 'Rechazar' : 'Decline'}</button>
                </div>`;
        }

        front.innerHTML = `
            <div class="bxf-notify-type">${esc(tl)}</div>
            <div class="bxf-notify-item-title">${esc(tb.title)}</div>
            <div class="bxf-notify-item-body">${esc(tb.body)}</div>
            <div class="bxf-notify-item-row-meta">
                <span class="bxf-notify-item-meta">${n.created_at ? fmtTime(n.created_at) : ''}</span>
                <div class="bxf-notify-item-row-meta-right">
                ${inAr ? `<button type="button" class="bxf-notify-restore">${L === 'es' ? 'Restaurar' : 'Restore'}</button>` : ''}
                ${seenUi ? `<div class="bxf-notify-seen" title="${L === 'es' ? 'Leído / visto' : 'Read'}">
                    ${iconSeenTick()}
                    <span class="bxf-notify-seen-txt" data-en="seen" data-es="visto">${seenLabel}</span>
                </div>` : ''}
                </div>
            </div>
            ${extra}`;

        if (inAr && n.id) {
            const rb = front.querySelector('.bxf-notify-restore');
            if (rb) {
                rb.addEventListener('click', async (e) => {
                    e.stopPropagation();
                    e.preventDefault();
                    await unarchiveIds([n.id]);
                    clearSelection();
                    await refresh();
                    window.dispatchEvent(new CustomEvent('bxf-notifications-updated'));
                });
            }
        }

        if (extra) {
            front.querySelectorAll('[data-action]').forEach((b) => {
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

        row.appendChild(actions);
        row.appendChild(front);
        bindSwipeRow(
            row,
            front,
            () => toggleSelectForRow(n, front),
            () => {
                if (!inAr) void openNotificationContext(n);
            }
        );
        return row;
    }

    async function refresh() {
        if (!listEl) return;
        const L = lang();
        listEl.innerHTML = `<div class="bxf-notify-empty">${L === 'es' ? 'Sincronizando…' : 'Syncing…'}</div>`;

        const snap = await buildInboxSnapshot();
        applyBadgeTotal(snap.badgeTotal);

        if (listMode === 'archive') {
            const archList = await fetchRpcArchivedNotifications();
            const delSet = loadIdSet(LS_DELETED);
            const rows = archList.filter((r) => !delSet.has(String(r.id)));
            if (rows.length === 0) {
                listEl.innerHTML = `<div class="bxf-notify-empty" data-en="Nothing archived yet." data-es="No hay nada archivado.">${L === 'es' ? 'No hay nada archivado.' : 'Nothing archived yet.'}</div>`;
            } else {
                listEl.innerHTML = '';
                rows.forEach((r) => {
                    const node = renderItem(Object.assign({}, r, { _inArchive: true }), true);
                    listEl.appendChild(node);
                });
            }
        } else if (snap.merged.length === 0) {
            listEl.innerHTML = `<div class="bxf-notify-empty" data-en="No activity yet." data-es="Sin actividad reciente.">${L === 'es' ? 'Sin actividad reciente.' : 'No activity yet.'}</div>`;
        } else {
            listEl.innerHTML = '';
            snap.merged.forEach((n) => listEl.appendChild(renderItem(n, false)));
        }

        syncToolbarTitles();
        syncTabStyles();
        syncHintForMode(L);
        if (typeof window.refreshBxfI18n === 'function') window.refreshBxfI18n();
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
