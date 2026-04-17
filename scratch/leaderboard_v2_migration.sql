-- Leaderboard v2: métricas enriquecidas, scopes global / red / blue / friends, momentum 14d
-- Ejecutar en Supabase SQL Editor.

CREATE OR REPLACE FUNCTION public._bxf_category_team(cat TEXT)
RETURNS TEXT
LANGUAGE sql
IMMUTABLE
AS $func$
  SELECT CASE
    WHEN COALESCE(TRIM(cat), '') = '' THEN 'red'
    WHEN TRIM(cat) IN ('Web', 'Pwn', 'Crypto', 'OSINT', 'Programming') THEN 'red'
    WHEN TRIM(cat) IN ('Forensics', 'Reversing', 'Rev', 'Hardware', 'Misc') THEN 'blue'
    WHEN mod(abs(hashtext(TRIM(cat))), 2) = 0 THEN 'red'
    ELSE 'blue'
  END;
$func$;

CREATE OR REPLACE FUNCTION public.get_leaderboard_v2(
  p_season_id INTEGER DEFAULT NULL,
  p_scope TEXT DEFAULT 'global',
  p_category TEXT DEFAULT NULL,
  p_difficulty TEXT DEFAULT NULL
)
RETURNS TABLE (
  id UUID,
  username TEXT,
  pts BIGINT,
  avatar_url TEXT,
  flags BIGINT,
  momentum BIGINT,
  last_solve_at TIMESTAMPTZ
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  sid INTEGER;
  sc TEXT;
BEGIN
  sid := CASE WHEN p_season_id IS NULL OR p_season_id = -1 THEN NULL ELSE p_season_id END;
  sc := lower(trim(coalesce(p_scope, 'global')));

  IF sc = 'friends' AND auth.uid() IS NULL THEN
    RETURN;
  END IF;

  IF sc NOT IN ('global', 'red', 'blue', 'friends') THEN
    sc := 'global';
  END IF;

  RETURN QUERY
  WITH mates AS (
    SELECT DISTINCT CASE WHEN f.requester_id = auth.uid() THEN f.addressee_id ELSE f.requester_id END AS uid
    FROM friendships f
    WHERE f.status = 'accepted'
      AND (f.requester_id = auth.uid() OR f.addressee_id = auth.uid())
    UNION
    SELECT auth.uid()
  ),
  bs AS (
    SELECT
      s.user_id,
      s.solved_at,
      c.points AS ch_pts,
      c.category
    FROM public.solves s
    INNER JOIN public.challenges c ON c.id = s.challenge_id
    WHERE (sid IS NULL OR c.season_id = sid)
      AND (p_category IS NULL OR c.category = p_category)
      AND (p_difficulty IS NULL OR c.difficulty = p_difficulty)
  ),
  ua AS (
    SELECT
      p.id AS pid,
      p.username AS uname,
      p.avatar_url AS av,
      p.points::bigint AS profile_pts,
      COALESCE(SUM(bs.ch_pts), 0)::bigint AS solved_pts,
      COUNT(bs.user_id)::bigint AS flag_n,
      MAX(bs.solved_at) AS last_at,
      COALESCE(SUM(CASE WHEN bs.solved_at > NOW() - INTERVAL '14 days' THEN 1 ELSE 0 END), 0)::bigint AS mom,
      COALESCE(SUM(CASE WHEN public._bxf_category_team(bs.category) = 'red' THEN bs.ch_pts ELSE 0 END), 0)::bigint AS rpt,
      COALESCE(SUM(CASE WHEN public._bxf_category_team(bs.category) = 'blue' THEN bs.ch_pts ELSE 0 END), 0)::bigint AS bpt,
      COALESCE(SUM(CASE WHEN public._bxf_category_team(bs.category) = 'red' THEN 1 ELSE 0 END), 0)::bigint AS rflag,
      COALESCE(SUM(CASE WHEN public._bxf_category_team(bs.category) = 'blue' THEN 1 ELSE 0 END), 0)::bigint AS bflag
    FROM public.profiles p
    LEFT JOIN bs ON bs.user_id = p.id
    GROUP BY p.id, p.username, p.avatar_url, p.points
  ),
  fil AS (
    SELECT
      ua.*,
      CASE
        WHEN sc = 'red' THEN ua.rpt
        WHEN sc = 'blue' THEN ua.bpt
        WHEN sid IS NULL THEN ua.profile_pts
        ELSE ua.solved_pts
      END AS sort_pts,
      CASE
        WHEN sc = 'red' THEN ua.rflag
        WHEN sc = 'blue' THEN ua.bflag
        ELSE ua.flag_n
      END AS out_flags
    FROM ua
    WHERE
      (sc <> 'friends' OR ua.pid IN (SELECT mates.uid FROM mates))
      AND (sid IS NULL OR ua.flag_n > 0)
      AND (
        sc = 'global'
        OR sc = 'friends'
        OR (sc = 'red' AND ua.rpt > 0)
        OR (sc = 'blue' AND ua.bpt > 0)
      )
  )
  SELECT
    fil.pid,
    fil.uname,
    fil.sort_pts,
    fil.av,
    fil.out_flags,
    fil.mom,
    fil.last_at
  FROM fil
  ORDER BY
    fil.sort_pts DESC,
    fil.last_at ASC NULLS LAST
  LIMIT 100;
END;
$$;

-- Realtime: puntos y solves disparan refresco en cliente
DO $pub$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'profiles'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.profiles;
  END IF;
  IF NOT EXISTS (
    SELECT 1 FROM pg_publication_tables
    WHERE pubname = 'supabase_realtime' AND schemaname = 'public' AND tablename = 'solves'
  ) THEN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.solves;
  END IF;
END;
$pub$;
