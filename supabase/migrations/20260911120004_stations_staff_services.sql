create table public.stations (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  status text not null default 'active' check (status in ('active', 'inactive', 'maintenance')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.stations enable row level security;

create trigger set_stations_updated_at
  before update on public.stations
  for each row execute function public.set_updated_at();

create policy "stations_select_members"
  on public.stations for select
  using (public.is_business_member(business_id));

create policy "stations_insert_owner"
  on public.stations for insert
  with check (public.get_business_role(business_id) = 'owner');

create policy "stations_update_owner"
  on public.stations for update
  using (public.get_business_role(business_id) = 'owner');

create policy "stations_delete_owner"
  on public.stations for delete
  using (public.get_business_role(business_id) = 'owner');

create table public.staff (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  profile_id uuid not null references public.profiles (id) on delete cascade,
  station_id uuid references public.stations (id) on delete set null,
  display_name text not null,
  status text not null default 'active' check (status in ('active', 'inactive')),
  joined_at date not null default current_date,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, profile_id)
);

alter table public.staff enable row level security;

create trigger set_staff_updated_at
  before update on public.staff
  for each row execute function public.set_updated_at();

create policy "staff_select_members"
  on public.staff for select
  using (public.is_business_member(business_id));

create policy "staff_insert_owner_secretary"
  on public.staff for insert
  with check (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "staff_update_owner_secretary"
  on public.staff for update
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "staff_delete_owner"
  on public.staff for delete
  using (public.get_business_role(business_id) = 'owner');

-- Business colleagues can see each other's profile (name/avatar) so staff
-- lists and transaction history can show real names, not raw user IDs —
-- without opening every profile up to every logged-in user.
create policy "profiles_select_business_colleagues"
  on public.profiles for select
  using (
    exists (
      select 1
      from public.staff s1
      join public.staff s2 on s1.business_id = s2.business_id
      where s1.profile_id = auth.uid() and s2.profile_id = profiles.id
    )
  );

create table public.services (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  description text,
  price numeric(12, 2) not null check (price >= 0),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.services enable row level security;

create trigger set_services_updated_at
  before update on public.services
  for each row execute function public.set_updated_at();

create policy "services_select_members"
  on public.services for select
  using (public.is_business_member(business_id));

create policy "services_insert_owner_secretary"
  on public.services for insert
  with check (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "services_update_owner_secretary"
  on public.services for update
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "services_delete_owner"
  on public.services for delete
  using (public.get_business_role(business_id) = 'owner');
