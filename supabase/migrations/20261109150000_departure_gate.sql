-- Gate of an imminent flight, from AeroDataBox: no mail states it. departure_checked_at throttles the lookups,
-- which spend a monthly free quota. The home page writes them with the owner's session, hence the grant.
alter table public.flights
  add column departure_gate text,
  add column departure_checked_at timestamptz;

grant update (departure_terminal, departure_gate, departure_checked_at) on public.flights to authenticated;
