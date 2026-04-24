-- =============================================================================
-- Aplica en Supabase (junto con apply_get_contest_leaderboard_rpc.sql si hace
-- falta) las reglas: sin bonus +1 first-blood en concursos para admin/beta,
-- submit_flag CTF sin FB para beta, is_beta_tester(NULL) = false.
-- Copiado de supabase_setup.sql — pegar bloques o ejecutar tras merge.
-- =============================================================================

create or replace function public.is_beta_tester(p_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select p_uid is not null
    and exists (
      select 1
      from public.profiles p
      where p.id = p_uid
        and lower(p.username) in ('pablo', 'keloka', 'pgaleote')
    );
$$;

grant execute on function public.is_beta_tester(uuid) to anon, authenticated;

create or replace function public.contest_apply_first_blood_bonus()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prev_count bigint;
begin
  perform pg_advisory_xact_lock(hashtext('contest_first_blood:' || new.challenge_id::text));

  select count(*) into v_prev_count
  from public.contest_solves s
  where s.challenge_id = new.challenge_id;

  if coalesce(v_prev_count, 0) = 0
     and not public.is_admin(new.user_id)
     and not public.is_beta_tester(new.user_id) then
    new.points := coalesce(new.points, 0) + 1;
  end if;

  return new;
end;
$$;
