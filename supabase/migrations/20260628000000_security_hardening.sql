create schema if not exists private;

grant usage on schema private to anon, authenticated;

create or replace function private.is_business_owner(target_business_id uuid)
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

create or replace function private.is_business_member(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select private.is_business_owner(target_business_id)
    or exists (
      select 1
      from public.business_members members
      where members.business_id = target_business_id
        and members.user_id = auth.uid()
        and members.status = 'active'
    );
$$;

create or replace function private.is_business_manager(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members members
    where members.business_id = target_business_id
      and members.user_id = auth.uid()
      and members.status = 'active'
      and members.role = 'manager'
  );
$$;

create or replace function private.is_business_admin(target_business_id uuid)
returns boolean
language sql
security definer
set search_path = public, private
as $$
  select private.is_business_owner(target_business_id)
    or private.is_business_manager(target_business_id);
$$;

create or replace function private.is_own_member(target_business_id uuid, target_member_id uuid)
returns boolean
language sql
security definer
set search_path = public
as $$
  select exists (
    select 1
    from public.business_members members
    where members.business_id = target_business_id
      and members.id = target_member_id
      and members.user_id = auth.uid()
      and members.status = 'active'
  );
$$;

revoke execute on function public.is_business_owner(uuid) from public, anon, authenticated;
revoke execute on function public.is_business_member(uuid) from public, anon, authenticated;
revoke execute on function public.is_business_admin(uuid) from public, anon, authenticated;

grant execute on function private.is_business_owner(uuid) to anon, authenticated;
grant execute on function private.is_business_member(uuid) to anon, authenticated;
grant execute on function private.is_business_manager(uuid) to anon, authenticated;
grant execute on function private.is_business_admin(uuid) to anon, authenticated;
grant execute on function private.is_own_member(uuid, uuid) to anon, authenticated;

alter table public.team_invites
  add column if not exists code_hash text,
  add column if not exists code_fingerprint text,
  add column if not exists max_attempts integer not null default 5,
  add column if not exists attempts integer not null default 0,
  add column if not exists last_attempt_at timestamptz,
  add column if not exists accepted_at timestamptz,
  add column if not exists canceled_at timestamptz;

alter table public.shifts add column if not exists deleted_at timestamptz;
alter table public.schedule_day_plans add column if not exists deleted_at timestamptz;
alter table public.staff_requests add column if not exists deleted_at timestamptz;
alter table public.time_entries add column if not exists deleted_at timestamptz;
alter table public.events add column if not exists deleted_at timestamptz;
alter table public.guide_items add column if not exists deleted_at timestamptz;

create table if not exists public.audit_log (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  actor_id uuid references auth.users(id) on delete set null,
  actor_member_id uuid references public.business_members(id) on delete set null,
  action text not null,
  target_table text,
  target_id uuid,
  metadata jsonb not null default '{}'::jsonb,
  ip_address inet,
  user_agent text,
  created_at timestamptz not null default now()
);

alter table public.audit_log enable row level security;

drop policy if exists "businesses member read" on public.businesses;
create policy "businesses member read"
  on public.businesses for select
  using (private.is_business_member(id));

drop policy if exists "businesses owner create" on public.businesses;
create policy "businesses owner create"
  on public.businesses for insert
  with check (owner_id = auth.uid());

drop policy if exists "businesses owner update" on public.businesses;
create policy "businesses owner update"
  on public.businesses for update
  using (private.is_business_owner(id))
  with check (private.is_business_owner(id));

drop policy if exists "businesses owner delete" on public.businesses;
create policy "businesses owner delete"
  on public.businesses for delete
  using (private.is_business_owner(id));

drop policy if exists "members business read" on public.business_members;
create policy "members business read"
  on public.business_members for select
  using (private.is_business_admin(business_id) or user_id = auth.uid());

drop policy if exists "members admin write" on public.business_members;
drop policy if exists "members owner insert" on public.business_members;
create policy "members owner insert"
  on public.business_members for insert
  with check (private.is_business_owner(business_id));

drop policy if exists "members owner update" on public.business_members;
create policy "members owner update"
  on public.business_members for update
  using (private.is_business_owner(business_id))
  with check (private.is_business_owner(business_id));

drop policy if exists "members owner delete" on public.business_members;
create policy "members owner delete"
  on public.business_members for delete
  using (private.is_business_owner(business_id));

drop policy if exists "work areas member read" on public.work_areas;
create policy "work areas member read"
  on public.work_areas for select
  using (private.is_business_member(business_id));

drop policy if exists "work areas admin write" on public.work_areas;
create policy "work areas admin write"
  on public.work_areas for all
  using (private.is_business_admin(business_id))
  with check (private.is_business_admin(business_id));

drop policy if exists "team invites admin manage" on public.team_invites;
drop policy if exists "team invites admin read" on public.team_invites;
create policy "team invites admin read"
  on public.team_invites for select
  using (private.is_business_admin(business_id));

drop policy if exists "team invites controlled insert" on public.team_invites;
create policy "team invites controlled insert"
  on public.team_invites for insert
  with check (
    private.is_business_owner(business_id)
    or (private.is_business_manager(business_id) and target_role = 'employee')
  );

drop policy if exists "team invites controlled update" on public.team_invites;
create policy "team invites controlled update"
  on public.team_invites for update
  using (
    private.is_business_owner(business_id)
    or (private.is_business_manager(business_id) and target_role = 'employee')
  )
  with check (
    private.is_business_owner(business_id)
    or (private.is_business_manager(business_id) and target_role = 'employee')
  );

drop policy if exists "team invites owner delete" on public.team_invites;
create policy "team invites owner delete"
  on public.team_invites for delete
  using (private.is_business_owner(business_id));

drop policy if exists "shifts member read" on public.shifts;
create policy "shifts member read"
  on public.shifts for select
  using (deleted_at is null and private.is_business_member(business_id));

drop policy if exists "shifts admin write" on public.shifts;
create policy "shifts admin write"
  on public.shifts for all
  using (private.is_business_admin(business_id))
  with check (private.is_business_admin(business_id));

drop policy if exists "day plans member read" on public.schedule_day_plans;
create policy "day plans member read"
  on public.schedule_day_plans for select
  using (deleted_at is null and private.is_business_member(business_id));

drop policy if exists "day plans admin write" on public.schedule_day_plans;
create policy "day plans admin write"
  on public.schedule_day_plans for all
  using (private.is_business_admin(business_id))
  with check (private.is_business_admin(business_id));

drop policy if exists "requests member read" on public.staff_requests;
create policy "requests member read"
  on public.staff_requests for select
  using (
    deleted_at is null
    and (
      private.is_business_admin(business_id)
      or private.is_own_member(business_id, member_id)
    )
  );

drop policy if exists "requests member create" on public.staff_requests;
create policy "requests member create"
  on public.staff_requests for insert
  with check (
    private.is_business_admin(business_id)
    or private.is_own_member(business_id, member_id)
  );

drop policy if exists "requests admin update" on public.staff_requests;
create policy "requests admin update"
  on public.staff_requests for update
  using (private.is_business_admin(business_id))
  with check (private.is_business_admin(business_id));

drop policy if exists "time entries member read" on public.time_entries;
create policy "time entries member read"
  on public.time_entries for select
  using (
    deleted_at is null
    and (
      private.is_business_admin(business_id)
      or private.is_own_member(business_id, member_id)
    )
  );

drop policy if exists "time entries member create" on public.time_entries;
create policy "time entries member create"
  on public.time_entries for insert
  with check (
    private.is_business_admin(business_id)
    or private.is_own_member(business_id, member_id)
  );

drop policy if exists "time entries admin update" on public.time_entries;
create policy "time entries admin update"
  on public.time_entries for update
  using (private.is_business_admin(business_id))
  with check (private.is_business_admin(business_id));

drop policy if exists "events member read" on public.events;
create policy "events member read"
  on public.events for select
  using (deleted_at is null and private.is_business_member(business_id));

drop policy if exists "events admin write" on public.events;
create policy "events admin write"
  on public.events for all
  using (private.is_business_admin(business_id))
  with check (private.is_business_admin(business_id));

drop policy if exists "guide member read" on public.guide_items;
create policy "guide member read"
  on public.guide_items for select
  using (deleted_at is null and private.is_business_member(business_id));

drop policy if exists "guide admin write" on public.guide_items;
create policy "guide admin write"
  on public.guide_items for all
  using (private.is_business_admin(business_id))
  with check (private.is_business_admin(business_id));

drop policy if exists "audit admin read" on public.audit_log;
create policy "audit admin read"
  on public.audit_log for select
  using (private.is_business_admin(business_id));

drop policy if exists "audit member insert" on public.audit_log;
create policy "audit member insert"
  on public.audit_log for insert
  with check (private.is_business_member(business_id));
