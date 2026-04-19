-- BXF: archivar / borrar notificaciones + get_my_notifications sin archivadas
-- Ejecutar en Supabase SQL Editor después de scratch/bxf_notifications_teams_migration.sql

ALTER TABLE public.user_notifications
  ADD COLUMN IF NOT EXISTS archived_at TIMESTAMPTZ;

CREATE INDEX IF NOT EXISTS idx_user_notifications_not_archived
  ON public.user_notifications (user_id, created_at DESC)
  WHERE archived_at IS NULL;

DROP POLICY IF EXISTS "un_delete_own_notifications" ON public.user_notifications;
CREATE POLICY "un_delete_own_notifications"
  ON public.user_notifications FOR DELETE
  USING (auth.uid() = user_id);

CREATE OR REPLACE FUNCTION public.get_my_notifications(p_limit INT DEFAULT 40)
RETURNS TABLE (
  id BIGINT,
  type TEXT,
  title TEXT,
  body TEXT,
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.id, n.type, n.title, n.body, n.payload, n.read_at, n.created_at
  FROM public.user_notifications n
  WHERE n.user_id = auth.uid()
    AND n.archived_at IS NULL
  ORDER BY n.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 40), 100);
$$;

CREATE OR REPLACE FUNCTION public.mark_all_notifications_read()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.user_notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
    AND read_at IS NULL
    AND archived_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_my_notifications(p_ids BIGINT[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.user_notifications
  SET archived_at = NOW()
  WHERE user_id = auth.uid()
    AND id = ANY(p_ids)
    AND archived_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.archive_all_my_notifications()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.user_notifications
  SET archived_at = NOW()
  WHERE user_id = auth.uid()
    AND archived_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_my_notifications(p_ids BIGINT[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  DELETE FROM public.user_notifications
  WHERE user_id = auth.uid()
    AND id = ANY(p_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.delete_all_my_notifications()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  DELETE FROM public.user_notifications
  WHERE user_id = auth.uid();
END;
$$;

CREATE OR REPLACE FUNCTION public.get_my_archived_notifications(p_limit INT DEFAULT 40)
RETURNS TABLE (
  id BIGINT,
  type TEXT,
  title TEXT,
  body TEXT,
  payload JSONB,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ
)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT n.id, n.type, n.title, n.body, n.payload, n.read_at, n.created_at
  FROM public.user_notifications n
  WHERE n.user_id = auth.uid()
    AND n.archived_at IS NOT NULL
  ORDER BY n.archived_at DESC, n.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 40), 100);
$$;

CREATE OR REPLACE FUNCTION public.unarchive_my_notifications(p_ids BIGINT[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.user_notifications
  SET archived_at = NULL
  WHERE user_id = auth.uid()
    AND id = ANY(p_ids);
END;
$$;

CREATE OR REPLACE FUNCTION public.unarchive_all_my_notifications()
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.user_notifications
  SET archived_at = NULL
  WHERE user_id = auth.uid()
    AND archived_at IS NOT NULL;
END;
$$;

GRANT EXECUTE ON FUNCTION public.archive_my_notifications(BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.archive_all_my_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_my_notifications(BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.delete_all_my_notifications() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_archived_notifications(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unarchive_my_notifications(BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.unarchive_all_my_notifications() TO authenticated;
