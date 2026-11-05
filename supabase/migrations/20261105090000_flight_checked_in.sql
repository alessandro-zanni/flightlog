-- A flight counts in stats and on the map once it has departed or once it is checked in. No airline
-- mails a "checked in" notice: the import marks it when a mail about a known leg arrives in the last
-- two days before departure (Ryanair resends the itinerary at check-in), see planChanges.
alter table public.flights add column checked_in boolean not null default false;

-- Same signature: a plan's update may now set checked_in; leaving it out keeps the stored value.
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
      checked_in = coalesce((u -> 'values' ->> 'checked_in')::boolean, f.checked_in)
  from jsonb_array_elements(p_update) u
  where f.id = (u ->> 'id')::bigint;

  insert into public.flights (date, origin, destination, airline, flight, pnr)
  select (i ->> 'date')::date, i ->> 'origin', i ->> 'destination', i ->> 'airline', i ->> 'flight', i ->> 'pnr'
  from jsonb_array_elements(p_insert) i
  on conflict (date, origin, destination, flight) do nothing;
end;
$$;
