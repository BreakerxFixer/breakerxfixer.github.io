/* 🤖 BREAKER_X_FIXER: HUD_TUTORIAL_SUBSYSTEM */

const tutorialData = {
    en: [
        {
            title: "> SYSTEM_INITIALIZED",
            desc: "Welcome to the Breaker && Fixer technical lab. I will guide you through our operational sectors.",
            target: null // Welcome screen
        },
        {
            title: "> NAVIGATION_CORE",
            desc: "Use the top navigation to switch between technical Writeups, CTF Sectors, and the Hall of Fame (Leaderboard).",
            target: ".top-nav"
        },
        {
            title: "> LANGUAGE_TRANSCEIVER",
            desc: "The system supports dual-language output. Toggle between English and Spanish here at any time.",
            target: "#lang-toggle"
        },
        {
            title: "> IDENTITY_STATUS",
            desc: "Monitor your rank position and accumulated points here. Your progress is updated in real-time.",
            target: ".nav-profile"
        },
        {
            title: "> OPERATIONAL_WIDGET",
            desc: "Manage your social connections, friend requests, and secure communications through this terminal.",
            target: ".social-toggle-btn"
        },
        {
            title: "> TERMINAL_HACKER",
            desc: "New: use the built-in browser terminal to run curl, encode/decode, hash, python and more — directly from the site. No local tools needed.",
            target: "a[href='/terminal.html']"
        },
        {
            title: "> INITIALIZATION_COMPLETE",
            desc: "You are now synchronized with the grid. Explore to understand, analyze to secure. Stay undetected.",
            target: null
        }
    ],
    es: [
        {
            title: "> SISTEMA_INICIALIZADO",
            desc: "Bienvenido al laboratorio técnico de Breaker && Fixer. Te guiaré a través de nuestros sectores operativos.",
            target: null
        },
        {
            title: "> NÚCLEO_NAVEGACIÓN",
            desc: "Usa la navegación superior para alternar entre Writeups técnicos, Sectores CTF y el Salón de la Fama (Leaderboard).",
            target: ".top-nav"
        },
        {
            title: "> TRANCEPTOR_IDIOMA",
            desc: "El sistema soporta salida bilingüe. Alterna entre Inglés y Español aquí en cualquier momento.",
            target: "#lang-toggle"
        },
        {
            title: "> ESTADO_IDENTIDAD",
            desc: "Monitorea tu posición en el rango y tus puntos acumulados aquí. Tu progreso se actualiza en tiempo real.",
            target: ".nav-profile"
        },
        {
            title: "> WIDGET_OPERATIVO",
            desc: "Gestiona tus conexiones sociales, solicitudes de amistad y comunicaciones seguras a través de este terminal.",
            target: ".social-toggle-btn"
        },
        {
            title: "> TERMINAL_HACKER",
            desc: "Nuevo: usa el terminal del navegador integrado para ejecutar curl, encode/decode, hash, python y más — directamente desde el sitio. Sin herramientas locales.",
            target: "a[href='/terminal.html']"
        },
        {
            title: "> INICIALIZACIÓN_COMPLETA",
            desc: "Ahora estás sincronizado con la red. Explora para comprender, analiza para asegurar. Mantente indetectado.",
            target: null
        }
    ]
};

const guestData = {
    en: [
        {
            title: "> UNAUTHENTICATED_SESSION",
            desc: "Initialization requires an identity. Please log in or register to track your progress and access competitive sectors.",
            target: "#auth-btn"
        }
    ]
};

const ctfTutorialData = {
    en: [
        {
            title: "> CTF_OPERATIONS_INIT",
            desc: "Welcome to the Offensive Sector. Here you will find active contracts and target systems. Ready to hack?",
            target: null
        },
        {
            title: "> 1. CHOOSE_BATTLEFIELD",
            desc: "Click on any node in this timeline to select a campaign. Each season contains different machines to compromise.",
            target: ".seasonal-hub"
        },
        {
            title: "> 2. INTEL_ACQUIRED",
            desc: "This is your TARGET_URL. All challenges on this page originate from this API. You will need it for your tools.",
            target: ".api-target-info"
        },
        {
            title: "> 3. BROWSER_TERMINAL",
            desc: "Use the built-in terminal (> TERMINAL in nav) to run curl, encode, hash and python — no local tools required. Perfect for quick recon.",
            target: "a[href='/terminal.html']"
        },
        {
            title: "> 4. MISSION_EXECUTION",
            desc: "Once you pick a season, machines will appear below. Solve them, find the flag bxf{...}, and paste it to earn points and rank up.",
            target: "#hub-welcome-message"
        }
    ],
    es: [
        {
            title: "> INICIO_OPERACIONES_CTF",
            desc: "Bienvenido al Sector Ofensivo. Aquí encontrarás contratos activos y sistemas objetivo. ¿Listo para hackear?",
            target: null
        },
        {
            title: "> 1. ELIGE_CAMPO_BATALLA",
            desc: "Haz clic en cualquier nodo de este cronograma para seleccionar una campaña. Cada temporada tiene máquinas diferentes.",
            target: ".seasonal-hub"
        },
        {
            title: "> 2. INTELIGENCIA_OBTENIDA",
            desc: "Esta es la URL_OBJETIVO. Todos los retos de esta página salen de esta API. La necesitarás para tus herramientas.",
            target: ".api-target-info"
        },
        {
            title: "> 3. TERMINAL_NAVEGADOR",
            desc: "Usa el terminal integrado (> TERMINAL en la nav) para ejecutar curl, encode, hash y python — sin herramientas locales. Ideal para reconocimiento rápido.",
            target: "a[href='/terminal.html']"
        },
        {
            title: "> 4. EJECUCIÓN_MISIÓN",
            desc: "Al elegir una temporada, aparecerán las máquinas abajo. Resuélvelas, busca la flag bxf{...} y pégala para ganar puntos.",
            target: "#hub-welcome-message"
        }
    ]
};

class TutorialEngine {
    constructor() {
        this.currentStep = 0;
        this.lang = localStorage.getItem('lang') || 'es';
        this.overlay = null;
        this.highlight = null;
        this.card = null;
        this.activeData = tutorialData; // Default to main tutorial
        
        this.init();
    }

    init() {
        // Detect page and setup data
        const isCTFPage = window.location.pathname.includes('ctf.html');
        if (isCTFPage) {
            this.activeData = ctfTutorialData;
            this.storageKeyBase = 'tut_ctf_seen';
        } else {
            this.activeData = tutorialData;
            this.storageKeyBase = 'tut_main_seen';
        }
        this.storageKey = this.storageKeyBase; // may be updated with userId

        // Only build HTML on DOM load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createHTMLElements());
        } else {
            this.createHTMLElements();
        }

        // Expose global trigger — called by main.js AFTER auth + language resolve.
        // _tutCheckDone prevents re-firing on multiple updateUserProfile() calls.
        window.checkAndShowTutorial = (userId) => {
            if (window._tutCheckDone) return; // Already evaluated this page session
            window._tutCheckDone = true;

            // Per-account key: if logged in, tie to userId; otherwise fallback to base key
            this.storageKey = userId
                ? `${this.storageKeyBase}_${userId}`
                : this.storageKeyBase;

            // Update lang from current localStorage (language has been set by this point)
            this.lang = localStorage.getItem('lang') || 'es';

            const tutSeen = localStorage.getItem(this.storageKey);
            // Legacy migration: if old key (no userId) was set, honour it
            const legacySeen = userId ? localStorage.getItem(this.storageKeyBase) : null;
            const forceShow = localStorage.getItem('show_tutorial') === 'true';

            if (forceShow || (!tutSeen && !legacySeen)) {
                setTimeout(() => this.start(), 800);
            } else if (legacySeen && !tutSeen) {
                // Migrate legacy key to per-user key silently
                localStorage.setItem(this.storageKey, 'true');
            }
        };
    }

    createHTMLElements() {
        if (document.getElementById('tutorial-overlay')) return;

        // Overlay & Highlight
        this.overlay = document.createElement('div');
        this.overlay.id = 'tutorial-overlay';
        
        this.highlight = document.createElement('div');
        this.highlight.className = 'tutorial-highlight';
        this.highlight.style.display = 'none';
        
        // Instruction Card
        this.card = document.createElement('div');
        this.card.id = 'tutorial-card';
        
        document.body.appendChild(this.overlay);
        document.body.appendChild(this.highlight);
        document.body.appendChild(this.card);
    }

    start() {
        this.currentStep = 0;
        this.overlay.classList.add('active');
        localStorage.removeItem('show_tutorial');
        this.renderStep();
    }

    renderStep() {
        const steps = this.activeData[this.lang];
        const step = steps[this.currentStep];
        
        // Clear previous highlight
        this.highlight.style.display = 'none';
        
        let btnText = this.lang === 'es' ? 'SIGUIENTE >' : 'NEXT >';
        if (this.currentStep === steps.length - 1) {
            btnText = this.lang === 'es' ? 'ENTENDIDO' : 'CONFIRM';
        }

        this.card.innerHTML = `
            <h3>${step.title}</h3>
            <p>${step.desc}</p>
            <div class="tutorial-btns">
                <button class="tutorial-btn primary" id="tut-next">${btnText}</button>
                <button class="tutorial-btn" id="tut-skip">${this.lang === 'es' ? 'OMITIR' : 'SKIP'}</button>
            </div>
            <div class="tutorial-step-indicator">[ STEP ${this.currentStep + 1} / ${steps.length} ]</div>
        `;

        this.card.classList.add('active');
        
        document.getElementById('tut-next').onclick = () => this.next();
        document.getElementById('tut-skip').onclick = () => this.finish();

        if (step.target) {
            const el = document.querySelector(step.target);
            if (el) {
                this.overlay.style.background = 'transparent';
                this.overlay.style.backdropFilter = 'none';

                // Scroll element into view first, then position after scroll settles
                el.scrollIntoView({ behavior: 'smooth', block: 'center' });
                setTimeout(() => {
                    this.positionHighlight(el);
                    this.positionCardOnTarget(el);
                }, 500); // Wait for smooth scroll to finish
            } else {
                this.overlay.style.background = 'rgba(0, 0, 0, 0.85)';
                this.overlay.style.backdropFilter = 'blur(4px)';
                this.centerCard();
            }
        } else {
            this.overlay.style.background = 'rgba(0, 0, 0, 0.85)';
            this.overlay.style.backdropFilter = 'blur(4px)';
            this.centerCard();
        }
    }

    positionHighlight(el) {
        const rect = el.getBoundingClientRect();
        const padding = 5;
        
        this.highlight.style.display = 'block';
        this.highlight.style.top = `${rect.top - padding}px`;
        this.highlight.style.left = `${rect.left - padding}px`;
        this.highlight.style.width = `${rect.width + padding * 2}px`;
        this.highlight.style.height = `${rect.height + padding * 2}px`;
    }

    positionCardOnTarget(el) {
        const rect = el.getBoundingClientRect();
        const cardWidth = Math.min(350, window.innerWidth - 40);
        const cardHeight = this.card.offsetHeight;
        const padding = 20;
        const viewportWidth = window.innerWidth;
        const viewportHeight = window.innerHeight;

        // Reset transform from centerCard
        this.card.style.transform = 'none';

        // Horizontal Centering logic relative to the element center
        const targetCenterX = rect.left + rect.width / 2;
        let left = targetCenterX - cardWidth / 2;

        // Vertical Positioning
        let top = rect.bottom + padding;

        // Smart Vertical Flip: If target is in the bottom half, place ABOVE it
        if (rect.bottom > viewportHeight * 0.6) {
            top = rect.top - cardHeight - padding;
        }

        // Clamp Horizontal
        if (left + cardWidth > viewportWidth - padding) {
            left = viewportWidth - cardWidth - padding;
        }
        if (left < padding) {
            left = padding;
        }

        // Final Vertical sanity check
        if (top < padding) top = rect.bottom + padding;
        if (top + cardHeight > viewportHeight - padding) top = viewportHeight - cardHeight - padding;

        this.card.style.top = `${top}px`;
        this.card.style.left = `${left}px`;
        this.card.style.maxWidth = `${cardWidth}px`;
    }

    centerCard() {
        this.card.style.top = '50%';
        this.card.style.left = '50%';
        this.card.style.transform = 'translate(-50%, -50%)';
    }

    next() {
        const steps = this.activeData[this.lang];
        if (this.currentStep < steps.length - 1) {
            this.currentStep++;
            this.renderStep();
        } else {
            this.finish();
        }
    }

    finish() {
        this.overlay.classList.remove('active');
        this.card.classList.remove('active');
        this.highlight.style.display = 'none';
        
        // Save that THIS specific tutorial was seen
        localStorage.setItem(this.storageKey, 'true');
        
        // Final cleanup for main tutorial too (legacy compat)
        if (this.activeData === tutorialData) {
            localStorage.setItem('tutorial_done', 'true');
        }
    }

    startGuestPrompt() {
        // Only show once per session to avoid annoyance
        if (sessionStorage.getItem('guest_prompt_seen')) return;
        
        sessionStorage.setItem('guest_prompt_seen', 'true');
        this.activeData = guestData;
        this.start();
    }
}

// Global Replay instance for the Account Panel
window.replayTutorial = () => {
    localStorage.setItem('show_tutorial', 'true');
    window._tutCheckDone = false; // Allow re-evaluation on next checkAndShowTutorial call
    window.location.reload();
};

window.startGuestPrompt = () => {
    if (window._tutEngine) window._tutEngine.startGuestPrompt();
};

const engine = new TutorialEngine();
window._tutEngine = engine;
