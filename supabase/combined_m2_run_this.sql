-- Combined M2 migration for one-shot paste into the Supabase SQL Editor.
-- Generated from the individual numbered files in supabase/migrations/ —
-- those remain the source of truth; this file is just a convenience bundle.
-- For a project that already ran the first 8 files, only the last file
-- (20260911130001_fix_created_by_integrity.sql) still needs to run.

-- ===== migrations/20260911120001_extensions_and_helpers.sql =====
-- Required for gen_random_uuid(), used as the default for every primary key.
create extension if not exists pgcrypto;

-- Shared trigger function: keeps updated_at current on every row update.
-- Attached per-table below rather than duplicated.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

-- ===== migrations/20260911120002_profiles.sql =====
create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  full_name text,
  phone text,
  avatar_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create trigger set_profiles_updated_at
  before update on public.profiles
  for each row execute function public.set_updated_at();

-- Auto-create a profile row whenever a new auth user is created, so the
-- rest of the app never has to handle "user exists but profile is missing".
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name)
  values (new.id, new.raw_user_meta_data ->> 'full_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

create policy "profiles_select_own"
  on public.profiles for select
  using (id = auth.uid());

create policy "profiles_update_own"
  on public.profiles for update
  using (id = auth.uid());

-- No insert/delete policy: rows are only ever created by the trigger
-- above and removed via the auth.users cascade — never directly by a
-- client.

-- ===== migrations/20260911120003_businesses_and_members.sql =====
create table public.businesses (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  phone text,
  email text,
  address text,
  city text,
  state text,
  country text,
  currency text not null default 'NGN',
  timezone text not null default 'Africa/Lagos',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.businesses enable row level security;

create trigger set_businesses_updated_at
  before update on public.businesses
  for each row execute function public.set_updated_at();

create table public.business_members (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  role text not null check (role in ('owner', 'secretary', 'barber')),
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, user_id)
);

alter table public.business_members enable row level security;

create trigger set_business_members_updated_at
  before update on public.business_members
  for each row execute function public.set_updated_at();

-- SECURITY DEFINER: looks up the caller's role without re-triggering RLS
-- on business_members. A policy on business_members that queried
-- business_members directly would recurse infinitely.
create or replace function public.get_business_role(p_business_id uuid)
returns text
language sql
security definer
set search_path = public
stable
as $$
  select role from public.business_members
  where business_id = p_business_id
    and user_id = auth.uid()
    and status = 'active'
  limit 1;
$$;

create or replace function public.is_business_member(p_business_id uuid)
returns boolean
language sql
security definer
set search_path = public
stable
as $$
  select public.get_business_role(p_business_id) is not null;
$$;

revoke execute on function public.get_business_role(uuid) from public;
grant execute on function public.get_business_role(uuid) to authenticated;
revoke execute on function public.is_business_member(uuid) from public;
grant execute on function public.is_business_member(uuid) to authenticated;

-- Creating a business and becoming its owner has to happen atomically —
-- a bare INSERT policy on businesses can't also guarantee the matching
-- owner row gets created, and business_members' own insert policy
-- requires an existing owner (chicken-and-egg for the very first row).
-- This SECURITY DEFINER function is therefore the only way to create a
-- business; there is deliberately no direct INSERT policy on businesses.
create or replace function public.create_business_with_owner(
  p_name text,
  p_description text default null,
  p_phone text default null,
  p_email text default null,
  p_address text default null,
  p_city text default null,
  p_state text default null,
  p_country text default null,
  p_currency text default 'NGN',
  p_timezone text default 'Africa/Lagos'
)
returns public.businesses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_business public.businesses;
begin
  insert into public.businesses
    (name, description, phone, email, address, city, state, country, currency, timezone)
  values
    (p_name, p_description, p_phone, p_email, p_address, p_city, p_state, p_country, p_currency, p_timezone)
  returning * into v_business;

  insert into public.business_members (business_id, user_id, role, status)
  values (v_business.id, auth.uid(), 'owner', 'active');

  return v_business;
end;
$$;

revoke execute on function public.create_business_with_owner(
  text, text, text, text, text, text, text, text, text, text
) from public;
grant execute on function public.create_business_with_owner(
  text, text, text, text, text, text, text, text, text, text
) to authenticated;

create policy "businesses_select_members"
  on public.businesses for select
  using (public.is_business_member(id));

create policy "businesses_update_owner"
  on public.businesses for update
  using (public.get_business_role(id) = 'owner');

create policy "business_members_select_members"
  on public.business_members for select
  using (public.is_business_member(business_id));

-- Adding further members (e.g. inviting a secretary or barber) is a
-- direct insert by an existing owner — only the very first (bootstrap)
-- member row goes through create_business_with_owner above.
create policy "business_members_insert_owner"
  on public.business_members for insert
  with check (public.get_business_role(business_id) = 'owner');

create policy "business_members_update_owner"
  on public.business_members for update
  using (public.get_business_role(business_id) = 'owner');

create policy "business_members_delete_owner"
  on public.business_members for delete
  using (public.get_business_role(business_id) = 'owner');

-- ===== migrations/20260911120004_stations_staff_services.sql =====
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

-- ===== migrations/20260911120005_transactions.sql =====
create table public.transactions (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete restrict,
  station_id uuid references public.stations (id) on delete set null,
  service_id uuid references public.services (id) on delete set null,
  -- Snapshot of the service's name/price at sale time — a later price or
  -- name change on `services` must never alter historical transactions.
  service_name text not null,
  service_price numeric(12, 2) not null check (service_price >= 0),
  amount numeric(12, 2) not null check (amount >= 0),
  payment_method text not null check (payment_method in ('cash', 'pos', 'bank_transfer', 'other')),
  transaction_date timestamptz not null default now(),
  -- Defaults to the caller, and the insert policy below pins it to the
  -- caller too — a client can't attribute a record to someone else.
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.transactions enable row level security;

-- Owners and secretaries see the full shop's transaction history.
-- Barbers only see their own — matches "Barber: limited access,
-- primarily their own activity/performance" from the product spec.
create policy "transactions_select_scoped"
  on public.transactions for select
  using (
    public.get_business_role(business_id) in ('owner', 'secretary')
    or (
      public.get_business_role(business_id) = 'barber'
      and staff_id in (
        select id from public.staff
        where business_id = transactions.business_id and profile_id = auth.uid()
      )
    )
  );

create policy "transactions_insert_members"
  on public.transactions for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary', 'barber')
    and created_by = auth.uid()
  );

-- No update/delete policy: financial history is append-only. Corrections
-- become new, audited entries once the correction workflow (M11) exists
-- — never a mutation of a past record.

-- ===== migrations/20260911120006_expenses.sql =====
create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

alter table public.expense_categories enable row level security;

create trigger set_expense_categories_updated_at
  before update on public.expense_categories
  for each row execute function public.set_updated_at();

create policy "expense_categories_select_owner_secretary"
  on public.expense_categories for select
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "expense_categories_insert_owner_secretary"
  on public.expense_categories for insert
  with check (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "expense_categories_update_owner_secretary"
  on public.expense_categories for update
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "expense_categories_delete_owner"
  on public.expense_categories for delete
  using (public.get_business_role(business_id) = 'owner');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  description text,
  expense_date date not null default current_date,
  -- Defaults to the caller, and the insert policy below pins it to the
  -- caller too — a client can't attribute a record to someone else.
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

-- Expenses are owner/secretary territory only — the product spec doesn't
-- list expense visibility as a barber permission.
create policy "expenses_select_owner_secretary"
  on public.expenses for select
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "expenses_insert_owner_secretary"
  on public.expenses for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary')
    and created_by = auth.uid()
  );

-- No update/delete: same append-only rule as transactions.

-- ===== migrations/20260911120007_materials.sql =====
create table public.materials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  unit text not null,
  current_quantity numeric(12, 2) not null default 0,
  minimum_quantity numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.materials enable row level security;

create trigger set_materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

create policy "materials_select_members"
  on public.materials for select
  using (public.is_business_member(business_id));

create policy "materials_insert_owner_secretary"
  on public.materials for insert
  with check (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "materials_update_owner_secretary"
  on public.materials for update
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "materials_delete_owner"
  on public.materials for delete
  using (public.get_business_role(business_id) = 'owner');

create table public.material_purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  total_cost numeric(12, 2) not null check (total_cost >= 0),
  supplier text,
  purchase_date date not null default current_date,
  -- Defaults to the caller, and the insert policy below pins it to the
  -- caller too — a client can't attribute a record to someone else.
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.material_purchases enable row level security;

-- Purchase cost is financial data — owner/secretary only, same as expenses.
create policy "material_purchases_select_owner_secretary"
  on public.material_purchases for select
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "material_purchases_insert_owner_secretary"
  on public.material_purchases for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary')
    and created_by = auth.uid()
  );

-- No update/delete: purchase history is append-only, same rule as
-- transactions/expenses. Stock-quantity math (M8) reads this history
-- rather than mutating it.

-- ===== migrations/20260911120008_audit_logs.sql =====
create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- "Owner: full business access ... and audit information" — audit trail
-- visibility is owner-only.
create policy "audit_logs_select_owner"
  on public.audit_logs for select
  using (public.get_business_role(business_id) = 'owner');

-- No insert/update/delete policy for any client role: audit rows are
-- written by trusted server-side logic (a SECURITY DEFINER function, once
-- the M11 correction workflow exists) — never directly by a user, and
-- never edited or removed once written.

-- ===== migrations/20260911130001_fix_created_by_integrity.sql =====
-- Fixes a gap found while testing M2: `created_by` on transactions,
-- expenses, and material_purchases had no server-side enforcement — a
-- client could insert any value, undermining "track who created the
-- record" (an explicit V1 requirement for financial rows). This defaults
-- it to the caller and pins it there via each insert policy, so it can no
-- longer be spoofed even by a malicious or buggy client.

alter table public.transactions
  alter column created_by set default auth.uid();

alter table public.expenses
  alter column created_by set default auth.uid();

alter table public.material_purchases
  alter column created_by set default auth.uid();

drop policy "transactions_insert_members" on public.transactions;
create policy "transactions_insert_members"
  on public.transactions for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary', 'barber')
    and created_by = auth.uid()
  );

drop policy "expenses_insert_owner_secretary" on public.expenses;
create policy "expenses_insert_owner_secretary"
  on public.expenses for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary')
    and created_by = auth.uid()
  );

drop policy "material_purchases_insert_owner_secretary" on public.material_purchases;
create policy "material_purchases_insert_owner_secretary"
  on public.material_purchases for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary')
    and created_by = auth.uid()
  );

