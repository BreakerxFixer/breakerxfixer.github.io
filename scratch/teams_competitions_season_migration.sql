-- BXF squads by competition (season-scoped)
-- Ejecutar en Supabase SQL Editor tras:
--   1) supabase_setup.sql
--   2) scratch/bxf_notifications_teams_migration.sql

-- 1) Teams now belong to a season/competition
alter table public.teams
  add column if not exists season_id integer references public.seasons(id) default 0;

update public.teams
set season_id = 0
where season_id is null;

create index if not exists idx_teams_season_id on public.teams(season_id);

-- 2) create_team now supports p_season_id (default 0)
drop function if exists public.create_team(text, text);
create or replace function public.create_team(
  p_name text,
  p_tag text,
  p_season_id integer default 0
)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_tag text;
  v_team uuid;
  v_season integer;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;

  v_tag := upper(trim(p_tag));
  v_season := coalesce(p_season_id, 0);
  if v_season = -1 then
    return jsonb_build_object('ok', false, 'error', 'INVALID_SEASON');
  end if;

  if not exists (select 1 from public.seasons s where s.id = v_season) then
    return jsonb_build_object('ok', false, 'error', 'SEASON_NOT_FOUND');
  end if;

  if v_tag !~ '^[A-Z0-9]{2,5}$' then
    return jsonb_build_object('ok', false, 'error', 'INVALID_TAG');
  end if;

  if exists (
    select 1
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = auth.uid()
      and t.season_id = v_season
  ) then
    return jsonb_build_object('ok', false, 'error', 'ALREADY_IN_TEAM_THIS_SEASON');
  end if;

  insert into public.teams (name, tag, owner_id, season_id)
  values (trim(p_name), v_tag, auth.uid(), v_season)
  returning id into v_team;

  insert into public.team_members (team_id, user_id, role)
  values (v_team, auth.uid(), 'owner');

  return jsonb_build_object('ok', true, 'team_id', v_team, 'season_id', v_season);
exception when unique_violation then
  return jsonb_build_object('ok', false, 'error', 'TAG_TAKEN');
end;
$$;

-- 3) invite_to_team now checks season-specific membership
create or replace function public.invite_to_team(p_team_id uuid, p_username text)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_uid uuid;
  v_role text;
  v_cnt int;
  v_inv_id bigint;
  v_team_season integer;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); end if;

  select t.season_id, tm.role
    into v_team_season, v_role
  from public.team_members tm
  join public.teams t on t.id = tm.team_id
  where tm.team_id = p_team_id and tm.user_id = auth.uid();

  if v_role is null then return jsonb_build_object('ok', false, 'error', 'NOT_MEMBER'); end if;
  if v_role <> 'owner' then return jsonb_build_object('ok', false, 'error', 'OWNER_ONLY'); end if;

  select id into v_uid from public.profiles where lower(username) = lower(trim(p_username));
  if v_uid is null then return jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND'); end if;
  if v_uid = auth.uid() then return jsonb_build_object('ok', false, 'error', 'SELF'); end if;

  select public._team_member_count(p_team_id) into v_cnt;
  if v_cnt >= 8 then return jsonb_build_object('ok', false, 'error', 'TEAM_FULL'); end if;

  if exists (
    select 1
    from public.team_members tm2
    join public.teams t2 on t2.id = tm2.team_id
    where tm2.user_id = v_uid
      and t2.season_id = v_team_season
  ) then
    return jsonb_build_object('ok', false, 'error', 'TARGET_IN_TEAM_THIS_SEASON');
  end if;

  begin
    insert into public.team_invites (team_id, inviter_id, invitee_id, status)
    values (p_team_id, auth.uid(), v_uid, 'pending')
    returning id into v_inv_id;
  exception when unique_violation then
    return jsonb_build_object('ok', false, 'error', 'DUPLICATE_INVITE');
  end;

  insert into public.user_notifications (user_id, type, title, body, payload)
  values (
    v_uid,
    'team_invite',
    'Invitación de equipo',
    'Te han invitado a un clan',
    jsonb_build_object('team_id', p_team_id, 'invite_id', v_inv_id, 'inviter_id', auth.uid(), 'season_id', v_team_season)
  );

  return jsonb_build_object('ok', true);
end;
$$;

-- 4) respond_team_invite enforces 1 team per season
create or replace function public.respond_team_invite(p_invite_id bigint, p_accept boolean)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  r public.team_invites%rowtype;
  v_cnt int;
  v_team_season integer;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED'); end if;
  select * into r from public.team_invites where id = p_invite_id and invitee_id = auth.uid() and status = 'pending';
  if not found then return jsonb_build_object('ok', false, 'error', 'NOT_FOUND'); end if;

  select season_id into v_team_season from public.teams where id = r.team_id;
  if v_team_season is null then
    return jsonb_build_object('ok', false, 'error', 'TEAM_NOT_FOUND');
  end if;

  if p_accept then
    select public._team_member_count(r.team_id) into v_cnt;
    if v_cnt >= 8 then
      update public.team_invites set status = 'declined' where id = p_invite_id;
      return jsonb_build_object('ok', false, 'error', 'TEAM_FULL');
    end if;

    if exists (
      select 1
      from public.team_members tm
      join public.teams t on t.id = tm.team_id
      where tm.user_id = auth.uid()
        and t.season_id = v_team_season
    ) then
      update public.team_invites set status = 'declined' where id = p_invite_id;
      return jsonb_build_object('ok', false, 'error', 'ALREADY_IN_TEAM_THIS_SEASON');
    end if;

    update public.team_invites set status = 'accepted' where id = p_invite_id;
    insert into public.team_members (team_id, user_id, role) values (r.team_id, auth.uid(), 'member');
  else
    update public.team_invites set status = 'declined' where id = p_invite_id;
  end if;

  return jsonb_build_object('ok', true);
end;
$$;

-- 5) season-aware leaderboard
drop function if exists public.get_team_leaderboard();
create or replace function public.get_team_leaderboard(p_season_id integer default null)
returns table (
  team_id uuid,
  name text,
  tag text,
  total_points bigint,
  member_count int,
  owner_id uuid
)
language sql stable security definer
set search_path = public
as $$
  with scoped as (
    select
      t.id,
      t.name,
      t.tag,
      t.owner_id,
      t.season_id,
      tm.user_id,
      p.points as profile_points,
      coalesce((
        select sum(c.points)::bigint
        from public.solves s
        join public.challenges c on c.id = s.challenge_id
        where s.user_id = tm.user_id
          and c.season_id = t.season_id
      ), 0::bigint) as season_points
    from public.teams t
    join public.team_members tm on tm.team_id = t.id
    join public.profiles p on p.id = tm.user_id
    where (p_season_id is null or p_season_id = -1 or t.season_id = p_season_id)
  )
  select
    s.id as team_id,
    s.name,
    s.tag,
    coalesce(sum(case when p_season_id is null or p_season_id = -1 then s.profile_points else s.season_points end), 0)::bigint as total_points,
    count(s.user_id)::int as member_count,
    s.owner_id
  from scoped s
  group by s.id, s.name, s.tag, s.owner_id
  order by total_points desc, s.name asc
  limit 50;
$$;

-- 6) season-aware "my team"
drop function if exists public.get_my_team();
create or replace function public.get_my_team(p_season_id integer default null)
returns jsonb
language plpgsql security definer
set search_path = public
as $$
declare
  v_team uuid;
  v_team_season integer;
  r record;
begin
  if auth.uid() is null then return jsonb_build_object('ok', false); end if;

  if p_season_id is null or p_season_id = -1 then
    select tm.team_id, t.season_id
      into v_team, v_team_season
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = auth.uid()
    order by t.created_at asc
    limit 1;
  else
    select tm.team_id, t.season_id
      into v_team, v_team_season
    from public.team_members tm
    join public.teams t on t.id = tm.team_id
    where tm.user_id = auth.uid()
      and t.season_id = p_season_id
    limit 1;
  end if;

  if v_team is null then return jsonb_build_object('ok', true, 'team', null); end if;

  select t.id, t.name, t.tag, t.owner_id into r from public.teams t where t.id = v_team;
  return jsonb_build_object(
    'ok', true,
    'team', jsonb_build_object(
      'id', r.id,
      'name', r.name,
      'tag', r.tag,
      'owner_id', r.owner_id,
      'season_id', v_team_season,
      'role', (select tm.role from public.team_members tm where tm.team_id = v_team and tm.user_id = auth.uid())
    )
  );
end;
$$;

-- 7) season-aware pending invites
drop function if exists public.get_pending_team_invites();
create or replace function public.get_pending_team_invites(p_season_id integer default null)
returns table (
  id bigint,
  team_id uuid,
  tag text,
  name text,
  inviter_id uuid
)
language sql stable security definer
set search_path = public
as $$
  select i.id, i.team_id, t.tag, t.name, i.inviter_id
  from public.team_invites i
  join public.teams t on t.id = i.team_id
  where i.invitee_id = auth.uid()
    and i.status = 'pending'
    and (p_season_id is null or p_season_id = -1 or t.season_id = p_season_id)
  order by i.created_at desc;
$$;

grant execute on function public.create_team(text, text, integer) to authenticated;
grant execute on function public.invite_to_team(uuid, text) to authenticated;
grant execute on function public.respond_team_invite(bigint, boolean) to authenticated;
grant execute on function public.get_team_leaderboard(integer) to anon, authenticated;
grant execute on function public.get_my_team(integer) to authenticated;
grant execute on function public.get_pending_team_invites(integer) to authenticated;
