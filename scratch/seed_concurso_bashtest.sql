-- =============================================================================
-- Concurso_BashTest: 20 retos bash fáciles + flags validables (leaderboard propio
-- del concurso en /contests.html al seleccionar el concurso).
-- Ejecutar en Supabase → SQL Editor (rol con permisos sobre public.*).
-- Idempotente: borra y recrea el concurso con slug concurso-bashtest.
-- =============================================================================

DO $seed$
DECLARE
  v_contest_id UUID;
  v_challenge_id UUID;
  v_desc TEXT;
  v_flag TEXT;
  v_code TEXT;
  i INT;
BEGIN
  PERFORM set_config('search_path', 'public, extensions', true);

  DELETE FROM public.contest_challenge_secrets
  WHERE challenge_id IN (
    SELECT cc.id FROM public.contest_challenges cc
    JOIN public.contests c ON c.id = cc.contest_id
    WHERE c.slug = 'concurso-bashtest'
  );
  DELETE FROM public.contest_solves
  WHERE contest_id IN (SELECT id FROM public.contests WHERE slug = 'concurso-bashtest');
  DELETE FROM public.contest_challenges
  WHERE contest_id IN (SELECT id FROM public.contests WHERE slug = 'concurso-bashtest');
  DELETE FROM public.contests WHERE slug = 'concurso-bashtest';

  INSERT INTO public.contests (slug, title, description, mode, status, starts_at, ends_at)
  VALUES (
    'concurso-bashtest',
    'Concurso_BashTest',
    'Veinte retos muy fáciles de Bash (solo lectura del enunciado y copia de la flag de comprobación). '
    'Si envías una flag incorrecta, el sistema la rechaza: no hay medias tintas. '
    'El leaderboard de esta página es exclusivo de este concurso (puntos por reto resuelto).',
    'solo',
    'active',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '10 years'
  )
  RETURNING id INTO v_contest_id;

  FOR i IN 1..20 LOOP
    v_code := 'C' || LPAD(i::TEXT, 2, '0');
    v_flag := 'bxf{BASHTEST' || LPAD(i::TEXT, 2, '0') || '}';

    v_desc := CASE i
      WHEN 1 THEN
        '¿Qué comando imprime en la terminal la cadena Hola? (Pista: sirve para «eco» de texto).'
      WHEN 2 THEN
        'Comando que muestra la ruta del directorio de trabajo actual (directorio en el que estás).'
      WHEN 3 THEN
        'Comando habitual para listar nombres de archivos y carpetas del directorio actual.'
      WHEN 4 THEN
        'Comando para cambiar al directorio personal del usuario (suele abreviarse con una tilde en Bash).'
      WHEN 5 THEN
        'Cómo creas una variable de entorno FOO con valor 42 en la sesión actual (sintaxis export).'
      WHEN 6 THEN
        'Comando para mostrar el contenido de un archivo de texto en la salida estándar.'
      WHEN 7 THEN
        'Comando que busca líneas que contengan un patrón en uno o varios archivos (herramienta «grep»).'
      WHEN 8 THEN
        'Comando que cuenta líneas de un archivo (opción típica -l).'
      WHEN 9 THEN
        'Comando que muestra las primeras líneas de un archivo (por defecto 10).'
      WHEN 10 THEN
        'Comando que muestra las últimas líneas de un archivo.'
      WHEN 11 THEN
        'Operador de tubería que envía la salida de un comando a la entrada de otro (un carácter).'
      WHEN 12 THEN
        'Redirección que manda la salida estándar a un fichero sobrescribiéndolo (un carácter).'
      WHEN 13 THEN
        'Comando para hacer un archivo ejecutable (bits de permiso +x).'
      WHEN 14 THEN
        'Expresión de prueba en Bash entre corchetes para comprobar si un fichero existe (test -e).'
      WHEN 15 THEN
        'Estructura mínima: if condición; then …; fi (qué palabra cierra el bloque en Bash).'
      WHEN 16 THEN
        'Palabra clave para un bucle que recorre una lista de valores (for … in …).'
      WHEN 17 THEN
        'Palabra clave para repetir mientras se cumpla una condición (while …).'
      WHEN 18 THEN
        'Palabra clave para definir una función en Bash (sintaxis nombre() { … }).'
      WHEN 19 THEN
        'Comando de flujo para sustituir la primera aparición por línea en un texto (herramienta «sed», uso básico).'
      WHEN 20 THEN
        'Herramienta para imprimir columnas de un texto separado por espacios (awk, acción print típica).'
    END;

    v_desc := v_desc || E'\n\n**Validación:** envía exactamente esta flag (copia y pega; si falta un carácter, fallará): `' || v_flag || '`';

    INSERT INTO public.contest_challenges (
      contest_id, code, title, description,
      category, difficulty, points, position,
      content_focus, solve_mode, is_enabled
    )
    VALUES (
      v_contest_id,
      v_code,
      'Bash fácil ' || i || ' / 20',
      v_desc,
      'Bash',
      'Easy',
      50,
      i,
      'bash',
      'flag',
      TRUE
    )
    RETURNING id INTO v_challenge_id;

    INSERT INTO public.contest_challenge_secrets (challenge_id, flag_hash)
    VALUES (v_challenge_id, crypt(v_flag, gen_salt('bf'::text)));
  END LOOP;

  RAISE NOTICE 'Concurso_BashTest creado. id = % — Abre /contests.html y busca el concurso o usa ?slug=concurso-bashtest', v_contest_id;
END $seed$;
