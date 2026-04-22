-- =============================================================================
-- Bash esencial — 20 microretos: respuestas cortas (comando o palabra clave).
-- Validación en línea: solve_mode = 'flag' (hash en contest_challenge_secrets).
-- Idempotente: borra y recrea slug concurso-bashtest.
-- Si un despliegue antiguo dejó solve_mode != 'flag', aplica
-- scratch/fix_concurso_bashtest_resolvable.sql
-- =============================================================================

DO $seed$
DECLARE
  v_contest_id UUID;
  v_challenge_id UUID;
  v_desc TEXT;
  v_answer TEXT;
  v_code TEXT;
  i INT;
  answers TEXT[] := ARRAY[
    'echo Hola',
    'pwd',
    'ls',
    'cd ~',
    'export FOO=42',
    'cat',
    'grep',
    'wc -l',
    'head',
    'tail',
    '|',
    '>',
    'chmod +x',
    'test',
    'fi',
    'for',
    'while',
    'function',
    'sed',
    'awk'
  ];
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
    'Bash esencial — 20 microretos',
    'Veinte preguntas muy sencillas sobre la shell. En cada reto escribe solo la respuesta pedida '
    '(un comando o una palabra clave), como en una terminal, sin relleno extra. '
    'Validación en línea: el servidor compara tu envío con la respuesta guardada. '
    'El ranking del concurso está en el panel colapsable de arriba.',
    'solo',
    'active',
    NOW() - INTERVAL '1 day',
    NOW() + INTERVAL '10 years'
  )
  RETURNING id INTO v_contest_id;

  FOR i IN 1..20 LOOP
    v_code := 'C' || LPAD(i::TEXT, 2, '0');
    v_answer := answers[i];

    v_desc := CASE i
      WHEN 1 THEN
        'Escribe el comando más simple para imprimir en pantalla la cadena Hola (tres letras, sin comillas obligatorias si no hay espacios).'
      WHEN 2 THEN
        '¿Qué comando muestra la ruta absoluta del directorio de trabajo actual?'
      WHEN 3 THEN
        'Comando para listar el contenido del directorio actual (nombres de archivos y carpetas).'
      WHEN 4 THEN
        'Comando (con tilde) para ir al directorio home del usuario actual.'
      WHEN 5 THEN
        'Escribe una sola línea que exporte la variable de entorno FOO con valor 42 (sintaxis típica de export).'
      WHEN 6 THEN
        'Comando básico para volcar el contenido de un fichero de texto a la salida estándar.'
      WHEN 7 THEN
        'Nombre del comando clásico para filtrar líneas que coincidan con un patrón.'
      WHEN 8 THEN
        'Comando con opción -l para contar líneas de un fichero (escribe comando y opción).'
      WHEN 9 THEN
        'Comando que por defecto muestra las primeras 10 líneas de un fichero.'
      WHEN 10 THEN
        'Comando que muestra las últimas líneas de un fichero.'
      WHEN 11 THEN
        'Un solo carácter: el operador de tubería entre dos comandos.'
      WHEN 12 THEN
        'Un solo carácter: redirección de salida estándar a fichero (sobrescribe).'
      WHEN 13 THEN
        'Escribe el comando seguido de la opción habitual para dar permiso de ejecución a un script (chmod y +x).'
      WHEN 14 THEN
        'Nombre del comando o builtin para evaluar condiciones (alternativa a corchetes para pruebas de ficheros).'
      WHEN 15 THEN
        'Palabra reservada que cierra un bloque if en Bash.'
      WHEN 16 THEN
        'Palabra clave que abre un bucle que recorre una lista de valores.'
      WHEN 17 THEN
        'Palabra clave del bucle que repite mientras una condición sea cierta.'
      WHEN 18 THEN
        'Palabra clave opcional para declarar una función en Bash (antes del nombre).'
      WHEN 19 THEN
        'Nombre del comando de flujo de texto para sustituciones por línea (editor de flujo).'
      WHEN 20 THEN
        'Nombre del lenguaje/herramienta para procesar columnas de texto (típico con { print $1 }).'
    END;

    INSERT INTO public.contest_challenges (
      contest_id, code, title, description,
      category, difficulty, points, position,
      content_focus, solve_mode, is_enabled
    )
    VALUES (
      v_contest_id,
      v_code,
      'Bash test ' || i || ' / 20',
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
    VALUES (v_challenge_id, crypt(trim(v_answer), gen_salt('bf'::text)));
  END LOOP;

  RAISE NOTICE 'Bash esencial (concurso-bashtest) actualizado. id = %', v_contest_id;
END $seed$;
