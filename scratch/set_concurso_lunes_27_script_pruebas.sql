-- Reparte concursos así:
-- 1) "Concurso Bash Scripting — Lunes 27/04/2026": retos Q01, Q02, Q03 (UI); harness/validación interna Q03–Q05 vía terminal (harnessCodeShift / isBashContestHarnessShiftedContext).
-- 2) Nuevo "Repaso 2 Abierto": Q01–Q05 propios del repaso.
-- Todo en modo bash_checker (validación por script con submit).

begin;

do $$
declare
  v_lunes_id uuid;
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

  -- Upsert concurso Repaso 2 Abierto
  insert into public.contests (
    slug, title, description, mode, status, starts_at, ends_at, access_scope
  ) values (
    'bash-scripting-2026-repaso-2-abierto',
    'Repaso 2 Abierto',
    'Repaso de scripting Bash (5 retos). Validación desde editor/terminal con submit.',
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
    title = 'Concurso Bash Scripting — Lunes 27/04/2026',
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

  -- Repaso 2: Q01/Q02 + 3 ejercicios similares a Q03/Q04/Q05
  insert into public.contest_challenges (
    contest_id, code, title, description, category, difficulty, points, position, content_focus, solve_mode, is_enabled
  ) values
  (
    v_repaso2_id,
    'Q01',
    'Bash scripting 1 / 5',
    '[LAB A1] Contar palabras y mostrar líneas de un script. Pide al usuario la ruta de un archivo y después: (a) comprueba si existe; si no, muestra mensaje y termina; (b) muestra las 5 primeras líneas; (c) muestra las 5 últimas; (d) cuenta cuántas palabras tiene. Formato de salida final obligatorio: Q01: <valor>.',
    'Bash', 'Easy', 2, 1, 'bash', 'bash_checker', true
  ),
  (
    v_repaso2_id,
    'Q02',
    'Bash scripting 2 / 5',
    '[LAB A2] Recibe la ruta de un directorio por argumento. Comprueba que existe; si no, termina. Busca archivos .txt en ese directorio y muestra solo los mayores de 1KB. Formato de salida final obligatorio: Q02: <resultado>.',
    'Bash', 'Easy', 2, 2, 'bash', 'bash_checker', true
  ),
  (
    v_repaso2_id,
    'Q03',
    'Bash scripting 3 / 5',
    '[LAB A3] Pide nombre, sexo y edad. Clasifica en hombre/mujer y menor/adulto/jubilado. Guarda el nombre en el archivo correspondiente y muestra al final: Q03: <archivo_generado>.',
    'Bash', 'Easy', 2, 3, 'bash', 'bash_checker', true
  ),
  (
    v_repaso2_id,
    'Q04',
    'Bash scripting 4 / 5',
    '[LAB A4] Genera un número aleatorio entre 1 y 100. Pide intentos al usuario, informa si son altos/bajos y termina al acertar. Salida final obligatoria: Q04: <intentos>.',
    'Bash', 'Easy', 2, 4, 'bash', 'bash_checker', true
  ),
  (
    v_repaso2_id,
    'Q05',
    'Bash scripting 5 / 5',
    '[LAB A5] Crea un menú en bucle para gestionar usuarios en archivo: añadir, buscar, listar, contar y salir. Solo minúsculas y números; sin duplicados. Salida final obligatoria: Q05: <total_usuarios>.',
    'Bash', 'Easy', 2, 5, 'bash', 'bash_checker', true
  );
end $$;

commit;
