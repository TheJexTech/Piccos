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
