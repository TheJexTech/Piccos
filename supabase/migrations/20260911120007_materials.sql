create table public.materials (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  name text not null,
  unit text not null,
  current_quantity numeric(12, 2) not null default 0,
  minimum_quantity numeric(12, 2) not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.materials enable row level security;

create trigger set_materials_updated_at
  before update on public.materials
  for each row execute function public.set_updated_at();

create policy "materials_select_members"
  on public.materials for select
  using (public.is_business_member(business_id));

create policy "materials_insert_owner_secretary"
  on public.materials for insert
  with check (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "materials_update_owner_secretary"
  on public.materials for update
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "materials_delete_owner"
  on public.materials for delete
  using (public.get_business_role(business_id) = 'owner');

create table public.material_purchases (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  material_id uuid not null references public.materials (id) on delete cascade,
  quantity numeric(12, 2) not null check (quantity > 0),
  unit_cost numeric(12, 2) not null check (unit_cost >= 0),
  total_cost numeric(12, 2) not null check (total_cost >= 0),
  supplier text,
  purchase_date date not null default current_date,
  -- Defaults to the caller, and the insert policy below pins it to the
  -- caller too — a client can't attribute a record to someone else.
  created_by uuid not null references auth.users (id) default auth.uid(),
  created_at timestamptz not null default now()
);

alter table public.material_purchases enable row level security;

-- Purchase cost is financial data — owner/secretary only, same as expenses.
create policy "material_purchases_select_owner_secretary"
  on public.material_purchases for select
  using (public.get_business_role(business_id) in ('owner', 'secretary'));

create policy "material_purchases_insert_owner_secretary"
  on public.material_purchases for insert
  with check (
    public.get_business_role(business_id) in ('owner', 'secretary')
    and created_by = auth.uid()
  );

-- No update/delete: purchase history is append-only, same rule as
-- transactions/expenses. Stock-quantity math (M8) reads this history
-- rather than mutating it.
