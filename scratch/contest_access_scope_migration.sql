-- Contest access scope migration
-- Adds "internal" visibility for contests and restricts it to admins + beta testers.
-- Beta testers (by username): pablo, keloka, pgaleote

begin;

create or replace function public.is_beta_tester(p_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.profiles p
    where p.id = coalesce(p_uid, auth.uid())
      and lower(p.username) in ('pablo', 'keloka', 'pgaleote')
  );
$$;

grant execute on function public.is_beta_tester(uuid) to anon, authenticated;

alter table public.contests
  add column if not exists access_scope text not null default 'public';

-- Normalize previous rows if any had null/invalid values.
update public.contests
set access_scope = 'public'
where access_scope is null
   or access_scope not in ('public', 'internal');

do $$
begin
  if not exists (
    select 1
    from pg_constraint
    where conname = 'contests_access_scope_chk'
      and conrelid = 'public.contests'::regclass
  ) then
    alter table public.contests
      add constraint contests_access_scope_chk
      check (access_scope in ('public', 'internal'));
  end if;
end $$;

drop policy if exists "contests_public_read" on public.contests;
create policy "contests_public_read" on public.contests
for select using (
  public.is_admin(auth.uid())
  or (
    status in ('scheduled', 'active', 'closed', 'archived')
    and access_scope = 'public'
  )
  or (
    status in ('scheduled', 'active', 'closed', 'archived')
    and access_scope = 'internal'
    and (public.is_admin(auth.uid()) or public.is_beta_tester(auth.uid()))
  )
);

drop policy if exists "contest_challenges_public_read" on public.contest_challenges;
create policy "contest_challenges_public_read" on public.contest_challenges
for select using (
  exists (
    select 1
    from public.contests c
    where c.id = contest_id
      and (
        public.is_admin(auth.uid())
        or (
          c.status in ('scheduled', 'active', 'closed', 'archived')
          and c.access_scope = 'public'
        )
        or (
          c.status in ('scheduled', 'active', 'closed', 'archived')
          and c.access_scope = 'internal'
          and (public.is_admin(auth.uid()) or public.is_beta_tester(auth.uid()))
        )
      )
  )
);

create or replace function public.submit_contest_flag(
  p_contest_id uuid,
  p_challenge_code text,
  p_flag text
)
returns jsonb
language plpgsql
security definer
set search_path = public, extensions
as $$
declare
  v_user uuid;
  v_contest public.contests%rowtype;
  v_challenge public.contest_challenges%rowtype;
  v_hash text;
  v_team uuid;
  v_ins int;
begin
  v_user := auth.uid();
  if v_user is null then
    return jsonb_build_object('success', false, 'error', 'NOT_AUTHENTICATED');
  end if;

  select * into v_contest from public.contests where id = p_contest_id;
  if not found then
    return jsonb_build_object('success', false, 'error', 'CONTEST_NOT_FOUND');
  end if;

  if coalesce(v_contest.access_scope, 'public') = 'internal'
     and not (public.is_admin(v_user) or public.is_beta_tester(v_user)) then
    return jsonb_build_object('success', false, 'error', 'CONTEST_ACCESS_DENIED');
  end if;

  if v_contest.status not in ('active', 'closed') then
    if not (
      v_contest.status = 'scheduled'
      and v_contest.starts_at is not null
      and now() >= v_contest.starts_at
    ) then
      return jsonb_build_object('success', false, 'error', 'CONTEST_NOT_ACTIVE');
    end if;
  end if;

  if v_contest.ends_at is not null and now() > v_contest.ends_at then
    return jsonb_build_object('success', false, 'error', 'CONTEST_ENDED');
  end if;

  select * into v_challenge
  from public.contest_challenges
  where contest_id = p_contest_id
    and code = upper(trim(coalesce(p_challenge_code, '')))
    and is_enabled = true;
  if not found then
    return jsonb_build_object('success', false, 'error', 'CHALLENGE_NOT_FOUND');
  end if;

  if coalesce(v_challenge.solve_mode, 'flag') <> 'flag' then
    return jsonb_build_object(
      'success', false,
      'error', 'NOT_ONLINE_VALIDATION',
      'solve_mode', coalesce(v_challenge.solve_mode, 'flag')
    );
  end if;

  select flag_hash into v_hash
  from public.contest_challenge_secrets
  where challenge_id = v_challenge.id;

  if v_hash is null or crypt(trim(coalesce(p_flag, '')), v_hash) <> v_hash then
    return jsonb_build_object('success', false, 'error', 'INVALID_FLAG');
  end if;

  if v_contest.mode = 'team' then
    select tm.team_id into v_team
    from public.team_members tm
    where tm.user_id = v_user
    order by tm.team_id
    limit 1;
  end if;

  insert into public.contest_solves (contest_id, challenge_id, user_id, team_id, points)
  values (p_contest_id, v_challenge.id, v_user, v_team, v_challenge.points)
  on conflict (challenge_id, user_id) do nothing;

  get diagnostics v_ins = row_count;
  if v_ins = 0 then
    return jsonb_build_object('success', false, 'error', 'ALREADY_SOLVED');
  end if;

  return jsonb_build_object('success', true, 'challenge', v_challenge.code, 'points', v_challenge.points);
end;
$$;

create or replace function public.get_contest_leaderboard(p_contest_id uuid)
returns table (
  entry_type text,
  entry_id text,
  label text,
  points bigint,
  solves bigint,
  last_solve_at timestamptz,
  avatar_url text,
  momentum bigint
)
language plpgsql
security definer
set search_path = public
as $$
declare
  v_mode text;
  v_scope text;
begin
  select mode, coalesce(access_scope, 'public')
  into v_mode, v_scope
  from public.contests
  where id = p_contest_id;

  if v_mode is null then
    return;
  end if;

  if v_scope = 'internal'
     and not (public.is_admin(auth.uid()) or public.is_beta_tester(auth.uid())) then
    return;
  end if;

  if v_mode = 'team' then
    return query
    select
      'team'::text,
      t.id::text,
      t.name::text,
      coalesce(sum(cs.points), 0)::bigint,
      count(cs.id)::bigint,
      max(cs.solved_at),
      null::text,
      (
        select count(*)::bigint
        from public.contest_solves cs2
        where cs2.contest_id = p_contest_id
          and cs2.team_id = t.id
          and cs2.solved_at >= (now() - interval '14 days')
      )
    from public.teams t
    left join public.contest_solves cs on cs.team_id = t.id and cs.contest_id = p_contest_id
    group by t.id, t.name
    having count(cs.id) > 0
    order by 4 desc, 6 asc nulls last;
  else
    return query
    select
      'user'::text,
      p.id::text,
      p.username::text,
      coalesce(sum(cs.points), 0)::bigint,
      count(cs.id)::bigint,
      max(cs.solved_at),
      p.avatar_url,
      (
        select count(*)::bigint
        from public.contest_solves cs2
        where cs2.contest_id = p_contest_id
          and cs2.user_id = p.id
          and cs2.solved_at >= (now() - interval '14 days')
      )
    from public.profiles p
    left join public.contest_solves cs on cs.user_id = p.id and cs.contest_id = p_contest_id
    group by p.id, p.username, p.avatar_url
    having count(cs.id) > 0
    order by 4 desc, 6 asc nulls last;
  end if;
end;
$$;

grant execute on function public.submit_contest_flag(uuid, text, text) to authenticated;
grant execute on function public.get_contest_leaderboard(uuid) to anon, authenticated;

commit;
