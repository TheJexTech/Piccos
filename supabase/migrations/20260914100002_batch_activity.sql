-- Correction pass 3: batch/daily activity recording. A batch is a composite
-- object (one staff member's work for a day, made of N service lines plus
-- an optional payment breakdown) — not a single financial fact like a
-- transaction or expense, so it gets its own header + line-item tables
-- rather than being forced into the transactions grain. business_id is
-- denormalized onto every child table (matching material_purchases already
-- denormalizing business_id alongside material_id) so RLS stays a simple
-- per-table check, no join required for the common case.

create table public.batches (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  staff_id uuid not null references public.staff (id) on delete restrict,
  batch_date date not null default current_date,
  tip_amount numeric(12, 2) not null default 0 check (tip_amount >= 0),
  status text not null default 'active' check (status in ('active', 'voided')),
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.batches enable row level security;

create table public.batch_services (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  service_id uuid references public.services (id) on delete set null,
  -- Snapshot of the service's name/price at record time — same rule as
  -- transactions.service_name/service_price, a later price change must
  -- never alter a past batch's totals.
  service_name text not null,
  service_price numeric(12, 2) not null check (service_price >= 0),
  quantity integer not null check (quantity > 0),
  line_total numeric(12, 2) not null check (line_total >= 0)
);

alter table public.batch_services enable row level security;

create table public.batch_payments (
  id uuid primary key default gen_random_uuid(),
  batch_id uuid not null references public.batches (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  -- 'service' = revenue payment breakdown, 'tip' = tip payment breakdown —
  -- one small table instead of two near-identical ones.
  kind text not null check (kind in ('service', 'tip')),
  payment_method text not null check (payment_method in ('cash', 'pos', 'bank_transfer', 'other')),
  amount numeric(12, 2) not null check (amount > 0)
);

alter table public.batch_payments enable row level security;

-- Same owner/secretary/barber-own-staff split as transactions (fixed in
-- 20260913100001) — owner/secretary record on behalf of any staff member,
-- a barber only against their own staff row.
create policy "batches_select_scoped"
  on public.batches for select
  using (
    public.get_business_role(business_id) in ('owner', 'secretary')
    or (
      public.get_business_role(business_id) = 'barber'
      and staff_id in (
        select id from public.staff
        where business_id = batches.business_id and profile_id = auth.uid()
      )
    )
  );

create policy "batches_insert_members"
  on public.batches for insert
  with check (
    created_by = auth.uid()
    and (
      public.get_business_role(business_id) in ('owner', 'secretary')
      or (
        public.get_business_role(business_id) = 'barber'
        and staff_id in (
          select id from public.staff
          where business_id = batches.business_id and profile_id = auth.uid()
        )
      )
    )
  );

-- No update/delete policy: append-only, same as transactions/expenses.
-- Voiding goes through void_batch() below (SECURITY DEFINER, owner-only).

create policy "batch_services_select_scoped"
  on public.batch_services for select
  using (
    public.get_business_role(business_id) in ('owner', 'secretary')
    or (
      public.get_business_role(business_id) = 'barber'
      and exists (
        select 1 from public.batches b
        join public.staff s on s.id = b.staff_id
        where b.id = batch_services.batch_id and s.profile_id = auth.uid()
      )
    )
  );

create policy "batch_services_insert_scoped"
  on public.batch_services for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary')
    or (
      public.get_business_role(business_id) = 'barber'
      and exists (
        select 1 from public.batches b
        join public.staff s on s.id = b.staff_id
        where b.id = batch_services.batch_id and s.profile_id = auth.uid()
      )
    )
  );

create policy "batch_payments_select_scoped"
  on public.batch_payments for select
  using (
    public.get_business_role(business_id) in ('owner', 'secretary')
    or (
      public.get_business_role(business_id) = 'barber'
      and exists (
        select 1 from public.batches b
        join public.staff s on s.id = b.staff_id
        where b.id = batch_payments.batch_id and s.profile_id = auth.uid()
      )
    )
  );

create policy "batch_payments_insert_scoped"
  on public.batch_payments for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary')
    or (
      public.get_business_role(business_id) = 'barber'
      and exists (
        select 1 from public.batches b
        join public.staff s on s.id = b.staff_id
        where b.id = batch_payments.batch_id and s.profile_id = auth.uid()
      )
    )
  );

-- Atomic multi-table insert, same shape/reasoning as record_material_purchase:
-- SECURITY INVOKER (RLS still applies as the caller — this doesn't bypass
-- permissions, it just makes the header + line items + payment breakdown
-- one atomic write instead of several round trips that could partially fail).
--
-- p_services: [{"service_id": uuid, "quantity": int}, ...] — required, >= 1.
-- p_payments / p_tip_payments: [{"payment_method": text, "amount": numeric}, ...]
-- — optional. If provided (non-empty), must sum to the service/tip total
-- exactly ("where the user chooses to provide a complete breakdown" per
-- spec) — an omitted breakdown is allowed through with no reconciliation.
create or replace function public.record_batch_activity(
  p_business_id uuid,
  p_staff_id uuid,
  p_batch_date date,
  p_services jsonb,
  p_tip_amount numeric default 0,
  p_payments jsonb default '[]'::jsonb,
  p_tip_payments jsonb default '[]'::jsonb
)
returns public.batches
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_batch public.batches;
  v_service_input jsonb;
  v_payment_input jsonb;
  v_service_row public.services;
  v_quantity integer;
  v_line_total numeric;
  v_service_total numeric := 0;
  v_payment_total numeric := 0;
  v_tip_payment_total numeric := 0;
begin
  if p_services is null or jsonb_array_length(p_services) = 0 then
    raise exception 'At least one service is required';
  end if;

  insert into public.batches (business_id, staff_id, batch_date, tip_amount)
  values (p_business_id, p_staff_id, coalesce(p_batch_date, current_date), coalesce(p_tip_amount, 0))
  returning * into v_batch;

  for v_service_input in select * from jsonb_array_elements(p_services)
  loop
    v_quantity := (v_service_input ->> 'quantity')::integer;
    if v_quantity is null or v_quantity <= 0 then
      raise exception 'Each service quantity must be greater than zero';
    end if;

    select * into v_service_row from public.services where id = (v_service_input ->> 'service_id')::uuid;
    if v_service_row is null then
      raise exception 'Selected service not found';
    end if;

    v_line_total := v_quantity * v_service_row.price;
    v_service_total := v_service_total + v_line_total;

    insert into public.batch_services
      (batch_id, business_id, service_id, service_name, service_price, quantity, line_total)
    values
      (v_batch.id, p_business_id, v_service_row.id, v_service_row.name, v_service_row.price, v_quantity, v_line_total);
  end loop;

  if p_payments is not null and jsonb_array_length(p_payments) > 0 then
    for v_payment_input in select * from jsonb_array_elements(p_payments)
    loop
      v_payment_total := v_payment_total + (v_payment_input ->> 'amount')::numeric;
      insert into public.batch_payments (batch_id, business_id, kind, payment_method, amount)
      values (v_batch.id, p_business_id, 'service', v_payment_input ->> 'payment_method', (v_payment_input ->> 'amount')::numeric);
    end loop;

    if v_payment_total <> v_service_total then
      raise exception 'Payment breakdown (%) does not match service revenue (%)', v_payment_total, v_service_total;
    end if;
  end if;

  if p_tip_payments is not null and jsonb_array_length(p_tip_payments) > 0 then
    for v_payment_input in select * from jsonb_array_elements(p_tip_payments)
    loop
      v_tip_payment_total := v_tip_payment_total + (v_payment_input ->> 'amount')::numeric;
      insert into public.batch_payments (batch_id, business_id, kind, payment_method, amount)
      values (v_batch.id, p_business_id, 'tip', v_payment_input ->> 'payment_method', (v_payment_input ->> 'amount')::numeric);
    end loop;

    if v_tip_payment_total <> coalesce(p_tip_amount, 0) then
      raise exception 'Tip payment breakdown (%) does not match tip amount (%)', v_tip_payment_total, p_tip_amount;
    end if;
  end if;

  return v_batch;
end;
$$;

revoke execute on function public.record_batch_activity(uuid, uuid, date, jsonb, numeric, jsonb, jsonb) from public;
grant execute on function public.record_batch_activity(uuid, uuid, date, jsonb, numeric, jsonb, jsonb) to authenticated;

-- Voiding: a batch is a composite object (header + line items + payment
-- breakdown) — a literal negative reversing batch would mean fabricating
-- negative line items and a fabricated reversed payment split, which
-- doesn't represent anything that actually happened. A status flag +
-- audit log entry preserves the same guarantees (nothing deleted or
-- mutated in place, owner-only, always audited) without forcing a pattern
-- onto data it doesn't fit. Reporting filters status = 'active'.
create or replace function public.void_batch(p_batch_id uuid, p_reason text)
returns public.batches
language plpgsql
security definer
set search_path = public
as $$
declare
  v_batch public.batches;
begin
  select * into v_batch from public.batches where id = p_batch_id;

  if v_batch is null then
    raise exception 'Batch not found';
  end if;

  -- IS DISTINCT FROM (not <>) — see 20260912110001: a non-member's
  -- get_business_role() is NULL, and NULL <> 'owner' evaluates to NULL,
  -- which IF...THEN treats as false and silently skips the RAISE.
  if public.get_business_role(v_batch.business_id) is distinct from 'owner' then
    raise exception 'Only the owner can void a batch';
  end if;

  if v_batch.status = 'voided' then
    raise exception 'Batch has already been voided';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required to void a batch';
  end if;

  update public.batches set status = 'voided' where id = p_batch_id returning * into v_batch;

  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_values, reason)
  values (v_batch.business_id, auth.uid(), 'void', 'batches', p_batch_id, to_jsonb(v_batch), p_reason);

  return v_batch;
end;
$$;

revoke execute on function public.void_batch(uuid, text) from public;
grant execute on function public.void_batch(uuid, text) to authenticated;
