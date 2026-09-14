-- Product sales / retail management. Services and product sales are
-- explicitly required to remain separate systems (different shape: a
-- product sale has quantity, cost price, and deducts stock; a service
-- transaction has none of that) — these are new, parallel tables, not a
-- reuse or extension of services/transactions.

create table public.products (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  cost_price numeric(12, 2) not null check (cost_price >= 0),
  -- May go negative — a miscount is a signal to fix, not a hard block on
  -- recording a sale, same philosophy as materials.current_quantity.
  stock_quantity integer not null default 0,
  status text not null default 'active' check (status in ('active', 'inactive')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.products enable row level security;

create trigger set_products_updated_at
  before update on public.products
  for each row execute function public.set_updated_at();

-- Unlike services, product sales have no barber-attribution path at all
-- (owner/secretary only, see product_sales below) — so unlike
-- services_select_members, there's no functional reason for a barber to
-- see the product catalog, and cost_price is margin data the owner likely
-- doesn't want visible to barbers anyway. Select stays owner/secretary,
-- matching product_sales' trust level exactly.
create policy "products_select_owner_secretary"
  on public.products for select
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "products_insert_owner_secretary"
  on public.products for insert
  with check (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "products_update_owner_secretary"
  on public.products for update
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "products_delete_owner"
  on public.products for delete
  using (public.get_business_role(business_id) = 'owner');

create table public.product_sales (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  product_id uuid references public.products (id) on delete set null,
  -- Snapshot of the product's name/prices at sale time — same rule as
  -- transactions.service_name/service_price, a later price change must
  -- never alter historical sales.
  product_name text not null,
  selling_price numeric(12, 2) not null check (selling_price >= 0),
  cost_price numeric(12, 2) not null check (cost_price >= 0),
  quantity integer not null check (quantity > 0 or correction_of_id is not null),
  amount numeric(12, 2) not null check (amount >= 0 or correction_of_id is not null),
  payment_method text not null check (payment_method in ('cash', 'pos', 'bank_transfer', 'other')),
  sale_date timestamptz not null default now(),
  correction_of_id uuid references public.product_sales (id),
  -- Defaults to the caller, and the insert policy below pins it to the
  -- caller too — a client can't attribute a record to someone else.
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.product_sales enable row level security;

-- Retail checkout is owner/secretary territory, same trust level as
-- expenses/material_purchases — the "Record Product Sale" flow has no
-- staff field, so unlike transactions there's no barber-attribution case.
create policy "product_sales_select_owner_secretary"
  on public.product_sales for select
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "product_sales_insert_owner_secretary"
  on public.product_sales for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary')
    and created_by = auth.uid()
  );

-- No update/delete policy: append-only, same rule as transactions/expenses.
-- Voiding goes through void_product_sale() below (SECURITY DEFINER,
-- owner-only).

-- Atomic sale + stock deduction, same reasoning as record_material_purchase:
-- two separate client round-trips risk a lost update or a sale recorded
-- with no matching stock change. SECURITY INVOKER — RLS still applies as
-- the caller, this doesn't bypass permissions.
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
    quantity, amount, payment_method, sale_date
  ) values (
    p_business_id, v_product.id, v_product.name, v_product.selling_price, v_product.cost_price,
    p_quantity, v_product.selling_price * p_quantity, p_payment_method, coalesce(p_sale_date, now())
  )
  returning * into v_sale;

  update public.products
  set stock_quantity = stock_quantity - p_quantity
  where id = p_product_id;

  return v_sale;
end;
$$;

revoke execute on function public.record_product_sale(uuid, uuid, integer, text, timestamptz) from public;
grant execute on function public.record_product_sale(uuid, uuid, integer, text, timestamptz) to authenticated;

-- Voiding: same reversing-entry pattern as void_transaction (a single-row
-- grain, unlike the composite batches which use a status flag instead) —
-- plus restoring the stock this sale had deducted, since a voided sale
-- means it didn't happen.
create or replace function public.void_product_sale(p_sale_id uuid, p_reason text)
returns public.product_sales
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.product_sales;
  v_correction public.product_sales;
begin
  select * into v_original from public.product_sales where id = p_sale_id;

  if v_original is null then
    raise exception 'Product sale not found';
  end if;

  -- IS DISTINCT FROM (not <>) — see 20260912110001: a non-member's
  -- get_business_role() is NULL, and NULL <> 'owner' evaluates to NULL,
  -- which IF...THEN treats as false and silently skips the RAISE.
  if public.get_business_role(v_original.business_id) is distinct from 'owner' then
    raise exception 'Only the owner can void a product sale';
  end if;

  if v_original.correction_of_id is not null then
    raise exception 'Cannot void a correction entry';
  end if;

  if exists (select 1 from public.product_sales where correction_of_id = p_sale_id) then
    raise exception 'Product sale has already been voided';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required to void a product sale';
  end if;

  insert into public.product_sales (
    business_id, product_id, product_name, selling_price, cost_price,
    quantity, amount, payment_method, sale_date, correction_of_id
  ) values (
    v_original.business_id, v_original.product_id, v_original.product_name,
    v_original.selling_price, v_original.cost_price,
    -v_original.quantity, -v_original.amount, v_original.payment_method, now(), p_sale_id
  )
  returning * into v_correction;

  if v_original.product_id is not null then
    update public.products
    set stock_quantity = stock_quantity + v_original.quantity
    where id = v_original.product_id;
  end if;

  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_values, reason)
  values (
    v_original.business_id, auth.uid(), 'void', 'product_sales', p_sale_id,
    to_jsonb(v_original), p_reason
  );

  return v_correction;
end;
$$;

revoke execute on function public.void_product_sale(uuid, text) from public;
grant execute on function public.void_product_sale(uuid, text) to authenticated;
