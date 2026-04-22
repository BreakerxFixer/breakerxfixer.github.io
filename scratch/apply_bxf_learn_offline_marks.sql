-- Sincroniza progreso Learn 32+38 (claves localStorage bashN / lin*) a Supabase para perfiles públicos
-- alineados con "en este navegador" en /learn. Ejecutar en SQL Editor.
-- Sustituye get_public_learn_stats para totales 32+38/70 y lectura desde bxf_learn_offline_marks.

CREATE TABLE IF NOT EXISTS public.bxf_learn_offline_marks (
  user_id uuid NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  slot text NOT NULL,
  completed_at timestamptz NOT NULL DEFAULT NOW(),
  PRIMARY KEY (user_id, slot),
  CONSTRAINT bxf_learn_slot_valid CHECK (slot ~ '^(lin[0-9a-zA-Z]+|bash[0-9]+)$' AND char_length(slot) < 32)
);

CREATE INDEX IF NOT EXISTS bxf_learn_offline_marks_user_idx
  ON public.bxf_learn_offline_marks (user_id);

ALTER TABLE public.bxf_learn_offline_marks ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS "bxf_learn_offline_no_direct" ON public.bxf_learn_offline_marks;
CREATE POLICY "bxf_learn_offline_no_direct" ON public.bxf_learn_offline_marks
  FOR ALL USING (false) WITH CHECK (false);

-- Solo RPCs SECURITY DEFINER; lectura pública vía get_public_learn_stats

CREATE OR REPLACE FUNCTION public.bxf_learn_offline_mark(p_slot text)
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF p_slot IS NULL OR p_slot !~ '^(lin[0-9a-zA-Z]+|bash[0-9]+)$' OR char_length(p_slot) > 31 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'bad_slot');
  END IF;
  INSERT INTO public.bxf_learn_offline_marks (user_id, slot, completed_at)
  VALUES (uid, p_slot, NOW())
  ON CONFLICT (user_id, slot) DO UPDATE SET completed_at = EXCLUDED.completed_at;
  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.bxf_learn_offline_sync_batch(p_slots text[])
RETURNS jsonb
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  s text;
  n int := 0;
  uid uuid := auth.uid();
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  IF p_slots IS NULL OR coalesce(array_length(p_slots, 1), 0) = 0 THEN
    RETURN jsonb_build_object('ok', true, 'upserted', 0);
  END IF;
  IF array_length(p_slots, 1) > 120 THEN
    RETURN jsonb_build_object('ok', false, 'error', 'too_many');
  END IF;
  FOREACH s IN ARRAY p_slots LOOP
    IF s IS NOT NULL AND s ~ '^(lin[0-9a-zA-Z]+|bash[0-9]+)$' AND char_length(s) < 32 THEN
      INSERT INTO public.bxf_learn_offline_marks (user_id, slot, completed_at)
      VALUES (uid, s, NOW())
      ON CONFLICT (user_id, slot) DO UPDATE SET completed_at = EXCLUDED.completed_at;
      n := n + 1;
    END IF;
  END LOOP;
  RETURN jsonb_build_object('ok', true, 'upserted', n);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bxf_learn_offline_mark(text) TO authenticated;
GRANT EXECUTE ON FUNCTION public.bxf_learn_offline_sync_batch(text[]) TO authenticated;

-- Totales 32+38/70 fijos; numeradores = marcas offline (mismo criterio que /learn y perfil "yo mismo").
CREATE OR REPLACE FUNCTION public.get_public_learn_stats(p_user_id uuid)
RETURNS jsonb
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  WITH tot AS (
    SELECT 32::int AS linux_total, 38::int AS bash_total, 70::int AS learn_total
  ),
  off AS (
    SELECT
      COALESCE((SELECT count(*)::int
        FROM public.bxf_learn_offline_marks m
        WHERE m.user_id = p_user_id AND m.slot ~ '^lin[0-9]'), 0) AS linux_done,
      COALESCE((SELECT count(*)::int
        FROM public.bxf_learn_offline_marks m
        WHERE m.user_id = p_user_id AND m.slot ~ '^bash[0-9]'), 0) AS bash_done
  )
  SELECT jsonb_build_object(
    'learn_total', (SELECT learn_total FROM tot),
    'learn_done', (SELECT (linux_done + bash_done) FROM off),
    'linux_total', (SELECT linux_total FROM tot),
    'linux_done', (SELECT linux_done FROM off),
    'bash_total', (SELECT bash_total FROM tot),
    'bash_done', (SELECT bash_done FROM off)
  );
$$;

GRANT EXECUTE ON FUNCTION public.get_public_learn_stats(uuid) TO anon, authenticated;
