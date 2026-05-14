-- Migración one-shot (Supabase SQL): fusionar el concurso duplicado "Repaso 1" creado con slug
-- bash-scripting-2026-repaso-1-abierto en el slug oficial Repaso 2, y eliminar el Repaso 2 antiguo.
--
-- Orden: borrar el viejo …repaso-2-abierto (otro id) antes de renombrar …repaso-1-abierto → …repaso-2-abierto
-- para no violar UNIQUE(slug).
--
-- Ejecutar una vez. Si ya no existe slug bash-scripting-2026-repaso-1-abierto, solo avisa (notice) y no modifica nada.

begin;

do $$
declare
  v_new uuid;
  v_old uuid;
  v_general uuid;
  v_r2 uuid;
begin
  select id into v_new from public.contests where slug = 'bash-scripting-2026-repaso-1-abierto' limit 1;
  select id into v_old from public.contests where slug = 'bash-scripting-2026-repaso-2-abierto' limit 1;
  select id into v_general from public.contests where slug = 'bash-scripting-2026-general-abierto' limit 1;

  if v_new is null then
    raise notice 'migrate_fusion_repaso1_slug_a_repaso2: no hay fila slug bash-scripting-2026-repaso-1-abierto; se omite la fusión.';
    return;
  end if;

  if v_old is not null and v_old <> v_new then
    delete from public.contest_challenge_secrets
    where challenge_id in (select id from public.contest_challenges where contest_id = v_old);

    delete from public.contest_solves where contest_id = v_old;

    delete from public.contest_challenges where contest_id = v_old;

    delete from public.contests where id = v_old;
  end if;

  update public.contests
  set
    slug = 'bash-scripting-2026-repaso-2-abierto',
    title = 'Repaso 2 Abierto',
    description = 'Repaso de scripting Bash (5 retos alineados con el terminal). Validación desde editor/terminal con submit.',
    updated_at = now()
  where id = v_new;

  select id into v_r2 from public.contests where slug = 'bash-scripting-2026-repaso-2-abierto' limit 1;

  delete from public.contest_challenge_secrets
  where challenge_id in (select id from public.contest_challenges where contest_id = v_r2);

  delete from public.contest_challenges where contest_id = v_r2;

  insert into public.contest_challenges (
    contest_id, code, title, description, category, difficulty, points, position, content_focus, solve_mode, is_enabled
  ) values
  (
    v_r2,
    'Q01',
    'Ejercicio 1/5 — archivo más antiguo',
    'Recibe por argumento ($1; el validador lo inyecta) la ruta de un directorio. Solo archivos regulares en ese directorio (sin subdirectorios, sin recursión). Debes obtener el fichero cuya fecha de modificación es la más antigua y escribir solo su nombre de archivo. Formato de salida final obligatorio: una sola línea que empiece exactamente por el prefijo Q01: (es la letra Q de «que», no la letra O; dígitos 0 y 1; dos puntos) seguida del nombre. Pista: find con -maxdepth 1, -type f y orden por tiempo.',
    'Bash', 'Easy', 2, 1, 'bash', 'bash_checker', true
  ),
  (
    v_r2,
    'Q02',
    'Ejercicio 2/5 — scripts ejecutables',
    'Recibe por argumento ($1) la ruta de un directorio. Cuenta únicamente archivos regulares con extensión .sh en ese directorio (no recursivo) que tengan permiso de ejecución para usuario, grupo u otros. Formato de salida final obligatorio: Q02: <entero>.',
    'Bash', 'Easy', 2, 2, 'bash', 'bash_checker', true
  ),
  (
    v_r2,
    'Q03',
    'Ejercicio 3/5 — copia de respaldo con fecha',
    'Crea en /home/entity/ctf/ un fichero vacío cuyo nombre siga exactamente el patrón backup-AAAAMMDD.tar.gz, usando la fecha actual del sistema (AAAAMMDD con date +%Y%m%d). La salida debe incluir el mismo nombre creado. Formato de salida final obligatorio: Q03: <nombre_creado>.',
    'Bash', 'Easy', 2, 3, 'bash', 'bash_checker', true
  ),
  (
    v_r2,
    'Q04',
    'Ejercicio 4/5 — ficheros escribibles por otros',
    'Recibe por argumento ($1) la ruta de un directorio. Cuenta archivos regulares en ese directorio (no recursivo) que tengan permiso de escritura para «otros» (bit o+w). Formato de salida final obligatorio: Q04: <entero>.',
    'Bash', 'Easy', 2, 4, 'bash', 'bash_checker', true
  ),
  (
    v_r2,
    'Q05',
    'Ejercicio 5/5 — menú de notas',
    'Script interactivo con read y bucle. Primero pide la ruta del fichero de notas. Menú con case: opción 1 pide una nota y la añade al fichero solo si esa línea exacta no existe ya; opción 3 muestra el número de notas distintas (p. ej. sort | uniq | wc -l) con prefijo Q05: o etiqueta Total; opción 4 termina el script. Debe tolerar opciones inválidas sin romperse. Formato exigido al contar: línea con Q05: <entero>.',
    'Bash', 'Easy', 2, 5, 'bash', 'bash_checker', true
  );

  if v_general is not null then
    update public.contests
    set
      title = 'Repaso 1 Abierto',
      description = 'Repaso de scripting Bash (5 retos LAB A1–A5: head/tail/wc, find, read, menú). Validación local en terminal + servidor.',
      updated_at = now()
    where id = v_general;

    delete from public.contest_challenge_secrets
    where challenge_id in (select id from public.contest_challenges where contest_id = v_general);

    delete from public.contest_challenges where contest_id = v_general;

    insert into public.contest_challenges (
      contest_id, code, title, description, category, difficulty, points, position, content_focus, solve_mode, is_enabled
    ) values
    (
      v_general,
      'Q01',
      'Bash scripting 1 / 5',
      '[LAB A1] Contar palabras y mostrar líneas de un script. Pide al usuario la ruta de un archivo y después: (a) comprueba si existe; si no, muestra mensaje y termina; (b) muestra las 5 primeras líneas; (c) muestra las 5 últimas; (d) cuenta cuántas palabras tiene. Formato de salida final obligatorio: Q01: <valor>.',
      'Bash', 'Easy', 2, 1, 'bash', 'bash_checker', true
    ),
    (
      v_general,
      'Q02',
      'Bash scripting 2 / 5',
      '[LAB A2] Recibe la ruta de un directorio por argumento. Comprueba que existe; si no, termina. Busca archivos .txt en ese directorio y muestra solo los mayores de 1KB. Formato de salida final obligatorio: Q02: <resultado>.',
      'Bash', 'Easy', 2, 2, 'bash', 'bash_checker', true
    ),
    (
      v_general,
      'Q03',
      'Bash scripting 3 / 5',
      '[LAB A3] Pide nombre, sexo y edad. Clasifica en hombre/mujer y menor/adulto/jubilado. Guarda el nombre en el archivo correspondiente y muestra al final: Q03: <archivo_generado>.',
      'Bash', 'Easy', 2, 3, 'bash', 'bash_checker', true
    ),
    (
      v_general,
      'Q04',
      'Bash scripting 4 / 5',
      '[LAB A4] Genera un número aleatorio entre 1 y 100. Pide intentos al usuario, informa si son altos/bajos y termina al acertar. Salida final obligatoria: Q04: <intentos>.',
      'Bash', 'Easy', 2, 4, 'bash', 'bash_checker', true
    ),
    (
      v_general,
      'Q05',
      'Bash scripting 5 / 5',
      '[LAB A5] Script con read para la ruta del fichero de usuarios y menú en bucle (case). Opción 1: pide un nombre de usuario y lo añade al fichero (solo minúsculas y números); no permitas duplicados. Opción 3: muestra el número de usuarios distintos con una línea Q05: <entero>. Opción 4: salir. La comprobación local del terminal usa la misma secuencia de prueba que el reto Q05 del sandbox canónico (incluye usuario ana01).',
      'Bash', 'Easy', 2, 5, 'bash', 'bash_checker', true
    );
  end if;
end $$;

commit;
