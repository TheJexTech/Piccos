-- Fixes a gap found while testing M13: transactions_insert_members only
-- checked role + created_by, not that staff_id belonged to the caller.
-- A barber (no other privileges) could attribute a transaction to a
-- DIFFERENT staff member, inflating a colleague's recorded sales.
-- Owners and secretaries still need to attribute a sale to any barber
-- (they ring up sales at checkout on behalf of whoever performed the
-- service) — only the barber role is now restricted to their own staff_id,
-- mirroring the same "own staff row" check already used by
-- transactions_select_scoped.

drop policy "transactions_insert_members" on public.transactions;

create policy "transactions_insert_members"
  on public.transactions for insert
  with check (
    created_by = auth.uid()
    and (
      public.get_business_role(business_id) in ('owner', 'secretary')
      or (
        public.get_business_role(business_id) = 'barber'
        and staff_id in (
          select id from public.staff
          where business_id = transactions.business_id and profile_id = auth.uid()
        )
      )
    )
  );
