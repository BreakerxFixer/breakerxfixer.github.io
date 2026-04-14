const challenges = [
    {
        id: "M01", titleEN: "Mission 01: The Ghost Endpoint", titleES: "Misión 01: El Punto Final Fantasma",
        descEN: "They left a backdoor, but they forgot to document it. Time to fuzz.",
        descES: "Dejaron una puerta trasera, pero olvidaron documentarla. Hora de fuzzear.",
        points: 50, category: "Web", difficulty: "Easy", diffClass: "diff-easy", tags: ["Recon"], assets: null
    },
    {
        id: "M02", titleEN: "Mission 02: Identity Crisis", titleES: "Misión 02: Crisis de Identidad",
        descEN: "Access vectors are flawed. You are User 10... but what if you claim to be User 1?",
        descES: "Los vectores de acceso tienen fallos. Eres el Usuario 10... ¿pero y si afirmas ser el 1?",
        points: 50, category: "Web", difficulty: "Easy", diffClass: "diff-easy", tags: ["IDOR"], assets: null
    },
    {
        id: "M03", titleEN: "Mission 03: The Impostor", titleES: "Misión 03: El Impostor",
        descEN: "The internal portal only accepts requests from the AdminBrowser/1.0. Lie to them.",
        descES: "El portal interno solo acepta peticiones de AdminBrowser/1.0. Miénteles.",
        points: 75, category: "Web", difficulty: "Easy", diffClass: "diff-easy", tags: ["Spoofing"], assets: null
    },
    {
        id: "M04", titleEN: "Mission 04: Unstoppable Force", titleES: "Misión 04: Fuerza Imparable",
        descEN: "The brute-force protection strictly limits attempts PER IP. Can you forge your origin?",
        descES: "La protección de fuerza bruta limita los intentos POR IP. ¿Puedes falsificar tu origen?",
        points: 150, category: "Web", difficulty: "Medium", diffClass: "diff-medium", tags: ["Rate-Limit Bypass"], assets: null
    },
    {
        id: "M05", titleEN: "Mission 05: Logic Fallacy", titleES: "Misión 05: Falacia Lógica",
        descEN: "Our intel says their legacy authentication endpoint just glues strings together.",
        descES: "Nuestros informes dicen que su endpoint de autenticación antiguo simplemente une cadenas.",
        points: 150, category: "Web", difficulty: "Medium", diffClass: "diff-medium", tags: ["SQLi"], assets: null
    },
    {
        id: "M06", titleEN: "Mission 06: The Wanderer", titleES: "Misión 06: El Errante",
        descEN: "File downloader API. They didn't sanitize the inputs. Find a way back to the root.",
        descES: "API de descarga de archivos. No sanearon las entradas. Encuentra el camino de vuelta.",
        points: 200, category: "Web", difficulty: "Medium", diffClass: "diff-medium", tags: ["Path Traversal"], assets: null
    },
    {
        id: "M07", titleEN: "Mission 07: Phantom Ping", titleES: "Misión 07: Ping Fantasma",
        descEN: "The network diagnostic tool is running system commands directly. Chain your commands!",
        descES: "La herramienta de diagnóstico de red ejecuta comandos del sistema directamente.",
        points: 400, category: "Web", difficulty: "Hard", diffClass: "diff-hard", tags: ["RCE"], assets: null
    },
    {
        id: "M08", titleEN: "Mission 08: Shattered Trust", titleES: "Misión 08: Confianza Quebrantada",
        descEN: "They are using JWT for authentication. Decode the token, find their terrible secret.",
        descES: "Usan JWT para autenticarse. Decodifica el token, descubre su terrible secreto.",
        points: 400, category: "Web", difficulty: "Hard", diffClass: "diff-hard", tags: ["JWT"], assets: null
    },
    {
        id: "M09", titleEN: "Mission 09: Careless Whispers", titleES: "Misión 09: Susurros Descuidados",
        descEN: "Try bad methods. Sometimes what you can't do reveals what you can.",
        descES: "Prueba métodos no permitidos. A veces lo bloqueado revela lo permitido.",
        points: 50, category: "Web", difficulty: "Easy", diffClass: "diff-easy", tags: ["Verb Tampering"], assets: null
    },
    {
        id: "M10", titleEN: "Mission 10: NoSQL Nightmare", titleES: "Misión 10: Pesadilla NoSQL",
        descEN: "Modern databases require modern injections. Break the JSON logic operators.",
        descES: "Bases de datos modernas, inyecciones modernas. Rompe los operadores.",
        points: 1000, category: "Web", difficulty: "Insane", diffClass: "diff-insane", tags: ["NoSQL"], assets: null
    },
    {
        id: "M11", titleEN: "Mission 11: The Core Breach", titleES: "Misión 11: La Brecha del Núcleo",
        descEN: "The internal mainframe is air-gapped... Use the portal to reach the unreachable.",
        descES: "La unidad central está aislada... Usa el portal para llegar a lo inalcanzable.",
        points: 500, category: "Web", difficulty: "Hard", diffClass: "diff-hard", tags: ["SSRF"], assets: null
    },
    {
        id: "M12", titleEN: "Mission 12: The XORacle", titleES: "Misión 12: El Oráculo XOR",
        descEN: "We intercepted an encrypted flag and a python script. Break the lock.",
        descES: "Interceptamos una flag cifrada y un script python. Rompe el candado.",
        points: 100, category: "Crypto", difficulty: "Easy", diffClass: "diff-easy", tags: ["XOR"], 
        assets: [{ name: "encrypt.py", path: "/assets/challenges/M12/encrypt.py" }, { name: "flag.enc", path: "/assets/challenges/M12/flag.enc" }]
    },
    {
        id: "M13", titleEN: "Mission 13: Shattered RSA", titleES: "Misión 13: RSA Quebrado",
        descEN: "n=3891783853, e=65537, c=1130635294. The primes are weak! Decrypt c.",
        descES: "n=3891783853, e=65537, c=1130635294. ¡Primos débiles! Descifra c.",
        points: 250, category: "Crypto", difficulty: "Medium", diffClass: "diff-medium", tags: ["RSA", "Math"], assets: null
    },
    {
        id: "M14", titleEN: "Mission 14: Buffer Overflow 101", titleES: "Misión 14: Desbordamiento 101",
        descEN: "A classic mistake. Overwrite the volatile variables beside the buffer.",
        descES: "Error clásico. Sobrescribe las variables adyacentes al buffer.",
        points: 150, category: "Pwn", difficulty: "Easy", diffClass: "diff-easy", tags: ["BOF"],
        assets: [{ name: "overflow101.c", path: "/assets/challenges/M14/overflow101.c" }, { name: "overflow101 (ELF)", path: "/assets/challenges/M14/overflow101" }]
    },
    {
        id: "M15", titleEN: "Mission 15: Format String Echo", titleES: "Misión 15: Eco de Formato",
        descEN: "Exploit the printf memory leak.",
        descES: "Explota la evasión de memoria en printf.",
        points: 300, category: "Pwn", difficulty: "Medium", diffClass: "diff-medium", tags: ["Format String"],
        assets: [{ name: "format_echo.c", path: "/assets/challenges/M15/format_echo.c" }, { name: "format_echo (ELF)", path: "/assets/challenges/M15/format_echo" }]
    },
    {
        id: "M16", titleEN: "Mission 16: The Hidden Packet", titleES: "Misión 16: El Paquete Oculto",
        descEN: "Analyze the DNS tunneling logs.",
        descES: "Analiza los logs de túnel DNS.",
        points: 100, category: "Forensics", difficulty: "Easy", diffClass: "diff-easy", tags: ["DNS Tunneling"],
        assets: [{ name: "capture.txt", path: "/assets/challenges/M16/capture.txt" }]
    },
    {
        id: "M17", titleEN: "Mission 17: Corrupted Memory", titleES: "Misión 17: Memoria Corrupta",
        descEN: "Look closely at this recovered photo.",
        descES: "Mira detenidamente esta foto recuperada.",
        points: 200, category: "Forensics", difficulty: "Medium", diffClass: "diff-medium", tags: ["Steganography"],
        assets: [{ name: "corrupted.jpg", path: "/assets/challenges/M17/corrupted.jpg" }]
    },
    {
        id: "M18", titleEN: "Mission 18: Ghost in the Web", titleES: "Misión 18: Fantasma en la Red",
        descEN: "'bxf_dev_zero' left a public note on internet. Find the trace.",
        descES: "'bxf_dev_zero' dejó una nota pública en internet. Encuentra su rastro.",
        points: 50, category: "OSINT", difficulty: "Easy", diffClass: "diff-easy", tags: ["Trace"], assets: null
    },
    {
        id: "M19", titleEN: "Mission 19: Geographical Echo", titleES: "Misión 19: Eco Geográfico",
        descEN: "Just kidding, the flag is bxf{g30l0c4t10n_by_sh4d0ws}",
        descES: "Es broma, la flag es bxf{g30l0c4t10n_by_sh4d0ws}",
        points: 150, category: "OSINT", difficulty: "Medium", diffClass: "diff-medium", tags: ["GEO OSINT"], assets: null
    },
    {
        id: "M20", titleEN: "Mission 20: Anti-Debugger Trap", titleES: "Misión 20: Trampa Anti-Debugger",
        descEN: "Bypass the ptrace() anti-debugging checks.",
        descES: "Burla las comprobaciones ptrace().",
        points: 400, category: "Rev", difficulty: "Hard", diffClass: "diff-hard", tags: ["Anti-Debug"],
        assets: [{ name: "trap (ELF)", path: "/assets/challenges/M20/trap" }]
    },
    {
        id: "M21", titleEN: "Mission 21: The Math API", titleES: "Misión 21: La API Matemática",
        descEN: "Solve 100 equations within 5 seconds at /api/v1/math-challenge.",
        descES: "Resuelve 100 ecuaciones en 5 segundos en /api/v1/math-challenge.",
        points: 250, category: "Programming", difficulty: "Medium", diffClass: "diff-medium", tags: ["Scripting"], assets: null
    },
    {
        id: "M22", titleEN: "Mission 22: I2C Chatter", titleES: "Misión 22: Charla I2C",
        descEN: "We sniffed an I2C bus communicating with an EEPROM chip.",
        descES: "Cazamos tráfico I2C de un chip EEPROM.",
        points: 350, category: "Hardware", difficulty: "Hard", diffClass: "diff-hard", tags: ["I2C", "Logic"],
        assets: [{ name: "i2c_dump.ascii", path: "/assets/challenges/M22/i2c_dump.ascii" }]
    }
];

document.addEventListener("DOMContentLoaded", () => {
    try {
        const listContainer = document.getElementById("ctf-list-container");
        const searchInput = document.getElementById("ctfSearch");
        const catButtons = document.querySelectorAll(".cat-btn");
        
        if (!listContainer) return;

        let currentCategory = "all";
        let currentSearch = "";

        // Fallback flag submission if window.submitFlag is failing
        window.submitFlagSafe = (id, btn) => {
            if(typeof window.submitFlag === 'function') {
                window.submitFlag(id, btn);
            } else {
                alert("submitFlag engine not fully loaded yet. Please wait a second.");
            }
        };

        function renderChallenges() {
            listContainer.innerHTML = "";
            let filtered = challenges.filter(c => {
                let matchCat = currentCategory === "all" || c.category.toLowerCase() === currentCategory.toLowerCase();
                let term = currentSearch.toLowerCase();
                let matchSearch = c.titleEN.toLowerCase().includes(term) || c.titleES.toLowerCase().includes(term) || 
                                  c.descEN.toLowerCase().includes(term) || c.descES.toLowerCase().includes(term) ||
                                  c.tags.some(t => t.toLowerCase().includes(term));
                return matchCat && matchSearch;
            });

            filtered.forEach(m => {
                let tagsHtml = m.tags.map(t => `<span class="badge" style="background-color:rgba(0, 255, 255, 0.1); color:#00ffff; border-color:rgba(0, 255, 255, 0.3);">${t}</span>`).join(" ");
                let assetsHtml = "";
                if (m.assets) {
                    assetsHtml = `<div style="margin-top: 15px; font-size: 0.8rem; border-top: 1px dashed rgba(255,0,60,0.3); padding-top: 10px;">
                        <strong style="color: #00ff3c;">[📥] ASSETS:</strong><br>` + 
                        m.assets.map(a => `<a href="${a.path}" download class="asset-link" style="color:var(--accent); text-decoration:none; margin-right:10px;">> ${a.name}</a>`).join("") + 
                    `</div>`;
                }

                let html = `
                <li class="ctf-item" data-id="${m.id}" data-category="${m.category}">
                    <div class="ctf-link">
                        <div class="ctf-header">
                            <div class="ctf-title" data-en="${m.titleEN}" data-es="${m.titleES}">${m.titleEN}</div>
                            <span class="badge" style="border-radius: 4px; padding: 2px 6px; border: 1px solid #777;">${m.category}</span>
                        </div>
                        <div class="mission-details-box" data-en="${m.descEN.replace(/"/g, '&quot;')}" data-es="${m.descES.replace(/"/g, '&quot;')}">
                            ${m.descEN}
                        </div>
                        ${assetsHtml}
                        <div class="ctf-footer" style="margin-top: 15px;">
                            <span class="badge points-badge">${m.points} PTS</span>
                            <span class="badge ${m.diffClass}" data-en="${m.difficulty}" data-es="${m.difficulty.replace('Easy','Fácil').replace('Hard','Difícil')}">${m.difficulty}</span>
                            ${tagsHtml}
                        </div>
                        <div class="flag-submission">
                            <input type="text" placeholder="bxf{...}" class="flag-input">
                            <button class="flag-submit-btn" onclick="window.submitFlagSafe('${m.id}', this)">Validate</button>
                        </div>
                        <div class="solve-status"></div>
                    </div>
                </li>`;
                
                listContainer.insertAdjacentHTML('beforeend', html);
            });

            const lang = localStorage.getItem('lang') || 'en';
            document.querySelectorAll('#ctf-list-container [data-en][data-es]').forEach(el => {
                if (el.getAttribute(`data-${lang}`)) {
                    el.innerHTML = el.getAttribute(`data-${lang}`);
                }
            });
        }

        if(searchInput) {
            searchInput.addEventListener("input", (e) => {
                currentSearch = e.target.value;
                renderChallenges();
            });
        }

        if(catButtons) {
            catButtons.forEach(btn => {
                btn.addEventListener("click", () => {
                    catButtons.forEach(b => b.classList.remove("active"));
                    btn.classList.add("active");
                    currentCategory = btn.getAttribute("data-cat");
                    renderChallenges();
                });
            });
        }

        renderChallenges();
        
    } catch(err) {
        document.getElementById("ctf-list-container").innerHTML = `<li style="color:red; font-family:monospace; padding: 20px; border:1px solid red; background: rgba(255,0,0,0.1);"><h1>CRITICAL UI ERROR</h1><p>${err.toString()}</p><pre>${err.stack}</pre></li>`;
    }
});
