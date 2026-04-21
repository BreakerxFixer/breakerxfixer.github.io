-- Seed: 3 contests (Bash scripting inspired)
-- - Contest A public scheduled: Friday 24/04/2026 11:10 (Europe/Madrid = +02)
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
    '[LAB A1] Construye un script que pida una ruta de fichero, valide que existe y sea legible, muestre las 8 primeras líneas, las 8 últimas y el total de palabras.',
    '[LAB A2] Construye un script que reciba un directorio por argumento y liste todos los archivos .log de tamaño superior a 2KB.',
    '[LAB A3] Construye un script de registro incremental que guarde resultados al final de un fichero sin sobrescribir contenido previo.',
    '[LAB A4] Construye un script de adivinanza con número aleatorio entre 1 y 200 que repita intentos hasta acierto y cuente intentos.',
    '[LAB A5] Construye un script de gestión de usuarios que valide formato alfanumérico con guion bajo, evite duplicados y registre en usuarios.txt.',
    '[LAB A6] Construye un script que filtre texto dentro de un archivo ignorando mayúsculas y minúsculas, mostrando coincidencias.',
    '[LAB A7] Construye un script que verifique permisos de ejecución de otro script y aplique corrección automática cuando falte permiso.',
    '[LAB A8] Construye un script que calcule un resumen de directorio de primer nivel con conteo de archivos.'
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
    '[LAB B1] Construye un script de inventario por extensión que cuente archivos .txt dentro de un árbol de directorios.',
    '[LAB B2] Construye un script de backup que comprima una carpeta en formato tar.gz con nombre de salida controlado.',
    '[LAB B3] Construye un script de supervisión que verifique si un proceso está activo por nombre exacto.',
    '[LAB B4] Construye un script de búsqueda que localice una cadena en archivos .txt e incluya referencia de línea.',
    '[LAB B5] Construye un script de limpieza que elimine archivos .tmp con antigüedad superior a 7 días en un directorio.',
    '[LAB B6] Construye un script con menú interactivo para ejecutar acciones numeradas en bucle hasta salida explícita.',
    '[LAB B7] Construye un script calculadora Bash que procese operaciones aritméticas básicas por entrada de usuario.',
    '[LAB B8] Construye un script de procesamiento CSV que extraiga la primera columna de un archivo delimitado por comas.'
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
