/* 🤖 BREAKER_X_FIXER: HUD_TUTORIAL_SUBSYSTEM */

const tutorialData = {
    en: [
        {
            title: "> SYSTEM_INITIALIZED",
            desc: "Welcome to the Breaker && Fixer technical lab. I will guide you through our operational sectors.",
            target: null // Welcome screen
        },
        {
            title: "> HERO_BREAKER_FIXER",
            desc: "The landing view contrasts Breaker (offensive) and Fixer (defensive) tracks. Buttons jump to the CTF grid, Learn, Terminal and Leaderboard.",
            target: ".bxf-hero"
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
            title: "> HERO_BREAKER_FIXER",
            desc: "La portada contrasta los tracks Breaker (ofensivo) y Fixer (defensivo). Los botones llevan al grid CTF, Learn, Terminal y Leaderboard.",
            target: ".bxf-hero"
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
    ],
    es: [
        {
            title: "> SESIÓN_NO_AUTENTICADA",
            desc: "La inicialización requiere una identidad. Por favor, accede o regístrate para rastrear tu progreso y acceder a los sectores competitivos.",
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
            desc: "This is the unified challenge board. Use search and filters to jump directly to the machine type you want.",
            target: "#ctf-hub"
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
            desc: "All campaigns are merged here. Solve machines, find the flag bxf{...}, and paste it to earn points and rank up.",
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
            desc: "Este es el tablero unificado de retos. Usa búsqueda y filtros para saltar directo al tipo de máquina que quieras.",
            target: "#ctf-hub"
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
            desc: "Todas las campañas están unificadas aquí. Resuelve máquinas, encuentra la flag bxf{...} y pégala para ganar puntos.",
            target: "#hub-welcome-message"
        }
    ]
};

const learnTutorialData = {
    en: [
        {
            title: "> LEARN_ENVIRONMENT_INIT",
            desc: "Welcome to the Learn command center. This path teaches you Linux and Bash from the browser terminal.",
            target: null
        },
        {
            title: "> 1. SELECT MODULE",
            desc: "Choose a lesson card from the learning path to open the integrated training environment.",
            target: ".path-card"
        },
        {
            title: "> 2. REVIEW DIRECTIVES",
            desc: "Read the instructions on the left, then use the terminal to complete the objective.",
            target: ".pane-instructions"
        },
        {
            title: "> 3. WRITE & EXECUTE",
            desc: "Use the built-in terminal or Bash editor to create files, run scripts and solve the exercise.",
            target: ".pane-terminal"
        },
        {
            title: "> 4. VALIDATE OBJECTIVE",
            desc: "When your solution is ready, press VALIDATE OBJECTIVE to verify the lesson and proceed.",
            target: ".ite-action"
        }
    ],
    es: [
        {
            title: "> INICIO_ENTORNO_LEARN",
            desc: "Bienvenido al centro de aprendizaje. Esta ruta te enseña Linux y Bash desde el terminal integrado.",
            target: null
        },
        {
            title: "> 1. SELECCIONA MÓDULO",
            desc: "Elige una tarjeta de lección en la ruta de aprendizaje para abrir el entorno integrado.",
            target: ".path-card"
        },
        {
            title: "> 2. REVISA DIRECTIVAS",
            desc: "Lee las instrucciones a la izquierda y usa el terminal para completar el objetivo.",
            target: ".pane-instructions"
        },
        {
            title: "> 3. ESCRIBE Y EJECUTA",
            desc: "Usa el terminal incorporado o el editor Bash para crear archivos, ejecutar scripts y resolver el ejercicio.",
            target: ".pane-terminal"
        },
        {
            title: "> 4. VALIDA OBJETIVO",
            desc: "Cuando tu solución esté lista, pulsa VALIDATE OBJECTIVE para comprobar la lección y continuar.",
            target: ".ite-action"
        }
    ]
};

const leaderboardTutorialData = {
    en: [
        { title: "> LEADERBOARD_GRID", desc: "This is the competitive scoreboard: live ranks, seasons, Red/Blue split and social scopes.", target: null },
        { title: "> SCOPE_TABS", desc: "Switch between Global, Red Team, Blue Team and Friends to see how standings change by track.", target: "#lb-scope-tabs" },
        { title: "> VIEW_MODES", desc: "CTF / Seasons shows challenge points; Learn ranks lesson progress; Clans shows squad standings when available.", target: "#lb-view-tabs" },
        { title: "> SEASON_TIMELINE", desc: "Pick a season tab to filter scores to that campaign, or All Time for the full history.", target: "#season-selector" },
        { title: "> SEARCH_AND_FILTERS", desc: "Search operators, filter by category and difficulty to find rivals or study the meta.", target: ".lb-toolbar" },
        { title: "> PODIUM_AND_TABLE", desc: "Top three appear on the podium; the grid lists everyone else with points and momentum hints.", target: "#lb-podium" },
        { title: "> GRID_SYNCED", desc: "Scores sync with your CTF solves. Improve rank by clearing challenges and seasonal contracts.", target: "#leaderboard-body" }
    ],
    es: [
        { title: "> GRID_CLASIFICACIÓN", desc: "Aquí está el tablero competitivo: rangos en vivo, temporadas, separación Red/Blue y vista de amigos.", target: null },
        { title: "> PESTAÑAS_ALCANCE", desc: "Alterna entre Global, Red Team, Blue Team y Amigos para ver cómo cambian las posiciones.", target: "#lb-scope-tabs" },
        { title: "> MODOS_VISTA", desc: "CTF / Temporadas muestra puntos de retos; Learn el progreso de lecciones; Clanes a escuadras cuando aplique.", target: "#lb-view-tabs" },
        { title: "> LÍNEA_TEMPORAL", desc: "Elige una temporada para filtrar puntuaciones, o Global para ver todo el histórico.", target: "#season-selector" },
        { title: "> BÚSQUEDA_Y_FILTROS", desc: "Busca operadores, filtra categoría y dificultad para encontrar rivales o ver el meta.", target: ".lb-toolbar" },
        { title: "> PODIO_Y_TABLA", desc: "El top tres va al podio; la tabla lista al resto con puntos e indicadores de momentum.", target: "#lb-podium" },
        { title: "> SINCRONIZADO", desc: "Las puntuaciones siguen tus solves CTF. Sube de rango completando retos y misiones.", target: "#leaderboard-body" }
    ]
};

const writeupsListTutorialData = {
    en: [
        { title: "> WRITEUP_ARCHIVE", desc: "Browse published machine walkthroughs and challenge notes from our lab. Content is searchable and bilingual where noted.", target: null },
        { title: "> SEARCH_FIELD", desc: "Filter by machine name, tags, difficulty or platform. Matching posts stay visible as you type.", target: "#searchInput" },
        { title: "> RESULT_LIST", desc: "Each card opens a full writeup. Language badges help you pick ES/EN versions when both exist.", target: "#writeupsList" },
        { title: "> FROM_SOLVE_TO_DOC", desc: "Many entries tie to CTF or Learn progress — earn the solve first where the platform gates spoilers.", target: ".writeups-header" }
    ],
    es: [
        { title: "> ARCHIVO_WRITEUPS", desc: "Explora writeups de máquinas y notas de retos publicadas en el laboratorio. Búsqueda y, donde aplica, contenido bilingüe.", target: null },
        { title: "> CAMPO_BÚSQUEDA", desc: "Filtra por nombre, tags, dificultad o plataforma. Los resultados se actualizan al escribir.", target: "#searchInput" },
        { title: "> LISTA_RESULTADOS", desc: "Cada tarjeta abre el writeup completo. Las marcas de idioma ayudan a elegir ES/EN.", target: "#writeupsList" },
        { title: "> DEL_SOLVE_AL_DOC", desc: "Muchas entradas enlazan con CTF o Learn: a veces hay que validar el solve antes de ver spoilers.", target: ".writeups-header" }
    ]
};

const writeupReaderTutorialData = {
    en: [
        { title: "> WRITEUP_READER", desc: "You are viewing a long-form article. Scroll for methodology, screenshots and flags — spoilers ahead.", target: null },
        { title: "> TITLE_AND_META", desc: "Title, author and metadata summarize the target. Tags cluster related techniques.", target: "#wv-hero, .writeup-header-meta" },
        { title: "> ARTICLE_BODY", desc: "The body holds the full narrative: recon, exploitation, hardening notes and conclusions.", target: "#wv-body, .writeup-content" },
        { title: "> BACK_TO_INDEX", desc: "Use the Writeups link in the top nav or the back link when present to return to the archive.", target: ".writeups-header, .top-nav a[href*='writeups.html']" }
    ],
    es: [
        { title: "> LECTOR_WRITEUP", desc: "Estás leyendo un artículo largo. Desplázate para metodología, capturas y flags — hay spoilers.", target: null },
        { title: "> TÍTULO_Y_META", desc: "Título, autor y metadatos resumen el objetivo. Los tags agrupan técnicas relacionadas.", target: "#wv-hero, .writeup-header-meta" },
        { title: "> CUERPO", desc: "El cuerpo contiene la narrativa completa: reconocimiento, explotación, endurecimiento y conclusiones.", target: "#wv-body, .writeup-content" },
        { title: "> VOLVER_AL_ÍNDICE", desc: "Usa Writeups en la nav superior o el enlace atrás cuando exista para volver al archivo.", target: ".writeups-header, .top-nav a[href*='writeups.html']" }
    ]
};

const aboutTutorialData = {
    en: [
        { title: "> OPERATOR_DOSSIER", desc: "Meet the Breaker x Fixer crew: offensive and defensive security, CTF and hands-on research.", target: null },
        { title: "> TEAM_ROSTER", desc: "Profile tiles link to external portfolios and socials — click through to see more work.", target: ".profiles-grid" },
        { title: "> MISSION_STATEMENT", desc: "We document real methodologies: break, fix, understand and teach — no recycled filler.", target: ".description-box" },
        { title: "> DEEP_DIVES", desc: "Individual bios expand on backgrounds, tooling and focus areas for each operator.", target: ".member-bio" }
    ],
    es: [
        { title: "> DOSSIER_OPERADORES", desc: "Conoce al equipo Breaker x Fixer: seguridad ofensiva y defensiva, CTF e investigación práctica.", target: null },
        { title: "> PLANTILLA_EQUIPO", desc: "Las tarjetas enlazan a portfolios y redes externas — haz clic para ver más trabajo.", target: ".profiles-grid" },
        { title: "> MANIFIESTO", desc: "Documentamos metodologías reales: romper, arreglar, entender y enseñar — sin relleno reciclado.", target: ".description-box" },
        { title: "> BIO_INDIVIDUAL", desc: "Las secciones por miembro amplían formación, herramientas y foco de cada operador.", target: ".member-bio" }
    ]
};

const privacyTutorialData = {
    en: [
        { title: "> PRIVACY_BRIEFING", desc: "This page explains what the platform stores, how accounts work and what we never collect.", target: null },
        { title: "> POLICY_HEADER", desc: "Sections below cover pseudonymous accounts, bcrypt hashing, flags and telemetry boundaries.", target: ".privacy-title" },
        { title: "> READ_THE_CLAUSES", desc: "Scroll through each block for retention, third parties and your controls — transparency by design.", target: ".privacy-container" }
    ],
    es: [
        { title: "> BRIEFING_PRIVACIDAD", desc: "Aquí se explica qué guarda la plataforma, cómo funcionan las cuentas y qué no recogemos nunca.", target: null },
        { title: "> ENCABEZADO_POLÍTICA", desc: "Las secciones cubren cuentas seudónimas, hash bcrypt, flags y límites de telemetría.", target: ".privacy-title" },
        { title: "> LEE_LAS_CLÁUSULAS", desc: "Desplázate por cada bloque: retención, terceros y tus controles — transparencia por diseño.", target: ".privacy-container" }
    ]
};

const seasonMissionsTutorialData = {
    en: [
        { title: "> UNIFIED_DEPLOYMENT", desc: "You are inside the unified mission grid: one place for all campaigns, with cleaner flow and faster filtering.", target: null },
        { title: "> FILTER_CONTROL", desc: "Use search + category + difficulty to focus only on the contracts you want right now.", target: "#ctf-hub" },
        { title: "> TARGET_API", desc: "The displayed API base powers this mission board — point curl, scripts and the BXF terminal at it.", target: ".api-target-info" },
        { title: "> FILTER_TOOLBAR", desc: "Search, category and difficulty narrow the mission list; reset filters to see everything again.", target: "#ctf-hub" },
        { title: "> MISSION_CARDS", desc: "Each card is a challenge: open details, grab connection info and submit flags in bxf{...} format.", target: "#ctf-list-container" },
        { title: "> PAGINATION", desc: "Large mission sets paginate — use the controls at the bottom so you do not miss edge challenges.", target: ".ctf-pager" }
    ],
    es: [
        { title: "> DESPLIEGUE_UNIFICADO", desc: "Estás en el grid unificado de misiones: un solo lugar para todas las campañas, con flujo más limpio y rápido.", target: null },
        { title: "> CONTROL_FILTROS", desc: "Usa búsqueda + categoría + dificultad para centrarte solo en los contratos que quieras ahora.", target: "#ctf-hub" },
        { title: "> API_OBJETIVO", desc: "La API mostrada alimenta este tablero de misiones — apunta curl, scripts y la terminal BXF ahí.", target: ".api-target-info" },
        { title: "> BARRA_FILTROS", desc: "Búsqueda, categoría y dificultad acotan la lista; limpia filtros para ver todo otra vez.", target: "#ctf-hub" },
        { title: "> TARJETAS_MISIÓN", desc: "Cada tarjeta es un reto: detalles, información de conexión y flags en formato bxf{...}.", target: "#ctf-list-container" },
        { title: "> PAGINACIÓN", desc: "Los listados grandes paginan — usa los controles inferiores para no perderte retos.", target: ".ctf-pager" }
    ]
};

const terminalTutorialData = {
    en: [
        { title: "> BXF_TERMINAL", desc: "In-browser shell for quick CTF work: curl, crypto helpers, Python sandbox and file tools — not a full OS replacement.", target: null },
        { title: "> WINDOW_CHROME", desc: "Window controls are cosmetic. BG changes backdrop; CLEAR wipes scrollback; BXF_OS returns to the site.", target: ".terminal-topbar" },
        { title: "> SESSION_NOTICE", desc: "We recommend a real Linux environment for serious practice; this session is sandboxed and limited.", target: "#terminal-os-notice" },
        { title: "> XTERM_SURFACE", desc: "Type commands here. Internal tutorial: run the `tutorial` command; help lists available builtins.", target: "#terminal-wrapper" },
        { title: "> STATUS_BAR", desc: "Shortcuts hint: history, paste, cancel — check the footer if you forget the keybindings.", target: ".status-bar" }
    ],
    es: [
        { title: "> BXF_TERMINAL", desc: "Shell en el navegador para CTF rápido: curl, utilidades crypto, Python y archivos — no sustituye un SO completo.", target: null },
        { title: "> MARCO_VENTANA", desc: "Los puntos de ventana son decorativos. BG cambia el fondo; CLEAR limpia; BXF_OS vuelve al sitio.", target: ".terminal-topbar" },
        { title: "> AVISO_SESIÓN", desc: "Recomendamos Linux real para práctica seria; esta sesión es un sandbox con límites.", target: "#terminal-os-notice" },
        { title: "> SUPERFICIE_XTERM", desc: "Escribe comandos aquí. Tutorial interno: comando `tutorial`; help lista builtins.", target: "#terminal-wrapper" },
        { title: "> BARRA_ESTADO", desc: "Atajos: historial, pegar, cancelar — mira el pie si olvidas las teclas.", target: ".status-bar" }
    ]
};

function resolveTutorialForPath(pathname) {
    const p = (pathname || '').toLowerCase();
    if (p.includes('terminal.html')) return { activeData: terminalTutorialData, storageKeyBase: 'tut_terminal_seen' };
    if (p.includes('leaderboard.html')) return { activeData: leaderboardTutorialData, storageKeyBase: 'tut_lb_seen' };
    if (p.includes('privacy.html')) return { activeData: privacyTutorialData, storageKeyBase: 'tut_privacy_seen' };
    if (p.includes('aboutus.html')) return { activeData: aboutTutorialData, storageKeyBase: 'tut_about_seen' };
    if (p.includes('learn.html')) return { activeData: learnTutorialData, storageKeyBase: 'tut_learn_seen' };
    if (p.includes('ctf.html')) return { activeData: ctfTutorialData, storageKeyBase: 'tut_ctf_seen' };
    if (/season\d+\.html/.test(p)) return { activeData: seasonMissionsTutorialData, storageKeyBase: 'tut_season_missions_seen' };
    if (p.includes('writeup-community.html')) return { activeData: writeupReaderTutorialData, storageKeyBase: 'tut_writeup_reader_seen' };
    if (p.endsWith('writeups.html')) return { activeData: writeupsListTutorialData, storageKeyBase: 'tut_writeups_seen' };
    if (p.includes('/writeups/') && !p.endsWith('writeups.html')) return { activeData: writeupReaderTutorialData, storageKeyBase: 'tut_writeup_reader_seen' };
    if (p === '/' || p.endsWith('/index.html') || p.endsWith('index.html')) return { activeData: tutorialData, storageKeyBase: 'tut_main_seen' };
    return { activeData: tutorialData, storageKeyBase: 'tut_main_seen' };
}

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
        const resolved = resolveTutorialForPath(window.location.pathname);
        this.activeData = resolved.activeData;
        this.storageKeyBase = resolved.storageKeyBase;
        this.storageKey = this.storageKeyBase;

        // Only build HTML on DOM load
        if (document.readyState === 'loading') {
            document.addEventListener('DOMContentLoaded', () => this.createHTMLElements());
        } else {
            this.createHTMLElements();
        }

        // Expose global trigger — called by main.js AFTER auth + language resolve.
        // _tutCheckDone prevents re-firing on multiple updateUserProfile() calls.
        window.checkAndShowTutorial = (userId) => {
            const previousKey = window._tutLastStorageKey;
            const previousUser = window._tutLastUserId;
            this.storageKey = userId
                ? `${this.storageKeyBase}_${userId}`
                : this.storageKeyBase;

            const currentKey = this.storageKey;
            if (window._tutCheckDone && currentKey === previousKey && userId === previousUser) return;
            window._tutCheckDone = true;
            window._tutLastStorageKey = currentKey;
            window._tutLastUserId = userId;

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

        setTimeout(() => this.injectAccountTutorialMenu(), 0);
    }

    injectAccountTutorialMenu() {
        if (document.getElementById('account-tut-menu')) return;
        const replayBtn = document.getElementById('replay-tut-btn');
        if (!replayBtn || !replayBtn.parentNode) return;

        const lang = localStorage.getItem('lang') || 'es';
        const routes = window.BXF_TUTORIAL_ROUTES || [];
        const details = document.createElement('details');
        details.id = 'account-tut-menu';
        details.className = 'account-tut-menu';

        const sum = document.createElement('summary');
        sum.className = 'account-tut-menu__summary';
        sum.textContent = lang === 'es' ? 'Todas las guías…' : 'All guided tours…';

        const list = document.createElement('div');
        list.className = 'account-tut-menu__list';
        routes.forEach((r) => {
            const b = document.createElement('button');
            b.type = 'button';
            b.className = 'account-tut-menu__item';
            b.textContent = lang === 'es' ? r.labelEs : r.labelEn;
            b.addEventListener('click', () => {
                if (window.replayTutorialForPath) window.replayTutorialForPath(r.path);
            });
            list.appendChild(b);
        });

        details.appendChild(sum);
        details.appendChild(list);
        replayBtn.insertAdjacentElement('afterend', details);
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

        if (this.activeData !== guestData) {
            localStorage.setItem(this.storageKey, 'true');
            if (this.activeData === tutorialData) {
                localStorage.setItem('tutorial_done', 'true');
            }
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

// Global Replay instance for the Account Panel (current page only)
window.replayTutorial = () => {
    localStorage.setItem('show_tutorial', 'true');
    window._tutCheckDone = false;
    window.location.reload();
};

/** Navigate to another URL and force that page's tutorial (per-route storage keys). */
window.replayTutorialForPath = (href) => {
    const url = typeof href === 'string' ? href : '/index.html';
    localStorage.setItem('show_tutorial', 'true');
    window._tutCheckDone = false;
    const next = new URL(url, window.location.origin);
    const curPath = window.location.pathname.replace(/\/$/, '') || '/';
    const nextPath = next.pathname.replace(/\/$/, '') || '/';
    if (nextPath === curPath) {
        window.location.reload();
    } else {
        window.location.href = next.href;
    }
};

window.BXF_TUTORIAL_ROUTES = [
    { path: '/index.html', labelEn: 'Home & HUD', labelEs: 'Inicio y HUD' },
    { path: '/writeups.html', labelEn: 'Writeups search', labelEs: 'Búsqueda de writeups' },
    { path: '/ctf.html', labelEn: 'CTF hub', labelEs: 'Hub CTF' },
    { path: '/contests.html', labelEn: 'Contests', labelEs: 'Concursos' },
    { path: '/learn.html', labelEn: 'Learn OS', labelEs: 'Learn OS' },
    { path: '/leaderboard.html', labelEn: 'Leaderboard', labelEs: 'Clasificación' },
    { path: '/terminal.html', labelEn: 'BXF Terminal', labelEs: 'Terminal BXF' },
    { path: '/aboutus.html', labelEn: 'About', labelEs: 'Sobre nosotros' },
    { path: '/privacy.html', labelEn: 'Privacy policy', labelEs: 'Privacidad' }
];

window.startGuestPrompt = () => {
    if (window._tutEngine) window._tutEngine.startGuestPrompt();
};

const engine = new TutorialEngine();
window._tutEngine = engine;
