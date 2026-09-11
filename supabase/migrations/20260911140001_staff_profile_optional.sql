-- M4: most barbers won't need a Piccos login of their own — staff is an
-- operational roster (name, station, status) managed by the owner/
-- secretary, independent of system access. business_members (already
-- optional per person) remains the separate concept of "who can log in
-- and with what role." A staff row can be linked to a login later if
-- that barber ever needs to see their own performance.
alter table public.staff
  alter column profile_id drop not null;
