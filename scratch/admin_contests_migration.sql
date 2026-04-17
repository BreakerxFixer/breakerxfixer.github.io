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

commit;
