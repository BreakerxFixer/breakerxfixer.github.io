-- Reparte concursos así:
-- 1) "Concurso Bash Scripting — Viernes 15/05/2026": retos Q01, Q02, Q03 (UI); harness/validación interna Q03–Q05 vía terminal (harnessCodeShift / isBashContestHarnessShiftedContext).
-- 2) "Repaso 1 Abierto": slug bash-scripting-2026-general-abierto (mismo concurso base del seed); 5 LAB A1–A5; validación local = runStrictContestHarness en terminal.html.
-- 3) "Repaso 2 Abierto" (slug …repaso-2-abierto): 5 retos alineados con runRepasoStrictHarness (find mtime, .sh, backup, o+w, notas).
-- Antes de usar este script en una BD que tuviera el duplicado slug bash-scripting-2026-repaso-1-abierto,
-- ejecutar una vez: scratch/migrate_fusion_repaso1_slug_a_repaso2.sql
-- Todo en modo bash_checker (validación por script con submit).

begin;

do $$
declare
  v_lunes_id uuid;
  v_repaso1_id uuid;
  v_repaso2_id uuid;
begin
  select id
  into v_lunes_id
  from public.contests
  where slug = 'bash-scripting-2026-interno-admin-beta'
  limit 1;

  if v_lunes_id is null then
    raise exception 'No existe el concurso con slug %', 'bash-scripting-2026-interno-admin-beta';
  end if;

  select id
  into v_repaso1_id
  from public.contests
  where slug = 'bash-scripting-2026-general-abierto'
  limit 1;

  if v_repaso1_id is null then
    raise exception 'No existe el concurso con slug % (Repaso 1 Abierto = general abierto del seed).', 'bash-scripting-2026-general-abierto';
  end if;

  update public.contests
  set
    title = 'Repaso 1 Abierto',
    description = 'Repaso de scripting Bash (5 retos LAB A1–A5: head/tail/wc, find, read, menú). Validación local en terminal + servidor.',
    updated_at = now()
  where id = v_repaso1_id;

  -- Upsert concurso Repaso 2 Abierto
  insert into public.contests (
    slug, title, description, mode, status, starts_at, ends_at, access_scope
  ) values (
    'bash-scripting-2026-repaso-2-abierto',
    'Repaso 2 Abierto',
    'Repaso de scripting Bash (5 retos alineados con el terminal). Validación desde editor/terminal con submit.',
    'solo',
    'active',
    now() - interval '1 day',
    null,
    'public'
  )
  on conflict (slug) do update
    set
      title = excluded.title,
      description = excluded.description,
      mode = excluded.mode,
      status = excluded.status,
      access_scope = excluded.access_scope,
      updated_at = now()
  returning id into v_repaso2_id;

  update public.contests
  set
    title = 'Concurso Bash Scripting — Viernes 15/05/2026',
    description = 'Pruebas de scripting Bash (3 retos: Q01, Q02, Q03). Validación desde editor/terminal con submit.',
    mode = 'solo',
    updated_at = now()
  where id = v_lunes_id;

  -- Limpieza de retos/secrets del concurso del lunes
  delete from public.contest_challenge_secrets
  where challenge_id in (
    select id from public.contest_challenges where contest_id = v_lunes_id
  );

  delete from public.contest_challenges
  where contest_id = v_lunes_id;

  -- Limpieza de retos/secrets de repaso 1
  delete from public.contest_challenge_secrets
  where challenge_id in (
    select id from public.contest_challenges where contest_id = v_repaso1_id
  );

  delete from public.contest_challenges
  where contest_id = v_repaso1_id;

  -- Limpieza de retos/secrets de repaso 2
  delete from public.contest_challenge_secrets
  where challenge_id in (
    select id from public.contest_challenges where contest_id = v_repaso2_id
  );

  delete from public.contest_challenges
  where contest_id = v_repaso2_id;

  -- Concurso Lunes: filas contest_challenges Q01–Q03 (mapeo a harness Q03–Q05 en cliente)
  insert into public.contest_challenges (
    contest_id, code, title, description, category, difficulty, points, position, content_focus, solve_mode, is_enabled
  ) values
  (
    v_lunes_id,
    'Q01',
    'Bash scripting 1 / 3',
    '[LAB A3] Pide nombre, sexo y edad. Clasifica en hombre/mujer y menor/adulto/jubilado. Guarda el nombre en el archivo correspondiente: hombres-menores, hombres-adultos, hombres-jubilados, mujeres-menores, mujeres-adultos o mujeres-jubilados. Formato de salida final obligatorio: Q01: <archivo_generado>.',
    'Bash', 'Easy', 2, 1, 'bash', 'bash_checker', true
  ),
  (
    v_lunes_id,
    'Q02',
    'Bash scripting 2 / 3',
    '[LAB A4] Genera un número aleatorio entre 1 y 100. Permite adivinarlo indicando si el intento es mayor o menor. Termina cuando acierte. Formato de salida final obligatorio: Q02: <intentos>.',
    'Bash', 'Easy', 2, 2, 'bash', 'bash_checker', true
  ),
  (
    v_lunes_id,
    'Q03',
    'Bash scripting 3 / 3',
    '[LAB A5] Menú en bucle sobre archivo de usuarios: añadir, buscar, listar, contar y salir. Solo minúsculas y números en usuario. No se permiten duplicados. Debe seguir hasta elegir salir. Formato de salida final obligatorio: Q03: <total_usuarios>.',
    'Bash', 'Easy', 2, 3, 'bash', 'bash_checker', true
  );

  -- Repaso 1: LAB A1–A5 (validación local = runStrictContestHarness en terminal.html)
  insert into public.contest_challenges (
    contest_id, code, title, description, category, difficulty, points, position, content_focus, solve_mode, is_enabled
  ) values
  (
    v_repaso1_id,
    'Q01',
    'Bash scripting 1 / 5',
    '[LAB A1] Contar palabras y mostrar líneas de un script. Pide al usuario la ruta de un archivo y después: (a) comprueba si existe; si no, muestra mensaje y termina; (b) muestra las 5 primeras líneas; (c) muestra las 5 últimas; (d) cuenta cuántas palabras tiene. Formato de salida final obligatorio: Q01: <valor>.',
    'Bash', 'Easy', 2, 1, 'bash', 'bash_checker', true
  ),
  (
    v_repaso1_id,
    'Q02',
    'Bash scripting 2 / 5',
    '[LAB A2] Recibe la ruta de un directorio por argumento. Comprueba que existe; si no, termina. Busca archivos .txt en ese directorio y muestra solo los mayores de 1KB. Formato de salida final obligatorio: Q02: <resultado>.',
    'Bash', 'Easy', 2, 2, 'bash', 'bash_checker', true
  ),
  (
    v_repaso1_id,
    'Q03',
    'Bash scripting 3 / 5',
    '[LAB A3] Pide nombre, sexo y edad. Clasifica en hombre/mujer y menor/adulto/jubilado. Guarda el nombre en el archivo correspondiente y muestra al final: Q03: <archivo_generado>.',
    'Bash', 'Easy', 2, 3, 'bash', 'bash_checker', true
  ),
  (
    v_repaso1_id,
    'Q04',
    'Bash scripting 4 / 5',
    '[LAB A4] Genera un número aleatorio entre 1 y 100. Pide intentos al usuario, informa si son altos/bajos y termina al acertar. Salida final obligatoria: Q04: <intentos>.',
    'Bash', 'Easy', 2, 4, 'bash', 'bash_checker', true
  ),
  (
    v_repaso1_id,
    'Q05',
    'Bash scripting 5 / 5',
    '[LAB A5] Script con read para la ruta del fichero de usuarios y menú en bucle (case). Opción 1: pide un nombre de usuario y lo añade al fichero (solo minúsculas y números); no permitas duplicados. Opción 3: muestra el número de usuarios distintos con una línea Q05: <entero>. Opción 4: salir. La comprobación local del terminal usa la misma secuencia de prueba que el reto Q05 del sandbox canónico (incluye usuario ana01).',
    'Bash', 'Easy', 2, 5, 'bash', 'bash_checker', true
  );

  -- Repaso 2: 5 retos alineados con runRepasoStrictHarness (terminal.html)
  insert into public.contest_challenges (
    contest_id, code, title, description, category, difficulty, points, position, content_focus, solve_mode, is_enabled
  ) values
  (
    v_repaso2_id,
    'Q01',
    'Ejercicio 1/5 — archivo más antiguo',
    'Recibe por argumento ($1; el validador lo inyecta) la ruta de un directorio. Solo archivos regulares en ese directorio (sin subdirectorios, sin recursión). Debes obtener el fichero cuya fecha de modificación es la más antigua y escribir solo su nombre de archivo. Formato de salida final obligatorio: una sola línea que empiece exactamente por el prefijo Q01: (es la letra Q de «que», no la letra O; dígitos 0 y 1; dos puntos) seguida del nombre. Pista: find con -maxdepth 1, -type f y orden por tiempo.',
    'Bash', 'Easy', 2, 1, 'bash', 'bash_checker', true
  ),
  (
    v_repaso2_id,
    'Q02',
    'Ejercicio 2/5 — scripts ejecutables',
    'Recibe por argumento ($1) la ruta de un directorio. Cuenta únicamente archivos regulares con extensión .sh en ese directorio (no recursivo) que tengan permiso de ejecución para usuario, grupo u otros. Formato de salida final obligatorio: Q02: <entero>.',
    'Bash', 'Easy', 2, 2, 'bash', 'bash_checker', true
  ),
  (
    v_repaso2_id,
    'Q03',
    'Ejercicio 3/5 — copia de respaldo con fecha',
    'Crea en /home/entity/ctf/ un fichero vacío cuyo nombre siga exactamente el patrón backup-AAAAMMDD.tar.gz, usando la fecha actual del sistema (AAAAMMDD con date +%Y%m%d). La salida debe incluir el mismo nombre creado. Formato de salida final obligatorio: Q03: <nombre_creado>.',
    'Bash', 'Easy', 2, 3, 'bash', 'bash_checker', true
  ),
  (
    v_repaso2_id,
    'Q04',
    'Ejercicio 4/5 — ficheros escribibles por otros',
    'Recibe por argumento ($1) la ruta de un directorio. Cuenta archivos regulares en ese directorio (no recursivo) que tengan permiso de escritura para «otros» (bit o+w). Formato de salida final obligatorio: Q04: <entero>.',
    'Bash', 'Easy', 2, 4, 'bash', 'bash_checker', true
  ),
  (
    v_repaso2_id,
    'Q05',
    'Ejercicio 5/5 — menú de notas',
    'Script interactivo con read y bucle. Primero pide la ruta del fichero de notas. Menú con case: opción 1 pide una nota y la añade al fichero solo si esa línea exacta no existe ya; opción 3 muestra el número de notas distintas (p. ej. sort | uniq | wc -l) con prefijo Q05: o etiqueta Total; opción 4 termina el script. Debe tolerar opciones inválidas sin romperse. Formato exigido al contar: línea con Q05: <entero>.',
    'Bash', 'Easy', 2, 5, 'bash', 'bash_checker', true
  );
end $$;

commit;
