-- Ejecutar en Supabase (SQL) para exponer progreso Learn (labs v2) en perfiles públicos.
-- Requiere: public.challenges_v2, public.learn_progress_v2 (mismo esquema que supabase_setup.sql).

CREATE OR REPLACE FUNCTION public.get_public_learn_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH base AS (
    SELECT
      c.id,
      CASE
        WHEN COALESCE(c.metadata->>'lesson', '') ~ '^LX' THEN 'linux'
        WHEN COALESCE(c.metadata->>'lesson', '') ~ '^BA' THEN 'bash'
        ELSE 'other'
      END AS fam
    FROM public.challenges_v2 c
    WHERE c.track_id = 'learn' AND c.status = 'published'
  ),
  tot AS (
    SELECT
      COUNT(*)::int AS learn_total,
      COUNT(*) FILTER (WHERE fam = 'linux')::int AS linux_total,
      COUNT(*) FILTER (WHERE fam = 'bash')::int AS bash_total
    FROM base
  ),
  d AS (
    SELECT b.fam
    FROM public.learn_progress_v2 lp
    JOIN base b ON b.id = lp.challenge_id
    WHERE lp.user_id = p_user_id AND lp.status = 'completed'
  )
  SELECT jsonb_build_object(
    'learn_total', (SELECT learn_total FROM tot),
    'learn_done', (SELECT COALESCE((SELECT COUNT(*)::int FROM d), 0)),
    'linux_total', (SELECT linux_total FROM tot),
    'linux_done', (SELECT COALESCE((SELECT COUNT(*)::int FROM d WHERE fam = 'linux'), 0)),
    'bash_total', (SELECT bash_total FROM tot),
    'bash_done', (SELECT COALESCE((SELECT COUNT(*)::int FROM d WHERE fam = 'bash'), 0))
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_learn_stats(uuid) TO anon, authenticated;
