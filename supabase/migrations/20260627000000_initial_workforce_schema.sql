create extension if not exists pgcrypto;

do $$
begin
  create type public.app_role as enum ('owner', 'manager', 'employee');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.invite_status as enum ('pending', 'accepted', 'canceled', 'expired');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.shift_status as enum ('scheduled', 'open', 'pending', 'covered', 'canceled');
exception
  when duplicate_object then null;
end $$;

do $$
begin
  create type public.request_status as enum ('pending', 'approved', 'declined', 'correction_requested');
exception
  when duplicate_object then null;
end $$;

create table if not exists public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  industry text,
  owner_id uuid not null references auth.users(id) on delete cascade,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid references auth.users(id) on delete set null,
  full_name text not null,
  email text not null,
  role public.app_role not null default 'employee',
  status text not null default 'active',
  work_area text,
  hourly_rate numeric(10, 2) not null default 0,
  invited_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, email),
  unique (business_id, user_id)
);

create table if not exists public.work_areas (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  name text not null,
  area_type text,
  notes text,
  created_at timestamptz not null default now(),
  unique (business_id, name)
);

create table if not exists public.team_invites (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  code text not null unique,
  target_role public.app_role not null default 'employee',
  email text,
  work_area_id uuid references public.work_areas(id) on delete set null,
  status public.invite_status not null default 'pending',
  created_by uuid references auth.users(id) on delete set null,
  claimed_by uuid references auth.users(id) on delete set null,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.shifts (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  work_area_id uuid references public.work_areas(id) on delete set null,
  member_id uuid references public.business_members(id) on delete set null,
  role_name text not null,
  start_at timestamptz not null,
  end_at timestamptz not null,
  status public.shift_status not null default 'scheduled',
  hourly_rate numeric(10, 2) not null default 0,
  note text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint shifts_valid_time check (end_at > start_at)
);

create table if not exists public.schedule_day_plans (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  work_area_id uuid references public.work_areas(id) on delete set null,
  plan_date date not null,
  demand_level text,
  staffing_target integer,
  business_hours text,
  required_roles text[] not null default '{}',
  manager_notes text,
  publish_rule text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, work_area_id, plan_date)
);

create table if not exists public.staff_requests (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id uuid references public.business_members(id) on delete set null,
  request_type text not null,
  requested_date date,
  status public.request_status not null default 'pending',
  note text,
  reviewed_by uuid references auth.users(id) on delete set null,
  reviewed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.time_entries (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  member_id uuid references public.business_members(id) on delete set null,
  shift_id uuid references public.shifts(id) on delete set null,
  work_date date not null,
  clock_in_at timestamptz,
  lunch_start_at timestamptz,
  lunch_end_at timestamptz,
  clock_out_at timestamptz,
  hourly_rate numeric(10, 2) not null default 0,
  flag text,
  manager_note text,
  status text not null default 'open',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.events (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  work_area_id uuid references public.work_areas(id) on delete set null,
  title text not null,
  starts_at timestamptz not null,
  ends_at timestamptz,
  audience text not null default 'all',
  priority text not null default 'normal',
  signup_rule text not null default 'open',
  notes text,
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists public.guide_items (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  title text not null,
  category text,
  content text,
  status text not null default 'draft',
  created_by uuid references auth.users(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create or replace function public.is_business_owner(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.businesses businesses
    where businesses.id = target_business_id
      and businesses.owner_id = auth.uid()
  );
$$;

create or replace function public.is_business_member(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_business_owner(target_business_id)
    or exists (
      select 1
      from public.business_members members
      where members.business_id = target_business_id
        and members.user_id = auth.uid()
        and members.status = 'active'
    );
$$;

create or replace function public.is_business_admin(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select public.is_business_owner(target_business_id)
    or exists (
      select 1
      from public.business_members members
      where members.business_id = target_business_id
        and members.user_id = auth.uid()
        and members.status = 'active'
        and members.role in ('owner', 'manager')
    );
$$;

alter table public.businesses enable row level security;
alter table public.business_members enable row level security;
alter table public.work_areas enable row level security;
alter table public.team_invites enable row level security;
alter table public.shifts enable row level security;
alter table public.schedule_day_plans enable row level security;
alter table public.staff_requests enable row level security;
alter table public.time_entries enable row level security;
alter table public.events enable row level security;
alter table public.guide_items enable row level security;

drop policy if exists "businesses member read" on public.businesses;
create policy "businesses member read"
  on public.businesses for select
  using (public.is_business_member(id));

drop policy if exists "businesses owner create" on public.businesses;
create policy "businesses owner create"
  on public.businesses for insert
  with check (owner_id = auth.uid());

drop policy if exists "businesses owner update" on public.businesses;
create policy "businesses owner update"
  on public.businesses for update
  using (public.is_business_owner(id))
  with check (public.is_business_owner(id));

drop policy if exists "businesses owner delete" on public.businesses;
create policy "businesses owner delete"
  on public.businesses for delete
  using (public.is_business_owner(id));

drop policy if exists "members business read" on public.business_members;
create policy "members business read"
  on public.business_members for select
  using (public.is_business_member(business_id));

drop policy if exists "members admin write" on public.business_members;
create policy "members admin write"
  on public.business_members for all
  using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

drop policy if exists "work areas member read" on public.work_areas;
create policy "work areas member read"
  on public.work_areas for select
  using (public.is_business_member(business_id));

drop policy if exists "work areas admin write" on public.work_areas;
create policy "work areas admin write"
  on public.work_areas for all
  using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

drop policy if exists "team invites admin manage" on public.team_invites;
create policy "team invites admin manage"
  on public.team_invites for all
  using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

drop policy if exists "shifts member read" on public.shifts;
create policy "shifts member read"
  on public.shifts for select
  using (public.is_business_member(business_id));

drop policy if exists "shifts admin write" on public.shifts;
create policy "shifts admin write"
  on public.shifts for all
  using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

drop policy if exists "day plans member read" on public.schedule_day_plans;
create policy "day plans member read"
  on public.schedule_day_plans for select
  using (public.is_business_member(business_id));

drop policy if exists "day plans admin write" on public.schedule_day_plans;
create policy "day plans admin write"
  on public.schedule_day_plans for all
  using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

drop policy if exists "requests member read" on public.staff_requests;
create policy "requests member read"
  on public.staff_requests for select
  using (public.is_business_member(business_id));

drop policy if exists "requests member create" on public.staff_requests;
create policy "requests member create"
  on public.staff_requests for insert
  with check (public.is_business_member(business_id));

drop policy if exists "requests admin update" on public.staff_requests;
create policy "requests admin update"
  on public.staff_requests for update
  using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

drop policy if exists "time entries member read" on public.time_entries;
create policy "time entries member read"
  on public.time_entries for select
  using (public.is_business_member(business_id));

drop policy if exists "time entries member create" on public.time_entries;
create policy "time entries member create"
  on public.time_entries for insert
  with check (public.is_business_member(business_id));

drop policy if exists "time entries admin update" on public.time_entries;
create policy "time entries admin update"
  on public.time_entries for update
  using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

drop policy if exists "events member read" on public.events;
create policy "events member read"
  on public.events for select
  using (public.is_business_member(business_id));

drop policy if exists "events admin write" on public.events;
create policy "events admin write"
  on public.events for all
  using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));

drop policy if exists "guide member read" on public.guide_items;
create policy "guide member read"
  on public.guide_items for select
  using (public.is_business_member(business_id));

drop policy if exists "guide admin write" on public.guide_items;
create policy "guide admin write"
  on public.guide_items for all
  using (public.is_business_admin(business_id))
  with check (public.is_business_admin(business_id));
