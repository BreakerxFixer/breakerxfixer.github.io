-- =============================================================================
-- Hace "resolvible" el concurso Bash 20 requis: validación en línea por hash
-- requiere solve_mode = 'flag' (submit_contest_flag / submit_contest_output).
-- Si en tu BD quedó 'bash_checker' o 'terminal', el RPC devuelve NOT_ONLINE_VALIDATION.
--
-- Opcional: renombra título (sin tocar el slug, para no romper enlaces).
-- Ejecutar después de comprobar el id/slug.
-- =============================================================================

-- Por slug fijo (seed concurso-bashtest)
UPDATE public.contests
SET
  title = 'Bash esencial — 20 microretos',
  description = 'Veinte pregunas muy sencillas sobre la shell. En cada reto responde solo '
    'con el comando o la palabra clave, como escribirías en una terminal, sin relleno extra. '
    'Validación en línea por coincidencia con la respuesta esperada (hash en servidor).'
WHERE slug = 'concurso-bashtest';

UPDATE public.contest_challenges
SET solve_mode = 'flag'
WHERE contest_id IN (SELECT id FROM public.contests WHERE slug = 'concurso-bashtest')
  AND COALESCE(solve_mode, 'flag') <> 'flag';

-- Comprobación
SELECT c.slug, c.title, cc.code, cc.solve_mode, cc.is_enabled
FROM public.contest_challenges cc
JOIN public.contests c ON c.id = cc.contest_id
WHERE c.slug = 'concurso-bashtest'
ORDER BY cc.position;
