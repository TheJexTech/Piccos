create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses (id) on delete cascade,
  user_id uuid references auth.users (id),
  action text not null,
  entity_type text not null,
  entity_id uuid,
  old_values jsonb,
  new_values jsonb,
  reason text,
  created_at timestamptz not null default now()
);

alter table public.audit_logs enable row level security;

-- "Owner: full business access ... and audit information" — audit trail
-- visibility is owner-only.
create policy "audit_logs_select_owner"
  on public.audit_logs for select
  using (public.get_business_role(business_id) = 'owner');

-- No insert/update/delete policy for any client role: audit rows are
-- written by trusted server-side logic (a SECURITY DEFINER function, once
-- the M11 correction workflow exists) — never directly by a user, and
-- never edited or removed once written.
