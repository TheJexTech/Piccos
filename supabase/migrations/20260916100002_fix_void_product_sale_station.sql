-- Bug fix: void_product_sale()'s reversing entry didn't carry station_id
-- (that column didn't exist yet when the function was first written, and
-- the station_id migration only updated record_product_sale/void_expense,
-- missing this one). Left as-is, a voided sale's correction row defaults
-- to station_id = NULL ("shop-wide"), so it cancels out correctly in
-- "All Outlets" totals but NOT when a single outlet is selected — the
-- original sale's revenue stays visible for that outlet with no
-- offsetting correction, a phantom-revenue bug.

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
    quantity, amount, payment_method, sale_date, station_id, correction_of_id
  ) values (
    v_original.business_id, v_original.product_id, v_original.product_name,
    v_original.selling_price, v_original.cost_price,
    -v_original.quantity, -v_original.amount, v_original.payment_method, now(),
    v_original.station_id, p_sale_id
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

-- Data repair: any existing correction row whose station_id doesn't match
-- its original sale's station_id was produced by the bug above — realign
-- it. Only touches correction rows (correction_of_id is not null), never
-- an original sale, and only the station_id column.
update public.product_sales AS correction
set station_id = original.station_id
from public.product_sales AS original
where correction.correction_of_id = original.id
  and correction.station_id is distinct from original.station_id;
