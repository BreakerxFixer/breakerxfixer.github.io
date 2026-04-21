-- BXF: notificar al usuario que envió un reporte cuando un admin lo resuelve.
-- Ejecutar en Supabase SQL Editor si la tabla user_notifications ya existe.

DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_notifications'
  ) THEN
    ALTER TABLE public.user_notifications DROP CONSTRAINT IF EXISTS user_notifications_type_check;
    ALTER TABLE public.user_notifications ADD CONSTRAINT user_notifications_type_check CHECK (
      type IN (
        'friend_request', 'message', 'rank_up', 'team_invite', 'team_event', 'system', 'support_reply', 'report_resolved'
      )
    );
  END IF;
END $$;

CREATE OR REPLACE FUNCTION public.admin_resolve_user_report(p_report_id UUID, p_status TEXT, p_note TEXT DEFAULT NULL)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_status TEXT;
  v_note TEXT;
  v_reporter UUID;
  v_title_es TEXT;
  v_title_en TEXT;
  v_body_es TEXT;
  v_body_en TEXT;
BEGIN
  IF auth.uid() IS NULL OR NOT public.is_admin(auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  END IF;

  v_status := lower(trim(COALESCE(p_status, '')));
  IF v_status NOT IN ('accepted', 'rejected') THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_STATUS');
  END IF;

  v_note := CASE WHEN p_note IS NULL OR trim(p_note) = '' THEN NULL ELSE left(trim(p_note), 1000) END;

  UPDATE public.user_reports
  SET status = v_status,
      admin_note = v_note,
      resolved_at = NOW(),
      resolved_by = auth.uid()
  WHERE id = p_report_id
    AND status = 'pending'
  RETURNING reporter_id INTO v_reporter;

  IF NOT FOUND THEN
    RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND_OR_ALREADY_RESOLVED');
  END IF;

  PERFORM public.admin_log_action(
    'resolve_user_report',
    'user_report',
    p_report_id::TEXT,
    jsonb_build_object('status', v_status)
  );

  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'public' AND table_name = 'user_notifications'
  ) THEN
    IF v_status = 'accepted' THEN
      v_title_es := 'Reporte aceptado';
      v_title_en := 'Report accepted';
      v_body_es := 'El equipo de moderación ha aceptado tu reporte.';
      v_body_en := 'The moderation team has accepted your report.';
    ELSE
      v_title_es := 'Reporte denegado';
      v_title_en := 'Report not upheld';
      v_body_es := 'El equipo ha revisado tu reporte y no ha procedido con la acción solicitada.';
      v_body_en := 'The team reviewed your report and did not uphold the requested action.';
    END IF;
    IF v_note IS NOT NULL THEN
      v_body_es := v_body_es || ' Nota: ' || left(v_note, 280);
      v_body_en := v_body_en || ' Note: ' || left(v_note, 280);
    END IF;

    INSERT INTO public.user_notifications (user_id, type, title, body, payload)
    VALUES (
      v_reporter,
      'report_resolved',
      v_title_es,
      left(v_body_es, 500),
      jsonb_build_object(
        'report_id', p_report_id,
        'status', v_status,
        'title_es', v_title_es,
        'title_en', v_title_en,
        'body_es', left(v_body_es, 500),
        'body_en', left(v_body_en, 500)
      )
    );
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

GRANT EXECUTE ON FUNCTION public.admin_resolve_user_report(UUID, TEXT, TEXT) TO authenticated;
