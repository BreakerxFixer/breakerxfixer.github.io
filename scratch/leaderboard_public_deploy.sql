-- Ejecutar en Supabase → SQL Editor (producción).
-- Leaderboard público: excluye admin_users e is_beta_tester (misma lógica que supabase_setup.sql).
-- El cliente también filtra admins conocidos por soporte (main.js).

CREATE OR REPLACE FUNCTION public.get_leaderboard(p_season_id INTEGER DEFAULT NULL)
RETURNS TABLE (
    id UUID,
    username TEXT,
    points BIGINT,
    avatar_url TEXT
)
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    IF p_season_id IS NULL OR p_season_id = -1 THEN
        RETURN QUERY
        SELECT p.id, p.username, p.points::BIGINT, p.avatar_url
        FROM public.profiles p
        LEFT JOIN public.admin_users au ON au.user_id = p.id
        WHERE au.user_id IS NULL
          AND NOT public.is_beta_tester(p.id)
        -- Tie-breaker: ASC last solve (the one who reached the score sooner wins)
        ORDER BY p.points DESC, (SELECT MAX(solved_at) FROM public.solves WHERE user_id = p.id) ASC NULLS LAST
        LIMIT 100;
    ELSE
        RETURN QUERY
        SELECT p.id, p.username, COALESCE(SUM(c.points), 0)::BIGINT as points, p.avatar_url
        FROM public.profiles p
        LEFT JOIN public.admin_users au ON au.user_id = p.id
        JOIN public.solves s ON s.user_id = p.id
        JOIN public.challenges c ON c.id = s.challenge_id
        WHERE c.season_id = p_season_id
          AND au.user_id IS NULL
          AND NOT public.is_beta_tester(p.id)
        GROUP BY p.id, p.username, p.avatar_url
        -- Tie-breaker: Earlier last solve within season wins
        ORDER BY points DESC, MAX(s.solved_at) ASC
        LIMIT 100;
    END IF;
END;
$$;

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
AS $lb2$
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
    FROM public.friendships f
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
    LEFT JOIN public.admin_users au ON au.user_id = p.id
    LEFT JOIN bs ON bs.user_id = p.id
    WHERE au.user_id IS NULL
      AND NOT public.is_beta_tester(p.id)
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
$lb2$;

GRANT EXECUTE ON FUNCTION public.get_leaderboard(integer) TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_leaderboard_v2(integer, text, text, text) TO anon, authenticated;
