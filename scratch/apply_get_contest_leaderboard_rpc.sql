-- =============================================================================
-- Pega en Supabase → SQL Editor → Run
-- Actualiza get_contest_leaderboard: avatar_url, momentum (14d), sin excluir admins
--
-- Postgres no permite cambiar el tipo de retorno con CREATE OR REPLACE: hay que
-- eliminar la función y volver a crearla.
-- =============================================================================

drop function if exists public.get_contest_leaderboard(uuid);

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

grant execute on function public.get_contest_leaderboard(uuid) to anon, authenticated;
