-- Where a flight stands. "Flown" is not a status: a booked flight counts in stats and on the map once its
-- day comes, a checked-in one at once; missed (lost or skipped), denied (overbooking) and cancelled never do.
-- No airline mails a "checked in" notice: the import sets checked_in when a mail about a known leg arrives
-- in the last two days before departure (Ryanair resends the itinerary at check-in), see planChanges.
-- missed and denied are set by hand only, and the import leaves those rows alone.
create type public.flight_status as enum ('booked', 'checked_in', 'missed', 'denied', 'cancelled');

alter table public.flights add column status public.flight_status not null default 'booked';

-- Same signature: a plan's update may now set status; leaving it out keeps the stored value.
create or replace function public.apply_flight_plan(p_remove bigint[], p_update jsonb, p_insert jsonb)
returns void
language plpgsql
set search_path = ''
as $$
begin
  delete from public.flights where id = any (p_remove);

  update public.flights f
  set date = (u -> 'values' ->> 'date')::date,
      origin = u -> 'values' ->> 'origin',
      destination = u -> 'values' ->> 'destination',
      airline = u -> 'values' ->> 'airline',
      flight = u -> 'values' ->> 'flight',
      pnr = u -> 'values' ->> 'pnr',
      status = coalesce((u -> 'values' ->> 'status')::public.flight_status, f.status)
  from jsonb_array_elements(p_update) u
  where f.id = (u ->> 'id')::bigint;

  insert into public.flights (date, origin, destination, airline, flight, pnr)
  select (i ->> 'date')::date, i ->> 'origin', i ->> 'destination', i ->> 'airline', i ->> 'flight', i ->> 'pnr'
  from jsonb_array_elements(p_insert) i
  on conflict (date, origin, destination, flight) do nothing;
end;
$$;

-- The flight page sets the status by hand, next to the other user-facing columns.
grant update (status) on public.flights to authenticated;
