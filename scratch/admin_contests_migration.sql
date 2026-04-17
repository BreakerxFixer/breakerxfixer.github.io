-- Admin + Concursos dedicados + Moderacion writeups
-- Ejecutar en Supabase SQL Editor
begin;

create extension if not exists pgcrypto;

create table if not exists public.admin_handle_allowlist (
  username text primary key,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now()
);

insert into public.admin_handle_allowlist (username, is_enabled)
values
  ('K1R0X', true),
  ('0xwinter', true),
  ('areman-05', true)
on conflict (username) do update set is_enabled = excluded.is_enabled;

create table if not exists public.admin_users (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  granted_by uuid references public.profiles(id) on delete set null,
  granted_at timestamptz not null default now()
);

create or replace function public.is_admin(p_uid uuid default auth.uid())
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists(select 1 from public.admin_users where user_id = auth.uid());
$$;

drop trigger if exists trg_admin_bootstrap_profile on public.profiles;
drop function if exists public.admin_bootstrap_from_username();

insert into public.admin_users (user_id, granted_by)
select p.id, p.id
from public.profiles p
join public.admin_handle_allowlist a on lower(a.username) = lower(p.username)
where a.is_enabled = true
on conflict (user_id) do nothing;

create table if not exists public.admin_audit_log (
  id bigserial primary key,
  actor_id uuid references public.profiles(id) on delete set null,
  action text not null,
  entity_type text not null,
  entity_id text,
  details jsonb not null default '{}'::jsonb,
  created_at timestamptz not null default now()
);

alter table public.admin_audit_log enable row level security;
drop policy if exists "admin_audit_admin_only" on public.admin_audit_log;
create policy "admin_audit_admin_only" on public.admin_audit_log
for select using (public.is_admin(auth.uid()));

alter table public.community_writeups
  add column if not exists status text not null default 'pending' check (status in ('pending','approved','rejected','hidden')),
  add column if not exists reviewed_by uuid references public.profiles(id) on delete set null,
  add column if not exists reviewed_at timestamptz,
  add column if not exists moderation_reason text;

create index if not exists idx_community_writeups_status on public.community_writeups(status);

drop policy if exists "community_writeups_select_public" on public.community_writeups;
create policy "community_writeups_select_public" on public.community_writeups
for select using (
  status = 'approved' or author_id = auth.uid() or public.is_admin(auth.uid())
);

drop policy if exists "community_writeups_update_own" on public.community_writeups;
create policy "community_writeups_update_own" on public.community_writeups
for update using (author_id = auth.uid() or public.is_admin(auth.uid()))
with check (author_id = auth.uid() or public.is_admin(auth.uid()));

drop policy if exists "community_writeups_delete_own" on public.community_writeups;
create policy "community_writeups_delete_own" on public.community_writeups
for delete using (author_id = auth.uid() or public.is_admin(auth.uid()));

create table if not exists public.contests (
  id uuid primary key default gen_random_uuid(),
  season_id integer references public.seasons(id) on delete set null,
  slug text not null unique,
  title text not null,
  description text,
  mode text not null default 'solo' check (mode in ('solo', 'team')),
  status text not null default 'draft' check (status in ('draft','scheduled','active','closed','archived')),
  starts_at timestamptz,
  ends_at timestamptz,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.contest_challenges (
  id uuid primary key default gen_random_uuid(),
  contest_id uuid not null references public.contests(id) on delete cascade,
  code text not null,
  title text not null,
  description text,
  category text not null default 'Web',
  difficulty text not null default 'Medium' check (difficulty in ('Easy','Medium','Hard','Insane')),
  points integer not null check (points > 0),
  position integer not null default 0,
  is_enabled boolean not null default true,
  created_at timestamptz not null default now(),
  unique(contest_id, code)
);

create table if not exists public.contest_challenge_secrets (
  challenge_id uuid primary key references public.contest_challenges(id) on delete cascade,
  flag_hash text not null
);

create table if not exists public.contest_solves (
  id bigserial primary key,
  contest_id uuid not null references public.contests(id) on delete cascade,
  challenge_id uuid not null references public.contest_challenges(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  team_id bigint references public.teams(id) on delete set null,
  points integer not null check (points >= 0),
  solved_at timestamptz not null default now(),
  unique(challenge_id, user_id)
);

alter table public.contests enable row level security;
alter table public.contest_challenges enable row level security;
alter table public.contest_challenge_secrets enable row level security;
alter table public.contest_solves enable row level security;

drop policy if exists "contests_public_read" on public.contests;
create policy "contests_public_read" on public.contests
for select using (status in ('scheduled','active','closed','archived') or public.is_admin(auth.uid()));

drop policy if exists "contest_challenges_public_read" on public.contest_challenges;
create policy "contest_challenges_public_read" on public.contest_challenges
for select using (
  exists(select 1 from public.contests c where c.id = contest_id and (c.status in ('scheduled','active','closed','archived') or public.is_admin(auth.uid())))
);

drop policy if exists "contest_solves_read" on public.contest_solves;
create policy "contest_solves_read" on public.contest_solves for select using (true);

drop policy if exists "contest_solves_insert_own" on public.contest_solves;
create policy "contest_solves_insert_own" on public.contest_solves for insert with check (auth.uid() = user_id);

create or replace function public.get_public_support_admins()
returns table (
  id uuid,
  username text,
  avatar_url text,
  points bigint
)
language sql
security definer
set search_path = public
as $$
  select
    p.id,
    p.username,
    p.avatar_url,
    p.points::bigint
  from public.admin_users au
  join public.profiles p on p.id = au.user_id
  left join public.admin_handle_allowlist a on lower(a.username) = lower(p.username)
  where coalesce(a.is_enabled, true) = true
  order by
    case lower(p.username)
      when 'k1r0x' then 1
      when '0xwinter' then 2
      when 'areman-05' then 3
      else 99
    end,
    lower(p.username);
$$;

create table if not exists public.support_messages (
  id bigserial primary key,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  receiver_id uuid not null references public.profiles(id) on delete cascade,
  content text not null check (char_length(content) between 1 and 2000),
  created_at timestamptz not null default now(),
  read_at timestamptz
);

create index if not exists idx_support_messages_sender_created on public.support_messages(sender_id, created_at desc);
create index if not exists idx_support_messages_receiver_created on public.support_messages(receiver_id, created_at desc);

alter table public.support_messages enable row level security;
drop policy if exists "support_messages_select" on public.support_messages;
create policy "support_messages_select" on public.support_messages
for select using (auth.uid() = sender_id or auth.uid() = receiver_id or public.is_admin(auth.uid()));

drop policy if exists "support_messages_insert" on public.support_messages;
create policy "support_messages_insert" on public.support_messages
for insert with check (
  auth.uid() = sender_id
  and (
    (not public.is_admin(auth.uid()) and exists (select 1 from public.admin_users au where au.user_id = receiver_id))
    or
    (public.is_admin(auth.uid()) and exists (select 1 from public.profiles p where p.id = receiver_id))
  )
);

create or replace function public.send_support_message(p_admin_id uuid, p_content text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg_id bigint;
  v_content text;
begin
  if auth.uid() is null then
    return jsonb_build_object('ok', false, 'error', 'UNAUTHORIZED');
  end if;
  if public.is_admin(auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'ADMIN_USE_REPLY_RPC');
  end if;
  if p_admin_id is null or not exists (select 1 from public.admin_users au where au.user_id = p_admin_id) then
    return jsonb_build_object('ok', false, 'error', 'ADMIN_NOT_FOUND');
  end if;
  v_content := trim(coalesce(p_content, ''));
  if v_content = '' or char_length(v_content) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'INVALID_CONTENT');
  end if;

  insert into public.support_messages(sender_id, receiver_id, content)
  values (auth.uid(), p_admin_id, v_content)
  returning id into v_msg_id;

  return jsonb_build_object('ok', true, 'id', v_msg_id);
end;
$$;

create or replace function public.admin_reply_support(p_user_id uuid, p_content text)
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  v_msg_id bigint;
  v_content text;
begin
  if auth.uid() is null or not public.is_admin(auth.uid()) then
    return jsonb_build_object('ok', false, 'error', 'ADMIN_ONLY');
  end if;
  if p_user_id is null or not exists (select 1 from public.profiles p where p.id = p_user_id) then
    return jsonb_build_object('ok', false, 'error', 'USER_NOT_FOUND');
  end if;
  v_content := trim(coalesce(p_content, ''));
  if v_content = '' or char_length(v_content) > 2000 then
    return jsonb_build_object('ok', false, 'error', 'INVALID_CONTENT');
  end if;

  insert into public.support_messages(sender_id, receiver_id, content)
  values (auth.uid(), p_user_id, v_content)
  returning id into v_msg_id;

  return jsonb_build_object('ok', true, 'id', v_msg_id);
end;
$$;

grant execute on function public.is_admin(uuid) to authenticated;
grant execute on function public.get_public_support_admins() to anon, authenticated;
grant execute on function public.send_support_message(uuid, text) to authenticated;
grant execute on function public.admin_reply_support(uuid, text) to authenticated;

commit;
