document.addEventListener("DOMContentLoaded", () => {
    // Referencias a los contenedores
    const redTeamBox = document.getElementById("redTeam");
    const blueTeamBox = document.getElementById("blueTeam");

    // Lógica interactiva simple para el Red Team (opcional, solo para demostrar funcionalidad)
    if (redTeamBox) {
        redTeamBox.addEventListener("click", () => {
            // Efecto visual rápido al hacer clic
            redTeamBox.style.backgroundColor = "#ffe6e6"; // Fondo rojo claro

            setTimeout(() => {
                redTeamBox.style.backgroundColor = "#ffffff";
            }, 200);

            console.log("¡Red Team seleccionado!");
        });
    }

    // Lógica interactiva simple para el Blue Team (opcional)
    if (blueTeamBox) {
        blueTeamBox.addEventListener("click", () => {
            // Efecto visual rápido al hacer clic
            blueTeamBox.style.backgroundColor = "#e6eaff"; // Fondo azul claro

            setTimeout(() => {
                blueTeamBox.style.backgroundColor = "#ffffff";
            }, 200);

            console.log("¡Blue Team seleccionado!");
        });
    }

    const navLinks = document.querySelectorAll('.top-nav a:not(#lang-toggle)');

    navLinks.forEach(link => {
        const originalText = link.textContent;
        // Se reduce el multiplicador significativamente para acelerar la animación de la barra
        const totalDuration = originalText.length * 15;
        link.style.setProperty('--bar-time', `${totalDuration}ms`);

        link.addEventListener('mouseenter', () => {
            clearInterval(link.dataset.intervalID);
            let i = 0;
            link.dataset.intervalID = setInterval(() => {
                if (i <= originalText.length) {
                    const uppercased = originalText.substring(0, i).toUpperCase();
                    const remaining = originalText.substring(i);
                    link.textContent = uppercased + remaining;
                    i++;
                } else {
                    clearInterval(link.dataset.intervalID);
                }
            }, 15); // Sincronizado con la barra
        });

        link.addEventListener('mouseleave', () => {
            clearInterval(link.dataset.intervalID);
            let i = originalText.length;
            link.dataset.intervalID = setInterval(() => {
                if (i >= 0) {
                    const uppercased = originalText.substring(0, i).toUpperCase();
                    const remaining = originalText.substring(i);
                    link.textContent = uppercased + remaining;
                    i--;
                } else {
                    clearInterval(link.dataset.intervalID);
                    link.textContent = originalText;
                }
            }, 15); // Más rápido al salir también
        });
    });

    // Lógica para ocultar el indicador de scroll al bajar en la página About Us
    const aboutScrollIndicator = document.getElementById('aboutScrollIndicator');
    if (aboutScrollIndicator) {
        window.addEventListener('scroll', () => {
            if (window.scrollY > 50) {
                aboutScrollIndicator.classList.add('hidden');
            } else {
                aboutScrollIndicator.classList.remove('hidden');
            }
        });
    }

    // ---------------------------------
    // Language Translation System
    const setLanguage = (lang, isFirstSelection = false) => {
        localStorage.setItem('lang', lang);
        document.documentElement.lang = lang;

        // Update all elements with data-lang attributes
        document.querySelectorAll('[data-en][data-es]').forEach(el => {
            if (el.getAttribute(`data-${lang}`)) {
                el.innerHTML = el.getAttribute(`data-${lang}`);
            }
        });

        // Update placeholders
        document.querySelectorAll('[data-en-placeholder][data-es-placeholder]').forEach(el => {
            if (el.getAttribute(`data-${lang}-placeholder`)) {
                el.setAttribute('placeholder', el.getAttribute(`data-${lang}-placeholder`));
            }
        });

        // Update static nav toggle
        const toggleBtn = document.getElementById('lang-toggle');
        if (toggleBtn) {
            toggleBtn.classList.remove('lang-glitch');
            void toggleBtn.offsetWidth;
            toggleBtn.classList.add('lang-glitch');
            toggleBtn.textContent = lang === 'en' ? 'LC_LANG >> ES' : 'LC_LANG >> EN';
        }

        // Update tutorial engine lang
        if (window._tutEngine) window._tutEngine.lang = lang;

        // If this is the very first language selection (from modal)
        // Auth has already resolved by this point (updateUserProfile ran first),
        // so we show the guest prompt after a short delay.
        if (isFirstSelection && window._hasSession === false) {
            setTimeout(() => {
                if (window.startGuestPrompt) window.startGuestPrompt();
            }, 1200);
        }

        // Writeups page filtering
        applyWriteupFilters(lang);
    };

    /** Re-applies data-en/data-es to all elements (e.g. UI injected after first paint). */
    window.refreshBxfI18n = () => {
        const lang = localStorage.getItem('lang') || 'es';
        document.querySelectorAll('[data-en][data-es]').forEach((el) => {
            const v = el.getAttribute(`data-${lang}`);
            if (v) el.innerHTML = v;
        });
        document.querySelectorAll('[data-en-placeholder][data-es-placeholder]').forEach((el) => {
            const v = el.getAttribute(`data-${lang}-placeholder`);
            if (v) el.setAttribute('placeholder', v);
        });
    };

    const applyWriteupFilters = (currentLang) => {
        const lang = currentLang || document.documentElement.lang || 'es';
        const searchInput = document.getElementById('searchInput');
        const searchTerm = searchInput ? searchInput.value.toLowerCase().trim() : '';
        const writeupItems = document.querySelectorAll('.writeup-item[data-postlang]');

        if (writeupItems.length > 0) {
            writeupItems.forEach(item => {
                const itemLang = item.getAttribute('data-postlang');
                const searchContent = item.getAttribute('data-search') || '';
                
                const matchesLang = (itemLang === lang);
                const matchesSearch = (searchTerm === '' || searchContent.includes(searchTerm));

                if (matchesLang && matchesSearch) {
                    item.style.display = '';
                    if (searchTerm !== '') {
                        item.style.animation = 'fadeIn 0.4s ease forwards';
                    }
                } else {
                    item.style.display = 'none';
                    item.style.animation = 'none';
                }
            });
        }
    };

    window.applyWriteupFilters = applyWriteupFilters;

    const initLanguageSystem = () => {
        const savedLang = localStorage.getItem('lang');
        if (!savedLang) {
            // Inject pop-up into body
            const modal = document.createElement('div');
            modal.id = 'lang-modal';
            modal.innerHTML = `
                <h2>> SELECT SYSTEM LANGUAGE_</h2>
                <div class="lang-options">
                    <button class="lang-btn" data-setlang="en">[ > ] ENGLISH</button>
                    <button class="lang-btn" data-setlang="es">[ > ] ESPAÑOL</button>
                </div>
            `;
            document.body.appendChild(modal);

            document.querySelectorAll('.lang-options .lang-btn').forEach(btn => {
                btn.addEventListener('click', (e) => {
                    const selected = e.target.getAttribute('data-setlang');
                    modal.classList.add('hidden');
                    setTimeout(() => modal.remove(), 500); // clean up
                    setLanguage(selected, true); // true = first selection, trigger tutorial after
                });
            });
        } else {
            setLanguage(savedLang);
        }

        // Toggle logic via Nav bar button
        document.body.addEventListener('click', (e) => {
            if (e.target && e.target.id === 'lang-toggle') {
                e.preventDefault();
                const current = localStorage.getItem('lang') || 'es';
                const next = current === 'en' ? 'es' : 'en';
                setLanguage(next);
            }
        });

        // [NEW] Writeups Search Event Listener
        const searchInput = document.getElementById('searchInput');
        if (searchInput) {
            searchInput.addEventListener('input', () => {
                const currentLang = localStorage.getItem('lang') || 'es';
                applyWriteupFilters(currentLang);
            });
        }
    };

    initLanguageSystem();

    // ---------------------------------
    // Security Lockdown & Anti-Dump
    // ---------------------------------
    const securityLockdown = () => {
        // Disable Right-Click
        document.addEventListener('contextmenu', (e) => e.preventDefault());

        console.log("%c> SYSTEM SECURED_", "color: #f38ba8; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px #f38ba8;");
        console.log("%cBreaker && Fixer — CTF Platform.", "color: #f38ba8;");
    };

    securityLockdown();

    // ---------------------------------
    // Performance Optimizations
    // ---------------------------------
    const optimizePerformance = () => {
        // Automatic Lazy Loading for all images
        const images = document.querySelectorAll('img');
        images.forEach(img => {
            if (!img.hasAttribute('loading')) {
                img.setAttribute('loading', 'lazy');
            }
        });
    };

    optimizePerformance();

    // ---------------------------------
    // Aesthetic Reveal Engine (Optimized)
    // ---------------------------------
    const revealElements = () => {
        const observerOptions = {
            threshold: 0.05,
            rootMargin: "0px 0px -20px 0px"
        };

        const observer = new IntersectionObserver((entries) => {
            entries.forEach((entry) => {
                if (entry.isIntersecting) {
                    requestAnimationFrame(() => {
                        entry.target.classList.add('reveal-active');
                    });
                    observer.unobserve(entry.target);
                }
            });
        }, observerOptions);

        const targets = document.querySelectorAll('.writeup-item, .ctf-item, .mission-details, .member-bio, .team-box, .description-box');
        for (let i = 0; i < targets.length; i++) {
            targets[i].style.willChange = 'transform, opacity';
            observer.observe(targets[i]);
        }
    };

    revealElements();

    // Random System Glitch effect (Throttled) - DISABLED per user request
    /*
    const triggerRandomGlitch = () => {
        const titles = document.querySelectorAll('h1, h2');
        if (titles.length === 0) return;

        setInterval(() => {
            if (document.visibilityState === 'visible' && Math.random() > 0.96) {
                const randomTitle = titles[Math.floor(Math.random() * titles.length)];
                requestAnimationFrame(() => {
                    randomTitle.classList.add('lang-glitch');
                    setTimeout(() => randomTitle.classList.remove('lang-glitch'), 400);
                });
            }
        }, 5000); // Less frequent checks for lower overhead
    };

    triggerRandomGlitch();
    */

    // ---------------------------------
    // Supabase Backend System
    // ---------------------------------
    // CONFIGURATION
    const SUPABASE_URL = 'https://qkeiajxyynvpybctxxuv.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZWlhanh5eW52cHliY3R4eHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjgxODQsImV4cCI6MjA5MTcwNDE4NH0.JTeODgp_ho_XamO-2oR1h0HT-Sv-v9Fe2vpn4KFgOpE';
    const BACKEND_URL = 'https://breakerxfixer-api.onrender.com/api/v1';

    // [SECURITY TRANSPARENCY] 
    console.log("%c[SYSTEM] Frontend 'lockdown' is thematic. Real security resides in Supabase RLS and Backend Validators.", "color: #00ff3c; font-weight: bold;");

    // ─── Ranks & Levels Configuration (HTB Inspired) ────────────────────────
    const RANKS = [
        { name: 'SCRIPT_KIDDIE', min: 0, color: '#888' },
        { name: 'GHOST_USER', min: 100, color: '#00ffff' },
        { name: 'NETWORK_WANDERER', min: 500, color: '#7b2cbf' },
        { name: 'CYBER_ENTITY', min: 1500, color: '#f38ba8' },
        { name: 'DATA_BREACHER', min: 3000, color: '#ff8c00' },
        { name: 'VOID_WALKER', min: 6000, color: '#9ef01a' },
        { name: 'OMNISCIENT_BREAKER', min: 10000, color: '#ffffff' }
    ];

    const getRankInfo = (pts) => {
        let current = RANKS[0];
        let next = null;
        for (let i = 0; i < RANKS.length; i++) {
            if (pts >= RANKS[i].min) {
                current = RANKS[i];
                next = RANKS[i + 1] || null;
            } else break;
        }
        
        let progress = 100;
        if (next) {
            const range = next.min - current.min;
            const currentLevelPts = pts - current.min;
            progress = Math.min(100, (currentLevelPts / range) * 100);
        }
        
        return { ...current, next, progress };
    };

    // Sync API URL in UI
    const apiBaseEl = document.getElementById('api-base-url');
    if (apiBaseEl) apiBaseEl.textContent = BACKEND_URL;

    let supabase = null;
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window._sbClient = supabase; // shared with social.js
    }

    /** Map challenge id → { username, at } for CTF cards (Season 0/1). */
    window.bxfLoadFirstBloodsMap = async () => {
        window.__bxfFbMap = new Map();
        if (!supabase) return window.__bxfFbMap;
        const { data, error } = await supabase
            .from('challenges')
            .select('id, first_blood_at, first_blood_user_id')
            .not('first_blood_user_id', 'is', null);
        if (error || !data?.length) return window.__bxfFbMap;
        const uids = [...new Set(data.map((r) => r.first_blood_user_id))];
        const { data: profs } = await supabase.from('profiles').select('id, username').in('id', uids);
        const un = new Map((profs || []).map((p) => [p.id, p.username]));
        data.forEach((r) => {
            window.__bxfFbMap.set(r.id, {
                username: un.get(r.first_blood_user_id) || '—',
                at: r.first_blood_at,
            });
        });
        return window.__bxfFbMap;
    };

    window._hasSession = null; // null = pending, false = guest, true = logged in

    // UI Elements
    const authBtn = document.getElementById('auth-btn');
    const authModalOverlay = document.getElementById('auth-modal-overlay');
    const authClose = document.getElementById('auth-close');
    const userStats = document.getElementById('user-stats');
    const rankDisplay = userStats ? userStats.querySelector('.rank-pos') : null;
    const pointsDisplay = userStats ? userStats.querySelector('.pts') : null;

    const loginView = document.getElementById('auth-login-view');
    const signupView = document.getElementById('auth-signup-view');
    const profileView = document.getElementById('user-profile-view');
    const tabSignup = document.getElementById('tab-signup');
    const tabLoginBack = document.getElementById('tab-login-back');
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    // Avatar & Account Panel elements
    const navAvatar = document.getElementById('nav-avatar');
    const avatarWrapper = document.getElementById('avatar-wrapper');
    const accountPanel = document.getElementById('account-panel');
    const accountPanelOverlay = document.getElementById('account-panel-overlay');
    const panelAvatar = document.getElementById('panel-avatar');
    const panelUsername = document.getElementById('panel-username');
    const panelStats = document.getElementById('panel-stats');
    const signoutBtn = document.getElementById('signout-btn');
    const deleteAccountBtnPanel = document.getElementById('delete-account-btn-panel');
    const avatarUploadInput = document.getElementById('avatar-upload');
    const avatarPreviewWrap = document.getElementById('avatar-preview-wrap');
    const avatarPreviewEl = document.getElementById('avatar-preview');
    const avatarApplyBtn = document.getElementById('avatar-apply-btn');
    const avatarCancelBtn = document.getElementById('avatar-cancel-btn');

    let pendingAvatarFile = null; 
    let cropper = null; // Cropper.js instance

    // ─── Render avatar URL everywhere (with cache-busting) ────────────────────
    const setAvatarSrc = (url, username) => {
        // Append cache-buster so browsers always fetch the latest version
        const src = url ? url + '?t=' + Date.now() : null;
        const escaped = src ? src.replace(/"/g, '&quot;') : null;
        const rawName = String(username || panelUsername?.textContent || '').trim();
        const initials = (rawName.match(/[A-Za-z0-9]/g) || [])
            .slice(0, 2)
            .join('')
            .toUpperCase() || 'BX';
        const img = escaped
            ? `<img src="${escaped}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : `<span aria-label="avatar fallback" style="display:inline-flex;width:100%;height:100%;align-items:center;justify-content:center;font-family:var(--font-mono);font-size:0.72rem;font-weight:800;letter-spacing:0.08em;color:#d9e0ee;background:radial-gradient(circle at 30% 20%, rgba(137,220,235,0.35), rgba(203,166,247,0.12));">${initials}</span>`;
        if (navAvatar) navAvatar.innerHTML = img;
        if (panelAvatar) panelAvatar.innerHTML = img;
    };

    // ─── Open / close panel ───────────────────────────────────────────────────
    const openAccountPanel = () => {
        if (accountPanel) accountPanel.classList.add('open');
        if (accountPanelOverlay) accountPanelOverlay.style.display = 'block';
    };
    const closeAccountPanel = () => {
        if (accountPanel) accountPanel.classList.remove('open');
        if (accountPanelOverlay) accountPanelOverlay.style.display = 'none';
        // Discard any pending upload
        pendingAvatarFile = null;
        if (avatarPreviewWrap) avatarPreviewWrap.style.display = 'none';
        if (avatarUploadInput) avatarUploadInput.value = '';
    };

    if (navAvatar) navAvatar.addEventListener('click', openAccountPanel);
    if (accountPanelOverlay) accountPanelOverlay.addEventListener('click', (e) => {
        if (e.target === accountPanelOverlay) closeAccountPanel();
    });

    // ─── Step 1: user picks a file → show cropper modal ──────────────────────
    const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const MAX_SIZE_BYTES = 5 * 1024 * 1024; // Increased to 5MB for cropping

    const injectCropperModal = () => {
        if (document.getElementById('cropper-modal')) return;
        const modalHtml = `
            <div id="cropper-modal" class="modal-overlay" style="display:none; z-index:20000; background:rgba(0,0,0,0.9); backdrop-filter:blur(10px);">
                <div class="cropper-card" style="width:90%; max-width:500px; background:#080808; border:1px solid var(--accent); padding:20px; border-radius:4px; position:relative; box-shadow:0 0 30px var(--accent-glow);">
                    <h3 style="font-family:var(--font-mono); color:var(--accent); font-size:0.9rem; margin-bottom:15px; letter-spacing:2px;">[ RE-DIMENSIONING_ENTITY_AVATAR ]</h3>
                    <div style="width:100%; height:350px; background:#000; margin-bottom:20px; overflow:hidden;">
                        <img id="cropper-img" src="" style="max-width:100%; display:block;">
                    </div>
                    <div style="display:flex; gap:10px; justify-content:flex-end;">
                        <button id="crop-cancel-btn" class="account-action-btn" style="width:auto; padding:8px 20px;">CANCEL</button>
                        <button id="crop-confirm-btn" class="account-action-btn" style="width:auto; padding:8px 20px; background:rgba(0,255,60,0.1); border-color:rgba(0,255,60,0.4); color:#00ff3c;">CONFIRM_CROP</button>
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);

        document.getElementById('crop-cancel-btn').addEventListener('click', () => {
            document.getElementById('cropper-modal').style.display = 'none';
            if (cropper) {
                cropper.destroy();
                cropper = null;
            }
            if (avatarUploadInput) avatarUploadInput.value = '';
        });

        document.getElementById('crop-confirm-btn').addEventListener('click', () => {
            if (!cropper) return;
            const canvas = cropper.getCroppedCanvas({
                width: 400,
                height: 400,
                imageSmoothingQuality: 'high'
            });

            canvas.toBlob((blob) => {
                pendingAvatarFile = new File([blob], "avatar.png", { type: "image/png" });
                
                // Show local preview
                if (avatarPreviewEl) {
                    avatarPreviewEl.innerHTML = `<img src="${canvas.toDataURL()}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                }
                if (avatarPreviewWrap) avatarPreviewWrap.style.display = 'block';

                document.getElementById('cropper-modal').style.display = 'none';
                cropper.destroy();
                cropper = null;
            }, 'image/png');
        });
    };

    if (avatarUploadInput) {
        injectCropperModal();
        avatarUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            if (!ALLOWED_TYPES.has(file.type)) {
                alert('INVALID_FORMAT: JPEG, PNG, WebP o GIF.');
                avatarUploadInput.value = '';
                return;
            }
            if (file.size > MAX_SIZE_BYTES) {
                alert('ARCHIVO_MUY_GRANDE: Max 5MB.');
                avatarUploadInput.value = '';
                return;
            }

            const reader = new FileReader();
            reader.onload = (ev) => {
                const modal = document.getElementById('cropper-modal');
                const img = document.getElementById('cropper-img');
                img.src = ev.target.result;
                modal.style.display = 'flex';
                modal.style.alignItems = 'center';
                modal.style.justifyContent = 'center';

                if (cropper) cropper.destroy();
                
                // Initialize Cropper.js
                // Note: We assume Cropper is already loaded via CDN in HTML
                if (window.Cropper) {
                    cropper = new window.Cropper(img, {
                        aspectRatio: 1,
                        viewMode: 2,
                        dragMode: 'move',
                        autoCropArea: 1,
                        background: false
                    });
                } else {
                    alert("SISTEMA_RECORTE_NO_INICIALIZADO. Intenta de nuevo.");
                }
            };
            reader.readAsDataURL(file);
        });
    }

    // ─── Step 2: user clicks Apply → upload to Supabase ──────────────────────
    if (avatarApplyBtn) {
        avatarApplyBtn.addEventListener('click', async () => {
            if (!supabase || !pendingAvatarFile) return;

            const { data: { session } } = await supabase.auth.getSession();
            if (!session) { alert('No autenticado.'); return; }

            avatarApplyBtn.disabled = true;
            avatarApplyBtn.textContent = 'SUBIENDO...';

            const uid = session.user.id;

            // Use a unique filename with timestamp — defeats any CDN/browser cache
            const ext = pendingAvatarFile.type.split('/')[1].replace('jpeg', 'jpg');
            const newPath = `${uid}/avatar_${Date.now()}.${ext}`;

            // Step A: List and delete ALL old avatars for this user
            const { data: existing } = await supabase.storage.from('avatars').list(uid);
            if (existing && existing.length > 0) {
                const oldPaths = existing.map(f => `${uid}/${f.name}`);
                await supabase.storage.from('avatars').remove(oldPaths);
            }

            // Step B: Upload new file
            const { error: uploadErr } = await supabase.storage
                .from('avatars')
                .upload(newPath, pendingAvatarFile, {
                    cacheControl: '60', // short CDN cache since we use unique filenames
                    contentType: pendingAvatarFile.type,
                });

            if (uploadErr) {
                alert('Error al subir: ' + uploadErr.message);
                avatarApplyBtn.disabled = false;
                avatarApplyBtn.textContent = 'APLICAR FOTO';
                return;
            }

            // Step C: Get clean public URL (no cache-buster in DB — we add it at render time)
            const { data: urlData } = supabase.storage.from('avatars').getPublicUrl(newPath);
            const publicUrl = urlData.publicUrl;

            // Step D: Persist URL to DB profile
            const { error: updateErr } = await supabase
                .from('profiles')
                .update({ avatar_url: publicUrl })
                .eq('id', uid);

            if (updateErr) {
                alert('Error al guardar en BD: ' + updateErr.message);
                avatarApplyBtn.disabled = false;
                avatarApplyBtn.textContent = 'APLICAR FOTO';
                return;
            }

            // Step E: Update all avatar elements with the new URL + cache-bust
            setAvatarSrc(publicUrl, panelUsername?.textContent);

            // Reset state
            pendingAvatarFile = null;
            if (avatarUploadInput) avatarUploadInput.value = '';
            if (avatarPreviewWrap) avatarPreviewWrap.style.display = 'none';
            avatarApplyBtn.disabled = false;
            avatarApplyBtn.textContent = 'APLICAR FOTO';
        });
    }

    // Cancel preview
    if (avatarCancelBtn) {
        avatarCancelBtn.addEventListener('click', () => {
            pendingAvatarFile = null;
            if (avatarUploadInput) avatarUploadInput.value = '';
            if (avatarPreviewWrap) avatarPreviewWrap.style.display = 'none';
        });
    }
    // ─────────────────────────────────────────────────────────────────────────

    // Sign out via account panel
    if (signoutBtn) {
        signoutBtn.addEventListener('click', async () => {
            if (supabase) await supabase.auth.signOut();
            closeAccountPanel();
            window.location.reload();
        });
    }

    // Delete account via panel
    if (deleteAccountBtnPanel) {
        deleteAccountBtnPanel.addEventListener('click', async () => {
            if (confirm('¿Seguro? Esta acción borrará tu cuenta, puntos y avatar de forma permanente e irreversible.')) {
                const { data: { session } } = await supabase.auth.getSession();
                if (session) {
                    // Remove all avatar files from storage
                    const { data: existing } = await supabase.storage.from('avatars').list(session.user.id);
                    if (existing && existing.length > 0) {
                        const paths = existing.map(f => `${session.user.id}/${f.name}`);
                        await supabase.storage.from('avatars').remove(paths);
                    }
                }
                const { error } = await supabase.rpc('delete_user_data');
                if (error) alert('Error al borrar cuenta: ' + error.message);
                else {
                    await supabase.auth.signOut();
                    window.location.reload();
                }
            }
        });
    }

    // Auth UI Toggle – only triggers for guests (logged in users use avatar)
    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            if (loginView) loginView.style.display = 'block';
            if (signupView) signupView.style.display = 'none';
            if (profileView) profileView.style.display = 'none';
            if (authModalOverlay) authModalOverlay.style.display = 'flex';
        });
    }

    if (deleteAccountBtn) {
        deleteAccountBtn.addEventListener('click', async () => {
            if (confirm('CONFIRM_ENTITY_DELETION: This will permanently wipe your flags and ranking. Proceed?')) {
                const { error } = await supabase.rpc('delete_user_data');
                if (error) alert('DELETION_ERROR: ' + error.message);
                else {
                    await supabase.auth.signOut();
                    window.location.reload();
                }
            }
        });
    }

    if (authClose) authClose.addEventListener('click', () => authModalOverlay.style.display = 'none');
    if (tabSignup) tabSignup.addEventListener('click', () => {
        loginView.style.display = 'none';
        signupView.style.display = 'block';
    });
    if (tabLoginBack) tabLoginBack.addEventListener('click', () => {
        signupView.style.display = 'none';
        loginView.style.display = 'block';
    });

    // Handle Authentication Forms
    const loginForm = document.getElementById('login-form');
    if (loginForm) {
        loginForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('login-username').value;
            const password = document.getElementById('login-password').value;
            const email = `${username}@bxf.internal`;

            const { data, error } = await supabase.auth.signInWithPassword({
                email,
                password,
            });

            if (error) {
                console.error("DEBUG_LOGIN_FAIL:", error);
                alert('LOGIN_ERROR: ' + error.message);
            } else window.location.reload();
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value;
            const password = document.getElementById('signup-password').value;
            const email = `${username}@bxf.internal`;

            const { data, error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: { data: { username } }
            });

            if (error) {
                console.error("DEBUG_SIGNUP_FAIL:", error);
                const debugDiv = document.getElementById('auth-debug-log');
                if (debugDiv) {
                    debugDiv.style.display = 'block';
                    debugDiv.innerText = `ERROR_LOG: ${error.message || 'Unknown Network Error'}\nDetails: ${JSON.stringify(error)}`;
                }
                alert('SIGNUP_ERROR: Check the debug log below the button.');
            } else {
                localStorage.setItem('show_tutorial', 'true');
                alert('ENTITY_CREATED: Session initialized.');
                window.location.reload();
            }
        });
    }

    // Flag Submission System (Global)
    window.submitFlag = async (challengeId, btn) => {
        if (!supabase) return alert('SISTEMA NO CONFIGURADO');
        
        const input = btn.previousElementSibling;
        const statusEl = btn.parentElement.nextElementSibling;
        const flag = input.value.trim();
        
        if (!flag) return;

        btn.disabled = true;
        btn.textContent = 'CHECKING...';

        try {
            const { data, error } = await supabase.rpc('submit_flag', {
                challenge_id_param: challengeId,
                submitted_flag: flag
            });

            if (error) throw error;

            if (data.success) {
                const langFb = localStorage.getItem('lang') || 'en';
                const isFb = data.first_blood === true;
                if (isFb) {
                    statusEl.textContent = langFb === 'es'
                        ? 'FIRST BLOOD — FLAG CORRECTA.'
                        : 'FIRST BLOOD — FLAG CORRECT.';
                    statusEl.className = 'solve-status success solve-status--first-blood';
                } else {
                    statusEl.textContent = 'ACCESS GRANTED. FLAG CORRECT.';
                    statusEl.className = 'solve-status success';
                }
                const card = btn.closest('.ctf-item');
                if (card) {
                    card.classList.add('solved');
                    if (isFb) {
                        card.classList.add('ctf-item--first-blood');
                        let strip = card.querySelector('.ctf-first-blood');
                        if (!strip) {
                            strip = document.createElement('div');
                            strip.className = 'ctf-first-blood';
                            const anchor = card.querySelector('.flag-submission');
                            if (anchor) anchor.before(strip);
                            else card.querySelector('.ctf-link')?.appendChild(strip);
                        }
                        let uname = '—';
                        const { data: sess } = await supabase.auth.getSession();
                        if (sess.session) {
                            const { data: prof } = await supabase
                                .from('profiles')
                                .select('username')
                                .eq('id', sess.session.user.id)
                                .maybeSingle();
                            uname = prof?.username || '—';
                        }
                        strip.classList.add('has-fb');
                        strip.innerHTML = `<span class="ctf-fb-badge">FIRST BLOOD</span><span class="ctf-fb-user">@${escapeHtml(uname)}</span>`;
                        if (window.__bxfFbMap && typeof window.__bxfFbMap.set === 'function') {
                            window.__bxfFbMap.set(challengeId, { username: uname, at: new Date().toISOString() });
                        }
                    }
                } else {
                    const legacy = btn.parentElement && btn.parentElement.parentElement && btn.parentElement.parentElement.parentElement;
                    if (legacy) legacy.classList.add('solved');
                }
                // Refresh points
                updateUserProfile();
            } else {
                statusEl.textContent = 'ACCESS DENIED. flag_hash_mismatch_error';
                statusEl.className = 'solve-status error';
                console.log("Error logic:", data.message);
            }
        } catch (err) {
            console.error(err);
            statusEl.textContent = 'SYSTEM_ERROR: ' + err.message;
            statusEl.className = 'solve-status error';
        } finally {
            btn.disabled = false;
            btn.textContent = 'VALIDATE';
        }
    };

    // Update User Profile & Points
    const updateUserProfile = async () => {
        if (!supabase) return;
        const { data: { session } } = await supabase.auth.getSession();
        if (session) {
            window._hasSession = true;
            const { data: profile } = await supabase
                .from('profiles')
                .select('*')
                .eq('id', session.user.id)
                .single();
            
            if (profile) {
                if (pointsDisplay) pointsDisplay.textContent = profile.points;

                // Fetch rank position
                const { data: allProfiles } = await supabase
                    .from('profiles')
                    .select('id, points')
                    .order('points', { ascending: false });
                let userRank = '--';
                if (allProfiles && rankDisplay) {
                    const pos = allProfiles.findIndex(p => p.id === session.user.id) + 1;
                    userRank = pos > 0 ? '#' + pos : '--';
                    rankDisplay.textContent = userRank;
                }

                // Show avatar, hide login button
                if (userStats) userStats.style.display = 'flex';
                if (authBtn) authBtn.style.display = 'none';
                if (avatarWrapper) avatarWrapper.style.display = 'block';

                // Populate account panel with Rank System
                if (panelUsername) panelUsername.textContent = profile.username || 'ENTITY';
                
                const rankInfo = getRankInfo(profile.points || 0);
                if (panelStats) {
                    panelStats.innerHTML = `
                        <div class="rank-name" style="color: ${rankInfo.color}; font-weight: 800; font-family: var(--font-mono); font-size: 0.85rem; margin-bottom: 8px; letter-spacing: 1px;">
                            [ ${rankInfo.name} ]
                        </div>
                        <div class="rank-progress-container" style="width: 100%; height: 6px; background: rgba(255,255,255,0.05); border-radius: 3px; overflow: hidden; margin-bottom: 8px;">
                            <div class="rank-progress-bar" style="width: ${rankInfo.progress}%; height: 100%; background: ${rankInfo.color}; border-radius: 3px; box-shadow: 0 0 10px ${rankInfo.color}; transition: width 1s ease;"></div>
                        </div>
                        <div style="font-size: 0.7rem; color: var(--text-dim); display:flex; justify-content: space-between; font-family: var(--font-mono); letter-spacing: 0.5px;">
                            <div>
                                <span data-en="RANK: " data-es="RANGO: ">RANK: </span><span style="color:white;">${userRank}</span>
                                <span style="margin: 0 8px; opacity: 0.3;">|</span>
                                <span style="color:white;">${profile.points} PTS</span>
                            </div>
                            <div style="text-align: right; color: ${rankInfo.color}; opacity: 0.8;">
                                ${rankInfo.next ? (rankInfo.next.min - profile.points) + ' TO NEXT' : 'MAX_LEVEL'}
                            </div>
                        </div>
                    `;

                    // Update header rank color too
                    if (rankDisplay) rankDisplay.style.color = rankInfo.color;

                    const headerXpFill = document.getElementById('header-xp-fill');
                    const headerRankName = document.getElementById('header-rank-name');
                    const headerXpBar = document.getElementById('header-xp-bar');
                    if (headerXpFill && rankInfo) {
                        headerXpFill.style.width = `${rankInfo.progress}%`;
                        headerXpFill.style.background = `linear-gradient(90deg, ${rankInfo.color}, #89dceb)`;
                    }
                    if (headerRankName && rankInfo) {
                        headerRankName.textContent = rankInfo.name;
                        headerRankName.style.color = rankInfo.color;
                    }
                    if (headerXpBar && rankInfo) {
                        headerXpBar.setAttribute('aria-valuenow', String(Math.round(rankInfo.progress)));
                    }
                }

                // Load avatar from DB (visible to all)
                setAvatarSrc(profile.avatar_url || null, profile.username || 'ENTITY');

                try {
                    const ri = getRankInfo(profile.points || 0);
                    const prevTier = localStorage.getItem('bxf_cached_rank_name');
                    if (prevTier && prevTier !== ri.name) {
                        const langN = localStorage.getItem('lang') || 'es';
                        await supabase.rpc('push_my_notification', {
                            p_type: 'rank_up',
                            p_title: langN === 'es' ? 'Nuevo rango desbloqueado' : 'New rank tier unlocked',
                            p_body: langN === 'es' ? `Rango: ${ri.name}` : `Tier: ${ri.name}`,
                            p_payload: { tier: ri.name }
                        });
                    }
                    localStorage.setItem('bxf_cached_rank_name', ri.name);
                } catch (_) {
                    /* RPC opcional si no hay migración */
                }
            }

            // Fire tutorial AFTER auth resolves (per-account key with userId)
            if (window.checkAndShowTutorial) {
                window.checkAndShowTutorial(session.user.id);
            }

            ensureBxfNotificationsAssets().then(() => {
                if (window.initBxfNotifications) window.initBxfNotifications();
            });

            // Mark solved challenges
            const { data: solves } = await supabase
                .from('solves')
                .select('challenge_id')
                .eq('user_id', session.user.id);
            
            if (solves) {
                solves.forEach(solve => {
                    const card = document.querySelector(`.ctf-item[data-id="${solve.challenge_id}"]`);
                    if (card) {
                        card.classList.add('solved');
                        const status = card.querySelector('.solve-status');
                        if (status) {
                            status.textContent = 'RESOLVED_BY_ENTITY';
                            status.className = 'solve-status success';
                        }
                    }
                });
            }
        } else {
            // Unauthenticated Guest Detection
            window._hasSession = false;
            // Only trigger guest prompt if language is already chosen
            if (localStorage.getItem('lang')) {
                if (window.startGuestPrompt) {
                    setTimeout(() => window.startGuestPrompt(), 2000);
                }
            }
        }
    };


    // Leaderboard — cache, búsqueda, modal de perfil público
    const lbProfileMap = new Map();
    let lbFullProfiles = [];
    let lbSearchQuery = '';
    let lbScope = 'global';
    let lbCategory = null;
    let lbDifficulty = null;
    let lbViewMode = 'ctf';
    let lbSeasonActive = '-1';
    let lbPrevIndexMap = new Map();
    let lbTablePage = 1;
    const LB_TABLE_PAGE_SIZE = 15;

    const LB_RANK_SNAP_KEY = 'bxf_lb_ranks_v3';
    const readLbRankSnap = () => {
        try {
            return JSON.parse(sessionStorage.getItem(LB_RANK_SNAP_KEY) || '{}');
        } catch {
            return {};
        }
    };
    const lbRankSnapKey = () =>
        `${lbSeasonActive}|${lbScope}|${lbCategory || ''}|${lbDifficulty || ''}`;
    const persistLbRankSnap = (profiles) => {
        const store = readLbRankSnap();
        const m = {};
        profiles.forEach((p, i) => {
            m[p.id] = i + 1;
        });
        store[lbRankSnapKey()] = m;
        sessionStorage.setItem(LB_RANK_SNAP_KEY, JSON.stringify(store));
    };
    const formatLbDelta = (p, newRank) => {
        const prevMap = readLbRankSnap()[lbRankSnapKey()] || {};
        const prev = prevMap[p.id];
        if (prev === undefined) {
            return '<span class="lb-delta lb-delta--new" title="—">·</span>';
        }
        if (prev > newRank) {
            return '<span class="lb-delta lb-delta--up" title="↑">↑</span>';
        }
        if (prev < newRank) {
            return '<span class="lb-delta lb-delta--down" title="↓">↓</span>';
        }
        return '<span class="lb-delta lb-delta--eq">·</span>';
    };
    let lbPublicProfileEscBound = false;

    const PP_LEARN_TOTAL_LINUX = 32;
    const PP_LEARN_TOTAL_BASH = 38;
    const PP_RED_CATS = new Set(['Web', 'Pwn', 'Crypto', 'OSINT']);
    const PP_BLUE_CATS = new Set(['Forensics', 'Reversing', 'Rev', 'Hardware', 'Misc']);

    function ppTeamFromCategory(cat) {
        const c = String(cat || '').trim();
        if (PP_RED_CATS.has(c)) return 'red';
        if (PP_BLUE_CATS.has(c)) return 'blue';
        let h = 0;
        for (let i = 0; i < c.length; i++) h = (h + c.charCodeAt(i) * 17) % 997;
        return (h % 2 === 0) ? 'red' : 'blue';
    }

    function ppHash32(s) {
        let h = 2166136261;
        const str = String(s || '');
        for (let i = 0; i < str.length; i++) {
            h ^= str.charCodeAt(i);
            h = Math.imul(h, 16777619);
        }
        return h >>> 0;
    }

    function ppCountLearnDone() {
        let lx = 0;
        let ba = 0;
        for (let i = 0; i < localStorage.length; i++) {
            const k = localStorage.key(i);
            if (!k || localStorage.getItem(k) !== '1') continue;
            if (k.startsWith('learn_completed_LX-') || /^learn_completed_lin\d+$/.test(k)) lx++;
            else if (k.startsWith('learn_completed_BA-') || /^learn_completed_bash\d+$/.test(k)) ba++;
        }
        return { lx, ba, total: lx + ba };
    }

    function ppTerminalHistoryPreview() {
        try {
            const raw = localStorage.getItem('bxf_term_hist');
            const arr = raw ? JSON.parse(raw) : [];
            if (!Array.isArray(arr) || !arr.length) return [];
            return arr.slice(-8).reverse();
        } catch (e) {
            return [];
        }
    }

    function escapeHtml(s) {
        return String(s ?? '')
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;');
    }

    let _bxfNotifAssets = false;
    function ensureBxfNotificationsAssets() {
        if (_bxfNotifAssets) return Promise.resolve();
        _bxfNotifAssets = true;
        const link = document.createElement('link');
        link.rel = 'stylesheet';
        link.href = '/notifications.css?v=1';
        document.head.appendChild(link);
        return new Promise((resolve) => {
            const s = document.createElement('script');
            s.src = '/notifications.js?v=1';
            s.async = true;
            s.onload = () => resolve();
            s.onerror = () => resolve();
            document.head.appendChild(s);
        });
    }

    const normalizeLbSearch = (s) => (s || '').trim().toLowerCase();

    const filterLbProfiles = (profiles) => {
        const q = normalizeLbSearch(lbSearchQuery);
        if (!q) return profiles;
        return profiles.filter((p) => {
            const u = (p.username || '').toLowerCase();
            const ri = getRankInfo(p.points || 0);
            return u.includes(q) || (ri.name || '').toLowerCase().includes(q);
        });
    };

    const closePublicProfile = () => {
        const modal = document.getElementById('bxf-public-profile');
        if (modal) {
            modal.classList.remove('is-open');
            modal.setAttribute('aria-hidden', 'true');
        }
    };

    const ensurePublicProfileModal = () => {
        const existing = document.getElementById('bxf-public-profile');
        if (existing) {
            const act = existing.querySelector('#bxf-pp-actions');
            if (act) {
                const sec = act.closest('.bxf-pp-section');
                if (sec) sec.remove();
            }
        }
        if (existing && existing.querySelector('#bxf-pp-tabs')) return;
        if (existing) existing.remove();

        const wrap = document.createElement('div');
        wrap.id = 'bxf-public-profile';
        wrap.setAttribute('aria-hidden', 'true');
        wrap.innerHTML = `
            <div class="bxf-pp-card" role="dialog" aria-modal="true" aria-labelledby="bxf-pp-title">
                <div class="bxf-pp-head">
                    <button type="button" class="bxf-pp-close" aria-label="Close">&times;</button>
                    <div class="bxf-pp-hero">
                        <div class="bxf-pp-avatar" id="bxf-pp-avatar"></div>
                        <div class="bxf-pp-hero-main">
                            <h2 class="bxf-pp-name" id="bxf-pp-title">—</h2>
                            <p class="bxf-pp-handle" id="bxf-pp-handle">—</p>
                            <div class="bxf-pp-tier" id="bxf-pp-tier">—</div>
                            <div class="bxf-pp-roles-row">
                                <span class="bxf-pp-pill bxf-pp-pill--red" id="bxf-pp-pill-breaker" title="Red Team">Breaker</span>
                                <span class="bxf-pp-pill bxf-pp-pill--blue" id="bxf-pp-pill-fixer" title="Blue Team">Fixer</span>
                                <span class="bxf-pp-dominant" id="bxf-pp-dominant"></span>
                            </div>
                            <p class="bxf-pp-points" id="bxf-pp-points">0 <span data-en="PTS" data-es="PTS">PTS</span></p>
                            <p class="bxf-pp-country" id="bxf-pp-country" hidden></p>
                        </div>
                    </div>
                </div>
                <p class="bxf-pp-rankline" id="bxf-pp-rankline" hidden></p>
                <div class="bxf-pp-quickstats" id="bxf-pp-quickstats"></div>
                <div class="bxf-pp-tabs" id="bxf-pp-tabs" role="tablist" aria-label="Profile">
                    <button type="button" class="bxf-pp-tab is-active" role="tab" data-tab="overview" aria-selected="true"
                        data-en="Overview" data-es="Resumen">Overview</button>
                    <button type="button" class="bxf-pp-tab" role="tab" data-tab="ctfs" aria-selected="false"
                        data-en="CTFs" data-es="CTFs">CTFs</button>
                    <button type="button" class="bxf-pp-tab" role="tab" data-tab="learn" aria-selected="false"
                        data-en="Learn" data-es="Learn">Learn</button>
                    <button type="button" class="bxf-pp-tab" role="tab" data-tab="terminal" aria-selected="false"
                        data-en="Terminal" data-es="Terminal">Terminal</button>
                    <button type="button" class="bxf-pp-tab" role="tab" data-tab="social" aria-selected="false"
                        data-en="Social" data-es="Social">Social</button>
                    <button type="button" class="bxf-pp-tab" role="tab" data-tab="stats" aria-selected="false"
                        data-en="Stats" data-es="Stats">Stats</button>
                </div>
                <div class="bxf-pp-body">
                    <div class="bxf-pp-tabpanel" id="bxf-pp-tab-overview" data-tab="overview" role="tabpanel">
                        <div class="bxf-pp-section">
                            <h3 class="bxf-pp-section-title" data-en="Rank progress" data-es="Progreso de rango">Rank progress</h3>
                            <div class="bxf-pp-progress-wrap">
                                <div class="bxf-pp-progress-track" role="progressbar" aria-valuemin="0" aria-valuemax="100" aria-valuenow="0" id="bxf-pp-progress-bar">
                                    <div class="bxf-pp-progress-fill" id="bxf-pp-progress-fill" style="width:0%"></div>
                                </div>
                                <p class="bxf-pp-progress-meta" id="bxf-pp-progress-meta"></p>
                            </div>
                        </div>
                        <div class="bxf-pp-section bxf-pp-dna">
                            <h3 class="bxf-pp-section-title" data-en="Hacker DNA" data-es="ADN hacker">Hacker DNA</h3>
                            <p class="bxf-pp-dna-style" id="bxf-pp-dna-style">—</p>
                            <p class="bxf-pp-dna-desc" id="bxf-pp-dna-desc"></p>
                        </div>
                        <div class="bxf-pp-section">
                            <h3 class="bxf-pp-section-title" data-en="Activity" data-es="Actividad">Activity</h3>
                            <div class="bxf-pp-heatmap" id="bxf-pp-heatmap" aria-hidden="true"></div>
                            <p class="bxf-pp-heatmap-legend" data-en="Intensity ≈ CTF + platform events (simulated grid from your ID)." data-es="Intensidad ≈ CTF + actividad (cuadrícula derivada de tu ID).">Intensity ≈ CTF + platform events (simulated grid from your ID).</p>
                        </div>
                        <div class="bxf-pp-section">
                            <h3 class="bxf-pp-section-title" data-en="Next targets" data-es="Próximos objetivos">Next targets</h3>
                            <ul class="bxf-pp-next" id="bxf-pp-next"></ul>
                        </div>
                        <div class="bxf-pp-section bxf-pp-section--note">
                            <h3 class="bxf-pp-section-title" data-en="Bio" data-es="Bio">Bio</h3>
                            <p class="bxf-pp-note" id="bxf-pp-note"></p>
                        </div>
                    </div>
                    <div class="bxf-pp-tabpanel" id="bxf-pp-tab-ctfs" data-tab="ctfs" role="tabpanel" hidden>
                        <div class="bxf-pp-section">
                            <h3 class="bxf-pp-section-title" data-en="Solved challenges" data-es="Retos resueltos">Solved challenges</h3>
                            <div class="bxf-pp-table-wrap"><table class="bxf-pp-table" id="bxf-pp-ctf-table"><thead><tr>
                                <th data-en="Challenge" data-es="Reto">Challenge</th>
                                <th data-en="Category" data-es="Cat.">Category</th>
                                <th data-en="Difficulty" data-es="Dif.">Difficulty</th>
                                <th data-en="First blood" data-es="1.º sangre">First blood</th>
                                <th data-en="Solved" data-es="Fecha">Solved</th>
                            </tr></thead><tbody id="bxf-pp-ctf-tbody"></tbody></table></div>
                        </div>
                        <div class="bxf-pp-section">
                            <h3 class="bxf-pp-section-title" data-en="Highlights" data-es="Logros">Highlights</h3>
                            <ul class="bxf-pp-badges" id="bxf-pp-badges"></ul>
                        </div>
                    </div>
                    <div class="bxf-pp-tabpanel" id="bxf-pp-tab-learn" data-tab="learn" role="tabpanel" hidden>
                        <div class="bxf-pp-section" id="bxf-pp-learn-root"></div>
                    </div>
                    <div class="bxf-pp-tabpanel" id="bxf-pp-tab-terminal" data-tab="terminal" role="tabpanel" hidden>
                        <div class="bxf-pp-section" id="bxf-pp-terminal-root"></div>
                    </div>
                    <div class="bxf-pp-tabpanel" id="bxf-pp-tab-social" data-tab="social" role="tabpanel" hidden>
                        <div class="bxf-pp-section" id="bxf-pp-social-root"></div>
                        <div class="bxf-pp-section" id="bxf-pp-social-friend-slot"></div>
                    </div>
                    <div class="bxf-pp-tabpanel" id="bxf-pp-tab-stats" data-tab="stats" role="tabpanel" hidden>
                        <div class="bxf-pp-section" id="bxf-pp-stats-root"></div>
                    </div>
                </div>
            </div>`;
        document.body.appendChild(wrap);
        wrap.addEventListener('click', (e) => {
            if (e.target === wrap) closePublicProfile();
        });
        wrap.querySelector('.bxf-pp-close').addEventListener('click', closePublicProfile);
        wrap.querySelector('.bxf-pp-card').addEventListener('click', (e) => e.stopPropagation());
        wrap.addEventListener('click', (e) => {
            const btn = e.target.closest('button.bxf-pp-add');
            if (!btn) return;
            const pid = btn.getAttribute('data-peer-id');
            if (pid && window._socialAddFriend) window._socialAddFriend(pid, btn);
        });

        const activateTab = (tab) => {
            wrap.querySelectorAll('.bxf-pp-tab').forEach((b) => {
                const on = b.dataset.tab === tab;
                b.classList.toggle('is-active', on);
                b.setAttribute('aria-selected', on ? 'true' : 'false');
            });
            wrap.querySelectorAll('.bxf-pp-tabpanel').forEach((panel) => {
                panel.hidden = panel.dataset.tab !== tab;
            });
        };
        wrap.querySelectorAll('.bxf-pp-tab').forEach((btn) => {
            btn.addEventListener('click', () => activateTab(btn.dataset.tab));
        });
        activateTab('overview');

        if (!lbPublicProfileEscBound) {
            lbPublicProfileEscBound = true;
            document.addEventListener('keydown', (e) => {
                if (e.key !== 'Escape') return;
                const m = document.getElementById('bxf-public-profile');
                if (m && m.classList.contains('is-open')) closePublicProfile();
            });
        }
    };

    const getLbAvatarHtml = (url) => {
        if (url) {
            const safe = String(url).replace(/"/g, '&quot;');
            return `<img src="${safe}" alt="" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
        }
        return `
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" style="width:60%;height:60%;opacity:0.4;">
                        <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"></path>
                        <circle cx="12" cy="7" r="4"></circle>
                    </svg>
                `;
    };

    const openPublicProfileFromLb = async (userId) => {
        if (!supabase) return;
        let p = lbProfileMap.get(userId);
        if (!p) {
            const { data: prof, error } = await supabase
                .from('profiles')
                .select('id, username, points, avatar_url')
                .eq('id', userId)
                .maybeSingle();
            if (error || !prof) return;
            p = prof;
        }
        ensurePublicProfileModal();
        const modal = document.getElementById('bxf-public-profile');
        const pts = p.points || 0;
        const rankInfo = getRankInfo(pts);
        const { data: { session } } = await supabase.auth.getSession();
        const myId = session ? session.user.id : null;
        const isSelf = myId && p.id === myId;
        const lang = localStorage.getItem('lang') || 'en';

        const { data: solves } = await supabase
            .from('solves')
            .select('challenge_id, solved_at')
            .eq('user_id', p.id)
            .order('solved_at', { ascending: false });

        const solveList = solves || [];
        const cIds = [...new Set(solveList.map((s) => s.challenge_id))];
        const chMap = new Map();
        if (cIds.length) {
            const { data: chs } = await supabase.from('challenges').select('id, title, category, difficulty, points').in('id', cIds);
            (chs || []).forEach((c) => chMap.set(c.id, c));
        }

        const { data: fbRows } = await supabase
            .from('challenges')
            .select('id')
            .eq('first_blood_user_id', p.id);
        const fbSet = new Set((fbRows || []).map((r) => r.id));
        const fbN = fbSet.size;

        let redPts = 0;
        let bluePts = 0;
        let redN = 0;
        let blueN = 0;
        solveList.forEach((s) => {
            const c = chMap.get(s.challenge_id);
            if (!c) return;
            const team = ppTeamFromCategory(c.category);
            if (team === 'red') {
                redPts += c.points || 0;
                redN++;
            } else {
                bluePts += c.points || 0;
                blueN++;
            }
        });
        const teamDenom = redPts + bluePts || 1;

        let dominantKey = 'balanced';
        let dominantLabel = lang === 'es' ? 'Operativo equilibrado' : 'Balanced operative';
        if (redPts > bluePts * 1.15) {
            dominantKey = 'breaker';
            dominantLabel = lang === 'es' ? 'Dominante: Breaker (Red Team)' : 'Dominant: Breaker (Red Team)';
        } else if (bluePts > redPts * 1.15) {
            dominantKey = 'fixer';
            dominantLabel = lang === 'es' ? 'Dominante: Fixer (Blue Team)' : 'Dominant: Fixer (Blue Team)';
        }

        const catCount = {};
        solveList.forEach((s) => {
            const c = chMap.get(s.challenge_id);
            const cat = c ? c.category : '?';
            catCount[cat] = (catCount[cat] || 0) + 1;
        });
        const topCat = Object.entries(catCount).sort((a, b) => b[1] - a[1])[0];

        document.getElementById('bxf-pp-title').textContent = p.username || '—';
        document.getElementById('bxf-pp-handle').textContent = `@${String(p.username || 'entity').toLowerCase()}`;

        const tierEl = document.getElementById('bxf-pp-tier');
        tierEl.textContent = `[ ${rankInfo.name} ]`;
        tierEl.style.color = rankInfo.color;
        tierEl.style.borderColor = `${rankInfo.color}44`;

        const brP = document.getElementById('bxf-pp-pill-breaker');
        const fxP = document.getElementById('bxf-pp-pill-fixer');
        if (brP) brP.style.opacity = dominantKey === 'fixer' ? '0.45' : '1';
        if (fxP) fxP.style.opacity = dominantKey === 'breaker' ? '0.45' : '1';
        const domEl = document.getElementById('bxf-pp-dominant');
        if (domEl) domEl.textContent = dominantLabel;

        document.getElementById('bxf-pp-points').innerHTML = `${pts.toLocaleString()} <span data-en="PTS" data-es="PTS">PTS</span>`;

        const flagsN = solveList.length;
        const avgStr = (() => {
            if (solveList.length < 2) return '—';
            const times = solveList.map((s) => new Date(s.solved_at).getTime()).sort((a, b) => a - b);
            let sum = 0;
            for (let i = 1; i < times.length; i++) sum += (times[i] - times[i - 1]);
            const hrs = sum / (times.length - 1) / 3600000;
            if (hrs < 120) return `${hrs.toFixed(1)} h`;
            return `${(hrs / 24).toFixed(1)} d`;
        })();
        const ratioExpl = lang === 'es' ? 'N/D: el ratio detallado no es público' : 'N/A: detailed ratio not public';

        let gRank = '—';
        const rankLine = document.getElementById('bxf-pp-rankline');
        if (rankLine && lbFullProfiles && lbFullProfiles.length) {
            const gi = lbFullProfiles.findIndex((x) => x.id === p.id);
            if (gi >= 0) {
                gRank = '#' + (gi + 1);
                rankLine.hidden = false;
                rankLine.textContent = lang === 'es'
                    ? `Clasificación en esta vista: ${gRank} de ${lbFullProfiles.length} entidades`
                    : `Ranking in this view: ${gRank} of ${lbFullProfiles.length} entities`;
            } else rankLine.hidden = true;
        } else if (rankLine) rankLine.hidden = true;

        const qs = document.getElementById('bxf-pp-quickstats');
        if (qs) {
            qs.innerHTML = `
                <div class="bxf-pp-qs-item"><span class="bxf-pp-qs-k">${lang === 'es' ? 'XP total' : 'Total XP'}</span><span class="bxf-pp-qs-v">${pts.toLocaleString()}</span></div>
                <div class="bxf-pp-qs-item"><span class="bxf-pp-qs-k">${lang === 'es' ? 'Nivel' : 'Tier'}</span><span class="bxf-pp-qs-v" style="color:${rankInfo.color}">${rankInfo.name}</span></div>
                <div class="bxf-pp-qs-item"><span class="bxf-pp-qs-k">${lang === 'es' ? 'Ranking' : 'Rank'}</span><span class="bxf-pp-qs-v">${gRank}</span></div>
                <div class="bxf-pp-qs-item"><span class="bxf-pp-qs-k">${lang === 'es' ? 'Flags' : 'Flags'}</span><span class="bxf-pp-qs-v">${flagsN}</span></div>
                <div class="bxf-pp-qs-item"><span class="bxf-pp-qs-k">${lang === 'es' ? 'First bloods' : 'First bloods'}</span><span class="bxf-pp-qs-v">${fbN}</span></div>
                <div class="bxf-pp-qs-item"><span class="bxf-pp-qs-k">${lang === 'es' ? 'Δ media' : 'Avg gap'}</span><span class="bxf-pp-qs-v">${avgStr}</span></div>
                <div class="bxf-pp-qs-item"><span class="bxf-pp-qs-k">${lang === 'es' ? 'Ratio' : 'Ratio'}</span><span class="bxf-pp-qs-v" title="${ratioExpl.replace(/"/g, '&quot;')}">${lang === 'es' ? 'N/D' : 'N/A'}</span></div>`;
        }

        const fill = document.getElementById('bxf-pp-progress-fill');
        const meta = document.getElementById('bxf-pp-progress-meta');
        const bar = document.getElementById('bxf-pp-progress-bar');
        if (fill && meta && bar) {
            const pct = Math.round(rankInfo.progress);
            fill.style.width = `${pct}%`;
            fill.style.background = `linear-gradient(90deg, ${rankInfo.color}, #89dceb)`;
            bar.setAttribute('aria-valuenow', String(pct));
            if (rankInfo.next) {
                const need = Math.max(0, rankInfo.next.min - pts);
                meta.textContent = lang === 'es'
                    ? `Faltan ${need.toLocaleString()} pts para ${rankInfo.next.name}`
                    : `${need.toLocaleString()} pts to reach ${rankInfo.next.name}`;
            } else {
                meta.textContent = lang === 'es' ? 'Rango máximo en la escala actual.' : 'Maximum tier on the current scale.';
            }
        }

        let dnaTitle = lang === 'es' ? 'Operador híbrido' : 'Hybrid operator';
        if (dominantKey === 'breaker') {
            dnaTitle = (topCat && topCat[0] === 'Web')
                ? (lang === 'es' ? 'Especialista Web ofensivo' : 'Offensive Web specialist')
                : (lang === 'es' ? 'Exploitador agresivo' : 'Aggressive exploiter');
        } else if (dominantKey === 'fixer') {
            dnaTitle = lang === 'es' ? 'Analista forense / Blue' : 'Forensic / Blue analyst';
        }
        const dnaStyleEl = document.getElementById('bxf-pp-dna-style');
        const dnaDescEl = document.getElementById('bxf-pp-dna-desc');
        if (dnaStyleEl) dnaStyleEl.textContent = dnaTitle;
        if (dnaDescEl) {
            const tc = topCat ? topCat[0] : '—';
            dnaDescEl.textContent = lang === 'es'
                ? `Enfoque frecuente: ${tc}. Crédito Red ${Math.round((redPts / teamDenom) * 100)}% · Blue ${Math.round((bluePts / teamDenom) * 100)}%. Fortaleza: volumen en ${tc}. Siguiente paso: ampliar categorías débiles.`
                : `Frequent focus: ${tc}. Red credit ${Math.round((redPts / teamDenom) * 100)}% · Blue ${Math.round((bluePts / teamDenom) * 100)}%. Strength: depth in ${tc}. Next: diversify weak categories.`;
        }

        const hm = document.getElementById('bxf-pp-heatmap');
        if (hm) {
            const h0 = ppHash32(p.id);
            const cells = [];
            for (let i = 0; i < 49; i++) {
                const v = (((h0 >> (i % 11)) + i * 17) & 255) / 255;
                const level = Math.min(4, Math.floor(v * 5));
                cells.push(`<span class="bxf-pp-hm-cell l${level}"></span>`);
            }
            hm.innerHTML = cells.join('');
        }

        const nextEl = document.getElementById('bxf-pp-next');
        if (nextEl) {
            nextEl.innerHTML = lang === 'es'
                ? '<li><a href="/season0.html">CTF Season 0</a> — retos por categoría y dificultad.</li><li><a href="/learn.html">Learn</a> — Linux, Bash y más.</li><li><a href="/terminal.html">BXF Terminal</a> — práctica de shell.</li>'
                : '<li><a href="/season0.html">CTF Season 0</a> — challenges by category &amp; difficulty.</li><li><a href="/learn.html">Learn</a> — Linux, Bash, and more.</li><li><a href="/terminal.html">BXF Terminal</a> — shell practice.</li>';
        }

        const note = document.getElementById('bxf-pp-note');
        if (note) {
            note.innerHTML = lang === 'es'
                ? 'Los <strong>puntos</strong> vienen de flags válidas. <strong>Breaker / Fixer</strong> reparte el crédito de CTF por categoría (ofensivo vs análisis). Esto no incluye datos privados del navegador (Learn / historial terminal).'
                : '<strong>Points</strong> come from valid flags. <strong>Breaker / Fixer</strong> splits CTF credit by category (offensive vs forensic-style). This does not include private browser data (Learn / terminal history).';
        }

        document.getElementById('bxf-pp-avatar').innerHTML = getLbAvatarHtml(p.avatar_url);

        const tb = document.getElementById('bxf-pp-ctf-tbody');
        if (tb) {
            tb.innerHTML = '';
            const slice = solveList.slice(0, 100);
            if (!slice.length) {
                tb.innerHTML = `<tr><td colspan="5" class="bxf-pp-muted">${lang === 'es' ? 'Sin resoluciones registradas.' : 'No solves on record.'}</td></tr>`;
            } else {
                slice.forEach((s) => {
                    const c = chMap.get(s.challenge_id);
                    const tr = document.createElement('tr');
                    const fbCell = fbSet.has(s.challenge_id)
                        ? (lang === 'es' ? 'Sí' : 'Yes')
                        : '—';
                    tr.innerHTML = `<td>${c ? escapeHtml(c.title) : escapeHtml(s.challenge_id)}</td><td>${c ? escapeHtml(c.category) : '—'}</td><td>${c ? escapeHtml(c.difficulty) : '—'}</td><td class="bxf-pp-fb-cell">${fbCell}</td><td>${String(s.solved_at || '').slice(0, 10)}</td>`;
                    tb.appendChild(tr);
                });
            }
        }

        const badgeEl = document.getElementById('bxf-pp-badges');
        if (badgeEl) {
            const badges = [];
            if (flagsN >= 1) badges.push(`<li class="bxf-pp-badge"><span class="bxf-pp-badge-r r-common">${lang === 'es' ? 'Común' : 'Common'}</span> ${lang === 'es' ? 'Primera flag' : 'First flag'}</li>`);
            if (fbN >= 1) badges.push(`<li class="bxf-pp-badge"><span class="bxf-pp-badge-r r-epic">${lang === 'es' ? 'Épica' : 'Epic'}</span> ${lang === 'es' ? `First blood ×${fbN}` : `First blood ×${fbN}`}</li>`);
            if (flagsN >= 5) badges.push(`<li class="bxf-pp-badge"><span class="bxf-pp-badge-r r-rare">${lang === 'es' ? 'Rara' : 'Rare'}</span> ${lang === 'es' ? 'Racha de resoluciones' : 'Solve streak'}</li>`);
            const insane = solveList.some((s) => {
                const c = chMap.get(s.challenge_id);
                return c && String(c.difficulty).toLowerCase() === 'insane';
            });
            if (insane) badges.push(`<li class="bxf-pp-badge"><span class="bxf-pp-badge-r r-legendary">${lang === 'es' ? 'Legendaria' : 'Legendary'}</span> ${lang === 'es' ? 'Reto Insane completado' : 'Insane challenge cleared'}</li>`);
            badgeEl.innerHTML = badges.length ? badges.join('') : `<li class="bxf-pp-muted">${lang === 'es' ? 'Sin insignias aún.' : 'No badges yet.'}</li>`;
        }

        const learnRoot = document.getElementById('bxf-pp-learn-root');
        if (learnRoot) {
            if (isSelf) {
                const { lx, ba } = ppCountLearnDone();
                const pL = Math.min(100, Math.round((lx / PP_LEARN_TOTAL_LINUX) * 100));
                const pB = Math.min(100, Math.round((ba / PP_LEARN_TOTAL_BASH) * 100));
                learnRoot.innerHTML = `
                    <h3 class="bxf-pp-section-title" data-en="Learn tracks" data-es="Rutas Learn">Learn tracks</h3>
                    <div class="bxf-pp-learn-row"><span>Linux</span><div class="bxf-pp-mini-track"><div style="width:${pL}%"></div></div><span>${pL}% (${lx}/${PP_LEARN_TOTAL_LINUX})</span></div>
                    <div class="bxf-pp-learn-row"><span>Bash</span><div class="bxf-pp-mini-track"><div style="width:${pB}%"></div></div><span>${pB}% (${ba}/${PP_LEARN_TOTAL_BASH})</span></div>
                    <p class="bxf-pp-muted" style="margin-top:12px;font-size:0.78rem;">${lang === 'es' ? 'El progreso se guarda en este navegador.' : 'Progress is stored in this browser.'}</p>
                    <p class="bxf-pp-skills"><strong>${lang === 'es' ? 'Skills' : 'Skills'}:</strong> ${lang === 'es' ? 'Deriva de lecciones completadas (local).' : 'Derived from completed lessons (local).'}</p>`;
            } else {
                learnRoot.innerHTML = `<p class="bxf-pp-muted">${lang === 'es' ? 'El progreso Learn es privado (local a cada navegador).' : 'Learn progress is private (per-browser).'}</p>`;
            }
        }

        const termRoot = document.getElementById('bxf-pp-terminal-root');
        if (termRoot) {
            const terminalOsTip =
                lang === 'es'
                    ? 'Recomendamos usar tu propio sistema operativo (p. ej. Linux en una VM o dual boot) para practicar de verdad. La terminal del navegador es un sandbox limitado.'
                    : 'We recommend using your own operating system (e.g. Linux in a VM or dual boot) for real practice. The in-browser terminal is a limited sandbox.';
            const osTipBlock = `<p class="bxf-pp-muted bxf-pp-terminal-os-tip" style="font-size:0.74rem;line-height:1.45;margin-bottom:12px;padding:10px 12px;border-radius:8px;border:1px solid rgba(137,220,235,0.22);background:rgba(137,220,235,0.06);">${escapeHtml(terminalOsTip)}</p>`;
            if (isSelf) {
                const hist = ppTerminalHistoryPreview();
                const lines = hist.length
                    ? `<ul class="bxf-pp-cmd-list">${hist.map((c) => `<li><code>${escapeHtml(String(c).slice(0, 120))}</code></li>`).join('')}</ul>`
                    : `<p class="bxf-pp-muted">${lang === 'es' ? 'Sin historial en este dispositivo.' : 'No history on this device.'}</p>`;
                termRoot.innerHTML = `
                    ${osTipBlock}
                    <h3 class="bxf-pp-section-title" data-en="Command history" data-es="Historial de comandos">Command history</h3>
                    ${lines}
                    <p class="bxf-pp-muted" style="font-size:0.78rem;">${lang === 'es' ? 'Alias y dotfiles: próximamente en tu cuenta.' : 'Aliases & dotfiles: coming to your account settings.'}</p>`;
            } else {
                termRoot.innerHTML = `${osTipBlock}<p class="bxf-pp-muted">${lang === 'es' ? 'El historial de terminal es privado.' : 'Terminal history is private.'}</p>`;
            }
        }

        const socRoot = document.getElementById('bxf-pp-social-root');
        if (socRoot) {
            const feed = solveList.slice(0, 6).map((s) => {
                const c = chMap.get(s.challenge_id);
                const name = c ? c.title : s.challenge_id;
                return `<li>${lang === 'es' ? 'Resolvió' : 'Solved'} <strong>${escapeHtml(name)}</strong> · ${String(s.solved_at || '').slice(0, 10)}</li>`;
            }).join('');
            socRoot.innerHTML = `
                <h3 class="bxf-pp-section-title" data-en="Recent activity" data-es="Actividad reciente">Recent activity</h3>
                ${feed ? `<ul class="bxf-pp-feed">${feed}</ul>` : `<p class="bxf-pp-muted">${lang === 'es' ? 'Sin actividad reciente.' : 'No recent activity.'}</p>`}
                <p class="bxf-pp-muted" style="font-size:0.78rem;margin-top:10px;">${lang === 'es' ? 'Equipos y amigos: usa el widget social.' : 'Teams & friends: use the social widget.'}</p>`;
        }
        const friendSlot = document.getElementById('bxf-pp-social-friend-slot');
        if (friendSlot) {
            if (!isSelf && myId && window._socialAddFriend) {
                friendSlot.innerHTML = `<button type="button" class="bxf-pp-add bxf-pp-add--wide" data-peer-id="${escapeHtml(p.id)}" data-en="+ Add friend" data-es="+ Añadir amigo">+ Add friend</button>`;
            } else {
                friendSlot.innerHTML = '';
            }
        }

        const statsRoot = document.getElementById('bxf-pp-stats-root');
        if (statsRoot) {
            statsRoot.innerHTML = `
                <div class="bxf-pp-teamgrid">
                    <div class="bxf-pp-teamcol bxf-pp-teamcol--red">
                        <h4>Breaker · Red</h4>
                        <p class="bxf-pp-big">${redN} ${lang === 'es' ? 'retos' : 'solves'}</p>
                        <p>${lang === 'es' ? 'Puntos' : 'Points'}: ${redPts.toLocaleString()} (${Math.round((redPts / teamDenom) * 100)}%)</p>
                    </div>
                    <div class="bxf-pp-teamcol bxf-pp-teamcol--blue">
                        <h4>Fixer · Blue</h4>
                        <p class="bxf-pp-big">${blueN} ${lang === 'es' ? 'retos' : 'solves'}</p>
                        <p>${lang === 'es' ? 'Puntos' : 'Points'}: ${bluePts.toLocaleString()} (${Math.round((bluePts / teamDenom) * 100)}%)</p>
                    </div>
                </div>
                <p class="bxf-pp-muted" style="margin-top:14px;font-size:0.8rem;">${lang === 'es' ? 'Categorías: Web/Pwn/Crypto/OSINT → Red; Forensics/Rev/Hardware/Misc → Blue.' : 'Categories: Web/Pwn/Crypto/OSINT → Red; Forensics/Rev/Hardware/Misc → Blue.'}</p>`;
        }

        modal.querySelectorAll('.bxf-pp-section-title[data-en][data-es], .bxf-pp-tab[data-en][data-es], #bxf-pp-heatmap-legend[data-en][data-es], .bxf-pp-table th[data-en][data-es]').forEach((el) => {
            if (el.getAttribute(`data-${lang}`)) el.textContent = el.getAttribute(`data-${lang}`);
        });
        friendSlot && friendSlot.querySelectorAll('[data-en][data-es]').forEach((el) => {
            if (el.getAttribute(`data-${lang}`)) el.textContent = el.getAttribute(`data-${lang}`);
        });

        modal.classList.add('is-open');
        modal.setAttribute('aria-hidden', 'false');
    };

    const paintLbMeta = (profiles, myId) => {
        const lang = localStorage.getItem('lang') || 'en';
        const riv = document.getElementById('lb-rivalry');
        const rivBody = document.getElementById('lb-rivalry-body');
        const nr = document.getElementById('lb-next-rank');
        const nrBody = document.getElementById('lb-next-rank-body');
        if (!riv || !rivBody || !nr || !nrBody) return;

        if (!myId || !profiles.length) {
            riv.hidden = true;
            nr.hidden = true;
            return;
        }

        const ix = profiles.findIndex((x) => x.id === myId);
        if (ix < 0) {
            riv.hidden = true;
            nr.hidden = true;
            return;
        }

        const me = profiles[ix];
        const above = ix > 0 ? profiles[ix - 1] : null;
        const below = ix < profiles.length - 1 ? profiles[ix + 1] : null;
        const gapUp = above ? Math.max(0, (above.points || 0) - (me.points || 0)) : 0;
        const gapDown = below ? Math.max(0, (me.points || 0) - (below.points || 0)) : 0;

        riv.hidden = false;
        rivBody.innerHTML = `
            <span class="lb-tag">#${ix + 1}</span>
            ${above ? `<span>${lang === 'es' ? 'Arriba' : 'Above'}: <strong>${escapeHtml(above.username)}</strong> (+${gapUp.toLocaleString()} PTS)</span>` : `<span>${lang === 'es' ? 'Cima del grid' : 'Top of grid'}</span>`}
            ${below ? `<span>${lang === 'es' ? 'Debajo' : 'Below'}: <strong>${escapeHtml(below.username)}</strong> (${gapDown.toLocaleString()} PTS ahead)</span>` : `<span>${lang === 'es' ? 'Último en esta vista' : 'Last in this view'}</span>`}
        `;

        const rki = getRankInfo(me.points || 0);
        nr.hidden = false;
        if (rki.next) {
            const need = Math.max(0, rki.next.min - (me.points || 0));
            nrBody.innerHTML = `
                <div style="font-size:0.78rem;color:rgba(205,208,214,0.9);margin-bottom:6px;">${lang === 'es' ? 'Siguiente' : 'Next'}: <strong style="color:${rki.next.color || '#cba6f7'}">${rki.next.name}</strong> — ${lang === 'es' ? 'faltan' : 'need'} <strong>${need.toLocaleString()}</strong> PTS</div>
                <div class="lb-next-rank__bar"><div class="lb-next-rank__fill" style="width:${Math.min(100, rki.progress)}%;background:linear-gradient(90deg,${rki.color},#89dceb);"></div></div>`;
        } else {
            nrBody.innerHTML = `<p style="margin:0;font-size:0.78rem;">${lang === 'es' ? 'Rango máximo en la escala actual.' : 'Maximum tier on the current scale.'}</p>`;
        }
    };

    const paintLearnLeaderboardPanel = () => {
        const ctf = document.getElementById('lb-ctf-stack');
        const learn = document.getElementById('lb-learn-dashboard');
        const clans = document.getElementById('lb-clans-dashboard');
        if (ctf) ctf.hidden = true;
        if (clans) clans.hidden = true;
        if (!learn) return;
        learn.hidden = false;
        const root = document.getElementById('lb-learn-bars-root');
        if (!root) return;
        const { lx, ba } = ppCountLearnDone();
        const pL = Math.min(100, Math.round((lx / PP_LEARN_TOTAL_LINUX) * 100));
        const pB = Math.min(100, Math.round((ba / PP_LEARN_TOTAL_BASH) * 100));
        const lang = localStorage.getItem('lang') || 'en';
        root.innerHTML = `
            <div class="lb-learn-row"><span>Linux</span><div class="lb-mini-track"><div style="width:${pL}%"></div></div><span>${pL}% (${lx}/${PP_LEARN_TOTAL_LINUX})</span></div>
            <div class="lb-learn-row"><span>Bash</span><div class="lb-mini-track"><div style="width:${pB}%"></div></div><span>${pB}% (${ba}/${PP_LEARN_TOTAL_BASH})</span></div>
            <p style="margin-top:14px;font-size:0.72rem;opacity:0.75;">${lang === 'es' ? 'Los demás usuarios no ven tu progreso Learn.' : 'Other users cannot see your Learn progress.'}</p>`;
    };

    const paintClansLeaderboardPanel = async () => {
        const ctf = document.getElementById('lb-ctf-stack');
        const learn = document.getElementById('lb-learn-dashboard');
        const clans = document.getElementById('lb-clans-dashboard');
        if (ctf) ctf.hidden = true;
        if (learn) learn.hidden = true;
        if (!clans) return;
        clans.hidden = false;
        const root = document.getElementById('lb-clans-root');
        if (!root || !supabase) return;

        const lang = localStorage.getItem('lang') || 'en';
        const sidParsed = lbSeasonActive === '-1' ? -1 : parseInt(lbSeasonActive, 10);
        const sidParam = Number.isFinite(sidParsed) ? sidParsed : -1;
        const seasonLabel = sidParam === -1
            ? (lang === 'es' ? 'Global (todas las temporadas)' : 'Global (all seasons)')
            : `${lang === 'es' ? 'Temporada' : 'Season'} ${sidParam}`;
        root.innerHTML = `<p class="lb-clans-muted">${lang === 'es' ? 'Cargando escuadras…' : 'Loading squads…'}</p>`;

        const callTeamsRpc = async (fn, args = {}) => {
            const withSeason = { ...args, p_season_id: sidParam };
            const first = await supabase.rpc(fn, withSeason);
            const msg = String((first && first.error && first.error.message) || '').toLowerCase();
            if (first.error && (msg.includes('p_season_id') || msg.includes('function') || msg.includes('does not exist'))) {
                return supabase.rpc(fn, args);
            }
            return first;
        };

        const { data: rows, error } = await callTeamsRpc('get_team_leaderboard');
        const { data: myT } = await callTeamsRpc('get_my_team');
        const { data: pending } = await callTeamsRpc('get_pending_team_invites');

        if (error) {
            root.innerHTML = `<div class="lb-clans-error"><p>${lang === 'es' ? 'Ejecuta la migración SQL en Supabase (scratch/bxf_notifications_teams_migration.sql y scratch/teams_competitions_season_migration.sql) para activar escuadras por competición.' : 'Run SQL migrations in Supabase (scratch/bxf_notifications_teams_migration.sql and scratch/teams_competitions_season_migration.sql) to enable competition squads.'}</p></div>`;
            return;
        }

        const myTeam = myT && myT.ok ? myT.team : null;
        const myTeamId = myTeam && myTeam.id ? myTeam.id : null;

        let myBlock = '';
        if (myTeam) {
            myBlock = `
                <div class="lb-clans-my">
                    <h3>${lang === 'es' ? 'Tu escuadra' : 'Your squad'}</h3>
                    <p><strong>[${escapeHtml(myTeam.tag)}]</strong> ${escapeHtml(myTeam.name)} · ${myTeam.role === 'owner' ? (lang === 'es' ? 'Líder' : 'Leader') : (lang === 'es' ? 'Miembro' : 'Member')}</p>
                    <p class="lb-clans-muted">${lang === 'es' ? 'Ámbito' : 'Scope'}: ${escapeHtml(seasonLabel)}</p>
                    <button type="button" class="lb-clans-btn danger" id="lb-leave-team">${lang === 'es' ? 'Abandonar / disolver' : 'Leave / disband'}</button>
                </div>`;
        } else {
            myBlock = `
                <div class="lb-clans-create">
                    <h3>${lang === 'es' ? 'Crear escuadra' : 'Create squad'}</h3>
                    <p class="lb-clans-muted">${lang === 'es' ? 'Ámbito activo' : 'Active scope'}: ${escapeHtml(seasonLabel)}</p>
                    <form id="lb-create-team-form" class="lb-clans-form">
                        <input type="text" id="lb-team-name" maxlength="40" placeholder="${lang === 'es' ? 'Nombre visible' : 'Display name'}" required />
                        <input type="text" id="lb-team-tag" maxlength="5" placeholder="TAG" class="lb-team-tag-input" required />
                        <button type="submit" class="lb-clans-btn primary">${lang === 'es' ? 'Crear' : 'Create'}</button>
                    </form>
                </div>`;
        }

        let invitesBlock = '';
        const pend = Array.isArray(pending) ? pending : [];
        if (pend.length) {
            invitesBlock =
                `<div class="lb-clans-invites"><h3>${lang === 'es' ? 'Invitaciones pendientes' : 'Pending invites'}</h3>` +
                pend
                    .map(
                        (inv) => `
                    <div class="lb-clans-invite-row">
                        <span>[${escapeHtml(inv.tag)}] ${escapeHtml(inv.name)}</span>
                        <button type="button" class="lb-clans-btn primary lb-acc-inv" data-id="${inv.id}">${lang === 'es' ? 'Aceptar' : 'Accept'}</button>
                        <button type="button" class="lb-clans-btn lb-dec-inv" data-id="${inv.id}">${lang === 'es' ? 'Rechazar' : 'Decline'}</button>
                    </div>`
                    )
                    .join('') +
                '</div>';
        }

        let tableHtml = '';
        const list = rows || [];
        if (list.length === 0) {
            tableHtml = `<p class="lb-clans-muted">${lang === 'es' ? 'Aún no hay escuadras en el grid.' : 'No squads on the grid yet.'}</p>`;
        } else {
            tableHtml =
                '<table class="lb-clans-table"><thead><tr><th>#</th><th>Tag</th><th>Name</th><th>PTS</th><th>Mem</th></tr></thead><tbody>' +
                list
                    .map(
                        (r, i) =>
                            `<tr><td>${i + 1}</td><td>[${escapeHtml(r.tag)}]</td><td>${escapeHtml(r.name)}</td><td>${Number(r.total_points || 0).toLocaleString()}</td><td>${r.member_count}</td></tr>`
                    )
                    .join('') +
                '</tbody></table>';
        }

        let inviteForm = '';
        if (myTeam && myTeam.role === 'owner') {
            inviteForm = `
                <div class="lb-clans-invite-user">
                    <h3>${lang === 'es' ? 'Invitar operador' : 'Invite operator'}</h3>
                    <form id="lb-invite-team-form" class="lb-clans-form">
                        <input type="text" id="lb-invite-username" placeholder="username" required />
                        <button type="submit" class="lb-clans-btn primary">${lang === 'es' ? 'Enviar' : 'Send'}</button>
                    </form>
                </div>`;
        }

        root.innerHTML = myBlock + inviteForm + invitesBlock + tableHtml;

        document.getElementById('lb-create-team-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            if (sidParam === -1) {
                window.alert(lang === 'es' ? 'Selecciona una temporada concreta para crear escuadra de competición.' : 'Select a specific season to create a competition squad.');
                return;
            }
            const name = document.getElementById('lb-team-name').value.trim();
            const tag = document.getElementById('lb-team-tag').value.trim().toUpperCase();
            const { data } = await callTeamsRpc('create_team', { p_name: name, p_tag: tag });
            if (data && data.ok) await paintClansLeaderboardPanel();
            else window.alert((data && data.error) || 'Error');
        });

        document.getElementById('lb-invite-team-form')?.addEventListener('submit', async (e) => {
            e.preventDefault();
            const un = document.getElementById('lb-invite-username').value.trim();
            if (!myTeamId) return;
            const { data } = await supabase.rpc('invite_to_team', { p_team_id: myTeamId, p_username: un });
            if (data && data.ok) window.alert(lang === 'es' ? 'Invitación enviada' : 'Invite sent');
            else window.alert((data && data.error) || 'Error');
        });

        document.getElementById('lb-leave-team')?.addEventListener('click', async () => {
            if (!myTeamId) return;
            if (!window.confirm(lang === 'es' ? '¿Seguro? El líder disuelve el equipo.' : 'Sure? As owner you will disband the squad.')) return;
            const { data } = await supabase.rpc('leave_team', { p_team_id: myTeamId });
            if (data && data.ok) await paintClansLeaderboardPanel();
        });

        document.querySelectorAll('.lb-acc-inv').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                const { data } = await supabase.rpc('respond_team_invite', { p_invite_id: id, p_accept: true });
                if (data && data.ok) await paintClansLeaderboardPanel();
            });
        });
        document.querySelectorAll('.lb-dec-inv').forEach((btn) => {
            btn.addEventListener('click', async () => {
                const id = parseInt(btn.getAttribute('data-id'), 10);
                await supabase.rpc('respond_team_invite', { p_invite_id: id, p_accept: false });
                await paintClansLeaderboardPanel();
            });
        });
    };

    window._bxfRefreshClansPanel = () => {
        if (lbViewMode === 'clans') paintClansLeaderboardPanel();
    };

    const paintLeaderboard = async (profiles) => {
        const body = document.getElementById('leaderboard-body');
        const podiumEl = document.getElementById('lb-podium');
        const banner = document.getElementById('lb-filter-banner');
        if (!body && !podiumEl) return;

        lbProfileMap.clear();
        profiles.forEach((p) => lbProfileMap.set(p.id, p));

        const q = normalizeLbSearch(lbSearchQuery);
        const display = filterLbProfiles(profiles);
        const maxPts = profiles[0] ? (profiles[0].points || 1) : 1;

        const { data: { session } } = await supabase.auth.getSession();
        const myId = session ? session.user.id : null;

        if (banner) {
            banner.style.display = q ? 'block' : 'none';
            const lang = localStorage.getItem('lang') || 'en';
            if (banner.getAttribute(`data-${lang}`)) banner.innerHTML = banner.getAttribute(`data-${lang}`);
        }

        if (podiumEl) {
            if (q) {
                podiumEl.innerHTML = '';
                podiumEl.style.display = 'none';
            } else {
                podiumEl.style.display = '';
                podiumEl.innerHTML = '';
                const top3 = profiles.slice(0, 3);
                const classes = ['p2', 'p1', 'p3'];
                const visualOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

                visualOrder.forEach((p, vi) => {
                    const realIdx = top3.indexOf(p);
                    const isSelf = myId && p.id === myId;
                    const h = realIdx === 0 ? 300 : (realIdx === 1 ? 240 : 180);
                    const avatarContent = getLbAvatarHtml(p.avatar_url);
                    const rankInfo = getRankInfo(p.points || 0);
                    const fl = p.flags != null ? p.flags : '—';
                    const mo = p.momentum != null ? p.momentum : '—';

                    const card = document.createElement('div');
                    card.className = `podium-card ${classes[vi]}${isSelf ? ' lb-self' : ''}`;
                    card.dataset.userId = p.id;
                    card.style.height = `${h}px`;
                    card.title = `Flags: ${fl} · 14d: ${mo}`;
                    card.innerHTML = `
                        <div class="podium-rank-badge">#${realIdx + 1}</div>
                        <div class="podium-avatar">${avatarContent}</div>
                        <div class="podium-name">${p.username}</div>
                        <div class="podium-pts">${p.points.toLocaleString()} PTS</div>
                        <div class="podium-meta"><span class="podium-tier" style="color:${rankInfo.color}">${rankInfo.name}</span> · <span class="podium-momentum">⚡ ${mo}</span> · ${fl} flags</div>
                        ${!isSelf ? `<button class="lb-add-btn" data-peer-id="${p.id}" onclick="event.stopPropagation();window._socialAddFriend('${p.id}', this)" data-en="+ Add" data-es="+ Añadir">+ Add</button>` : ''}
                    `;
                    podiumEl.appendChild(card);
                });
            }
        }

        if (body) {
            body.innerHTML = '';
            const tableRows = q ? display : profiles.slice(3);
            const pagerEl = document.getElementById('lb-table-pager');
            const renderLbPager = (total, page, pageSize) => {
                if (!pagerEl) return;
                const totalPages = Math.max(1, Math.ceil(total / pageSize));
                if (page > totalPages) lbTablePage = totalPages;
                const pActive = Math.min(page, totalPages);
                if (total === 0 || total <= pageSize) {
                    pagerEl.hidden = true;
                    pagerEl.innerHTML = '';
                    return;
                }
                pagerEl.hidden = false;
                const lang = localStorage.getItem('lang') || 'en';
                const prevDis = pActive <= 1;
                const nextDis = pActive >= totalPages;
                const startN = (pActive - 1) * pageSize + 1;
                const endN = Math.min(pActive * pageSize, total);
                const meta =
                    lang === 'es'
                        ? `Filas ${startN}–${endN} de ${total} · pág. ${pActive} / ${totalPages}`
                        : `Rows ${startN}–${endN} of ${total} · page ${pActive} / ${totalPages}`;
                pagerEl.innerHTML = `
                    <button type="button" class="lb-table-pager__btn" ${prevDis ? 'disabled' : ''} data-lb-pager="-1" aria-label="${lang === 'es' ? 'Anterior' : 'Previous'}">←</button>
                    <span class="lb-table-pager__meta">${meta}</span>
                    <button type="button" class="lb-table-pager__btn" ${nextDis ? 'disabled' : ''} data-lb-pager="1" aria-label="${lang === 'es' ? 'Siguiente' : 'Next'}">→</button>`;
                pagerEl.querySelectorAll('[data-lb-pager]').forEach((btn) => {
                    btn.addEventListener('click', () => {
                        const dir = parseInt(btn.getAttribute('data-lb-pager'), 10);
                        lbTablePage = Math.max(1, lbTablePage + dir);
                        paintLeaderboard(lbFullProfiles);
                    });
                });
            };

            if (q && display.length === 0) {
                body.innerHTML = '<tr><td colspan="9" class="lb-loading" data-en="NO MATCHES" data-es="SIN COINCIDENCIAS">SIN COINCIDENCIAS</td></tr>';
                renderLbPager(0, 1, LB_TABLE_PAGE_SIZE);
            } else if (!tableRows.length) {
                body.innerHTML = '';
                renderLbPager(0, 1, LB_TABLE_PAGE_SIZE);
            } else {
                const totalPagesTbl = Math.max(1, Math.ceil(tableRows.length / LB_TABLE_PAGE_SIZE));
                if (lbTablePage > totalPagesTbl) lbTablePage = totalPagesTbl;
                const t0 = (lbTablePage - 1) * LB_TABLE_PAGE_SIZE;
                const pageSlice = tableRows.slice(t0, t0 + LB_TABLE_PAGE_SIZE);

                pageSlice.forEach((p, i) => {
                    const idx = t0 + i;
                    const rank = q ? idx + 1 : idx + 4;
                    const pct = Math.round((p.points / maxPts) * 100);
                    const isSelf = myId && p.id === myId;
                    const avatarContent = getLbAvatarHtml(p.avatar_url);
                    const rankInfo = getRankInfo(p.points || 0);
                    const prevI = lbPrevIndexMap.get(p.id);
                    const newI = profiles.findIndex((x) => x.id === p.id);

                    const row = document.createElement('tr');
                    row.className = isSelf ? 'lb-self' : '';
                    if (!q && prevI !== undefined && newI >= 0) {
                        if (newI < prevI) row.classList.add('lb-row--up');
                        else if (newI > prevI) row.classList.add('lb-row--down');
                    }
                    row.dataset.userId = p.id;
                    const deltaHtml = q ? '<span class="lb-delta lb-delta--eq">·</span>' : formatLbDelta(p, rank);
                    const fl = p.flags != null ? String(p.flags) : '—';
                    const mo = p.momentum != null ? String(p.momentum) : '—';

                    row.innerHTML = `
                        <td class="lb-rank">#${rank}</td>
                        <td>
                            <div class="lb-user">
                                <div class="lb-avatar-sm">${avatarContent}</div>
                                <div class="lb-user__name"><span class="lb-username">${p.username}</span></div>
                            </div>
                        </td>
                        <td class="lb-tier-cell" style="color:${rankInfo.color}">${rankInfo.name}</td>
                        <td class="lb-score-cell">${p.points.toLocaleString()}</td>
                        <td class="lb-flags-cell">${fl}</td>
                        <td class="lb-momo">${mo}</td>
                        <td class="lb-delta-cell">${deltaHtml}</td>
                        <td class="lb-bar-cell">
                            <div class="lb-bar-bg"><div class="lb-bar-fill" style="width:${pct}%"></div></div>
                        </td>
                        <td class="lb-action">${!isSelf ? `<button class="lb-add-btn" data-peer-id="${p.id}" onclick="event.stopPropagation();window._socialAddFriend('${p.id}', this)" data-en="+ Add" data-es="+ Añadir">+ Add</button>` : ''}</td>
                    `;
                    body.appendChild(row);
                });
                renderLbPager(tableRows.length, lbTablePage, LB_TABLE_PAGE_SIZE);
            }
        }

        lbPrevIndexMap = new Map(profiles.map((p, i) => [p.id, i]));
        persistLbRankSnap(profiles);
        paintLbMeta(profiles, myId);

        if (window._socialSyncLeaderboard) window._socialSyncLeaderboard();

        const currentLang = localStorage.getItem('lang') || 'en';
        document.querySelectorAll('#leaderboard-body [data-en][data-es], #lb-podium [data-en][data-es]').forEach((el) => {
            if (el.getAttribute(`data-${currentLang}`)) el.innerHTML = el.getAttribute(`data-${currentLang}`);
        });
    };

    const renderLeaderboard = async (seasonId) => {
        const body = document.getElementById('leaderboard-body');
        const podiumEl = document.getElementById('lb-podium');
        if (!body && !podiumEl) return;

        lbSeasonActive = seasonId === undefined || seasonId === null ? lbSeasonActive : String(seasonId);

        if (lbViewMode === 'learn') {
            paintLearnLeaderboardPanel();
            return;
        }
        if (lbViewMode === 'clans') {
            await paintClansLeaderboardPanel();
            return;
        }

        const ctf = document.getElementById('lb-ctf-stack');
        const learn = document.getElementById('lb-learn-dashboard');
        const clans = document.getElementById('lb-clans-dashboard');
        if (ctf) ctf.hidden = false;
        if (learn) learn.hidden = true;
        if (clans) clans.hidden = true;

        const v2banner = document.getElementById('lb-v2-banner');
        const sidParsed = lbSeasonActive === '-1' ? -1 : parseInt(lbSeasonActive, 10);
        const sidParam = Number.isFinite(sidParsed) ? sidParsed : -1;
        const { data: { session: sessCheck } } = await supabase.auth.getSession();

        try {
            let rows = [];
            const v2 = await supabase.rpc('get_leaderboard_v2', {
                p_season_id: sidParam,
                p_scope: lbScope,
                p_category: lbCategory,
                p_difficulty: lbDifficulty,
            });

            if (v2.error) {
                console.warn('get_leaderboard_v2:', v2.error);
                const v1 = await supabase.rpc('get_leaderboard', {
                    p_season_id: sidParam === -1 ? null : sidParam,
                });
                if (v1.error) throw v1.error;
                rows = (v1.data || []).map((p) => ({
                    id: p.id,
                    username: p.username,
                    points: Number(p.points),
                    avatar_url: p.avatar_url,
                    flags: null,
                    momentum: null,
                    last_solve_at: null,
                }));
                if (v2banner) {
                    const lang = localStorage.getItem('lang') || 'en';
                    v2banner.textContent =
                        lang === 'es'
                            ? 'Instala get_leaderboard_v2 en Supabase para Red/Blue, amigos, filtros y métricas ⚡ (scratch/leaderboard_v2_migration.sql).'
                            : 'Deploy get_leaderboard_v2 on Supabase for Red/Blue, friends, filters & ⚡ metrics (scratch/leaderboard_v2_migration.sql).';
                }
            } else {
                rows = (v2.data || []).map((r) => ({
                    id: r.id,
                    username: r.username,
                    points: Number(r.pts),
                    avatar_url: r.avatar_url,
                    flags: r.flags != null ? Number(r.flags) : null,
                    momentum: r.momentum != null ? Number(r.momentum) : null,
                    last_solve_at: r.last_solve_at,
                }));
                if (v2banner) v2banner.textContent = '';
            }

            if (
                v2.error &&
                (lbScope !== 'global' || lbCategory || lbDifficulty) &&
                v2banner
            ) {
                const lang = localStorage.getItem('lang') || 'en';
                v2banner.textContent +=
                    lang === 'es'
                        ? ' Filtros de ámbito desactivados hasta migración v2.'
                        : ' Scope filters disabled until v2 migration.';
            }

            if (!rows.length) {
                lbFullProfiles = [];
                const lang = localStorage.getItem('lang') || 'en';
                const msg =
                    lbScope === 'friends' && !sessCheck
                        ? lang === 'es'
                            ? 'INICIA SESIÓN PARA VER AMIGOS'
                            : 'SIGN IN TO VIEW FRIENDS'
                        : lang === 'es'
                          ? 'NO SE ENCONTRARON ENTIDADES'
                          : 'NO_ENTITIES_FOUND';
                if (body) body.innerHTML = `<tr><td colspan="9" class="lb-loading">${msg}</td></tr>`;
                if (podiumEl) podiumEl.innerHTML = '';
                return;
            }

            lbFullProfiles = rows;
            await paintLeaderboard(rows);
        } catch (err) {
            console.error('LEADERBOARD_ERROR:', err);
            if (body) body.innerHTML = '<tr><td colspan="9" class="lb-loading">GRID_DISCONNECTED</td></tr>';
        }
    };

    // Timeline Rendering
    const renderTimeline = (seasons, container) => {
        container.innerHTML = '';
        const path = window.location.pathname;
        
        seasons.forEach(s => {
            const node = document.createElement('div');
            // Detect active season from URL
            const isActive = (s.id === 0 && (path.includes('season0.html') || path.includes('ctf.html'))) || 
                             (s.id !== 0 && path.includes(`season${s.id}.html`));
            
            node.className = `timeline-node${isActive ? ' active' : ''}`;
            node.innerHTML = `
                <div class="node-dot"></div>
                <div class="node-label">${s.name.toUpperCase()}</div>
                <div class="node-status" data-en="${s.is_active ? 'ONLINE' : 'LOCKED'}" data-es="${s.is_active ? 'EN LÍNEA' : 'BLOQUEADO'}">${s.is_active ? 'ONLINE' : 'LOCKED'}</div>
            `;
            node.onclick = () => {
                if (s.id === 0) {
                    window.location.href = 'season0.html';
                } else {
                    window.location.href = `season${s.id}.html`;
                }
            };
            container.appendChild(node);
        });

        // Force translation refresh for timeline
        const currentLang = localStorage.getItem('lang') || 'en';
        container.querySelectorAll('[data-en][data-es]').forEach(el => {
            el.innerHTML = el.getAttribute(`data-${currentLang}`);
        });
    };

    // Global Season Management
    const fetchSeasons = async () => {
        const container = document.getElementById('season-timeline');
        const lbSelector = document.getElementById('season-selector');
        if (!container && !lbSelector) return;

        try {
            const { data: seasons, error } = await supabase.rpc('get_seasons');
            if (error) throw error;

            if (container) renderTimeline(seasons, container);
            if (lbSelector) {
                const currentLang = localStorage.getItem('lang') || 'en';
                lbSelector.innerHTML = '';
                
                // Add "All Time" tab
                const allTab = document.createElement('button');
                allTab.className = 'season-tab active';
                allTab.dataset.id = '-1';
                allTab.innerHTML = `<span class="bracket">[</span> <span data-en="ALL TIME" data-es="GLOBAL">${currentLang === 'es' ? 'GLOBAL' : 'ALL TIME'}</span> <span class="bracket">]</span>`;
                allTab.onclick = () => {
                    document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
                    allTab.classList.add('active');
                    lbSeasonActive = '-1';
                    lbTablePage = 1;
                    renderLeaderboard('-1');
                };
                lbSelector.appendChild(allTab);

                seasons.forEach(s => {
                    const tab = document.createElement('button');
                    tab.className = 'season-tab';
                    tab.dataset.id = s.id;
                    tab.innerHTML = `<span class="bracket">[</span> ${s.name.toUpperCase()} <span class="bracket">]</span>`;
                    tab.onclick = () => {
                        document.querySelectorAll('.season-tab').forEach(t => t.classList.remove('active'));
                        tab.classList.add('active');
                        lbSeasonActive = String(s.id);
                        lbTablePage = 1;
                        renderLeaderboard(s.id);
                    };
                    lbSelector.appendChild(tab);
                });
            }
        } catch (err) {
            console.error("SEASONS_FETCH_ERROR:", err);
            if (container) {
                container.innerHTML = `<div style="color:red;font-size:0.7rem;">[!] TIMELINE_ERR: ${err.message}</div>`;
            }
        }
    };

    const injectAccountFullProfileButton = () => {
        const body = document.querySelector('.account-panel-body');
        if (!body || body.querySelector('.account-full-profile-wrap')) return;
        const wrap = document.createElement('div');
        wrap.className = 'account-full-profile-wrap';
        const btn = document.createElement('button');
        btn.type = 'button';
        btn.className = 'account-full-profile-btn';
        btn.id = 'account-open-full-profile';
        btn.setAttribute('data-en', 'Full profile');
        btn.setAttribute('data-es', 'Perfil completo');
        btn.textContent = 'Perfil completo';
        btn.addEventListener('click', async () => {
            if (!supabase) return;
            const { data: { session } } = await supabase.auth.getSession();
            if (!session) return;
            closeAccountPanel();
            await openPublicProfileFromLb(session.user.id);
        });
        wrap.appendChild(btn);
        body.insertBefore(wrap, body.firstChild);
        const ap = document.getElementById('account-panel');
        if (ap) ap.classList.add('account-panel--enhanced');
    };

    // Initialization
    if (supabase) {
        injectAccountFullProfileButton();
        updateUserProfile();
        fetchSeasons();

        // Apply saved language immediately
        const savedLang = localStorage.getItem('lang') || 'es';
        setLanguage(savedLang);

        const lbSearchEl = document.getElementById('lb-search');
        if (lbSearchEl) {
            lbSearchEl.addEventListener('input', (e) => {
                lbSearchQuery = e.target.value;
                lbTablePage = 1;
                if (lbFullProfiles.length) paintLeaderboard(lbFullProfiles);
            });
        }

        const lbScopeTabs = document.getElementById('lb-scope-tabs');
        if (lbScopeTabs) {
            lbScopeTabs.querySelectorAll('[data-scope]').forEach((btn) => {
                btn.addEventListener('click', () => {
                    lbScope = btn.getAttribute('data-scope') || 'global';
                    lbScopeTabs.querySelectorAll('[data-scope]').forEach((b) => b.classList.toggle('is-active', b === btn));
                    lbTablePage = 1;
                    renderLeaderboard(lbSeasonActive);
                });
            });
        }

        const lbViewTabs = document.getElementById('lb-view-tabs');
        if (lbViewTabs) {
            lbViewTabs.querySelectorAll('[data-view]').forEach((btn) => {
                if (btn.disabled) return;
                btn.addEventListener('click', () => {
                    lbViewMode = btn.getAttribute('data-view') || 'ctf';
                    lbViewTabs.querySelectorAll('[data-view]').forEach((b) => {
                        if (b.disabled) return;
                        b.classList.toggle('is-active', b === btn);
                    });
                    lbTablePage = 1;
                    renderLeaderboard(lbSeasonActive);
                });
            });
        }

        const lbCatFilter = document.getElementById('lb-cat-filter');
        const lbDiffFilter = document.getElementById('lb-diff-filter');
        if (lbCatFilter) {
            lbCatFilter.addEventListener('change', () => {
                lbCategory = lbCatFilter.value || null;
                lbTablePage = 1;
                renderLeaderboard(lbSeasonActive);
            });
        }
        if (lbDiffFilter) {
            lbDiffFilter.addEventListener('change', () => {
                lbDifficulty = lbDiffFilter.value || null;
                lbTablePage = 1;
                renderLeaderboard(lbSeasonActive);
            });
        }

        const lbPodium = document.getElementById('lb-podium');
        const lbBodyEl = document.getElementById('leaderboard-body');
        if (lbPodium) {
            lbPodium.addEventListener('click', (e) => {
                const card = e.target.closest('.podium-card[data-user-id]');
                if (!card || e.target.closest('.lb-add-btn')) return;
                openPublicProfileFromLb(card.dataset.userId);
            });
        }
        if (lbBodyEl) {
            lbBodyEl.addEventListener('click', (e) => {
                const row = e.target.closest('tr[data-user-id]');
                if (!row || e.target.closest('.lb-add-btn')) return;
                openPublicProfileFromLb(row.dataset.userId);
            });
        }

        // Initial data load based on current page
        const isLeaderboard = document.getElementById('leaderboard-body');
        if (isLeaderboard) {
            lbSeasonActive = '-1';
            renderLeaderboard('-1');

            let lbRtTimer;
            const scheduleLbRefresh = () => {
                clearTimeout(lbRtTimer);
                lbRtTimer = setTimeout(() => {
                    if (!document.getElementById('leaderboard-body')) return;
                    if (lbViewMode !== 'ctf') return;
                    renderLeaderboard(lbSeasonActive);
                }, 480);
            };
            if (!window._bxfLbRealtime) {
                window._bxfLbRealtime = true;
                supabase
                    .channel('bxf-lb-live')
                    .on('postgres_changes', { event: '*', schema: 'public', table: 'profiles' }, scheduleLbRefresh)
                    .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'solves' }, scheduleLbRefresh)
                    .subscribe();
            }
        }
    }
});
