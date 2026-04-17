/**
 * Todas las misiones CTF (Season 0 + Season 1).
 * Regenerar: node scratch/build-ctf-all.js
 */
(function () {
    var season0 = [
        {
                id: "M01",
                titleEN: "Mission 01: Dead Drop Manifest",
                titleES: "Mision 01: Manifiesto del Buzon Muerto",
                descEN: "An exposed endpoint leaks the first logistics ledger. Follow the trail without auth.",
                descES: "Un endpoint expuesto filtra el primer ledger logistico. Sigue el rastro sin autenticacion.",
                points: 75,
                category: "Web",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "Recon",
                        "API"
                ],
                assets: null
        },
        {
                id: "M02",
                titleEN: "Mission 02: Badge Replay",
                titleES: "Mision 02: Reutilizacion de Credencial",
                descEN: "A stale session token still unlocks operator routes. Replay it before rotation.",
                descES: "Un token de sesion obsoleto aun abre rutas de operador. Reutilizalo antes de la rotacion.",
                points: 75,
                category: "Web",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "Session",
                        "Web"
                ],
                assets: null
        },
        {
                id: "M03",
                titleEN: "Mission 03: Header Masquerade",
                titleES: "Mision 03: Mascara por Cabecera",
                descEN: "The gateway trusts an internal header. Forge identity and enter the staging node.",
                descES: "El gateway confia en una cabecera interna. Forja identidad y entra al nodo de staging.",
                points: 100,
                category: "Web",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "Headers",
                        "Spoofing"
                ],
                assets: null
        },
        {
                id: "M04",
                titleEN: "Mission 04: Clockwork SQL",
                titleES: "Mision 04: SQL de Relojeria",
                descEN: "Timed responses reveal blind SQL behavior. Build confidence bit by bit.",
                descES: "Respuestas temporizadas revelan SQL ciego. Construye certeza bit a bit.",
                points: 200,
                category: "Web",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "SQLi",
                        "Blind"
                ],
                assets: null
        },
        {
                id: "M05",
                titleEN: "Mission 05: Recursive Local File",
                titleES: "Mision 05: Archivo Local Recursivo",
                descEN: "Path filters are naive. Traverse the vault map and recover internal config.",
                descES: "Los filtros de ruta son ingenuos. Recorre el mapa del vault y recupera configuracion interna.",
                points: 200,
                category: "Web",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "Traversal",
                        "LFI"
                ],
                assets: null
        },
        {
                id: "M06",
                titleEN: "Mission 06: Proxy of No Return",
                titleES: "Mision 06: Proxy sin Retorno",
                descEN: "An image fetcher can be coerced into server side requests. Reach forbidden metadata.",
                descES: "Un fetcher de imagenes puede forzarse a peticiones del lado servidor. Alcanza metadatos prohibidos.",
                points: 375,
                category: "Web",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "SSRF",
                        "Cloud"
                ],
                assets: null
        },
        {
                id: "M07",
                titleEN: "Mission 07: Null Signature Choir",
                titleES: "Mision 07: Coro de Firma Nula",
                descEN: "Legacy JWT verification accepts the none algorithm under fallback mode.",
                descES: "La verificacion JWT legacy acepta el algoritmo none en modo fallback.",
                points: 375,
                category: "Web",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "JWT",
                        "Auth"
                ],
                assets: null
        },
        {
                id: "M08",
                titleEN: "Mission 08: Night Shift Queue",
                titleES: "Mision 08: Cola de Turno Nocturno",
                descEN: "Race two workers against each other and force duplicate payout credits.",
                descES: "Haz competir dos workers y fuerza creditos de pago duplicados.",
                points: 900,
                category: "Web",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "Race",
                        "Logic"
                ],
                assets: null
        },
        {
                id: "M09",
                titleEN: "Mission 09: Caesar in Static",
                titleES: "Mision 09: Cesar entre Estatica",
                descEN: "A low effort substitution cipher hides a dispatch key in plain text.",
                descES: "Un cifrado por sustitucion simple oculta una clave de despacho a plena vista.",
                points: 75,
                category: "Crypto",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "Caesar",
                        "Classical"
                ],
                assets: null
        },
        {
                id: "M10",
                titleEN: "Mission 10: XOR Relay",
                titleES: "Mision 10: Rele XOR",
                descEN: "Recover the repeating XOR key from known protocol structure.",
                descES: "Recupera la clave XOR repetida desde la estructura conocida del protocolo.",
                points: 200,
                category: "Crypto",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "XOR",
                        "Known-Plaintext"
                ],
                assets: null
        },
        {
                id: "M11",
                titleEN: "Mission 11: RSA Cracked Ledger",
                titleES: "Mision 11: Ledger RSA Roto",
                descEN: "Small primes, big mistake. Factor n and decrypt shipment notes.",
                descES: "Primos pequenos, error enorme. Factoriza n y descifra notas de envio.",
                points: 375,
                category: "Crypto",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "RSA",
                        "Math"
                ],
                assets: null
        },
        {
                id: "M12",
                titleEN: "Mission 12: Padding Oracle Storm",
                titleES: "Mision 12: Tormenta de Oraculo de Padding",
                descEN: "CBC error leaks become an oracle. Recover the command packet one block at a time.",
                descES: "Los errores CBC se convierten en oraculo. Recupera el paquete bloque a bloque.",
                points: 900,
                category: "Crypto",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "CBC",
                        "Oracle"
                ],
                assets: null
        },
        {
                id: "M13",
                titleEN: "Mission 13: Stack Warmup",
                titleES: "Mision 13: Calentamiento de Pila",
                descEN: "Simple stack overflow with a reachable win function. Control RIP cleanly.",
                descES: "Overflow de pila simple con funcion win alcanzable. Controla RIP de forma limpia.",
                points: 100,
                category: "Pwn",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "BOF"
                ],
                assets: null
        },
        {
                id: "M14",
                titleEN: "Mission 14: Canary Whisper",
                titleES: "Mision 14: Susurro del Canary",
                descEN: "Leak the canary through format confusion and return safely to shell.",
                descES: "Filtra el canary via confusion de formato y retorna seguro a shell.",
                points: 200,
                category: "Pwn",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "Canary",
                        "FmtStr"
                ],
                assets: null
        },
        {
                id: "M15",
                titleEN: "Mission 15: GOT Eclipse",
                titleES: "Mision 15: Eclipse de la GOT",
                descEN: "Overwrite a GOT target and redirect execution into your payload path.",
                descES: "Sobrescribe un objetivo GOT y redirige ejecucion a tu payload.",
                points: 375,
                category: "Pwn",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "GOT",
                        "ELF"
                ],
                assets: null
        },
        {
                id: "M16",
                titleEN: "Mission 16: Heap Cathedral",
                titleES: "Mision 16: Catedral del Heap",
                descEN: "Abuse allocator metadata to pivot pointers and seize privileged flow.",
                descES: "Abusa metadatos del allocator para pivotar punteros y tomar flujo privilegiado.",
                points: 900,
                category: "Pwn",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "Heap",
                        "Allocator"
                ],
                assets: null
        },
        {
                id: "M17",
                titleEN: "Mission 17: EXIF Breadcrumbs",
                titleES: "Mision 17: Migas EXIF",
                descEN: "Image metadata carries location breadcrumbs and operator initials.",
                descES: "Los metadatos de imagen guardan migas de ubicacion e iniciales de operador.",
                points: 75,
                category: "Forensics",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "EXIF",
                        "Metadata"
                ],
                assets: null
        },
        {
                id: "M18",
                titleEN: "Mission 18: PCAP Drift",
                titleES: "Mision 18: Deriva en PCAP",
                descEN: "Reassemble fragmented traffic and recover a credential fragment.",
                descES: "Reensambla trafico fragmentado y recupera un fragmento de credencial.",
                points: 200,
                category: "Forensics",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "PCAP",
                        "Traffic"
                ],
                assets: null
        },
        {
                id: "M19",
                titleEN: "Mission 19: Audio Ghostline",
                titleES: "Mision 19: Linea Fantasma de Audio",
                descEN: "A spectrogram watermark hides the extraction phrase.",
                descES: "Una marca en espectrograma esconde la frase de extraccion.",
                points: 375,
                category: "Forensics",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "Audio",
                        "Spectrogram"
                ],
                assets: null
        },
        {
                id: "M20",
                titleEN: "Mission 20: Time Capsule Zip",
                titleES: "Mision 20: Zip Capsula Temporal",
                descEN: "Recursive archive layers and timestamp clues unlock final artifact.",
                descES: "Capas recursivas de archivo y pistas temporales desbloquean el artefacto final.",
                points: 900,
                category: "Forensics",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "Archive",
                        "Timeline"
                ],
                assets: null
        },
        {
                id: "M21",
                titleEN: "Mission 21: Handle Drift",
                titleES: "Mision 21: Deriva del Alias",
                descEN: "Track one alias across commit history, mirrors and profile reuse.",
                descES: "Rastrea un alias entre commits, espejos y reutilizacion de perfiles.",
                points: 100,
                category: "OSINT",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "Alias",
                        "Git"
                ],
                assets: null
        },
        {
                id: "M22",
                titleEN: "Mission 22: Satellite Delta",
                titleES: "Mision 22: Delta Satelital",
                descEN: "Correlate map tiles, sun angle and shadows to geolocate the relay.",
                descES: "Correlaciona teselas, angulo solar y sombras para geolocalizar el rele.",
                points: 375,
                category: "OSINT",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "Geo",
                        "Correlation"
                ],
                assets: null
        }
    ];
    var season1 = [
        {
                id: "S1M01",
                titleEN: "Mission S1-01: Boot Sector Murmur",
                titleES: "Mision S1-01: Murmullo de Boot Sector",
                descEN: "A damaged disk image still boots hidden clues if inspected byte by byte.",
                descES: "Una imagen de disco danada aun arranca pistas ocultas si se inspecciona byte a byte.",
                points: 75,
                category: "Rev",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "Disk",
                        "Hex"
                ],
                assets: null
        },
        {
                id: "S1M02",
                titleEN: "Mission S1-02: Obfuscated Courier",
                titleES: "Mision S1-02: Mensajero Ofuscado",
                descEN: "A courier binary masks constants through simple arithmetic fog.",
                descES: "Un binario mensajero enmascara constantes bajo niebla aritmetica simple.",
                points: 200,
                category: "Rev",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "Static",
                        "Deobfuscation"
                ],
                assets: null
        },
        {
                id: "S1M03",
                titleEN: "Mission S1-03: Bytecode Mirage",
                titleES: "Mision S1-03: Espejismo de Bytecode",
                descEN: "Custom VM bytecode validates a key stream. Reverse opcodes and win.",
                descES: "Un bytecode de VM valida una secuencia clave. Revierte opcodes y gana.",
                points: 375,
                category: "Rev",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "VM",
                        "Opcode"
                ],
                assets: null
        },
        {
                id: "S1M04",
                titleEN: "Mission S1-04: Self-Defending Loader",
                titleES: "Mision S1-04: Loader Autodefensivo",
                descEN: "Anti-debug and anti-tamper layers guard the final branch.",
                descES: "Capas anti-debug y anti-tamper guardan la rama final.",
                points: 900,
                category: "Rev",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "Anti-Debug",
                        "Loader"
                ],
                assets: null
        },
        {
                id: "S1M05",
                titleEN: "Mission S1-05: Kernel Log Echo",
                titleES: "Mision S1-05: Eco de Log del Kernel",
                descEN: "System logs reveal accidental credentials and host transitions.",
                descES: "Los logs del sistema revelan credenciales accidentales y saltos de host.",
                points: 75,
                category: "Programming",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "Parsing",
                        "Logs"
                ],
                assets: null
        },
        {
                id: "S1M06",
                titleEN: "Mission S1-06: Regex Circuit",
                titleES: "Mision S1-06: Circuito Regex",
                descEN: "Build a parser that extracts valid payload records from noisy streams.",
                descES: "Construye un parser que extraiga registros validos de flujos con ruido.",
                points: 200,
                category: "Programming",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "Regex",
                        "Parser"
                ],
                assets: null
        },
        {
                id: "S1M07",
                titleEN: "Mission S1-07: Rate-Limit Marathon",
                titleES: "Mision S1-07: Maraton de Rate Limit",
                descEN: "Automate token rotation to finish challenge rounds within strict windows.",
                descES: "Automatiza la rotacion de tokens para completar rondas bajo ventanas estrictas.",
                points: 375,
                category: "Programming",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "Automation",
                        "API"
                ],
                assets: null
        },
        {
                id: "S1M08",
                titleEN: "Mission S1-08: Distributed Solver",
                titleES: "Mision S1-08: Solver Distribuido",
                descEN: "Parallel tasks and retries are required to beat the orchestrator timer.",
                descES: "Se requieren tareas paralelas y reintentos para vencer el temporizador del orquestador.",
                points: 900,
                category: "Programming",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "Concurrency",
                        "Queue"
                ],
                assets: null
        },
        {
                id: "S1M09",
                titleEN: "Mission S1-09: Bus Sniffer",
                titleES: "Mision S1-09: Sniffer de Bus",
                descEN: "Decode I2C captures and identify the command that unlocks maintenance mode.",
                descES: "Decodifica capturas I2C e identifica el comando que desbloquea mantenimiento.",
                points: 100,
                category: "Hardware",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "I2C",
                        "Bus"
                ],
                assets: null
        },
        {
                id: "S1M10",
                titleEN: "Mission S1-10: SPI Relay",
                titleES: "Mision S1-10: Rele SPI",
                descEN: "Recovered SPI traces contain segmented firmware headers.",
                descES: "Trazas SPI recuperadas contienen cabeceras segmentadas de firmware.",
                points: 200,
                category: "Hardware",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "SPI",
                        "Firmware"
                ],
                assets: null
        },
        {
                id: "S1M11",
                titleEN: "Mission S1-11: UART Nightwatch",
                titleES: "Mision S1-11: Guardia Nocturna UART",
                descEN: "A serial console challenge leaks privileged mode through timing.",
                descES: "Un reto de consola serial filtra modo privilegiado por temporizacion.",
                points: 375,
                category: "Hardware",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "UART",
                        "Timing"
                ],
                assets: null
        },
        {
                id: "S1M12",
                titleEN: "Mission S1-12: FPGA Smoke",
                titleES: "Mision S1-12: Humo en FPGA",
                descEN: "Gate level netlists reveal a hidden check path in custom logic.",
                descES: "Netlists a nivel compuerta revelan una ruta oculta de verificacion.",
                points: 900,
                category: "Hardware",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "FPGA",
                        "Logic"
                ],
                assets: null
        },
        {
                id: "S1M13",
                titleEN: "Mission S1-13: Archive of Ghost Accounts",
                titleES: "Mision S1-13: Archivo de Cuentas Fantasma",
                descEN: "Cross-link public profiles and forgotten mirrors to tie identities.",
                descES: "Cruza perfiles publicos y espejos olvidados para unir identidades.",
                points: 75,
                category: "OSINT",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "Profiles",
                        "Correlation"
                ],
                assets: null
        },
        {
                id: "S1M14",
                titleEN: "Mission S1-14: Transit Camera Triangulation",
                titleES: "Mision S1-14: Triangulacion de Camaras",
                descEN: "Triangulate route timestamps from open transport feeds.",
                descES: "Triangula marcas temporales de ruta usando feeds abiertos de transporte.",
                points: 200,
                category: "OSINT",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "Transport",
                        "Timeline"
                ],
                assets: null
        },
        {
                id: "S1M15",
                titleEN: "Mission S1-15: Cloud Breadcrumbs",
                titleES: "Mision S1-15: Migas en la Nube",
                descEN: "Public bucket metadata and commit leaks converge into one key artifact.",
                descES: "Metadatos de bucket publico y fugas en commits convergen en un artefacto clave.",
                points: 375,
                category: "OSINT",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "Cloud",
                        "Leaks"
                ],
                assets: null
        },
        {
                id: "S1M16",
                titleEN: "Mission S1-16: Phantom Persona Engine",
                titleES: "Mision S1-16: Motor de Persona Fantasma",
                descEN: "Build an attribution graph from scattered traces and dead links.",
                descES: "Construye un grafo de atribucion desde trazas dispersas y enlaces muertos.",
                points: 900,
                category: "OSINT",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "Attribution",
                        "Graph"
                ],
                assets: null
        },
        {
                id: "S1M17",
                titleEN: "Mission S1-17: Honey Endpoint",
                titleES: "Mision S1-17: Endpoint Trampa",
                descEN: "A fake service fingerprints your payload style. Blend in to proceed.",
                descES: "Un servicio falso perfila tu estilo de payload. Camuflate para avanzar.",
                points: 100,
                category: "Web",
                difficulty: "Easy",
                diffClass: "diff-easy",
                tags: [
                        "Recon",
                        "Fingerprint"
                ],
                assets: null
        },
        {
                id: "S1M18",
                titleEN: "Mission S1-18: Cookie Confession",
                titleES: "Mision S1-18: Confesion en Cookie",
                descEN: "Session cookies expose role claims after weak encoding.",
                descES: "Las cookies de sesion exponen claims de rol por codificacion debil.",
                points: 200,
                category: "Web",
                difficulty: "Medium",
                diffClass: "diff-medium",
                tags: [
                        "Cookie",
                        "Auth"
                ],
                assets: null
        },
        {
                id: "S1M19",
                titleEN: "Mission S1-19: Templating Rift",
                titleES: "Mision S1-19: Grieta de Plantillas",
                descEN: "Server side template rendering leaks internals under crafted expressions.",
                descES: "El render de plantillas del servidor filtra internos con expresiones preparadas.",
                points: 375,
                category: "Web",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "SSTI",
                        "Template"
                ],
                assets: null
        },
        {
                id: "S1M20",
                titleEN: "Mission S1-20: Multi-Stage Pivot",
                titleES: "Mision S1-20: Pivot Multietapa",
                descEN: "Chain auth confusion, SSRF and cache poisoning into final takeover.",
                descES: "Encadena confusion de auth, SSRF y poisoning de cache hasta la toma final.",
                points: 900,
                category: "Web",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "Chain",
                        "Pivot"
                ],
                assets: null
        },
        {
                id: "S1M21",
                titleEN: "Mission S1-21: Last Handshake",
                titleES: "Mision S1-21: Ultimo Handshake",
                descEN: "Recover a sabotaged TLS transcript and identify the rogue cert path.",
                descES: "Recupera un transcript TLS saboteado e identifica la ruta de certificado rogue.",
                points: 375,
                category: "Forensics",
                difficulty: "Hard",
                diffClass: "diff-hard",
                tags: [
                        "TLS",
                        "Network"
                ],
                assets: null
        },
        {
                id: "S1M22",
                titleEN: "Mission S1-22: Dawn of the Grid",
                titleES: "Mision S1-22: Amanecer de la Red",
                descEN: "Final raid: correlate all channels and deliver the shutdown phrase.",
                descES: "Incursion final: correlaciona todos los canales y entrega la frase de cierre.",
                points: 1000,
                category: "Programming",
                difficulty: "Insane",
                diffClass: "diff-insane",
                tags: [
                        "Finale",
                        "Orchestration"
                ],
                assets: null
        }
    ];
    window.BXF_CTF_ALL_CHALLENGES = season0.concat(season1);
})();
