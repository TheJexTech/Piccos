-- Correction pass 3: tips must be tracked separately from service revenue
-- (spec: tips must not be included in service revenue or estimated
-- operating profit). Adding these directly to transactions rather than a
-- new table keeps `amount` meaning "service revenue" exactly as it already
-- does everywhere it's summed today — nothing that reads `amount` needs to
-- change. tip_payment_method is only meaningful when tip_amount > 0, so it
-- stays nullable rather than forcing a default.

alter table public.transactions
  add column tip_amount numeric(12, 2) not null default 0 check (tip_amount >= 0);

alter table public.transactions
  add column tip_payment_method text
    check (tip_payment_method in ('cash', 'pos', 'bank_transfer', 'other'));
