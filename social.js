/**
 * social.js — BreakerxFixer Social System
 * Friends + Real-time Chat via Supabase
 */
(function () {
    'use strict';

    // ── Wait for Supabase client to be available ──────────────────────────────
    let sb = null;
    let currentUserId = null;
    let currentUserProfile = null;
    let friendships = []; // [{id, requester_id, addressee_id, status, peer: profileObj}]
    let realtimeChannel = null;
    let activeChatPeerId = null;
    let activeChatSub = null;

    // ── DOM refs ──────────────────────────────────────────────────────────────
    const $id = (id) => document.getElementById(id);

    const socialWidget   = $id('social-widget');
    const socialToggleBtn= $id('social-toggle-btn');
    const socialPanel    = $id('social-panel');
    const socialBadge    = $id('social-badge');
    const tabFriends     = $id('tab-friends');
    const tabRequests    = $id('tab-requests');
    const tabReqBadge    = $id('tab-req-badge');
    const friendsList    = $id('social-friends-list');
    const requestsList   = $id('social-requests-list');
    const chatWindow     = $id('chat-window');
    const chatBackBtn    = $id('chat-back-btn');
    const chatCloseBtn   = $id('chat-close-btn');
    const chatPeerAvatar = $id('chat-peer-avatar');
    const chatPeerName   = $id('chat-peer-name');
    const chatMessages   = $id('chat-messages');
    const chatInput      = $id('chat-input');
    const chatSendBtn    = $id('chat-send-btn');

    // ── Helpers ───────────────────────────────────────────────────────────────
    const esc = (s) => String(s)
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;')
        .replace(/"/g, '&quot;');

    const avatarHtml = (url, size = 36) => {
        const s = `width:${size}px;height:${size}px;border-radius:50%;overflow:hidden;border:1px solid rgba(255,255,255,0.1);background:rgba(255,0,60,0.06);display:flex;align-items:center;justify-content:center;font-size:0.9rem;flex-shrink:0;`;
        const content = url
            ? `<img src="${esc(url)}?t=${Date.now()}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : '👾';
        return `<div style="${s}">${content}</div>`;
    };

    const fmtTime = (iso) => {
        const d = new Date(iso);
        return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    };

    // ── Notification sound (Web Audio API, no external file needed) ───────────
    function playNotificationSound() {
        try {
            const ctx = new (window.AudioContext || window.webkitAudioContext)();
            const gain = ctx.createGain();
            gain.connect(ctx.destination);
            gain.gain.setValueAtTime(0, ctx.currentTime);
            gain.gain.linearRampToValueAtTime(0.12, ctx.currentTime + 0.01);
            gain.gain.linearRampToValueAtTime(0.08, ctx.currentTime + 0.12);
            gain.gain.linearRampToValueAtTime(0, ctx.currentTime + 0.28);
            // Two-tone ping
            [880, 1320].forEach((freq, i) => {
                const osc = ctx.createOscillator();
                osc.type = 'sine';
                osc.frequency.setValueAtTime(freq, ctx.currentTime + i * 0.1);
                osc.connect(gain);
                osc.start(ctx.currentTime + i * 0.1);
                osc.stop(ctx.currentTime + i * 0.1 + 0.18);
            });
        } catch (_) { /* AudioContext not available */ }
    }

    // ── Visual + sound notification on the toggle button ─────────────────────
    function triggerMsgNotification() {
        playNotificationSound();
        if (!socialToggleBtn) return;
        // Pulse animation — remove then re-add class so it replays
        socialToggleBtn.classList.remove('incoming');
        void socialToggleBtn.offsetWidth; // force reflow
        socialToggleBtn.classList.add('incoming');
        // Auto-remove after animation ends
        const onEnd = () => { socialToggleBtn.classList.remove('incoming'); socialToggleBtn.removeEventListener('animationend', onEnd); };
        socialToggleBtn.addEventListener('animationend', onEnd);
    }

    // ── Init ─────────────────────────────────────────────────────────────────
    async function init() {
        // Wait for the global supabase client created in main.js
        let attempts = 0;
        while (!window._sbClient && attempts < 40) {
            await new Promise(r => setTimeout(r, 250));
            attempts++;
        }
        sb = window._sbClient;
        if (!sb) return; // supabase not configured, social disabled

        const { data: { session } } = await sb.auth.getSession();
        if (!session) return; // not logged in, social disabled

        currentUserId = session.user.id;

        // Load own profile
        const { data: prof } = await sb.from('profiles').select('*').eq('id', currentUserId).single();
        currentUserProfile = prof;

        // Show the widget
        if (socialWidget) socialWidget.style.display = 'block';

        await refreshFriendships();
        subscribeRealtime();
        wireUI();

        // Immediate sync in case main.js rendered leaderboard before social.js was ready
        syncLeaderboardButtons();
    }

    // ── Friendships ───────────────────────────────────────────────────────────
    async function refreshFriendships() {
        const { data, error } = await sb
            .from('friendships')
            .select('id, requester_id, addressee_id, status');
        if (error || !data) return;

        // Collect all peer IDs
        const peerIds = [...new Set(
            data.map(f => f.requester_id === currentUserId ? f.addressee_id : f.requester_id)
        )];

        let peerMap = {};
        if (peerIds.length > 0) {
            const { data: peers } = await sb
                .from('profiles')
                .select('id, username, avatar_url')
                .in('id', peerIds);
            if (peers) peers.forEach(p => { peerMap[p.id] = p; });
        }

        friendships = data.map(f => ({
            ...f,
            peer: peerMap[f.requester_id === currentUserId ? f.addressee_id : f.requester_id] || null
        }));

        renderFriendsList();
        renderRequestsList();
        updateBadges();
        syncLeaderboardButtons();
    }

    // ── Render friends ────────────────────────────────────────────────────────
    function renderFriendsList() {
        if (!friendsList) return;
        const accepted = friendships.filter(f => f.status === 'accepted');

        if (accepted.length === 0) {
            friendsList.innerHTML = `<div class="social-empty">SIN_AMIGOS_AÚN<br><span style="font-size:0.65rem;opacity:0.5;">Añade a alguien desde la leaderboard</span></div>`;
            return;
        }

        friendsList.innerHTML = accepted.map(f => {
            const p = f.peer;
            const name = p ? esc(p.username) : 'ENTITY';
            const av = p && p.avatar_url ? `<img src="${esc(p.avatar_url)}?t=${Date.now()}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '👾';
            return `
            <div class="social-item" data-peer-id="${f.peer.id}" onclick="window._socialOpenChat('${f.peer.id}')">
                <div class="social-item-avatar">${av}</div>
                <div class="social-item-info">
                    <div class="social-item-name">${name}</div>
                    <div class="social-item-sub unread" id="last-msg-${f.peer.id}"></div>
                </div>
                <div class="social-item-actions">
                    <button class="soc-btn decline" onclick="event.stopPropagation();window._socialUnfriend(${f.id})" title="Eliminar amigo">✕</button>
                </div>
            </div>`;
        }).join('');

        // Load last messages for each friend
        accepted.forEach(f => loadLastMessage(f.peer.id));
    }

    async function loadLastMessage(peerId) {
        const el = document.getElementById(`last-msg-${peerId}`);
        if (!el) return;
        const { data } = await sb
            .from('messages')
            .select('content, sender_id, created_at')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: false })
            .limit(1);
        if (data && data.length > 0) {
            const m = data[0];
            const prefix = m.sender_id === currentUserId ? 'Tú: ' : '';
            el.textContent = prefix + m.content.slice(0, 28) + (m.content.length > 28 ? '…' : '');
        }
    }

    // ── Render requests ───────────────────────────────────────────────────────
    function renderRequestsList() {
        if (!requestsList) return;
        const pending = friendships.filter(f => f.status === 'pending' && f.addressee_id === currentUserId);
        const sent    = friendships.filter(f => f.status === 'pending' && f.requester_id === currentUserId);

        let html = '';

        if (pending.length > 0) {
            html += `<div style="padding:8px 14px 4px;font-family:var(--font-mono);font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;">Recibidas</div>`;
            html += pending.map(f => {
                const p = f.peer;
                const name = p ? esc(p.username) : 'ENTITY';
                const av = p && p.avatar_url ? `<img src="${esc(p.avatar_url)}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">` : '👾';
                return `
                <div class="social-item">
                    <div class="social-item-avatar">${av}</div>
                    <div class="social-item-info">
                        <div class="social-item-name">${name}</div>
                        <div class="social-item-sub">solicitud pendiente</div>
                    </div>
                    <div class="social-item-actions">
                        <button class="soc-btn accept" onclick="window._socialRespond(${f.id},'accept')">✓</button>
                        <button class="soc-btn decline" onclick="window._socialRespond(${f.id},'decline')">✕</button>
                    </div>
                </div>`;
            }).join('');
        }

        if (sent.length > 0) {
            html += `<div style="padding:8px 14px 4px;font-family:var(--font-mono);font-size:0.65rem;color:var(--text-dim);text-transform:uppercase;letter-spacing:1px;">Enviadas</div>`;
            html += sent.map(f => {
                const p = f.peer;
                const name = p ? esc(p.username) : 'ENTITY';
                return `
                <div class="social-item">
                    <div class="social-item-info">
                        <div class="social-item-name">${name}</div>
                        <div class="social-item-sub">pendiente de respuesta</div>
                    </div>
                    <div class="social-item-actions">
                        <button class="soc-btn decline" onclick="window._socialCancel(${f.id})">Cancelar</button>
                    </div>
                </div>`;
            }).join('');
        }

        requestsList.innerHTML = html || `<div class="social-empty">SIN_SOLICITUDES</div>`;
    }

    // ── Badges ────────────────────────────────────────────────────────────────
    function updateBadges() {
        const inbound = friendships.filter(f => f.status === 'pending' && f.addressee_id === currentUserId).length;
        if (tabReqBadge) {
            tabReqBadge.textContent = inbound;
            tabReqBadge.className = 'social-tab-badge' + (inbound > 0 ? ' visible' : '');
        }
        if (socialBadge) {
            socialBadge.textContent = inbound;
            socialBadge.className = 'social-badge' + (inbound > 0 ? ' visible' : '');
        }
    }

    // ── Tabs ──────────────────────────────────────────────────────────────────
    let activeTab = 'friends';

    function switchTab(tab) {
        activeTab = tab;
        const friendsView   = $id('social-friends-view');
        const requestsView  = $id('social-requests-view');
        if (friendsView)  friendsView.style.display  = tab === 'friends' ? 'block' : 'none';
        if (requestsView) requestsView.style.display = tab === 'requests' ? 'block' : 'none';
        if (tabFriends)   tabFriends.classList.toggle('active', tab === 'friends');
        if (tabRequests)  tabRequests.classList.toggle('active', tab === 'requests');
    }

    // ── Panel toggle ──────────────────────────────────────────────────────────
    function togglePanel() {
        if (!socialPanel) return;
        const isOpen = socialPanel.classList.contains('open');
        if (isOpen) {
            socialPanel.classList.remove('open');
        } else {
            socialPanel.classList.add('open');
            refreshFriendships();
        }
    }

    // ── Chat ──────────────────────────────────────────────────────────────────
    window._socialOpenChat = async function (peerId) {
        activeChatPeerId = peerId;

        const friend = friendships.find(f => f.peer && f.peer.id === peerId);
        const peer = friend ? friend.peer : null;

        // Populate header
        if (chatPeerName) chatPeerName.textContent = peer ? peer.username : 'ENTITY';
        if (chatPeerAvatar) chatPeerAvatar.innerHTML = peer && peer.avatar_url
            ? `<img src="${esc(peer.avatar_url)}?t=${Date.now()}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : '👾';

        // Open window
        if (chatWindow) chatWindow.classList.add('open');

        // Load history
        await loadChatHistory(peerId);

        // Subscribe to realtime for this conversation
        subscribeChat(peerId);

        chatInput && chatInput.focus();
    };

    async function loadChatHistory(peerId) {
        if (!chatMessages) return;
        chatMessages.innerHTML = '<div style="text-align:center;color:var(--text-dim);font-family:var(--font-mono);font-size:0.7rem;padding:20px;">cargando...</div>';

        const { data, error } = await sb
            .from('messages')
            .select('id, sender_id, content, created_at')
            .or(`and(sender_id.eq.${currentUserId},receiver_id.eq.${peerId}),and(sender_id.eq.${peerId},receiver_id.eq.${currentUserId})`)
            .order('created_at', { ascending: true })
            .limit(80);

        if (error) { chatMessages.innerHTML = '<div class="social-empty">ERROR al cargar mensajes</div>'; return; }

        chatMessages.innerHTML = '';
        if (!data || data.length === 0) {
            chatMessages.innerHTML = '<div class="social-empty">Aún no hay mensajes.<br><span style="font-size:0.65rem;opacity:0.5;">Di hola 👋</span></div>';
            return;
        }

        data.forEach(m => appendMessage(m));
        scrollChatToBottom();

        // Mark received as read
        await sb.from('messages')
            .update({ read_at: new Date().toISOString() })
            .is('read_at', null)
            .eq('receiver_id', currentUserId)
            .eq('sender_id', peerId);
    }

    function appendMessage(m) {
        if (!chatMessages) return;
        const mine = m.sender_id === currentUserId;
        const div = document.createElement('div');
        div.className = `chat-msg ${mine ? 'mine' : 'theirs'}`;
        div.dataset.msgId = m.id;
        div.innerHTML = `${esc(m.content)}<div class="chat-msg-time">${fmtTime(m.created_at)}</div>`;
        // Remove empty placeholder if present
        const empty = chatMessages.querySelector('.social-empty');
        if (empty) empty.remove();
        chatMessages.appendChild(div);
    }

    function scrollChatToBottom() {
        if (chatMessages) chatMessages.scrollTop = chatMessages.scrollHeight;
    }

    function subscribeChat(peerId) {
        // Unsubscribe previous
        if (activeChatSub) { activeChatSub.unsubscribe(); activeChatSub = null; }

        activeChatSub = sb.channel(`chat-${currentUserId}-${peerId}`)
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUserId}`
            }, (payload) => {
                const m = payload.new;
                if (m.sender_id !== peerId) return;
                appendMessage(m);
                scrollChatToBottom();
                // Mark as read immediately
                sb.from('messages').update({ read_at: new Date().toISOString() }).eq('id', m.id);
            })
            .subscribe();
    }

    async function sendMessage() {
        if (!chatInput || !sb || !activeChatPeerId) return;
        const content = chatInput.value.trim();
        if (!content) return;

        chatInput.value = '';
        chatSendBtn && (chatSendBtn.disabled = true);

        const { data, error } = await sb.rpc('send_message', {
            p_receiver_id: activeChatPeerId,
            p_content: content
        });

        chatSendBtn && (chatSendBtn.disabled = false);

        if (error || !data || !data.ok) {
            // Re-add content so user doesn't lose it
            chatInput.value = content;
            const hint = data && data.hint ? data.hint : (error ? error.message : 'Error desconocido');
            // Show inline error
            const errDiv = document.createElement('div');
            errDiv.style.cssText = 'text-align:center;color:#ff003c;font-family:var(--font-mono);font-size:0.65rem;padding:4px;';
            errDiv.textContent = hint;
            chatMessages.appendChild(errDiv);
            setTimeout(() => errDiv.remove(), 3000);
            return;
        }

        // Optimistically append own message
        appendMessage({
            id: data.id,
            sender_id: currentUserId,
            content,
            created_at: new Date().toISOString()
        });
        scrollChatToBottom();
        // Refresh last message under friend list
        loadLastMessage(activeChatPeerId);
    }

    // ── Friend actions ────────────────────────────────────────────────────────
    window._socialUnfriend = async function (friendshipId) {
        if (!confirm('¿Eliminar a este amigo?')) return;
        await sb.from('friendships').delete().eq('id', friendshipId);
        await refreshFriendships();
        if (activeChatPeerId) {
            const stillFriend = friendships.find(f => f.peer && f.peer.id === activeChatPeerId && f.status === 'accepted');
            if (!stillFriend) closeChatWindow();
        }
    };

    window._socialCancel = async function (friendshipId) {
        await sb.from('friendships').delete().eq('id', friendshipId);
        await refreshFriendships();
    };

    window._socialRespond = async function (friendshipId, action) {
        const { data } = await sb.rpc('respond_friend_request', {
            p_friendship_id: friendshipId,
            p_action: action
        });
        if (data && data.ok) await refreshFriendships();
    };

    // Public API for leaderboard "Add friend" button
    window._socialAddFriend = async function (addresseeId, btn) {
        if (!sb || !currentUserId || addresseeId === currentUserId) return;

        // Visual feedback
        if (btn) {
            btn.disabled = true;
            btn.textContent = '...';
        }

        // Check if relationship already exists
        const existing = friendships.find(f =>
            (f.requester_id === currentUserId && f.addressee_id === addresseeId) ||
            (f.requester_id === addresseeId && f.addressee_id === currentUserId)
        );

        if (existing) {
            syncLeaderboardButtons(); // Refresh all buttons
            return;
        }

        const { error } = await sb.from('friendships').insert({ 
            requester_id: currentUserId, 
            addressee_id: addresseeId,
            status: 'pending'
        });
        
        if (error) { 
            console.error("ADD_FRIEND_ERROR:", error);
            if (btn) btn.disabled = false;
            return; 
        }

        await refreshFriendships();
        syncLeaderboardButtons();
    };

    // ── Panel close / chat close ──────────────────────────────────────────────
    function closeChatWindow() {
        if (chatWindow) chatWindow.classList.remove('open');
        if (activeChatSub) { activeChatSub.unsubscribe(); activeChatSub = null; }
        activeChatPeerId = null;
    }

    // ── Realtime for friendship changes + global message notifications ────────
    function subscribeRealtime() {
        realtimeChannel = sb.channel(`social-${currentUserId}`)
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'friendships',
                filter: `addressee_id=eq.${currentUserId}`
            }, (payload) => {
                if (payload.eventType === 'INSERT') triggerMsgNotification();
                refreshFriendships();
            })
            .on('postgres_changes', {
                event: '*',
                schema: 'public',
                table: 'friendships',
                filter: `requester_id=eq.${currentUserId}`
            }, () => { refreshFriendships(); })
            // Global new-message listener — only fires when chat with sender is NOT open
            .on('postgres_changes', {
                event: 'INSERT',
                schema: 'public',
                table: 'messages',
                filter: `receiver_id=eq.${currentUserId}`
            }, (payload) => {
                const m = payload.new;
                const chatIsOpenWithSender = activeChatPeerId === m.sender_id;
                if (!chatIsOpenWithSender) {
                    // Notify even without chat open
                    triggerMsgNotification();
                    // Refresh last-message snippet in friends list if panel is open
                    loadLastMessage(m.sender_id);
                }
            })
            .subscribe();
    }

    function syncLeaderboardButtons() {
        const buttons = document.querySelectorAll('.lb-add-btn[data-peer-id]');
        buttons.forEach(btn => {
            const peerId = btn.getAttribute('data-peer-id');
            const rel = friendships.find(f => 
                (f.requester_id === currentUserId && f.addressee_id === peerId) ||
                (f.requester_id === peerId && f.addressee_id === currentUserId)
            );
            
            if (rel) {
                if (rel.status === 'accepted') {
                    btn.textContent = 'Amigos ✓';
                    btn.className = 'lb-add-btn friends';
                    btn.disabled = true;
                    btn.onclick = null;
                } else if (rel.status === 'pending') {
                    if (rel.addressee_id === currentUserId) {
                        // Inbound request: allow accepting right here
                        btn.textContent = 'Aceptar ✓';
                        btn.className = 'lb-add-btn accept';
                        btn.disabled = false;
                        btn.onclick = (e) => { e.stopPropagation(); window._socialRespond(rel.id, 'accept'); };
                    } else {
                        // Outbound request: just show status
                        btn.textContent = 'Pendiente...';
                        btn.className = 'lb-add-btn pending';
                        btn.disabled = true;
                        btn.onclick = null;
                    }
                } else {
                    btn.textContent = '+ Añadir';
                    btn.className = 'lb-add-btn';
                    btn.disabled = false;
                }
            } else {
                btn.textContent = '+ Añadir';
                btn.className = 'lb-add-btn';
                btn.disabled = false;
            }
        });
    }

    // Expose globally so main.js can call it after rendering leaderboard
    window._socialSyncLeaderboard = syncLeaderboardButtons;

    // ── Wire UI events ────────────────────────────────────────────────────────
    function wireUI() {
        socialToggleBtn && socialToggleBtn.addEventListener('click', togglePanel);
        tabFriends && tabFriends.addEventListener('click', () => switchTab('friends'));
        tabRequests && tabRequests.addEventListener('click', () => switchTab('requests'));

        chatBackBtn && chatBackBtn.addEventListener('click', () => {
            closeChatWindow();
        });
        chatCloseBtn && chatCloseBtn.addEventListener('click', () => {
            closeChatWindow();
            if (socialPanel) socialPanel.classList.remove('open');
        });

        chatSendBtn && chatSendBtn.addEventListener('click', sendMessage);
        chatInput && chatInput.addEventListener('keydown', (e) => {
            if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
        });
    }

    // ── Boot ──────────────────────────────────────────────────────────────────
    if (document.readyState === 'loading') {
        document.addEventListener('DOMContentLoaded', init);
    } else {
        // Slight delay to ensure main.js has registered _sbClient
        setTimeout(init, 600);
    }

})();
