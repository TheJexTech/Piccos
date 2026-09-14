-- Outlet model correction: "Outlet" means a station (existing table, M4),
-- not a separate business. These are purely additive, nullable columns —
-- no backfill needed, no RLS policy changes anywhere (business_id stays
-- the tenant-isolation boundary; station_id is an optional filter layered
-- on top, the same shape transactions.station_id/staff.station_id already
-- are).

alter table public.products
  add column station_id uuid references public.stations (id) on delete set null;

alter table public.product_sales
  add column station_id uuid references public.stations (id) on delete set null;

alter table public.batches
  add column station_id uuid references public.stations (id) on delete set null;

alter table public.expenses
  add column station_id uuid references public.stations (id) on delete set null;

-- Re-derive the recording staff member's current station and snapshot it
-- onto the batch header — same auto-populate-from-staff rule the Activity
-- UI already applies to individual transactions.
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
  v_staff_station_id uuid;
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

  select station_id into v_staff_station_id from public.staff where id = p_staff_id;

  insert into public.batches (business_id, staff_id, station_id, batch_date, tip_amount)
  values (p_business_id, p_staff_id, v_staff_station_id, coalesce(p_batch_date, current_date), coalesce(p_tip_amount, 0))
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

-- Re-derive the product's current station and snapshot it onto the sale —
-- same "never let history move" rule as product_name/selling_price.
create or replace function public.record_product_sale(
  p_business_id uuid,
  p_product_id uuid,
  p_quantity integer,
  p_payment_method text,
  p_sale_date timestamptz default now()
)
returns public.product_sales
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_product public.products;
  v_sale public.product_sales;
begin
  if p_quantity is null or p_quantity <= 0 then
    raise exception 'Quantity must be greater than zero';
  end if;

  select * into v_product from public.products where id = p_product_id;
  if v_product is null then
    raise exception 'Product not found';
  end if;

  insert into public.product_sales (
    business_id, product_id, product_name, selling_price, cost_price,
    quantity, amount, payment_method, sale_date, station_id
  ) values (
    p_business_id, v_product.id, v_product.name, v_product.selling_price, v_product.cost_price,
    p_quantity, v_product.selling_price * p_quantity, p_payment_method, coalesce(p_sale_date, now()), v_product.station_id
  )
  returning * into v_sale;

  update public.products
  set stock_quantity = stock_quantity - p_quantity
  where id = p_product_id;

  return v_sale;
end;
$$;

-- Carry the original expense's station_id onto its reversing entry — a
-- voided single-outlet expense must not silently become shop-wide (or
-- vice versa) in the per-outlet figures.
create or replace function public.void_expense(p_expense_id uuid, p_reason text)
returns public.expenses
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.expenses;
  v_correction public.expenses;
begin
  select * into v_original from public.expenses where id = p_expense_id;

  if v_original is null then
    raise exception 'Expense not found';
  end if;

  if public.get_business_role(v_original.business_id) is distinct from 'owner' then
    raise exception 'Only the owner can void an expense';
  end if;

  if v_original.correction_of_id is not null then
    raise exception 'Cannot void a correction entry';
  end if;

  if exists (select 1 from public.expenses where correction_of_id = p_expense_id) then
    raise exception 'Expense has already been voided';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required to void an expense';
  end if;

  insert into public.expenses (
    business_id, category_id, amount, description, expense_date, station_id, created_by, correction_of_id
  ) values (
    v_original.business_id, v_original.category_id, -v_original.amount,
    v_original.description, current_date, v_original.station_id, auth.uid(), p_expense_id
  )
  returning * into v_correction;

  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_values, reason)
  values (
    v_original.business_id, auth.uid(), 'void', 'expenses', p_expense_id,
    to_jsonb(v_original), p_reason
  );

  return v_correction;
end;
$$;
