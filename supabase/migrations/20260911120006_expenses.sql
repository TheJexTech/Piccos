create table public.expense_categories (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  is_default boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (business_id, name)
);

alter table public.expense_categories enable row level security;

create trigger set_expense_categories_updated_at
  before update on public.expense_categories
  for each row execute function public.set_updated_at();

create policy "expense_categories_select_owner_secretary"
  on public.expense_categories for select
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "expense_categories_insert_owner_secretary"
  on public.expense_categories for insert
  with check (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "expense_categories_update_owner_secretary"
  on public.expense_categories for update
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "expense_categories_delete_owner"
  on public.expense_categories for delete
  using (public.get_business_role(business_id) = 'owner');

create table public.expenses (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  category_id uuid references public.expense_categories (id) on delete set null,
  amount numeric(12, 2) not null check (amount >= 0),
  description text,
  expense_date date not null default current_date,
  -- Defaults to the caller, and the insert policy below pins it to the
  -- caller too — a client can't attribute a record to someone else.
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.expenses enable row level security;

-- Expenses are owner/secretary territory only — the product spec doesn't
-- list expense visibility as a barber permission.
create policy "expenses_select_owner_secretary"
  on public.expenses for select
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "expenses_insert_owner_secretary"
  on public.expenses for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary')
    and created_by = auth.uid()
  );

-- No update/delete: same append-only rule as transactions.
