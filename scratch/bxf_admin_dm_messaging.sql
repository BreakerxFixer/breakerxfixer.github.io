-- BXF: mensajería admin↔admin sin requerir amistad (además de la lógica existente por friends).
-- Ejecutar en Supabase SQL Editor si ya tienes la función send_message anterior.

CREATE OR REPLACE FUNCTION public.send_message(p_receiver_id UUID, p_content TEXT)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
    v_msg_id BIGINT;
    v_friends_ok BOOLEAN;
    v_admin_dm_ok BOOLEAN;
BEGIN
    IF auth.uid() IS NULL THEN
        RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED');
    END IF;

    v_friends_ok := EXISTS (
        SELECT 1 FROM public.friendships
        WHERE status = 'accepted'
          AND (
              (requester_id = auth.uid() AND addressee_id = p_receiver_id)
              OR (requester_id = p_receiver_id AND addressee_id = auth.uid())
          )
    );

    v_admin_dm_ok := EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = auth.uid()
    ) AND EXISTS (
        SELECT 1 FROM public.admin_users WHERE user_id = p_receiver_id
    );

    IF NOT (v_friends_ok OR v_admin_dm_ok) THEN
        RETURN jsonb_build_object('ok', false, 'hint', 'Must be friends to message');
    END IF;

    INSERT INTO public.messages (sender_id, receiver_id, content)
    VALUES (auth.uid(), p_receiver_id, p_content)
    RETURNING id INTO v_msg_id;

    RETURN jsonb_build_object('ok', true, 'id', v_msg_id);
END;
$$;

-- Permite al cliente saber si un usuario es admin (solo booleano; tabla admin_users ya es sensible en backend).
CREATE OR REPLACE FUNCTION public.is_user_admin(p_uid UUID)
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (SELECT 1 FROM public.admin_users WHERE user_id = p_uid);
$$;

GRANT EXECUTE ON FUNCTION public.is_user_admin(UUID) TO authenticated;
