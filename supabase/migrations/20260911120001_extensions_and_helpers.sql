-- Required for gen_random_uuid(), used as the default for every primary key.
create extension if not exists pgcrypto;

-- Shared trigger function: keeps updated_at current on every row update.
-- Attached per-table below rather than duplicated.
create or replace function public.set_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;
