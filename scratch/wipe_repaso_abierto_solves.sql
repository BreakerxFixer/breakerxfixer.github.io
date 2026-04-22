-- =============================================================================
-- Wipe: solo filas de contest_solves del concurso cuyo título coincide con
-- "Repaso Abierto" (el más reciente por updated_at / starts_at).
-- Ejecútalo en el SQL Editor de Supabase (o psql) con una cuenta con permisos.
-- Revisa el SELECT de _target_contest antes del DELETE.
-- =============================================================================

BEGIN;

-- 1) Concurso objetivo: Repaso Abierto (el más reciente por seguridad)
CREATE TEMP TABLE _target_contest ON COMMIT DROP AS
SELECT c.id, c.title, c.slug
FROM public.contests c
WHERE c.title ILIKE '%Repaso Abierto%'
ORDER BY c.updated_at DESC NULLS LAST, c.starts_at DESC NULLS LAST
LIMIT 1;

-- 2) Ver cuál ha seleccionado
SELECT * FROM _target_contest;

-- 3) Ver solves antes (total y por reto)
SELECT count(*) AS solves_before
FROM public.contest_solves cs
JOIN _target_contest t ON t.id = cs.contest_id;

SELECT cs.challenge_id, count(*) AS solves_before_challenge
FROM public.contest_solves cs
JOIN _target_contest t ON t.id = cs.contest_id
GROUP BY cs.challenge_id
ORDER BY cs.challenge_id;

-- 4) Borrar solves del concurso objetivo
DELETE FROM public.contest_solves cs
USING _target_contest t
WHERE cs.contest_id = t.id;

-- 5) Verificar
SELECT count(*) AS solves_after
FROM public.contest_solves cs
JOIN _target_contest t ON t.id = cs.contest_id;

COMMIT;
