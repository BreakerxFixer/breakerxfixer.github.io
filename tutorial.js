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
            title: "> INICIALIZACIÓN_COMPLETA",
            desc: "Ahora estás sincronizado con la red. Explora para comprender, analiza para asegurar. Mantente indetectado.",
            target: null
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
        
        this.init();
    }

    init() {
        // Only run on DOM load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createHTMLElements());
        } else {
            this.createHTMLElements();
        }
        
        // Listen for tutorial trigger
        window.addEventListener('load', () => {
            if (localStorage.getItem('show_tutorial') === 'true') {
                setTimeout(() => this.start(), 1500); // Wait for animations
            }
        });
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
        const steps = tutorialData[this.lang];
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
                this.positionHighlight(el);
                // Use rAF to ensure height is calculated after display:block
                requestAnimationFrame(() => this.positionCardOnTarget(el));
            } else {
                this.centerCard();
            }
        } else {
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
        const steps = tutorialData[this.lang];
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
        localStorage.setItem('tutorial_done', 'true');
    }
}

// Global Replay instance for the Account Panel
window.replayTutorial = () => {
    localStorage.setItem('show_tutorial', 'true');
    window.location.reload();
};

const engine = new TutorialEngine();
