-- M11: correction workflow. Financial history is append-only (M2/M6/M7)
-- and stays that way here — a correction is a NEW, negative reversing
-- entry that references the original via correction_of_id, never a
-- mutation of the original row. "Preserve the original event" (spec
-- section 4.13) is then literally true: the original row is untouched,
-- forever. Summing amount naturally nets out corrections, so Dashboard
-- (M9) and Reports (M10) need no changes at all.
--
-- The amount/quantity check constraints required non-negative values,
-- which blocks a negative reversing entry — relaxed to allow negative
-- only when correction_of_id is set, so normal entries still can't be
-- negative.

alter table public.transactions add column correction_of_id uuid references public.transactions (id);
alter table public.transactions drop constraint transactions_amount_check;
alter table public.transactions add constraint transactions_amount_check
  check (amount >= 0 or correction_of_id is not null);

alter table public.expenses add column correction_of_id uuid references public.expenses (id);
alter table public.expenses drop constraint expenses_amount_check;
alter table public.expenses add constraint expenses_amount_check
  check (amount >= 0 or correction_of_id is not null);

-- Voiding is owner-only ("restricted administrative actions" are
-- explicitly outside the secretary's scope, and audit_logs itself is
-- owner-only visible). SECURITY DEFINER bypasses RLS for the writes
-- below, so the owner check happens explicitly in the function body —
-- there is no INSERT policy on transactions/expenses/audit_logs backing
-- this up.
create or replace function public.void_transaction(p_transaction_id uuid, p_reason text)
returns public.transactions
language plpgsql
security definer
set search_path = public
as $$
declare
  v_original public.transactions;
  v_correction public.transactions;
begin
  select * into v_original from public.transactions where id = p_transaction_id;

  if v_original is null then
    raise exception 'Transaction not found';
  end if;

  -- IS DISTINCT FROM (not <>) — a non-member's get_business_role() is
  -- NULL, and `NULL <> 'owner'` evaluates to NULL, which `IF ... THEN`
  -- treats as false and silently skips the RAISE. IS DISTINCT FROM
  -- handles NULL correctly, so a non-member is correctly rejected.
  if public.get_business_role(v_original.business_id) is distinct from 'owner' then
    raise exception 'Only the owner can void a transaction';
  end if;

  if v_original.correction_of_id is not null then
    raise exception 'Cannot void a correction entry';
  end if;

  if exists (select 1 from public.transactions where correction_of_id = p_transaction_id) then
    raise exception 'Transaction has already been voided';
  end if;

  if p_reason is null or btrim(p_reason) = '' then
    raise exception 'A reason is required to void a transaction';
  end if;

  insert into public.transactions (
    business_id, staff_id, station_id, service_id, service_name, service_price,
    amount, payment_method, transaction_date, created_by, correction_of_id
  ) values (
    v_original.business_id, v_original.staff_id, v_original.station_id, v_original.service_id,
    v_original.service_name, v_original.service_price,
    -v_original.amount, v_original.payment_method, now(), auth.uid(), p_transaction_id
  )
  returning * into v_correction;

  insert into public.audit_logs (business_id, user_id, action, entity_type, entity_id, old_values, reason)
  values (
    v_original.business_id, auth.uid(), 'void', 'transactions', p_transaction_id,
    to_jsonb(v_original), p_reason
  );

  return v_correction;
end;
$$;

revoke execute on function public.void_transaction(uuid, text) from public;
grant execute on function public.void_transaction(uuid, text) to authenticated;

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

  -- IS DISTINCT FROM (not <>) — a non-member's get_business_role() is
  -- NULL, and `NULL <> 'owner'` evaluates to NULL, which `IF ... THEN`
  -- treats as false and silently skips the RAISE. IS DISTINCT FROM
  -- handles NULL correctly, so a non-member is correctly rejected.
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
    business_id, category_id, amount, description, expense_date, created_by, correction_of_id
  ) values (
    v_original.business_id, v_original.category_id, -v_original.amount,
    v_original.description, current_date, auth.uid(), p_expense_id
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

revoke execute on function public.void_expense(uuid, text) from public;
grant execute on function public.void_expense(uuid, text) to authenticated;
