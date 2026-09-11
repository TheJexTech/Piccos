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
