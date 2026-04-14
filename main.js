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
    // ---------------------------------
    const setLanguage = (lang) => {
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
            // Apply a brief glitch effect
            toggleBtn.classList.remove('lang-glitch');
            void toggleBtn.offsetWidth; // Trigger reflow
            toggleBtn.classList.add('lang-glitch');
            
            toggleBtn.textContent = lang === 'en' ? 'LC_LANG >> ES' : 'LC_LANG >> EN';
        }

        // Writeups page filtering
        applyWriteupFilters(lang);
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
                    setLanguage(selected);
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

        // Disable DevTools Shortcuts
        document.addEventListener('keydown', (e) => {
            if (
                e.key === 'F12' ||
                (e.ctrlKey && e.shiftKey && (e.key === 'I' || e.key === 'J' || e.key === 'C')) ||
                (e.ctrlKey && e.key === 'U')
            ) {
                e.preventDefault();
                alert('ACCESS DENIED: SYSTEM INTEGRITY PROTECTED_');
                return false;
            }
        });

        // Debugger Trap: freezes browser if DevTools is forced open
        setInterval(() => {
            const startTime = performance.now();
            debugger;
            const endTime = performance.now();
            if (endTime - startTime > 1000) { // Increased to 1s to avoid false positives on mobile/slow devices
                document.body.innerHTML = '<div style="background:#000; color:#ff003c; height:100vh; display:flex; justify-content:center; align-items:center; font-family:monospace; font-size:2rem; text-align:center;">[!] SECURITY BREACH DETECTED<br>SESSION ENCRYPTED AND TERMINATED</div>';
                window.location.reload();
            }
        }, 1000);

        console.log("%c> SYSTEM SECURED_", "color: #ff003c; font-size: 20px; font-weight: bold; text-shadow: 0 0 10px #ff003c;");
        console.log("%cUnauthorized access attempts are logged and reported.", "color: #ff003c;");
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

    // Random System Glitch effect (Throttled)
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

    // ---------------------------------
    // Supabase Backend System
    // ---------------------------------
    // CONFIGURATION
    const SUPABASE_URL = 'https://qkeiajxyynvpybctxxuv.supabase.co'; 
    const SUPABASE_ANON_KEY = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InFrZWlhanh5eW52cHliY3R4eHV2Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzYxMjgxODQsImV4cCI6MjA5MTcwNDE4NH0.JTeODgp_ho_XamO-2oR1h0HT-Sv-v9Fe2vpn4KFgOpE';
    const BACKEND_URL = 'https://breakerxfixer-api.onrender.com/api/v1';

    // [SECURITY TRANSPARENCY] 
    console.log("%c[SYSTEM] Frontend 'lockdown' is thematic. Real security resides in Supabase RLS and Backend Validators.", "color: #00ff3c; font-weight: bold;");
    console.log("%c[SYSTEM] Zero-PII Policy Active. No personal data is stored.", "color: #00ff3c;");

    // Sync API URL in UI
    const apiBaseEl = document.getElementById('api-base-url');
    if (apiBaseEl) apiBaseEl.textContent = BACKEND_URL;

    let supabase = null;
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
        window._sbClient = supabase; // shared with social.js
    }

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

    let pendingAvatarFile = null; // holds the File object pending upload

    // ─── Render avatar URL everywhere (with cache-busting) ────────────────────
    const setAvatarSrc = (url) => {
        // Append cache-buster so browsers always fetch the latest version
        const src = url ? url + '?t=' + Date.now() : null;
        const escaped = src ? src.replace(/"/g, '&quot;') : null;
        const img = escaped
            ? `<img src="${escaped}" alt="avatar" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
            : '👾';
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

    // ─── Step 1: user picks a file → show preview ─────────────────────────────
    const ALLOWED_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp', 'image/gif']);
    const MAX_SIZE_BYTES = 2 * 1024 * 1024; // 2 MB

    if (avatarUploadInput) {
        avatarUploadInput.addEventListener('change', (e) => {
            const file = e.target.files[0];
            if (!file) return;

            // [SEC] Client-side validation
            if (!ALLOWED_TYPES.has(file.type)) {
                alert('INVALID_FORMAT: Solo se permiten JPEG, PNG, WebP o GIF.');
                avatarUploadInput.value = '';
                return;
            }
            if (file.size > MAX_SIZE_BYTES) {
                alert('ARCHIVO_MUY_GRANDE: El tamaño máximo es 2 MB.');
                avatarUploadInput.value = '';
                return;
            }

            pendingAvatarFile = file;

            // Show local preview immediately (no upload yet)
            const reader = new FileReader();
            reader.onload = (ev) => {
                if (avatarPreviewEl) {
                    avatarPreviewEl.innerHTML = `<img src="${ev.target.result}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`;
                }
                if (avatarPreviewWrap) avatarPreviewWrap.style.display = 'block';
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
            setAvatarSrc(publicUrl);

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
                statusEl.textContent = 'ACCESS GRANTED. FLAG CORRECT.';
                statusEl.className = 'solve-status success';
                btn.parentElement.parentElement.parentElement.classList.add('solved');
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

                // Populate account panel
                if (panelUsername) panelUsername.textContent = profile.username || 'ENTITY';
                if (panelStats) panelStats.textContent = `RANK ${userRank}  |  ${profile.points} PTS`;

                // Load avatar from DB (visible to all)
                setAvatarSrc(profile.avatar_url || null);
            }

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
        }
    };


    // Leaderboard Renderer (Seasons Aware)
    const renderLeaderboard = async (seasonId = 0) => {
        const body = document.getElementById('leaderboard-body');
        const podiumEl = document.getElementById('lb-podium');
        if (!body && !podiumEl) return;

        try {
            const { data: profiles, error } = await supabase.rpc('get_leaderboard', {
                p_season_id: seasonId === "-1" ? null : parseInt(seasonId)
            });

            if (error) throw error;
            if (!profiles || profiles.length === 0) {
                if (body) body.innerHTML = '<tr><td colspan="4" class="lb-loading">NO_ENTITIES_FOUND</td></tr>';
                if (podiumEl) podiumEl.innerHTML = '';
                return;
            }

            // Get current user id
            const { data: { session } } = await supabase.auth.getSession();
            const myId = session ? session.user.id : null;
            const maxPts = profiles[0] ? profiles[0].points : 1;

            // Render podium (top 3)
            if (podiumEl) {
                podiumEl.innerHTML = '';
                const top3 = profiles.slice(0, 3);
                const classes = ['p2', 'p1', 'p3']; // Silver, Gold, Bronze
                const medals = ['🥈', '🥇', '🥉'];
                const visualOrder = [top3[1], top3[0], top3[2]].filter(Boolean);

                visualOrder.forEach((p, vi) => {
                    const realIdx = top3.indexOf(p);
                    const isSelf = myId && p.id === myId;
                    const h = realIdx === 0 ? 300 : (realIdx === 1 ? 240 : 180);
                    const avatarHtml = p.avatar_url
                        ? `<img src="${p.avatar_url}" style="width:100%;height:100%;object-fit:cover;border-radius:50%;">`
                        : medals[realIdx];

                    const card = document.createElement('div');
                    card.className = `podium-card ${classes[vi]}${isSelf ? ' lb-self' : ''}`;
                    card.style.height = `${h}px`;
                    card.innerHTML = `
                        <div class="podium-rank-badge">#${realIdx + 1}</div>
                        <div class="podium-avatar">${avatarHtml}</div>
                        <div class="podium-name">${p.username}</div>
                        <div class="podium-pts">${p.points.toLocaleString()} PTS</div>
                    `;
                    podiumEl.appendChild(card);
                });
            }

            // Render rest (rank 4+)
            if (body) {
                body.innerHTML = '';
                profiles.slice(3).forEach((p, i) => {
                    const rank = i + 4;
                    const pct = Math.round((p.points / maxPts) * 100);
                    const isSelf = myId && p.id === myId;
                    const row = document.createElement('tr');
                    row.className = isSelf ? 'lb-self' : '';
                    row.innerHTML = `
                        <td class="lb-rank">#${rank}</td>
                        <td><span class="lb-username">${p.username}</span></td>
                        <td class="lb-bar-cell">
                            <div class="lb-bar-bg"><div class="lb-bar-fill" style="width:${pct}%"></div></div>
                        </td>
                        <td class="lb-pts">${p.points.toLocaleString()} PTS</td>
                    `;
                    body.appendChild(row);
                });
            }
        } catch (err) {
            console.error("LEADERBOARD_ERROR:", err);
            if (body) body.innerHTML = '<tr><td colspan="4" class="lb-loading">GRID_DISCONNECTED</td></tr>';
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
                <div class="node-status">${s.is_active ? 'ONLINE' : 'LOCKED'}</div>
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
                const currentVal = lbSelector.value;
                lbSelector.innerHTML = '<option value="-1">ALL_TIME</option>';
                seasons.forEach(s => {
                    const opt = document.createElement('option');
                    opt.value = s.id;
                    opt.textContent = s.name.toUpperCase();
                    lbSelector.appendChild(opt);
                });
                lbSelector.value = currentVal;
                lbSelector.onchange = (e) => renderLeaderboard(e.target.value);
            }
        } catch (err) {
            console.error("SEASONS_FETCH_ERROR:", err);
            if (container) {
                container.innerHTML = `<div style="color:red;font-size:0.7rem;">[!] TIMELINE_ERR: ${err.message}</div>`;
            }
        }
    };

    // Initialization
    if (supabase) {
        updateUserProfile();
        fetchSeasons();
        
        // Initial data load based on current page
        const isCtf = document.getElementById('challenges-grid');
        const isLeaderboard = document.getElementById('leaderboard-body');
        
        if (isCtf) fetchChallenges(0);
        if (isLeaderboard) renderLeaderboard(0);
    }
});
