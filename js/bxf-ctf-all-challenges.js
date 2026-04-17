/**
 * Todas las misiones CTF (Season 0 + Season 1).
 * Regenerar: node scratch/build-ctf-all.js
 */
(function () {
    var season0 = [
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
                descEN: "Correlate public clues until the location story collapses into a single answer — then submit the flag you derive.",
                descES: "Correlaciona pistas públicas hasta que la historia geográfica converja en una sola respuesta; luego envía la flag que obtengas.",
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
    var season1 = [
        { id: "S1M01", titleEN: "The Unseen Path", titleES: "El Camino Invisible", descEN: "Check the traditional hideout.", descES: "Revisa el escondite tradicional.", points: 50, category: "Web", difficulty: "Easy", diffClass: "diff-easy", tags: ["Recon"], assets: [{ name: "robots.txt", path: "/assets/challenges/S1M01/robots.txt" }] },
        { id: "S1M02", titleEN: "Ancient Cipher", titleES: "Cifrado Antiguo", descEN: "cvs{ebg13_vf_pynffvp}", descES: "cvs{ebg13_vf_pynffvp}", points: 50, category: "Crypto", difficulty: "Easy", diffClass: "diff-easy", tags: ["ROT13"], assets: null },
        { id: "S1M03", titleEN: "Commented Out", titleES: "Comentado", descEN: "The developers left something in the DOM.", descES: "Los desarrolladores dejaron algo en el DOM.", points: 75, category: "Web", difficulty: "Easy", diffClass: "diff-easy", tags: ["HTML"], assets: null },
        { id: "S1M04", titleEN: "Custom Auth", titleES: "Auth Personalizada", descEN: "The portal expects X-Admin-Auth: enabled.", descES: "El portal espera X-Admin-Auth: enabled.", points: 75, category: "Web", difficulty: "Easy", diffClass: "diff-easy", tags: ["Headers"], assets: null },
        { id: "S1M05", titleEN: "Embedded Truth", titleES: "Verdad Embebida", descEN: "A simple image hides a big secret.", descES: "Una simple imagen oculta un gran secreto.", points: 100, category: "Forensics", difficulty: "Easy", diffClass: "diff-easy", tags: ["Steganography"], assets: [{ name: "secret.jpg", path: "/assets/challenges/S1M05/secret.jpg" }] },
        { id: "S1M06", titleEN: "Wrong Extension", titleES: "Extensión Errónea", descEN: "This PNG won't open. Why?", descES: "Este PNG no abre. ¿Por qué?", points: 150, category: "Forensics", difficulty: "Medium", diffClass: "diff-medium", tags: ["File Headers"], assets: [{ name: "broken.png", path: "/assets/challenges/S1M06/broken.png" }] },
        { id: "S1M07", titleEN: "Forgotten Branch", titleES: "Rama Olvidada", descEN: "Check the developer repository history.", descES: "Revisa el histórico del repo del desarrollador.", points: 50, category: "OSINT", difficulty: "Easy", diffClass: "diff-easy", tags: ["Git"], assets: null },
        { id: "S1M08", titleEN: "Buffer Intro", titleES: "Intro al Buffer", descEN: "Overwrite the return address.", descES: "Sobrescribe la dirección de retorno.", points: 200, category: "Pwn", difficulty: "Medium", diffClass: "diff-medium", tags: ["BOF"], assets: [{ name: "overflow.c", path: "/assets/challenges/S1M08/overflow.c" }, { name: "overflow (ELF)", path: "/assets/challenges/S1M08/overflow" }] },
        { id: "S1M09", titleEN: "Union Base", titleES: "Base Union", descEN: "Extract data from the database.", descES: "Extrae datos de la DB.", points: 200, category: "Web", difficulty: "Medium", diffClass: "diff-medium", tags: ["SQLi"], assets: null },
        { id: "S1M10", titleEN: "Vigenere Revenge", titleES: "Venganza Vigenere", descEN: "Key is BR34K.", descES: "La clave es BR34K.", points: 150, category: "Crypto", difficulty: "Medium", diffClass: "diff-medium", tags: ["Vigenere"], assets: null },
        { id: "S1M11", titleEN: "Meta Geo", titleES: "Geo Meta", descEN: "Where was this photo taken?", descES: "¿Dónde se tomó esta foto?", points: 100, category: "Forensics", difficulty: "Easy", diffClass: "diff-easy", tags: ["EXIF"], assets: [{ name: "travel.jpg", path: "/assets/challenges/S1M11/travel.jpg" }] },
        { id: "S1M12", titleEN: "Tasty Cookie", titleES: "Cookie Sabrosa", descEN: "Cookies are delicious but dangerous.", descES: "Las cookies son ricas pero peligrosas.", points: 150, category: "Web", difficulty: "Medium", diffClass: "diff-medium", tags: ["Cookies"], assets: null },
        { id: "S1M13", titleEN: "Null JWT", titleES: "JWT Nulo", descEN: "The server trusts the none algorithm.", descES: "El servidor confía en el algoritmo none.", points: 300, category: "Web", difficulty: "Hard", diffClass: "diff-hard", tags: ["JWT"], assets: null },
        { id: "S1M14", titleEN: "ELF Grep", titleES: "Grep ELF", descEN: "Find the flag inside the compiled binary.", descES: "Halla la flag en el binario compilado.", points: 100, category: "Rev", difficulty: "Easy", diffClass: "diff-easy", tags: ["Strings"], assets: [{ name: "challenge.elf", path: "/assets/challenges/S1M14/challenge.elf" }] },
        { id: "S1M15", titleEN: "Cmd Inject v2", titleES: "Inyección Comandos v2", descEN: "They added a filter, but you can bypass it.", descES: "Añadieron un filtro, pero puedes saltarlo.", points: 250, category: "Web", difficulty: "Medium", diffClass: "diff-medium", tags: ["RCE"], assets: null },
        { id: "S1M16", titleEN: "Wave Seeker", titleES: "Buscador de Ondas", descEN: "Listen carefully or look at the spectrograph.", descES: "Escucha bien o mira el espectrograma.", points: 200, category: "Forensics", difficulty: "Medium", diffClass: "diff-medium", tags: ["Audio"], assets: [{ name: "signal.wav", path: "/assets/challenges/S1M16/signal.wav" }] },
        { id: "S1M17", titleEN: "XOR Loop", titleES: "Bucle XOR", descEN: "The program XORs each byte with a key.", descES: "El programa hace XOR con cada byte.", points: 400, category: "Rev", difficulty: "Hard", diffClass: "diff-hard", tags: ["Logic"], assets: [{ name: "decrypt_me.py", path: "/assets/challenges/S1M17/decrypt_me.py" }, { name: "flag.enc", path: "/assets/challenges/S1M17/flag.enc" }] },
        { id: "S1M18", titleEN: "S3 Leak", titleES: "Leak S3", descEN: "Explore the open storage buckets.", descES: "Explora los buckets abiertos.", points: 200, category: "OSINT", difficulty: "Medium", diffClass: "diff-medium", tags: ["Cloud"], assets: null },
        { id: "S1M19", titleEN: "TXT Records", titleES: "Registros TXT", descEN: "Check the DNS records for the domain.", descES: "Revisa los registros DNS del dominio.", points: 100, category: "Forensics", difficulty: "Easy", diffClass: "diff-easy", tags: ["DNS"], assets: null },
        { id: "S1M20", titleEN: "Format String v2", titleES: "Format String v2", descEN: "Advanced format string exploitation.", descES: "Explotación avanzada de format string.", points: 500, category: "Pwn", difficulty: "Hard", diffClass: "diff-hard", tags: ["FmtStr"], assets: [{ name: "fmt_str.c", path: "/assets/challenges/S1M20/fmt_str.c" }, { name: "fmt_str", path: "/assets/challenges/S1M20/fmt_str" }] },
        { id: "S1M21", titleEN: "Zip Recursion", titleES: "Recursión Zip", descEN: "It is zips all the way down.", descES: "Son zips hasta el fondo.", points: 250, category: "Forensics", difficulty: "Medium", diffClass: "diff-medium", tags: ["Zip Bomb"], assets: [{ name: "layers.zip", path: "/assets/challenges/S1M21/layers.zip" }] },
        { id: "S1M22", titleEN: "The Final Link", titleES: "El Enlace Final", descEN: "Reach the local metadata service.", descES: "Llega al servicio de metadatos local.", points: 1000, category: "Web", difficulty: "Insane", diffClass: "diff-insane", tags: ["SSRF"], assets: null }
    ];
    window.BXF_CTF_ALL_CHALLENGES = season0.concat(season1);
})();
