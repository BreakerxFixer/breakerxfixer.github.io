-- First blood system — run once in Supabase SQL editor (idempotent)
-- 1) Columns on challenges
ALTER TABLE public.challenges
  ADD COLUMN IF NOT EXISTS first_blood_user_id UUID REFERENCES public.profiles (id) ON DELETE SET NULL,
  ADD COLUMN IF NOT EXISTS first_blood_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_challenges_first_blood_user ON public.challenges (first_blood_user_id);

-- 2) Backfill from existing solves (earliest NON-admin solve per challenge).
-- If current first blood belongs to an admin, replace it with earliest non-admin solve.
UPDATE public.challenges c
SET
  first_blood_user_id = sub.uid,
  first_blood_at = sub.first_at
FROM (
  SELECT
    s.challenge_id,
    (array_agg(s.user_id ORDER BY s.solved_at ASC))[1] AS uid,
    MIN(s.solved_at) AS first_at
  FROM public.solves s
  LEFT JOIN public.admin_users au ON au.user_id = s.user_id
  WHERE au.user_id IS NULL
  GROUP BY s.challenge_id
) sub
WHERE c.id = sub.challenge_id
  AND (
    c.first_blood_user_id IS NULL
    OR EXISTS (
      SELECT 1
      FROM public.admin_users au2
      WHERE au2.user_id = c.first_blood_user_id
    )
  );

-- 3) submit_flag: set first blood only if still vacant (race-safe); return first_blood in JSON
CREATE OR REPLACE FUNCTION public.submit_flag(challenge_id_param TEXT, submitted_flag TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
AS $$
DECLARE
  correct_hash TEXT;
  pts_to_add INTEGER;
  already_solved BOOLEAN;
  inserted_solve BOOLEAN;
  fb_rows INTEGER := 0;
BEGIN
  IF auth.uid() IS NULL THEN
    RETURN jsonb_build_object('success', false, 'message', 'NOT_AUTHENTICATED');
  END IF;

  SELECT EXISTS (
    SELECT 1 FROM public.solves
    WHERE user_id = auth.uid() AND challenge_id = challenge_id_param
  ) INTO already_solved;

  IF already_solved THEN
    RETURN jsonb_build_object('success', false, 'message', 'ALREADY_SOLVED');
  END IF;

  SELECT flag_hash FROM public.challenge_secrets WHERE id = challenge_id_param INTO correct_hash;
  SELECT points FROM public.challenges WHERE id = challenge_id_param INTO pts_to_add;

  IF encode(digest(submitted_flag, 'sha256'), 'hex') = correct_hash THEN
    INSERT INTO public.solves (user_id, challenge_id)
    VALUES (auth.uid(), challenge_id_param)
    ON CONFLICT (user_id, challenge_id) DO NOTHING
    RETURNING true INTO inserted_solve;

    IF inserted_solve THEN
      UPDATE public.profiles
      SET points = points + COALESCE(pts_to_add, 0)
      WHERE id = auth.uid();

      INSERT INTO public.submission_logs (user_id, challenge_id, success)
      VALUES (auth.uid(), challenge_id_param, true);

      -- Admin solves never claim first blood.
      -- If first blood is currently owned by an admin, first non-admin solve replaces it.
      UPDATE public.challenges c
      SET
        first_blood_user_id = auth.uid(),
        first_blood_at = NOW()
      WHERE c.id = challenge_id_param
        AND NOT public.is_admin(auth.uid())
        AND (
          c.first_blood_user_id IS NULL
          OR EXISTS (
            SELECT 1
            FROM public.admin_users au
            WHERE au.user_id = c.first_blood_user_id
          )
        );

      GET DIAGNOSTICS fb_rows = ROW_COUNT;

      RETURN jsonb_build_object(
        'success', true,
        'message', 'FLAG_CORRECT',
        'points_earned', pts_to_add,
        'first_blood', fb_rows > 0
      );
    ELSE
      RETURN jsonb_build_object('success', false, 'message', 'ALREADY_SOLVED');
    END IF;
  ELSE
    INSERT INTO public.submission_logs (user_id, challenge_id, success)
    VALUES (auth.uid(), challenge_id_param, false);
    RETURN jsonb_build_object('success', false, 'message', 'INVALID_FLAG');
  END IF;
END;
$$;
