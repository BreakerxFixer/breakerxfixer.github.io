-- =============================================================================
-- Apertura: "Concurso Bash Scripting … Repaso Abierto"
-- 23/04/2026 a las 01:05 (madrugada) en hora de España (Europe/Madrid, abril = CEST, +02).
-- El concurso queda en scheduled hasta esa hora; a partir de entonces acepta envíos
-- (submit_contest_flag / output) según reglas de submit_contest_flag en supabase.
--
-- Si quieres 01:05 UTC en lugar de Madrid, cambia a: '2026-04-23T01:05:00+00'::timestamptz
-- =============================================================================

UPDATE public.contests
SET
  status = 'scheduled',
  starts_at = '2026-04-23T01:05:00+02'::timestamptz,
  updated_at = now()
WHERE
  title ILIKE '%Bash Scripting%'
  AND title ILIKE '%Repaso Abierto%';

-- Comprueba qué filas quedaron (debería ser 1)
SELECT id, slug, title, status, starts_at, ends_at, access_scope, updated_at
FROM public.contests
WHERE title ILIKE '%Repaso Abierto%'
ORDER BY updated_at DESC;
