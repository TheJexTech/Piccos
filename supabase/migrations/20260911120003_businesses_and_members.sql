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
