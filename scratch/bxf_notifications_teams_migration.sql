-- ═══════════════════════════════════════════════════════════════════════════
-- BXF: user_notifications + teams + invites + RPCs
-- Ejecutar en Supabase SQL Editor (después de supabase_setup.sql)
-- ═══════════════════════════════════════════════════════════════════════════

-- ── 1) Notificaciones de cuenta ────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.user_notifications (
  id BIGSERIAL PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  type TEXT NOT NULL CHECK (type IN (
    'friend_request', 'message', 'rank_up', 'team_invite', 'team_event', 'system', 'support_reply'
  )),
  title TEXT NOT NULL,
  body TEXT,
  payload JSONB DEFAULT '{}'::jsonb,
  read_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE INDEX IF NOT EXISTS idx_user_notifications_user_created
  ON public.user_notifications(user_id, created_at DESC);

CREATE INDEX IF NOT EXISTS idx_user_notifications_unread
  ON public.user_notifications(user_id)
  WHERE read_at IS NULL;

ALTER TABLE public.user_notifications ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "un_read_own_notifications" ON public.user_notifications;
CREATE POLICY "un_read_own_notifications"
  ON public.user_notifications FOR SELECT
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "un_update_own_notifications" ON public.user_notifications;
CREATE POLICY "un_update_own_notifications"
  ON public.user_notifications FOR UPDATE
  USING (auth.uid() = user_id);

-- ── 2) Equipos (clanes) ────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS public.teams (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL CHECK (char_length(name) BETWEEN 2 AND 40),
  tag TEXT NOT NULL UNIQUE CHECK (tag ~ '^[A-Z0-9]{2,5}$'),
  owner_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ DEFAULT NOW()
);

CREATE TABLE IF NOT EXISTS public.team_members (
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'member')),
  joined_at TIMESTAMPTZ DEFAULT NOW(),
  PRIMARY KEY (team_id, user_id)
);

CREATE TABLE IF NOT EXISTS public.team_invites (
  id BIGSERIAL PRIMARY KEY,
  team_id UUID NOT NULL REFERENCES public.teams(id) ON DELETE CASCADE,
  inviter_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  invitee_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'accepted', 'declined')),
  created_at TIMESTAMPTZ DEFAULT NOW(),
  UNIQUE (team_id, invitee_id)
);

ALTER TABLE public.teams ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.team_invites ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "teams_select_all" ON public.teams;
CREATE POLICY "teams_select_all" ON public.teams FOR SELECT USING (true);

DROP POLICY IF EXISTS "teams_insert_owner" ON public.teams;
CREATE POLICY "teams_insert_owner" ON public.teams FOR INSERT
  WITH CHECK (auth.uid() = owner_id);

DROP POLICY IF EXISTS "teams_update_owner" ON public.teams;
CREATE POLICY "teams_update_owner" ON public.teams FOR UPDATE
  USING (auth.uid() = owner_id);

DROP POLICY IF EXISTS "tm_select" ON public.team_members;
CREATE POLICY "tm_select" ON public.team_members FOR SELECT USING (true);

DROP POLICY IF EXISTS "tm_insert_self" ON public.team_members;
CREATE POLICY "tm_insert_self" ON public.team_members FOR INSERT
  WITH CHECK (auth.uid() = user_id);

DROP POLICY IF EXISTS "tm_delete_self" ON public.team_members;
CREATE POLICY "tm_delete_self" ON public.team_members FOR DELETE
  USING (auth.uid() = user_id);

DROP POLICY IF EXISTS "tinv_parties" ON public.team_invites;
CREATE POLICY "tinv_parties" ON public.team_invites FOR SELECT
  USING (auth.uid() IN (inviter_id, invitee_id));

DROP POLICY IF EXISTS "tinv_insert_inviter" ON public.team_invites;
CREATE POLICY "tinv_insert_inviter" ON public.team_invites FOR INSERT
  WITH CHECK (auth.uid() = inviter_id);

DROP POLICY IF EXISTS "tinv_update_invitee" ON public.team_invites;
CREATE POLICY "tinv_update_invitee" ON public.team_invites FOR UPDATE
  USING (auth.uid() = invitee_id);

-- ── 3) RPCs notificaciones ─────────────────────────────────────────────────
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
  ORDER BY n.created_at DESC
  LIMIT LEAST(COALESCE(p_limit, 40), 100);
$$;

CREATE OR REPLACE FUNCTION public.mark_notifications_read(p_ids BIGINT[])
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  UPDATE public.user_notifications
  SET read_at = NOW()
  WHERE user_id = auth.uid()
    AND id = ANY(p_ids)
    AND read_at IS NULL;
END;
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
  WHERE user_id = auth.uid() AND read_at IS NULL;
END;
$$;

CREATE OR REPLACE FUNCTION public.push_my_notification(
  p_type TEXT,
  p_title TEXT,
  p_body TEXT,
  p_payload JSONB DEFAULT '{}'::jsonb
)
RETURNS VOID
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF auth.uid() IS NULL THEN RETURN; END IF;
  IF p_type NOT IN ('rank_up', 'system') THEN
    RAISE EXCEPTION 'INVALID_NOTIFICATION_TYPE';
  END IF;
  INSERT INTO public.user_notifications (user_id, type, title, body, payload)
  VALUES (auth.uid(), p_type, p_title, p_body, COALESCE(p_payload, '{}'::jsonb));
END;
$$;

-- ── 4) Trigger: solicitud de amistad → notificación ───────────────────────
CREATE OR REPLACE FUNCTION public.trg_friendship_notify()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_name TEXT;
BEGIN
  IF TG_OP = 'INSERT' AND NEW.status = 'pending' THEN
    SELECT username INTO v_name FROM public.profiles WHERE id = NEW.requester_id;
    INSERT INTO public.user_notifications (user_id, type, title, body, payload)
    VALUES (
      NEW.addressee_id,
      'friend_request',
      'Solicitud de amistad',
      COALESCE(v_name, 'Usuario') || ' quiere conectar contigo',
      jsonb_build_object('friendship_id', NEW.id, 'requester_id', NEW.requester_id)
    );
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_friendship_notify ON public.friendships;
CREATE TRIGGER trg_friendship_notify
  AFTER INSERT ON public.friendships
  FOR EACH ROW EXECUTE PROCEDURE public.trg_friendship_notify();

-- ── 5) RPCs equipos ────────────────────────────────────────────────────────
CREATE OR REPLACE FUNCTION public._team_member_count(p_team UUID)
RETURNS INT LANGUAGE SQL STABLE AS $$
  SELECT COUNT(*)::INT FROM public.team_members WHERE team_id = p_team;
$$;

CREATE OR REPLACE FUNCTION public.create_team(p_name TEXT, p_tag TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_tag TEXT;
  v_team UUID;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); END IF;
  v_tag := upper(trim(p_tag));
  IF v_tag !~ '^[A-Z0-9]{2,5}$' THEN
    RETURN jsonb_build_object('ok', false, 'error', 'INVALID_TAG');
  END IF;
  IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid()) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_IN_TEAM');
  END IF;
  INSERT INTO public.teams (name, tag, owner_id)
  VALUES (trim(p_name), v_tag, auth.uid())
  RETURNING id INTO v_team;
  INSERT INTO public.team_members (team_id, user_id, role) VALUES (v_team, auth.uid(), 'owner');
  RETURN jsonb_build_object('ok', true, 'team_id', v_team);
EXCEPTION WHEN unique_violation THEN
  RETURN jsonb_build_object('ok', false, 'error', 'TAG_TAKEN');
END;
$$;

CREATE OR REPLACE FUNCTION public.invite_to_team(p_team_id UUID, p_username TEXT)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_uid UUID;
  v_role TEXT;
  v_cnt INT;
  v_inv_id BIGINT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); END IF;
  SELECT role INTO v_role FROM public.team_members WHERE team_id = p_team_id AND user_id = auth.uid();
  IF v_role IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_MEMBER'); END IF;
  IF v_role <> 'owner' THEN RETURN jsonb_build_object('ok', false, 'error', 'OWNER_ONLY'); END IF;

  SELECT id INTO v_uid FROM public.profiles WHERE lower(username) = lower(trim(p_username));
  IF v_uid IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND'); END IF;
  IF v_uid = auth.uid() THEN RETURN jsonb_build_object('ok', false, 'error', 'SELF'); END IF;

  SELECT public._team_member_count(p_team_id) INTO v_cnt;
  IF v_cnt >= 8 THEN RETURN jsonb_build_object('ok', false, 'error', 'TEAM_FULL'); END IF;

  IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = v_uid) THEN
    RETURN jsonb_build_object('ok', false, 'error', 'TARGET_IN_TEAM');
  END IF;

  BEGIN
    INSERT INTO public.team_invites (team_id, inviter_id, invitee_id, status)
    VALUES (p_team_id, auth.uid(), v_uid, 'pending')
    RETURNING id INTO v_inv_id;
  EXCEPTION WHEN unique_violation THEN
    RETURN jsonb_build_object('ok', false, 'error', 'DUPLICATE_INVITE');
  END;

  INSERT INTO public.user_notifications (user_id, type, title, body, payload)
  VALUES (
    v_uid,
    'team_invite',
    'Invitación de equipo',
    'Te han invitado a un clan',
    jsonb_build_object('team_id', p_team_id, 'invite_id', v_inv_id, 'inviter_id', auth.uid())
  );

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.respond_team_invite(p_invite_id BIGINT, p_accept BOOLEAN)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  r public.team_invites%ROWTYPE;
  v_cnt INT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); END IF;
  SELECT * INTO r FROM public.team_invites WHERE id = p_invite_id AND invitee_id = auth.uid() AND status = 'pending';
  IF NOT FOUND THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); END IF;

  IF p_accept THEN
    SELECT public._team_member_count(r.team_id) INTO v_cnt;
    IF v_cnt >= 8 THEN
      UPDATE public.team_invites SET status = 'declined' WHERE id = p_invite_id;
      RETURN jsonb_build_object('ok', false, 'error', 'TEAM_FULL');
    END IF;
    IF EXISTS (SELECT 1 FROM public.team_members WHERE user_id = auth.uid()) THEN
      UPDATE public.team_invites SET status = 'declined' WHERE id = p_invite_id;
      RETURN jsonb_build_object('ok', false, 'error', 'ALREADY_IN_TEAM');
    END IF;
    UPDATE public.team_invites SET status = 'accepted' WHERE id = p_invite_id;
    INSERT INTO public.team_members (team_id, user_id, role) VALUES (r.team_id, auth.uid(), 'member');
  ELSE
    UPDATE public.team_invites SET status = 'declined' WHERE id = p_invite_id;
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.leave_team(p_team_id UUID)
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_role TEXT;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); END IF;
  SELECT role INTO v_role FROM public.team_members WHERE team_id = p_team_id AND user_id = auth.uid();
  IF v_role IS NULL THEN RETURN jsonb_build_object('ok', false, 'error', 'NOT_MEMBER'); END IF;

  IF v_role = 'owner' THEN
    DELETE FROM public.teams WHERE id = p_team_id AND owner_id = auth.uid();
  ELSE
    DELETE FROM public.team_members WHERE team_id = p_team_id AND user_id = auth.uid();
  END IF;

  RETURN jsonb_build_object('ok', true);
END;
$$;

CREATE OR REPLACE FUNCTION public.get_team_leaderboard()
RETURNS TABLE (
  team_id UUID,
  name TEXT,
  tag TEXT,
  total_points BIGINT,
  member_count INT,
  owner_id UUID
)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT
    t.id,
    t.name,
    t.tag,
    COALESCE(SUM(p.points), 0)::BIGINT AS total_points,
    COUNT(tm.user_id)::INT AS member_count,
    t.owner_id
  FROM public.teams t
  JOIN public.team_members tm ON tm.team_id = t.id
  JOIN public.profiles p ON p.id = tm.user_id
  GROUP BY t.id, t.name, t.tag, t.owner_id
  ORDER BY total_points DESC, t.name ASC
  LIMIT 50;
$$;

CREATE OR REPLACE FUNCTION public.get_my_team()
RETURNS JSONB
LANGUAGE plpgsql SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_team UUID;
  r RECORD;
BEGIN
  IF auth.uid() IS NULL THEN RETURN jsonb_build_object('ok', false); END IF;
  SELECT team_id INTO v_team FROM public.team_members WHERE user_id = auth.uid() LIMIT 1;
  IF v_team IS NULL THEN RETURN jsonb_build_object('ok', true, 'team', NULL); END IF;

  SELECT t.id, t.name, t.tag, t.owner_id INTO r FROM public.teams t WHERE t.id = v_team;
  RETURN jsonb_build_object(
    'ok', true,
    'team', jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'tag', r.tag,
      'owner_id', r.owner_id,
      'role', (SELECT tm.role FROM public.team_members tm WHERE tm.team_id = v_team AND tm.user_id = auth.uid())
    )
  );
END;
$$;

CREATE OR REPLACE FUNCTION public.get_pending_team_invites()
RETURNS TABLE (
  id BIGINT,
  team_id UUID,
  tag TEXT,
  name TEXT,
  inviter_id UUID
)
LANGUAGE SQL STABLE SECURITY DEFINER
SET search_path = public
AS $$
  SELECT i.id, i.team_id, t.tag, t.name, i.inviter_id
  FROM public.team_invites i
  JOIN public.teams t ON t.id = i.team_id
  WHERE i.invitee_id = auth.uid() AND i.status = 'pending'
  ORDER BY i.created_at DESC;
$$;

-- Grants
GRANT EXECUTE ON FUNCTION public.get_my_notifications(INT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_notifications_read(BIGINT[]) TO authenticated;
GRANT EXECUTE ON FUNCTION public.mark_all_notifications_read() TO authenticated;
GRANT EXECUTE ON FUNCTION public.push_my_notification(TEXT, TEXT, TEXT, JSONB) TO authenticated;
GRANT EXECUTE ON FUNCTION public.create_team(TEXT, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.invite_to_team(UUID, TEXT) TO authenticated;
GRANT EXECUTE ON FUNCTION public.respond_team_invite(BIGINT, BOOLEAN) TO authenticated;
GRANT EXECUTE ON FUNCTION public.leave_team(UUID) TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_team_leaderboard() TO anon, authenticated;
GRANT EXECUTE ON FUNCTION public.get_my_team() TO authenticated;
GRANT EXECUTE ON FUNCTION public.get_pending_team_invites() TO authenticated;
