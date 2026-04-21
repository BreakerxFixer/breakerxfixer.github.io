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
  q_a text[] := array[
    'Pide una ruta de fichero y valida que existe. Después muestra las 8 primeras líneas, las 8 últimas y el total de palabras. Escribe el comando de Bash que cuenta palabras.',
    'Recibiendo un directorio por argumento, busca todos los archivos .log con tamaño superior a 2KB. Escribe el comando principal para esa búsqueda.',
    'En un script, ¿qué operador usas para añadir una línea al final de un fichero sin sobrescribir contenido?',
    'Genera un número aleatorio de 1 a 200 y repite intentos hasta acertar. ¿Qué palabra clave cierra el bloque while en Bash?',
    'Valida nombres de usuario con patrón ^[a-z0-9_]+$ en un if de Bash. ¿Qué comando se usa para buscar si un usuario exacto ya existe en usuarios.txt?',
    'Muestra coincidencias de una palabra ignorando mayúsculas/minúsculas dentro de un archivo. Escribe el comando clave.',
    'Si un script no tiene permiso de ejecución, ¿qué comando usas para otorgarlo?',
    'Muestra número de archivos de un directorio (sin subdirectorios). Escribe una tubería típica con ls y conteo.'
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
  q_b text[] := array[
    'En un directorio dado, cuenta cuántos archivos .txt hay (incluyendo subdirectorios). Escribe el comando principal.',
    'Crea un backup comprimido de una carpeta en formato tar.gz. Escribe el comando base para generar ese archivo.',
    'Comprueba si un proceso está corriendo por nombre y devuelve solo coincidencia exacta. ¿Qué comando usarías?',
    'Busca una cadena dentro de todos los .txt y muestra también el número de línea. Escribe el comando clave.',
    'Elimina archivos .tmp de más de 7 días en un directorio. ¿Qué comando principal usarías para filtrar por antigüedad y borrar?',
    'En un menú de script, ¿qué estructura de control en Bash es la más adecuada para manejar opciones numeradas?',
    'En una calculadora bash, ¿qué operador aritmético usas para multiplicación dentro de $(( ... ))?',
    'Extrae la primera columna de un CSV separado por comas. Escribe un comando típico para hacerlo.'
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
      v_description := 'Concurso de scripting Bash (set A). Apertura pública programada para viernes 24/04/2026 a las 08:00 (Europe/Madrid).';
      v_mode := 'solo';
      v_status := 'scheduled';
      v_scope := 'public';
      v_starts_at := '2026-04-24 08:00:00+02'::timestamptz;
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
