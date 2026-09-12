-- M8: recording a purchase and bumping the material's stock level must
-- happen together — doing this as two separate client requests (insert
-- purchase, then update quantity) risks a lost update under concurrent
-- purchases and can leave a purchase recorded with no matching stock
-- change if the second request fails. SECURITY INVOKER (the default,
-- named explicitly here) means RLS still applies as the calling user —
-- this function doesn't bypass permissions, it just makes the two
-- writes atomic.
create or replace function public.record_material_purchase(
  p_material_id uuid,
  p_quantity numeric,
  p_unit_cost numeric,
  p_supplier text default null,
  p_purchase_date date default current_date
)
returns public.material_purchases
language plpgsql
security invoker
set search_path = public
as $$
declare
  v_business_id uuid;
  v_purchase public.material_purchases;
begin
  select business_id into v_business_id from public.materials where id = p_material_id;

  if v_business_id is null then
    raise exception 'Material not found';
  end if;

  insert into public.material_purchases
    (business_id, material_id, quantity, unit_cost, total_cost, supplier, purchase_date)
  values
    (v_business_id, p_material_id, p_quantity, p_unit_cost, p_quantity * p_unit_cost, p_supplier, p_purchase_date)
  returning * into v_purchase;

  update public.materials
  set current_quantity = current_quantity + p_quantity
  where id = p_material_id;

  return v_purchase;
end;
$$;

revoke execute on function public.record_material_purchase(uuid, numeric, numeric, text, date) from public;
grant execute on function public.record_material_purchase(uuid, numeric, numeric, text, date) to authenticated;
