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
        const writeupItems = document.querySelectorAll('.writeup-item[data-postlang]');
        if (writeupItems.length > 0) {
            writeupItems.forEach(item => {
                if (item.getAttribute('data-postlang') === lang) {
                    item.style.display = '';
                } else {
                    item.style.display = 'none';
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
    const SUPABASE_URL = 'https://qkeiajsyynvpybctxxuv.supabase.co'; 
    const SUPABASE_ANON_KEY = 'sb_publishable_zT08uTMPGCKTJ72SMyMZtw_4ttOaKr8';

    let supabase = null;
    if (SUPABASE_URL !== 'YOUR_SUPABASE_URL') {
        supabase = window.supabase.createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
    }

    // UI Elements
    const authBtn = document.getElementById('auth-btn');
    const authModalOverlay = document.getElementById('auth-modal-overlay');
    const authClose = document.getElementById('auth-close');
    const userStats = document.getElementById('user-stats');
    const pointsDisplay = userStats ? userStats.querySelector('.pts') : null;

    const loginView = document.getElementById('auth-login-view');
    const signupView = document.getElementById('auth-signup-view');
    const profileView = document.getElementById('user-profile-view');
    const tabSignup = document.getElementById('tab-signup');
    const tabLoginBack = document.getElementById('tab-login-back');
    const deleteAccountBtn = document.getElementById('delete-account-btn');

    // Auth UI Toggle
    if (authBtn) {
        authBtn.addEventListener('click', async () => {
            const { data: { session } } = await supabase.auth.getSession();
            if (session) {
                // Toggle between statistics and options or just sign out
                // For now, let's show the profile view to allow deletion
                loginView.style.display = 'none';
                signupView.style.display = 'none';
                profileView.style.display = 'block';
                authModalOverlay.style.display = 'flex';
            } else {
                profileView.style.display = 'none';
                signupView.style.display = 'none';
                loginView.style.display = 'block';
                authModalOverlay.style.display = 'flex';
            }
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
            const email = document.getElementById('login-email').value;
            const password = document.getElementById('login-password').value;
            const { error } = await supabase.auth.signInWithPassword({ email, password });
            if (error) alert('LOGIN ERROR: ' + error.message);
            else window.location.reload();
        });
    }

    const signupForm = document.getElementById('signup-form');
    if (signupForm) {
        signupForm.addEventListener('submit', async (e) => {
            e.preventDefault();
            const username = document.getElementById('signup-username').value;
            const email = document.getElementById('signup-email').value;
            const password = document.getElementById('signup-password').value;
            const { error } = await supabase.auth.signUp({ 
                email, 
                password,
                options: { data: { username } }
            });
            if (error) alert('SIGNUP ERROR: ' + error.message);
            else alert('REGISTRO COMPLETADO. Revisa tu email si es necesario o intenta entrar.');
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
                if (userStats) userStats.style.display = 'block';
                if (authBtn) authBtn.textContent = 'TERMINATE_SESSION';
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

    // Leaderboard Renderer
    const renderLeaderboard = async () => {
        const body = document.getElementById('leaderboard-body');
        if (!body) return;

        const { data: profiles, error } = await supabase
            .from('profiles')
            .select('username, points')
            .order('points', { ascending: false })
            .limit(50);

        if (error) {
            body.innerHTML = '<tr><td colspan="3">ERROR_GRID_DISCONNECT</td></tr>';
            return;
        }

        body.innerHTML = '';
        profiles.forEach((p, index) => {
            const row = document.createElement('tr');
            row.className = `leaderboard-row ${index < 3 ? 'top-3' : ''}`;
            row.innerHTML = `
                <td class="rank-cell rank-${index+1}">#${index + 1}</td>
                <td class="user-cell">${p.username}</td>
                <td class="points-cell">${p.points} PTS</td>
            `;
            body.appendChild(row);
        });
    };

    // Initialization
    if (supabase) {
        updateUserProfile();
        renderLeaderboard();
    }
});
