-- CTF Reboot total (solo quedan los CTF nuevos)
-- Ejecutar en Supabase SQL Editor
begin;

create extension if not exists pgcrypto;

-- Reinicio completo de progreso CTF anterior
delete from public.submission_logs;
delete from public.solves;
update public.profiles set points = 0;

-- Reinicio de retos y secretos
update public.challenges set first_blood_user_id = null, first_blood_at = null;
delete from public.challenge_secrets;
delete from public.challenges;

insert into public.seasons (id, name, description, is_active)
values
  (0, 'Season 0', 'Operation Dead Grid', true),
  (1, 'Season 1', 'Operation Dawn Grid', true)
on conflict (id) do update set
  name = excluded.name,
  description = excluded.description,
  is_active = excluded.is_active;

insert into public.challenges (id, title, category, difficulty, points, season_id, description_en, description_es)
values
('M01', 'Mission 01: Dead Drop Manifest', 'Web', 'Easy', 75, 0, 'An exposed endpoint leaks the first logistics ledger. Follow the trail without auth.', 'Un endpoint expuesto filtra el primer ledger logistico. Sigue el rastro sin autenticacion.'),
('M02', 'Mission 02: Badge Replay', 'Web', 'Easy', 75, 0, 'A stale session token still unlocks operator routes. Replay it before rotation.', 'Un token de sesion obsoleto aun abre rutas de operador. Reutilizalo antes de la rotacion.'),
('M03', 'Mission 03: Header Masquerade', 'Web', 'Easy', 100, 0, 'The gateway trusts an internal header. Forge identity and enter the staging node.', 'El gateway confia en una cabecera interna. Forja identidad y entra al nodo de staging.'),
('M04', 'Mission 04: Clockwork SQL', 'Web', 'Medium', 200, 0, 'Timed responses reveal blind SQL behavior. Build confidence bit by bit.', 'Respuestas temporizadas revelan SQL ciego. Construye certeza bit a bit.'),
('M05', 'Mission 05: Recursive Local File', 'Web', 'Medium', 200, 0, 'Path filters are naive. Traverse the vault map and recover internal config.', 'Los filtros de ruta son ingenuos. Recorre el mapa del vault y recupera configuracion interna.'),
('M06', 'Mission 06: Proxy of No Return', 'Web', 'Hard', 375, 0, 'An image fetcher can be coerced into server side requests. Reach forbidden metadata.', 'Un fetcher de imagenes puede forzarse a peticiones del lado servidor. Alcanza metadatos prohibidos.'),
('M07', 'Mission 07: Null Signature Choir', 'Web', 'Hard', 375, 0, 'Legacy JWT verification accepts the none algorithm under fallback mode.', 'La verificacion JWT legacy acepta el algoritmo none en modo fallback.'),
('M08', 'Mission 08: Night Shift Queue', 'Web', 'Insane', 900, 0, 'Race two workers against each other and force duplicate payout credits.', 'Haz competir dos workers y fuerza creditos de pago duplicados.'),
('M09', 'Mission 09: Caesar in Static', 'Crypto', 'Easy', 75, 0, 'A low effort substitution cipher hides a dispatch key in plain text.', 'Un cifrado por sustitucion simple oculta una clave de despacho a plena vista.'),
('M10', 'Mission 10: XOR Relay', 'Crypto', 'Medium', 200, 0, 'Recover the repeating XOR key from known protocol structure.', 'Recupera la clave XOR repetida desde la estructura conocida del protocolo.'),
('M11', 'Mission 11: RSA Cracked Ledger', 'Crypto', 'Hard', 375, 0, 'Small primes, big mistake. Factor n and decrypt shipment notes.', 'Primos pequenos, error enorme. Factoriza n y descifra notas de envio.'),
('M12', 'Mission 12: Padding Oracle Storm', 'Crypto', 'Insane', 900, 0, 'CBC error leaks become an oracle. Recover the command packet one block at a time.', 'Los errores CBC se convierten en oraculo. Recupera el paquete bloque a bloque.'),
('M13', 'Mission 13: Stack Warmup', 'Pwn', 'Easy', 100, 0, 'Simple stack overflow with a reachable win function. Control RIP cleanly.', 'Overflow de pila simple con funcion win alcanzable. Controla RIP de forma limpia.'),
('M14', 'Mission 14: Canary Whisper', 'Pwn', 'Medium', 200, 0, 'Leak the canary through format confusion and return safely to shell.', 'Filtra el canary via confusion de formato y retorna seguro a shell.'),
('M15', 'Mission 15: GOT Eclipse', 'Pwn', 'Hard', 375, 0, 'Overwrite a GOT target and redirect execution into your payload path.', 'Sobrescribe un objetivo GOT y redirige ejecucion a tu payload.'),
('M16', 'Mission 16: Heap Cathedral', 'Pwn', 'Insane', 900, 0, 'Abuse allocator metadata to pivot pointers and seize privileged flow.', 'Abusa metadatos del allocator para pivotar punteros y tomar flujo privilegiado.'),
('M17', 'Mission 17: EXIF Breadcrumbs', 'Forensics', 'Easy', 75, 0, 'Image metadata carries location breadcrumbs and operator initials.', 'Los metadatos de imagen guardan migas de ubicacion e iniciales de operador.'),
('M18', 'Mission 18: PCAP Drift', 'Forensics', 'Medium', 200, 0, 'Reassemble fragmented traffic and recover a credential fragment.', 'Reensambla trafico fragmentado y recupera un fragmento de credencial.'),
('M19', 'Mission 19: Audio Ghostline', 'Forensics', 'Hard', 375, 0, 'A spectrogram watermark hides the extraction phrase.', 'Una marca en espectrograma esconde la frase de extraccion.'),
('M20', 'Mission 20: Time Capsule Zip', 'Forensics', 'Insane', 900, 0, 'Recursive archive layers and timestamp clues unlock final artifact.', 'Capas recursivas de archivo y pistas temporales desbloquean el artefacto final.'),
('M21', 'Mission 21: Handle Drift', 'OSINT', 'Easy', 100, 0, 'Track one alias across commit history, mirrors and profile reuse.', 'Rastrea un alias entre commits, espejos y reutilizacion de perfiles.'),
('M22', 'Mission 22: Satellite Delta', 'OSINT', 'Hard', 375, 0, 'Correlate map tiles, sun angle and shadows to geolocate the relay.', 'Correlaciona teselas, angulo solar y sombras para geolocalizar el rele.'),
('S1M01', 'Mission S1-01: Boot Sector Murmur', 'Rev', 'Easy', 75, 1, 'A damaged disk image still boots hidden clues if inspected byte by byte.', 'Una imagen de disco danada aun arranca pistas ocultas si se inspecciona byte a byte.'),
('S1M02', 'Mission S1-02: Obfuscated Courier', 'Rev', 'Medium', 200, 1, 'A courier binary masks constants through simple arithmetic fog.', 'Un binario mensajero enmascara constantes bajo niebla aritmetica simple.'),
('S1M03', 'Mission S1-03: Bytecode Mirage', 'Rev', 'Hard', 375, 1, 'Custom VM bytecode validates a key stream. Reverse opcodes and win.', 'Un bytecode de VM valida una secuencia clave. Revierte opcodes y gana.'),
('S1M04', 'Mission S1-04: Self-Defending Loader', 'Rev', 'Insane', 900, 1, 'Anti-debug and anti-tamper layers guard the final branch.', 'Capas anti-debug y anti-tamper guardan la rama final.'),
('S1M05', 'Mission S1-05: Kernel Log Echo', 'Programming', 'Easy', 75, 1, 'System logs reveal accidental credentials and host transitions.', 'Los logs del sistema revelan credenciales accidentales y saltos de host.'),
('S1M06', 'Mission S1-06: Regex Circuit', 'Programming', 'Medium', 200, 1, 'Build a parser that extracts valid payload records from noisy streams.', 'Construye un parser que extraiga registros validos de flujos con ruido.'),
('S1M07', 'Mission S1-07: Rate-Limit Marathon', 'Programming', 'Hard', 375, 1, 'Automate token rotation to finish challenge rounds within strict windows.', 'Automatiza la rotacion de tokens para completar rondas bajo ventanas estrictas.'),
('S1M08', 'Mission S1-08: Distributed Solver', 'Programming', 'Insane', 900, 1, 'Parallel tasks and retries are required to beat the orchestrator timer.', 'Se requieren tareas paralelas y reintentos para vencer el temporizador del orquestador.'),
('S1M09', 'Mission S1-09: Bus Sniffer', 'Hardware', 'Easy', 100, 1, 'Decode I2C captures and identify the command that unlocks maintenance mode.', 'Decodifica capturas I2C e identifica el comando que desbloquea mantenimiento.'),
('S1M10', 'Mission S1-10: SPI Relay', 'Hardware', 'Medium', 200, 1, 'Recovered SPI traces contain segmented firmware headers.', 'Trazas SPI recuperadas contienen cabeceras segmentadas de firmware.'),
('S1M11', 'Mission S1-11: UART Nightwatch', 'Hardware', 'Hard', 375, 1, 'A serial console challenge leaks privileged mode through timing.', 'Un reto de consola serial filtra modo privilegiado por temporizacion.'),
('S1M12', 'Mission S1-12: FPGA Smoke', 'Hardware', 'Insane', 900, 1, 'Gate level netlists reveal a hidden check path in custom logic.', 'Netlists a nivel compuerta revelan una ruta oculta de verificacion.'),
('S1M13', 'Mission S1-13: Archive of Ghost Accounts', 'OSINT', 'Easy', 75, 1, 'Cross-link public profiles and forgotten mirrors to tie identities.', 'Cruza perfiles publicos y espejos olvidados para unir identidades.'),
('S1M14', 'Mission S1-14: Transit Camera Triangulation', 'OSINT', 'Medium', 200, 1, 'Triangulate route timestamps from open transport feeds.', 'Triangula marcas temporales de ruta usando feeds abiertos de transporte.'),
('S1M15', 'Mission S1-15: Cloud Breadcrumbs', 'OSINT', 'Hard', 375, 1, 'Public bucket metadata and commit leaks converge into one key artifact.', 'Metadatos de bucket publico y fugas en commits convergen en un artefacto clave.'),
('S1M16', 'Mission S1-16: Phantom Persona Engine', 'OSINT', 'Insane', 900, 1, 'Build an attribution graph from scattered traces and dead links.', 'Construye un grafo de atribucion desde trazas dispersas y enlaces muertos.'),
('S1M17', 'Mission S1-17: Honey Endpoint', 'Web', 'Easy', 100, 1, 'A fake service fingerprints your payload style. Blend in to proceed.', 'Un servicio falso perfila tu estilo de payload. Camuflate para avanzar.'),
('S1M18', 'Mission S1-18: Cookie Confession', 'Web', 'Medium', 200, 1, 'Session cookies expose role claims after weak encoding.', 'Las cookies de sesion exponen claims de rol por codificacion debil.'),
('S1M19', 'Mission S1-19: Templating Rift', 'Web', 'Hard', 375, 1, 'Server side template rendering leaks internals under crafted expressions.', 'El render de plantillas del servidor filtra internos con expresiones preparadas.'),
('S1M20', 'Mission S1-20: Multi-Stage Pivot', 'Web', 'Insane', 900, 1, 'Chain auth confusion, SSRF and cache poisoning into final takeover.', 'Encadena confusion de auth, SSRF y poisoning de cache hasta la toma final.'),
('S1M21', 'Mission S1-21: Last Handshake', 'Forensics', 'Hard', 375, 1, 'Recover a sabotaged TLS transcript and identify the rogue cert path.', 'Recupera un transcript TLS saboteado e identifica la ruta de certificado rogue.'),
('S1M22', 'Mission S1-22: Dawn of the Grid', 'Programming', 'Insane', 1000, 1, 'Final raid: correlate all channels and deliver the shutdown phrase.', 'Incursion final: correlaciona todos los canales y entrega la frase de cierre.')
on conflict (id) do update set
  title = excluded.title,
  category = excluded.category,
  difficulty = excluded.difficulty,
  points = excluded.points,
  season_id = excluded.season_id,
  description_en = excluded.description_en,
  description_es = excluded.description_es,
  first_blood_user_id = null,
  first_blood_at = null;

insert into public.challenge_secrets (id, flag_hash)
values
('M01', 'c3a172e160a64d7738d097a4ffc6e33c40fd85834ab5c3b67a6974adc4e3303c'),
('M02', '3ad3b20b579a01280650a4dcb2fb2003b79795b3c2503cd72dc0055f48fdba61'),
('M03', 'c93eefe1b1e9effb891f1c81d9d34ca9f0c943966e73d02950dfe36a7978a5bd'),
('M04', '243dd41246a1a159f7519c2dc8cee417e7f6923b16aeb6cb8fb590e7e5d8835f'),
('M05', '1d4af8327f303ee3b905dbe8010da2a54fe19cd9e7dfaf741e14ab947c872b41'),
('M06', 'f83eafc575c57f5843ec2d9ceb35b60f500dd8bad81baa73d7453f712f9a7515'),
('M07', 'b9d5c6c729cdf21578fabe9e920912fa222048510955c19db59e96dd18ff0a3a'),
('M08', 'e0797462ee27f4a7d19248718536f6ee7690da14932e938a35277572e6f6f096'),
('M09', 'dfe04c071baf80e971404d25242007cfbe9bc1513c2476545acfd9ffda282981'),
('M10', '0622e797c6fca02989411a0b982e2134136155cc7401aac20af61f7040e3c54c'),
('M11', '823a83a869838018c0c649e7db5185e1939ee17b893617d9950e589900db6492'),
('M12', '846002142b8368bbbf17b8e41ee266c79270fc3ce85b25e2356f34ef00127bc3'),
('M13', '3a4a1cebee1fd403803cdf38a8871f32f30c34d61d1be03f813300e084fa0735'),
('M14', 'd6b09bfc24e8eb98fda7938fe4c903b18ce50b0d9aeb3d9add7fe8b5a4073886'),
('M15', '829fffd3ca25035640cf0aac7a2171460e939562e63fccb37229e79aa6c151bf'),
('M16', 'bda714b44c27ec456397281ea683730b849319fd0e6cabe6d85f1e74c23f6229'),
('M17', 'da1b361f53aca02356b1c601da233c8ec83b37ceff85e593ade16fd6a957a7cc'),
('M18', 'bf2b650046079266a4c916d368c76b5f6b6d6e39f071d85e1b8871a807744a82'),
('M19', 'ced506d2588e8072be32193f38bcaee9f4be65218897072977f90ff812c53f78'),
('M20', '83358a394c7ce41b992f09ae85c366c7d6221bee8233c3a8e22f1e792be7f0c0'),
('M21', 'c4a1ab83412bb412d06ef851276345e98801288e39ac2933ccce13fd7edfe85d'),
('M22', 'b61a6c546da2580fbafa7a19af2f697fd2b51d7607c0db6c13a14369d8e2afca'),
('S1M01', 'bc53cc413be0e336579bd2e438dcf5f51fd313cbbbd7aa1377132cc387f58fd9'),
('S1M02', '6ec6341efc2aa850e2f21eb923f7c6d9976091a0f20e3049b552245c68669683'),
('S1M03', '2ae720b3e5ab70a7bf4c6c38631ca94ae5ad35458316edefa4a84572492bd07d'),
('S1M04', 'ab62064ca0b24b4ab7287ea8ef50c50ddeaf020cd2cdd30ebeb3f503a8b1432f'),
('S1M05', 'd593a725af7421cb08ef6af70c6a348f0a95db3fb523337dc615bf5cea02233a'),
('S1M06', '0f0dc1601f963935ad90988cf707fdafe59a1200d8e7805b98a0cd20b82beff3'),
('S1M07', '5844540b87dfcf9ce77e4c7365b1268c59d87b6896ad060cb9d2338dd2a749f1'),
('S1M08', '1bf40b161c59a055245bd014e8ce75fe29f27478698ac9c54ccbf5fe02e8e12d'),
('S1M09', '278ea34032b282faed12f6a38585bc832f578fe364a7ab0a9b3ed159ab20e509'),
('S1M10', '80042d03ad2aa189ecc51133661253c7f650d5ba84b0b6c618ed079dec9ea5e7'),
('S1M11', '238b4489b32fc697e59f3f9e6a41afb3d222d2f49d6b2ea51a9f139962d1d303'),
('S1M12', '3e792b48ff919c152a7126644772c0a3dc94fa54a776ae2d163547b0b1fe5fe9'),
('S1M13', '56cfadfff4f1e37b4971e5f8bfa2692ab89f79755989f6e98d4459f4763ebe3b'),
('S1M14', 'f8027ab0b986786d5d6b3c400f3fa9587e94739b51248399e4bc6e672e6bd22e'),
('S1M15', '3e006254e443ac498c832a04cc064de7ecbbbeb922849b1eb14d00e0be795d3d'),
('S1M16', 'eb14ca5ed6e8a6f2f2edbd566245a52eab21485a0ca4c264010024897a4517d4'),
('S1M17', '1c241725b4f0b18336d86f9377c3848f1fc0aec5d9568f0fd9eccd45893177f1'),
('S1M18', 'a85e6075cefcfdc445541c880b932754dbdc42cb0a1709b39fa0ff3d2e6fc4f4'),
('S1M19', '2b27567194f36bde223234d87d06b2e690c90ec649d15245f8fde03d48e7b1f0'),
('S1M20', '722696c1561fdd5e9963d0ac11d62a49a20601890d8efdb8bfb0021ae5f0f832'),
('S1M21', 'ca4a8bd440f7049f0f12be85d8e6d862cb908300fff4d12d84dc019beafcd167'),
('S1M22', 'f19524b4d379262590dc64a7cdf81a4792813bdf7726f2b70fd3b643403f4215')
on conflict (id) do update set flag_hash = excluded.flag_hash;

commit;
