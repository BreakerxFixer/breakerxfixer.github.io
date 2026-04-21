-- Seed: 3 contests (Bash scripting inspired)
-- - Contest A public scheduled: Friday 24/04/2026 08:00 (Europe/Madrid = +02)
-- - Contest A internal active now: only admins + beta testers
-- - Contest B public active now: same exercise style, different prompts
-- Idempotent by slug.

do $seed$
declare
  v_contest_id uuid;
  v_challenge_id uuid;

  v_slug text;
  v_title text;
  v_description text;
  v_mode text;
  v_status text;
  v_scope text;
  v_starts_at timestamptz;
  v_ends_at timestamptz;

  outer_idx int;
  inner_idx int;
  set_size int;

  v_code text;
  v_q text;
  v_a text;

  slugs text[] := array[
    'bash-scripting-2026-public-viernes',
    'bash-scripting-2026-interno-admin-beta',
    'bash-scripting-2026-general-abierto'
  ];

  -- Set A: used for contest 1 (scheduled public) + contest 2 (internal active).
  -- Learn Bash style (task/lab format, no question wording).
  q_a text[] := array[
    '[LAB A1] Script de inspección de fichero. Objetivo: pedir una ruta, validar archivo existente y legible, mostrar 8 primeras líneas, 8 últimas y total de palabras. Entrega: comando clave de conteo de palabras usado en el script.',
    '[LAB A2] Script de barrido de logs. Objetivo: recibir un directorio por argumento y listar archivos .log de más de 2KB. Entrega: comando principal de búsqueda usado en la solución.',
    '[LAB A3] Script de auditoría incremental. Objetivo: registrar resultados sin sobrescribir históricos en un fichero de log. Entrega: operador de redirección usado para anexar al final.',
    '[LAB A4] Script de juego de adivinanza. Objetivo: generar número aleatorio y repetir intentos hasta acierto. Entrega: palabra de cierre del bucle while utilizada en Bash.',
    '[LAB A5] Script de gestión de usuarios. Objetivo: validar nombre con regex y detectar duplicados en usuarios.txt. Entrega: comando de búsqueda silenciosa usado para comprobar existencia exacta.',
    '[LAB A6] Script de filtrado textual. Objetivo: buscar coincidencias ignorando mayúsculas/minúsculas dentro de un archivo. Entrega: comando de filtrado utilizado.',
    '[LAB A7] Script de preparación de ejecución. Objetivo: verificar permisos y habilitar ejecución de script si falta. Entrega: comando aplicado para otorgar permiso ejecutable.',
    '[LAB A8] Script de resumen de directorio. Objetivo: contar archivos de primer nivel con tubería de comandos. Entrega: tubería completa de conteo usada.'
  ];
  a_a text[] := array[
    'wc -w',
    'find',
    '>>',
    'done',
    'grep -q',
    'grep -i',
    'chmod +x',
    'ls -1 | wc -l'
  ];

  -- Set B: public active for everyone, different prompts from set A.
  -- Learn Bash style (task/lab format, no question wording).
  q_b text[] := array[
    '[LAB B1] Script de inventario por extensión. Objetivo: contar archivos .txt en un árbol de directorios. Entrega: comando principal de búsqueda usado en el script.',
    '[LAB B2] Script de backup operativo. Objetivo: comprimir una carpeta en formato tar.gz con nombre de salida controlado. Entrega: comando base de empaquetado/compresión.',
    '[LAB B3] Script de supervisión de procesos. Objetivo: verificar si un proceso concreto está activo por nombre exacto. Entrega: comando de comprobación empleado.',
    '[LAB B4] Script de búsqueda técnica. Objetivo: localizar cadena en todos los .txt mostrando número de línea. Entrega: comando de búsqueda con numeración utilizado.',
    '[LAB B5] Script de limpieza temporal. Objetivo: detectar y eliminar archivos .tmp con antigüedad superior a 7 días. Entrega: comando principal de filtrado/borrado.',
    '[LAB B6] Script con menú interactivo. Objetivo: manejar opciones numeradas y acciones diferenciadas en bucle. Entrega: estructura de control usada para enrutar opciones.',
    '[LAB B7] Script calculadora Bash. Objetivo: aplicar operación de multiplicación en contexto aritmético de shell. Entrega: operador utilizado.',
    '[LAB B8] Script de extracción CSV. Objetivo: obtener la primera columna en un fichero delimitado por comas. Entrega: comando típico de extracción empleado.'
  ];
  a_b text[] := array[
    'find',
    'tar -czf',
    'pgrep -x',
    'grep -n',
    'find',
    'case',
    '*',
    'cut -d, -f1'
  ];
begin
  perform set_config('search_path', 'public, extensions', true);

  -- Cleanup old rows for target slugs.
  delete from public.contest_challenge_secrets
  where challenge_id in (
    select cc.id
    from public.contest_challenges cc
    join public.contests c on c.id = cc.contest_id
    where c.slug = any(slugs)
  );

  delete from public.contest_solves
  where contest_id in (
    select id from public.contests where slug = any(slugs)
  );

  delete from public.contest_challenges
  where contest_id in (
    select id from public.contests where slug = any(slugs)
  );

  delete from public.contests
  where slug = any(slugs);

  -- Build 3 contests.
  for outer_idx in 1..3 loop
    if outer_idx = 1 then
      v_slug := 'bash-scripting-2026-public-viernes';
      v_title := 'Concurso Bash Scripting — Viernes 24/04/2026';
      v_description := 'Concurso de scripting Bash (set A). Apertura pública programada para viernes 24/04/2026 a las 11:10 (Europe/Madrid).';
      v_mode := 'solo';
      v_status := 'scheduled';
      v_scope := 'public';
      v_starts_at := '2026-04-24 11:10:00+02'::timestamptz;
      v_ends_at := null;
      set_size := array_length(q_a, 1);
    elsif outer_idx = 2 then
      v_slug := 'bash-scripting-2026-interno-admin-beta';
      v_title := 'Concurso Bash Scripting — Interno Admin/Beta';
      v_description := 'Mismo set A. Visible y resoluble solo para admins y beta testers (pablo, keloka).';
      v_mode := 'solo';
      v_status := 'active';
      v_scope := 'internal';
      v_starts_at := now() - interval '1 day';
      v_ends_at := null;
      set_size := array_length(q_a, 1);
    else
      v_slug := 'bash-scripting-2026-general-abierto';
      v_title := 'Concurso Bash Scripting — General Abierto';
      v_description := 'Concurso general abierto (set B): mismo estilo de scripting Bash, preguntas distintas al set A.';
      v_mode := 'solo';
      v_status := 'active';
      v_scope := 'public';
      v_starts_at := now() - interval '1 day';
      v_ends_at := null;
      set_size := array_length(q_b, 1);
    end if;

    insert into public.contests (
      slug, title, description, mode, status, starts_at, ends_at, access_scope
    )
    values (
      v_slug, v_title, v_description, v_mode, v_status, v_starts_at, v_ends_at, v_scope
    )
    returning id into v_contest_id;

    for inner_idx in 1..set_size loop
      v_code := 'Q' || lpad(inner_idx::text, 2, '0');
      if v_slug in ('bash-scripting-2026-public-viernes', 'bash-scripting-2026-interno-admin-beta') then
        v_q := q_a[inner_idx];
        v_a := a_a[inner_idx];
      else
        v_q := q_b[inner_idx];
        v_a := a_b[inner_idx];
      end if;

      insert into public.contest_challenges (
        contest_id, code, title, description, category, difficulty, points, position, content_focus, solve_mode, is_enabled
      )
      values (
        v_contest_id,
        v_code,
        'Bash scripting ' || inner_idx || ' / ' || set_size,
        v_q,
        'Bash',
        'Easy',
        100,
        inner_idx,
        'bash',
        'flag',
        true
      )
      returning id into v_challenge_id;

      insert into public.contest_challenge_secrets (challenge_id, flag_hash)
      values (v_challenge_id, crypt(trim(v_a), gen_salt('bf'::text)));
    end loop;
  end loop;

  raise notice 'Seed completed: 3 contests created (A public scheduled, A internal active, B public active).';
end
$seed$;
