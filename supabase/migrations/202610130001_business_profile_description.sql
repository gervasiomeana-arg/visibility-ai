-- Add the confirmed business description without replacing existing data or policies.
alter table public.businesses add column if not exists description text;
