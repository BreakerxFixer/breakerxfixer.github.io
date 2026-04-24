-- Ejecutar en Supabase SQL Editor si ya tienes bxf_learn_offline_marks pero falta la lectura para /learn.
-- Devuelve { ok, slots: ["lin1", ...] } para auth.uid().

CREATE OR REPLACE FUNCTION public.bxf_learn_offline_get_slots()
RETURNS jsonb
LANGUAGE plpgsql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  uid uuid := auth.uid();
  j jsonb;
BEGIN
  IF uid IS NULL THEN
    RETURN jsonb_build_object('ok', false, 'error', 'not_authenticated');
  END IF;
  SELECT coalesce(jsonb_agg(m.slot ORDER BY m.slot), '[]'::jsonb)
  INTO j
  FROM public.bxf_learn_offline_marks m
  WHERE m.user_id = uid;
  RETURN jsonb_build_object('ok', true, 'slots', j);
END;
$$;

GRANT EXECUTE ON FUNCTION public.bxf_learn_offline_get_slots() TO authenticated;
