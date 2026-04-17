/**
 * Reboot completo de CTF:
 * - Regenera hub unificado: js/bxf-ctf-all-challenges.js
 * - Regenera scratch/ctf_reboot_migration.sql (reset puntos + retos + flags)
 * - Actualiza seeds en supabase_setup.sql y hints en terminal.html
 */
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const root = path.join(__dirname, '..');

const diffClass = {
  Easy: 'diff-easy',
  Medium: 'diff-medium',
  Hard: 'diff-hard',
  Insane: 'diff-insane',
};

const season0 = [
  { id: 'M01', titleEN: 'Mission 01: Dead Drop Manifest', titleES: 'Mision 01: Manifiesto del Buzon Muerto', descEN: 'An exposed endpoint leaks the first logistics ledger. Follow the trail without auth.', descES: 'Un endpoint expuesto filtra el primer ledger logistico. Sigue el rastro sin autenticacion.', points: 75, category: 'Web', difficulty: 'Easy', tags: ['Recon', 'API'], flag: 'bxf{dead_drop_manifest_open}' },
  { id: 'M02', titleEN: 'Mission 02: Badge Replay', titleES: 'Mision 02: Reutilizacion de Credencial', descEN: 'A stale session token still unlocks operator routes. Replay it before rotation.', descES: 'Un token de sesion obsoleto aun abre rutas de operador. Reutilizalo antes de la rotacion.', points: 75, category: 'Web', difficulty: 'Easy', tags: ['Session', 'Web'], flag: 'bxf{badge_replay_window}' },
  { id: 'M03', titleEN: 'Mission 03: Header Masquerade', titleES: 'Mision 03: Mascara por Cabecera', descEN: 'The gateway trusts an internal header. Forge identity and enter the staging node.', descES: 'El gateway confia en una cabecera interna. Forja identidad y entra al nodo de staging.', points: 100, category: 'Web', difficulty: 'Easy', tags: ['Headers', 'Spoofing'], flag: 'bxf{masquerade_header_internal}' },
  { id: 'M04', titleEN: 'Mission 04: Clockwork SQL', titleES: 'Mision 04: SQL de Relojeria', descEN: 'Timed responses reveal blind SQL behavior. Build confidence bit by bit.', descES: 'Respuestas temporizadas revelan SQL ciego. Construye certeza bit a bit.', points: 200, category: 'Web', difficulty: 'Medium', tags: ['SQLi', 'Blind'], flag: 'bxf{clockwork_blind_sqli}' },
  { id: 'M05', titleEN: 'Mission 05: Recursive Local File', titleES: 'Mision 05: Archivo Local Recursivo', descEN: 'Path filters are naive. Traverse the vault map and recover internal config.', descES: 'Los filtros de ruta son ingenuos. Recorre el mapa del vault y recupera configuracion interna.', points: 200, category: 'Web', difficulty: 'Medium', tags: ['Traversal', 'LFI'], flag: 'bxf{recursive_local_file_route}' },
  { id: 'M06', titleEN: 'Mission 06: Proxy of No Return', titleES: 'Mision 06: Proxy sin Retorno', descEN: 'An image fetcher can be coerced into server side requests. Reach forbidden metadata.', descES: 'Un fetcher de imagenes puede forzarse a peticiones del lado servidor. Alcanza metadatos prohibidos.', points: 375, category: 'Web', difficulty: 'Hard', tags: ['SSRF', 'Cloud'], flag: 'bxf{proxy_no_return_metadata}' },
  { id: 'M07', titleEN: 'Mission 07: Null Signature Choir', titleES: 'Mision 07: Coro de Firma Nula', descEN: 'Legacy JWT verification accepts the none algorithm under fallback mode.', descES: 'La verificacion JWT legacy acepta el algoritmo none en modo fallback.', points: 375, category: 'Web', difficulty: 'Hard', tags: ['JWT', 'Auth'], flag: 'bxf{null_signature_choir}' },
  { id: 'M08', titleEN: 'Mission 08: Night Shift Queue', titleES: 'Mision 08: Cola de Turno Nocturno', descEN: 'Race two workers against each other and force duplicate payout credits.', descES: 'Haz competir dos workers y fuerza creditos de pago duplicados.', points: 900, category: 'Web', difficulty: 'Insane', tags: ['Race', 'Logic'], flag: 'bxf{night_shift_queue_race}' },
  { id: 'M09', titleEN: 'Mission 09: Caesar in Static', titleES: 'Mision 09: Cesar entre Estatica', descEN: 'A low effort substitution cipher hides a dispatch key in plain text.', descES: 'Un cifrado por sustitucion simple oculta una clave de despacho a plena vista.', points: 75, category: 'Crypto', difficulty: 'Easy', tags: ['Caesar', 'Classical'], flag: 'bxf{static_caesar_dispatch}' },
  { id: 'M10', titleEN: 'Mission 10: XOR Relay', titleES: 'Mision 10: Rele XOR', descEN: 'Recover the repeating XOR key from known protocol structure.', descES: 'Recupera la clave XOR repetida desde la estructura conocida del protocolo.', points: 200, category: 'Crypto', difficulty: 'Medium', tags: ['XOR', 'Known-Plaintext'], flag: 'bxf{xor_relay_key_recovered}' },
  { id: 'M11', titleEN: 'Mission 11: RSA Cracked Ledger', titleES: 'Mision 11: Ledger RSA Roto', descEN: 'Small primes, big mistake. Factor n and decrypt shipment notes.', descES: 'Primos pequenos, error enorme. Factoriza n y descifra notas de envio.', points: 375, category: 'Crypto', difficulty: 'Hard', tags: ['RSA', 'Math'], flag: 'bxf{rsa_ledger_factorized}' },
  { id: 'M12', titleEN: 'Mission 12: Padding Oracle Storm', titleES: 'Mision 12: Tormenta de Oraculo de Padding', descEN: 'CBC error leaks become an oracle. Recover the command packet one block at a time.', descES: 'Los errores CBC se convierten en oraculo. Recupera el paquete bloque a bloque.', points: 900, category: 'Crypto', difficulty: 'Insane', tags: ['CBC', 'Oracle'], flag: 'bxf{padding_oracle_storm}' },
  { id: 'M13', titleEN: 'Mission 13: Stack Warmup', titleES: 'Mision 13: Calentamiento de Pila', descEN: 'Simple stack overflow with a reachable win function. Control RIP cleanly.', descES: 'Overflow de pila simple con funcion win alcanzable. Controla RIP de forma limpia.', points: 100, category: 'Pwn', difficulty: 'Easy', tags: ['BOF'], flag: 'bxf{stack_warmup_control}' },
  { id: 'M14', titleEN: 'Mission 14: Canary Whisper', titleES: 'Mision 14: Susurro del Canary', descEN: 'Leak the canary through format confusion and return safely to shell.', descES: 'Filtra el canary via confusion de formato y retorna seguro a shell.', points: 200, category: 'Pwn', difficulty: 'Medium', tags: ['Canary', 'FmtStr'], flag: 'bxf{canary_whisper_leak}' },
  { id: 'M15', titleEN: 'Mission 15: GOT Eclipse', titleES: 'Mision 15: Eclipse de la GOT', descEN: 'Overwrite a GOT target and redirect execution into your payload path.', descES: 'Sobrescribe un objetivo GOT y redirige ejecucion a tu payload.', points: 375, category: 'Pwn', difficulty: 'Hard', tags: ['GOT', 'ELF'], flag: 'bxf{got_eclipse_redirect}' },
  { id: 'M16', titleEN: 'Mission 16: Heap Cathedral', titleES: 'Mision 16: Catedral del Heap', descEN: 'Abuse allocator metadata to pivot pointers and seize privileged flow.', descES: 'Abusa metadatos del allocator para pivotar punteros y tomar flujo privilegiado.', points: 900, category: 'Pwn', difficulty: 'Insane', tags: ['Heap', 'Allocator'], flag: 'bxf{heap_cathedral_pivot}' },
  { id: 'M17', titleEN: 'Mission 17: EXIF Breadcrumbs', titleES: 'Mision 17: Migas EXIF', descEN: 'Image metadata carries location breadcrumbs and operator initials.', descES: 'Los metadatos de imagen guardan migas de ubicacion e iniciales de operador.', points: 75, category: 'Forensics', difficulty: 'Easy', tags: ['EXIF', 'Metadata'], flag: 'bxf{exif_breadcrumbs_found}' },
  { id: 'M18', titleEN: 'Mission 18: PCAP Drift', titleES: 'Mision 18: Deriva en PCAP', descEN: 'Reassemble fragmented traffic and recover a credential fragment.', descES: 'Reensambla trafico fragmentado y recupera un fragmento de credencial.', points: 200, category: 'Forensics', difficulty: 'Medium', tags: ['PCAP', 'Traffic'], flag: 'bxf{pcap_drift_reassembled}' },
  { id: 'M19', titleEN: 'Mission 19: Audio Ghostline', titleES: 'Mision 19: Linea Fantasma de Audio', descEN: 'A spectrogram watermark hides the extraction phrase.', descES: 'Una marca en espectrograma esconde la frase de extraccion.', points: 375, category: 'Forensics', difficulty: 'Hard', tags: ['Audio', 'Spectrogram'], flag: 'bxf{audio_ghostline_phrase}' },
  { id: 'M20', titleEN: 'Mission 20: Time Capsule Zip', titleES: 'Mision 20: Zip Capsula Temporal', descEN: 'Recursive archive layers and timestamp clues unlock final artifact.', descES: 'Capas recursivas de archivo y pistas temporales desbloquean el artefacto final.', points: 900, category: 'Forensics', difficulty: 'Insane', tags: ['Archive', 'Timeline'], flag: 'bxf{time_capsule_zip_core}' },
  { id: 'M21', titleEN: 'Mission 21: Handle Drift', titleES: 'Mision 21: Deriva del Alias', descEN: 'Track one alias across commit history, mirrors and profile reuse.', descES: 'Rastrea un alias entre commits, espejos y reutilizacion de perfiles.', points: 100, category: 'OSINT', difficulty: 'Easy', tags: ['Alias', 'Git'], flag: 'bxf{handle_drift_traced}' },
  { id: 'M22', titleEN: 'Mission 22: Satellite Delta', titleES: 'Mision 22: Delta Satelital', descEN: 'Correlate map tiles, sun angle and shadows to geolocate the relay.', descES: 'Correlaciona teselas, angulo solar y sombras para geolocalizar el rele.', points: 375, category: 'OSINT', difficulty: 'Hard', tags: ['Geo', 'Correlation'], flag: 'bxf{satellite_delta_located}' },
];

const season1 = [
  { id: 'S1M01', titleEN: 'Mission S1-01: Boot Sector Murmur', titleES: 'Mision S1-01: Murmullo de Boot Sector', descEN: 'A damaged disk image still boots hidden clues if inspected byte by byte.', descES: 'Una imagen de disco danada aun arranca pistas ocultas si se inspecciona byte a byte.', points: 75, category: 'Rev', difficulty: 'Easy', tags: ['Disk', 'Hex'], flag: 'bxf{boot_sector_murmur}' },
  { id: 'S1M02', titleEN: 'Mission S1-02: Obfuscated Courier', titleES: 'Mision S1-02: Mensajero Ofuscado', descEN: 'A courier binary masks constants through simple arithmetic fog.', descES: 'Un binario mensajero enmascara constantes bajo niebla aritmetica simple.', points: 200, category: 'Rev', difficulty: 'Medium', tags: ['Static', 'Deobfuscation'], flag: 'bxf{obfuscated_courier_clear}' },
  { id: 'S1M03', titleEN: 'Mission S1-03: Bytecode Mirage', titleES: 'Mision S1-03: Espejismo de Bytecode', descEN: 'Custom VM bytecode validates a key stream. Reverse opcodes and win.', descES: 'Un bytecode de VM valida una secuencia clave. Revierte opcodes y gana.', points: 375, category: 'Rev', difficulty: 'Hard', tags: ['VM', 'Opcode'], flag: 'bxf{bytecode_mirage_vm}' },
  { id: 'S1M04', titleEN: 'Mission S1-04: Self-Defending Loader', titleES: 'Mision S1-04: Loader Autodefensivo', descEN: 'Anti-debug and anti-tamper layers guard the final branch.', descES: 'Capas anti-debug y anti-tamper guardan la rama final.', points: 900, category: 'Rev', difficulty: 'Insane', tags: ['Anti-Debug', 'Loader'], flag: 'bxf{self_defending_loader_bypassed}' },
  { id: 'S1M05', titleEN: 'Mission S1-05: Kernel Log Echo', titleES: 'Mision S1-05: Eco de Log del Kernel', descEN: 'System logs reveal accidental credentials and host transitions.', descES: 'Los logs del sistema revelan credenciales accidentales y saltos de host.', points: 75, category: 'Programming', difficulty: 'Easy', tags: ['Parsing', 'Logs'], flag: 'bxf{kernel_log_echo_parse}' },
  { id: 'S1M06', titleEN: 'Mission S1-06: Regex Circuit', titleES: 'Mision S1-06: Circuito Regex', descEN: 'Build a parser that extracts valid payload records from noisy streams.', descES: 'Construye un parser que extraiga registros validos de flujos con ruido.', points: 200, category: 'Programming', difficulty: 'Medium', tags: ['Regex', 'Parser'], flag: 'bxf{regex_circuit_clean}' },
  { id: 'S1M07', titleEN: 'Mission S1-07: Rate-Limit Marathon', titleES: 'Mision S1-07: Maraton de Rate Limit', descEN: 'Automate token rotation to finish challenge rounds within strict windows.', descES: 'Automatiza la rotacion de tokens para completar rondas bajo ventanas estrictas.', points: 375, category: 'Programming', difficulty: 'Hard', tags: ['Automation', 'API'], flag: 'bxf{rate_limit_marathon_done}' },
  { id: 'S1M08', titleEN: 'Mission S1-08: Distributed Solver', titleES: 'Mision S1-08: Solver Distribuido', descEN: 'Parallel tasks and retries are required to beat the orchestrator timer.', descES: 'Se requieren tareas paralelas y reintentos para vencer el temporizador del orquestador.', points: 900, category: 'Programming', difficulty: 'Insane', tags: ['Concurrency', 'Queue'], flag: 'bxf{distributed_solver_orchestrated}' },
  { id: 'S1M09', titleEN: 'Mission S1-09: Bus Sniffer', titleES: 'Mision S1-09: Sniffer de Bus', descEN: 'Decode I2C captures and identify the command that unlocks maintenance mode.', descES: 'Decodifica capturas I2C e identifica el comando que desbloquea mantenimiento.', points: 100, category: 'Hardware', difficulty: 'Easy', tags: ['I2C', 'Bus'], flag: 'bxf{bus_sniffer_unlock}' },
  { id: 'S1M10', titleEN: 'Mission S1-10: SPI Relay', titleES: 'Mision S1-10: Rele SPI', descEN: 'Recovered SPI traces contain segmented firmware headers.', descES: 'Trazas SPI recuperadas contienen cabeceras segmentadas de firmware.', points: 200, category: 'Hardware', difficulty: 'Medium', tags: ['SPI', 'Firmware'], flag: 'bxf{spi_relay_segments}' },
  { id: 'S1M11', titleEN: 'Mission S1-11: UART Nightwatch', titleES: 'Mision S1-11: Guardia Nocturna UART', descEN: 'A serial console challenge leaks privileged mode through timing.', descES: 'Un reto de consola serial filtra modo privilegiado por temporizacion.', points: 375, category: 'Hardware', difficulty: 'Hard', tags: ['UART', 'Timing'], flag: 'bxf{uart_nightwatch_root}' },
  { id: 'S1M12', titleEN: 'Mission S1-12: FPGA Smoke', titleES: 'Mision S1-12: Humo en FPGA', descEN: 'Gate level netlists reveal a hidden check path in custom logic.', descES: 'Netlists a nivel compuerta revelan una ruta oculta de verificacion.', points: 900, category: 'Hardware', difficulty: 'Insane', tags: ['FPGA', 'Logic'], flag: 'bxf{fpga_smoke_netlist}' },
  { id: 'S1M13', titleEN: 'Mission S1-13: Archive of Ghost Accounts', titleES: 'Mision S1-13: Archivo de Cuentas Fantasma', descEN: 'Cross-link public profiles and forgotten mirrors to tie identities.', descES: 'Cruza perfiles publicos y espejos olvidados para unir identidades.', points: 75, category: 'OSINT', difficulty: 'Easy', tags: ['Profiles', 'Correlation'], flag: 'bxf{archive_ghost_accounts}' },
  { id: 'S1M14', titleEN: 'Mission S1-14: Transit Camera Triangulation', titleES: 'Mision S1-14: Triangulacion de Camaras', descEN: 'Triangulate route timestamps from open transport feeds.', descES: 'Triangula marcas temporales de ruta usando feeds abiertos de transporte.', points: 200, category: 'OSINT', difficulty: 'Medium', tags: ['Transport', 'Timeline'], flag: 'bxf{transit_camera_triangulated}' },
  { id: 'S1M15', titleEN: 'Mission S1-15: Cloud Breadcrumbs', titleES: 'Mision S1-15: Migas en la Nube', descEN: 'Public bucket metadata and commit leaks converge into one key artifact.', descES: 'Metadatos de bucket publico y fugas en commits convergen en un artefacto clave.', points: 375, category: 'OSINT', difficulty: 'Hard', tags: ['Cloud', 'Leaks'], flag: 'bxf{cloud_breadcrumbs_artifact}' },
  { id: 'S1M16', titleEN: 'Mission S1-16: Phantom Persona Engine', titleES: 'Mision S1-16: Motor de Persona Fantasma', descEN: 'Build an attribution graph from scattered traces and dead links.', descES: 'Construye un grafo de atribucion desde trazas dispersas y enlaces muertos.', points: 900, category: 'OSINT', difficulty: 'Insane', tags: ['Attribution', 'Graph'], flag: 'bxf{phantom_persona_engine}' },
  { id: 'S1M17', titleEN: 'Mission S1-17: Honey Endpoint', titleES: 'Mision S1-17: Endpoint Trampa', descEN: 'A fake service fingerprints your payload style. Blend in to proceed.', descES: 'Un servicio falso perfila tu estilo de payload. Camuflate para avanzar.', points: 100, category: 'Web', difficulty: 'Easy', tags: ['Recon', 'Fingerprint'], flag: 'bxf{honey_endpoint_blended}' },
  { id: 'S1M18', titleEN: 'Mission S1-18: Cookie Confession', titleES: 'Mision S1-18: Confesion en Cookie', descEN: 'Session cookies expose role claims after weak encoding.', descES: 'Las cookies de sesion exponen claims de rol por codificacion debil.', points: 200, category: 'Web', difficulty: 'Medium', tags: ['Cookie', 'Auth'], flag: 'bxf{cookie_confession_role}' },
  { id: 'S1M19', titleEN: 'Mission S1-19: Templating Rift', titleES: 'Mision S1-19: Grieta de Plantillas', descEN: 'Server side template rendering leaks internals under crafted expressions.', descES: 'El render de plantillas del servidor filtra internos con expresiones preparadas.', points: 375, category: 'Web', difficulty: 'Hard', tags: ['SSTI', 'Template'], flag: 'bxf{templating_rift_shell}' },
  { id: 'S1M20', titleEN: 'Mission S1-20: Multi-Stage Pivot', titleES: 'Mision S1-20: Pivot Multietapa', descEN: 'Chain auth confusion, SSRF and cache poisoning into final takeover.', descES: 'Encadena confusion de auth, SSRF y poisoning de cache hasta la toma final.', points: 900, category: 'Web', difficulty: 'Insane', tags: ['Chain', 'Pivot'], flag: 'bxf{multi_stage_pivot_complete}' },
  { id: 'S1M21', titleEN: 'Mission S1-21: Last Handshake', titleES: 'Mision S1-21: Ultimo Handshake', descEN: 'Recover a sabotaged TLS transcript and identify the rogue cert path.', descES: 'Recupera un transcript TLS saboteado e identifica la ruta de certificado rogue.', points: 375, category: 'Forensics', difficulty: 'Hard', tags: ['TLS', 'Network'], flag: 'bxf{last_handshake_rogue_cert}' },
  { id: 'S1M22', titleEN: 'Mission S1-22: Dawn of the Grid', titleES: 'Mision S1-22: Amanecer de la Red', descEN: 'Final raid: correlate all channels and deliver the shutdown phrase.', descES: 'Incursion final: correlaciona todos los canales y entrega la frase de cierre.', points: 1000, category: 'Programming', difficulty: 'Insane', tags: ['Finale', 'Orchestration'], flag: 'bxf{dawn_of_the_grid_shutdown}' },
];

function toChallengeObject(c) {
  return {
    id: c.id,
    titleEN: c.titleEN,
    titleES: c.titleES,
    descEN: c.descEN,
    descES: c.descES,
    points: c.points,
    category: c.category,
    difficulty: c.difficulty,
    diffClass: diffClass[c.difficulty] || 'diff-easy',
    tags: c.tags || [],
    assets: null,
  };
}

function toJsArray(arr) {
  const lines = ['['];
  arr.forEach((c, i) => {
    const o = toChallengeObject(c);
    const json = JSON.stringify(o, null, 8)
      .replace(/"([^"]+)":/g, '$1:')
      .replace(/"/g, '"');
    const indented = json.split('\n').map((ln) => '        ' + ln).join('\n');
    lines.push(indented + (i < arr.length - 1 ? ',' : ''));
  });
  lines.push('    ]');
  return lines.join('\n');
}

function writeUnifiedChallengeBundle() {
  const a0 = toJsArray(season0);
  const a1 = toJsArray(season1);
  const body = `/**
 * Todas las misiones CTF unificadas.
 * Regenerado por scratch/generate_ctf_reboot.js
 */
(function () {
    var season0 = ${a0};
    var season1 = ${a1};
    window.BXF_CTF_ALL_CHALLENGES = season0.concat(season1);
})();
`;
  fs.writeFileSync(path.join(root, 'js', 'bxf-ctf-all-challenges.js'), body, 'utf8');
}

function replaceChallengesArray(filePath, newArrayLiteral) {
  const html = fs.readFileSync(filePath, 'utf8');
  const needle = 'const challenges =';
  const start = html.indexOf(needle);
  if (start < 0) throw new Error(path.basename(filePath) + ': no se encontro const challenges =');
  const arrStart = html.indexOf('[', start);
  if (arrStart < 0) throw new Error(path.basename(filePath) + ': no se encontro inicio de array');
  let i = arrStart;
  let depth = 0;
  let inS = false;
  let inD = false;
  let inT = false;
  let esc = false;
  for (; i < html.length; i++) {
    const ch = html[i];
    if (esc) {
      esc = false;
      continue;
    }
    if (inS) {
      if (ch === '\\') esc = true;
      else if (ch === "'") inS = false;
      continue;
    }
    if (inD) {
      if (ch === '\\') esc = true;
      else if (ch === '"') inD = false;
      continue;
    }
    if (inT) {
      if (ch === '\\') esc = true;
      else if (ch === '`') inT = false;
      continue;
    }
    if (ch === "'") {
      inS = true;
      continue;
    }
    if (ch === '"') {
      inD = true;
      continue;
    }
    if (ch === '`') {
      inT = true;
      continue;
    }
    if (ch === '[') depth++;
    else if (ch === ']') {
      depth--;
      if (depth === 0) break;
    }
  }
  if (depth !== 0) throw new Error(path.basename(filePath) + ': array challenges no cerrado');

  const out = html.slice(0, arrStart) + newArrayLiteral + html.slice(i + 1);
  fs.writeFileSync(filePath, out, 'utf8');
}

function sha256(v) {
  return crypto.createHash('sha256').update(v).digest('hex');
}

function sqlEscape(v) {
  return String(v).replace(/'/g, "''");
}

function buildSqlMigration() {
  const all = [...season0, ...season1];
  const header = `-- CTF Reboot total (solo quedan los CTF nuevos)\n-- Ejecutar en Supabase SQL Editor\nbegin;\n\ncreate extension if not exists pgcrypto;\n\n-- Reinicio completo de progreso CTF anterior\ndelete from public.submission_logs;\ndelete from public.solves;\nupdate public.profiles set points = 0;\n\n-- Reinicio de retos y secretos\nupdate public.challenges set first_blood_user_id = null, first_blood_at = null;\ndelete from public.challenge_secrets;\ndelete from public.challenges;\n\ninsert into public.seasons (id, name, description, is_active)\nvalues\n  (0, 'Season 0', 'Operation Dead Grid', true),\n  (1, 'Season 1', 'Operation Dawn Grid', true)\non conflict (id) do update set\n  name = excluded.name,\n  description = excluded.description,\n  is_active = excluded.is_active;\n\ninsert into public.challenges (id, title, category, difficulty, points, season_id, description_en, description_es)\nvalues\n`;

  const values = all.map((c) => {
    const seasonId = c.id.startsWith('S1') ? 1 : 0;
    return `('${sqlEscape(c.id)}', '${sqlEscape(c.titleEN)}', '${sqlEscape(c.category)}', '${sqlEscape(c.difficulty)}', ${Number(c.points)}, ${seasonId}, '${sqlEscape(c.descEN)}', '${sqlEscape(c.descES)}')`;
  }).join(',\n');

  const challengesUpsert = `\non conflict (id) do update set\n  title = excluded.title,\n  category = excluded.category,\n  difficulty = excluded.difficulty,\n  points = excluded.points,\n  season_id = excluded.season_id,\n  description_en = excluded.description_en,\n  description_es = excluded.description_es,\n  first_blood_user_id = null,\n  first_blood_at = null;\n\ninsert into public.challenge_secrets (id, flag_hash)\nvalues\n`;

  const secValues = all.map((c) => `('${sqlEscape(c.id)}', '${sha256(c.flag)}')`).join(',\n');
  const secUpsert = `\non conflict (id) do update set flag_hash = excluded.flag_hash;\n\ncommit;\n`;

  return header + values + challengesUpsert + secValues + secUpsert;
}

function buildSupabaseSetupChallengesBlock() {
  const all = [...season0, ...season1];
  const values = all.map((c) => {
    const seasonId = c.id.startsWith('S1') ? 1 : 0;
    return `('${sqlEscape(c.id)}', '${sqlEscape(c.titleEN)}', '${sqlEscape(c.category)}', '${sqlEscape(c.difficulty)}', ${Number(c.points)}, ${seasonId}, '${sqlEscape(c.descEN)}', '${sqlEscape(c.descES)}')`;
  }).join(',\n');
  return `INSERT INTO public.challenges (id, title, category, difficulty, points, season_id, description_en, description_es) VALUES\n${values}\nON CONFLICT (id) DO UPDATE SET \n  season_id = EXCLUDED.season_id,\n  description_en = EXCLUDED.description_en,\n  description_es = EXCLUDED.description_es,\n  points = EXCLUDED.points,\n  category = EXCLUDED.category,\n  difficulty = EXCLUDED.difficulty;`;
}

function buildSupabaseSetupSecretsBlock() {
  const all = [...season0, ...season1];
  const values = all.map((c) => `('${sqlEscape(c.id)}', '${sha256(c.flag)}')`).join(',\n');
  return `INSERT INTO public.challenge_secrets (id, flag_hash) VALUES\n${values}\nON CONFLICT (id) DO UPDATE SET flag_hash = EXCLUDED.flag_hash;`;
}

function updateSupabaseSetupSeed() {
  const setupPath = path.join(root, 'supabase_setup.sql');
  let sql = fs.readFileSync(setupPath, 'utf8');

  const challengeRegex = /INSERT INTO public\.challenges \(id, title, category, difficulty, points, season_id, description_en, description_es\) VALUES[\s\S]*?ON CONFLICT \(id\) DO UPDATE SET[\s\S]*?difficulty = EXCLUDED\.difficulty;/m;
  const secretRegex = /INSERT INTO public\.challenge_secrets \(id, flag_hash\) VALUES[\s\S]*?ON CONFLICT \(id\) DO UPDATE SET flag_hash = EXCLUDED\.flag_hash;/m;

  if (!challengeRegex.test(sql)) throw new Error('No se encontro bloque seed de challenges en supabase_setup.sql');
  if (!secretRegex.test(sql)) throw new Error('No se encontro bloque seed de challenge_secrets en supabase_setup.sql');

  sql = sql.replace(challengeRegex, buildSupabaseSetupChallengesBlock());
  sql = sql.replace(secretRegex, buildSupabaseSetupSecretsBlock());

  fs.writeFileSync(setupPath, sql, 'utf8');
}

function terminalHintFor(c) {
  const base = {
    Web: "Probe endpoints and manipulate requests carefully.",
    Crypto: "Decode, test assumptions, and verify transformations.",
    Pwn: "Inspect binary behavior and control execution primitives.",
    Forensics: "Inspect artifacts, metadata, and hidden payload traces.",
    OSINT: "Correlate public breadcrumbs across multiple sources.",
    Rev: "Reverse logic flow and recover hidden constants.",
    Programming: "Automate parsing/requests and validate outputs.",
    Hardware: "Interpret bus/protocol traces and derive control bytes.",
  };
  return base[c.category] || "Explore methodically and validate each assumption.";
}

function terminalStepsFor(c) {
  const map = {
    Web: [
      { i: "Recon endpoint and methods:", c: 'curl "https://target/api/v1/status" -v' },
      { i: "Try controlled parameter/header tampering:", c: 'curl "https://target/api/v1/entry?debug=1" -H "X-Operator: internal"' },
      { i: "Submit once you derive the flag format:", c: `echo ${c.id} && submit ${c.id}` },
    ],
    Crypto: [
      { i: "Inspect and normalize input:", c: 'echo "CIPHERTEXT" | tr -d " "' },
      { i: "Run candidate decode/transformation:", c: 'decode base64 "QlhGe2RlbW99"' },
      { i: "Validate final phrase and submit:", c: `echo ${c.id} && submit ${c.id}` },
    ],
    Pwn: [
      { i: "Enumerate binary hints:", c: "file challenge.bin && strings challenge.bin | head -20" },
      { i: "Probe crash/offset strategy:", c: "python3 -c \"print('A'*128)\"" },
      { i: "Finalize exploit path and submit:", c: `echo ${c.id} && submit ${c.id}` },
    ],
    Forensics: [
      { i: "Identify artifact type:", c: "file artifact.bin" },
      { i: "Extract visible traces:", c: "strings artifact.bin | grep -i bxf" },
      { i: "Correlate clue and submit:", c: `echo ${c.id} && submit ${c.id}` },
    ],
    OSINT: [
      { i: "Enumerate public records:", c: 'curl "https://dns.google/resolve?name=target.example&type=TXT"' },
      { i: "Cross-check timeline clues:", c: "echo timeline && date" },
      { i: "Build final attribution and submit:", c: `echo ${c.id} && submit ${c.id}` },
    ],
    Rev: [
      { i: "Inspect static metadata:", c: "file challenge.bin && strings challenge.bin | head -30" },
      { i: "Trace key logic branch:", c: 'python3 -c "print(\'inspect branches\')"' },
      { i: "Recover flag routine and submit:", c: `echo ${c.id} && submit ${c.id}` },
    ],
    Programming: [
      { i: "Prototype parser/automation:", c: 'python3 -c "print(\'parse + automate\')"' },
      { i: "Run batch validation loop:", c: 'python3 -c "print(\'batch complete\')"' },
      { i: "Use derived token and submit:", c: `echo ${c.id} && submit ${c.id}` },
    ],
    Hardware: [
      { i: "Classify protocol dump:", c: "xxd dump.bin | head -20" },
      { i: "Extract command bytes/state:", c: "strings dump.bin | head -20" },
      { i: "Compute final value and submit:", c: `echo ${c.id} && submit ${c.id}` },
    ],
  };
  return map[c.category] || [
    { i: "Inspect challenge context:", c: "help" },
    { i: "Test hypothesis with small steps:", c: "echo test" },
    { i: "Submit final answer:", c: `echo ${c.id} && submit ${c.id}` },
  ];
}

function jsEsc(s) {
  return String(s).replace(/\\/g, '\\\\').replace(/'/g, "\\'");
}

function buildTerminalCtfBlock() {
  const all = [...season0, ...season1];
  const lines = [];
  for (const c of all) {
    const steps = terminalStepsFor(c)
      .map((st) => `{i:'${jsEsc(st.i)}',c:'${jsEsc(st.c)}'}`)
      .join(',');
    lines.push(`        '${c.id}':{ title:'${jsEsc(c.titleEN.replace(/^Mission\s+/, ''))}', cat:'${jsEsc(c.category)}', diff:'${jsEsc(c.difficulty)}', pts:${Number(c.points)}, hint:'${jsEsc(terminalHintFor(c))}', steps:[${steps}] },`);
  }
  return lines.join('\n');
}

function updateTerminalCtfHints() {
  const terminalPath = path.join(root, 'terminal.html');
  let html = fs.readFileSync(terminalPath, 'utf8');
  const block = buildTerminalCtfBlock();
  const re = /        'M01':[\s\S]*?        'S1M22':[\s\S]*?\},/m;
  if (!re.test(html)) {
    throw new Error('No se encontro bloque CTF M01..S1M22 en terminal.html');
  }
  html = html.replace(re, block);
  fs.writeFileSync(terminalPath, html, 'utf8');
}

function main() {
  writeUnifiedChallengeBundle();
  fs.writeFileSync(path.join(root, 'scratch', 'ctf_reboot_migration.sql'), buildSqlMigration(), 'utf8');
  updateSupabaseSetupSeed();
  updateTerminalCtfHints();
  console.log('OK: hub unificado + scratch/ctf_reboot_migration.sql');
  console.log('Season0:', season0.length, 'Season1:', season1.length, 'Total:', season0.length + season1.length);
}

main();
