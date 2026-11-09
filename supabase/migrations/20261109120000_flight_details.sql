-- Departure time and terminal, read from the imported mails. Nullable: older flights have neither and many
-- mails name no terminal. The time is local to the origin airport.
alter table public.flights
  add column departure_time time,
  add column departure_terminal text;

-- Same signature: a plan may now carry the two details; leaving them out keeps the stored values.
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
      status = coalesce((u -> 'values' ->> 'status')::public.flight_status, f.status),
      departure_time = coalesce((u -> 'values' ->> 'departure_time')::time, f.departure_time),
      departure_terminal = coalesce(u -> 'values' ->> 'departure_terminal', f.departure_terminal)
  from jsonb_array_elements(p_update) u
  where f.id = (u ->> 'id')::bigint;

  insert into public.flights (date, origin, destination, airline, flight, pnr, departure_time, departure_terminal)
  select (i ->> 'date')::date, i ->> 'origin', i ->> 'destination', i ->> 'airline', i ->> 'flight', i ->> 'pnr',
         (i ->> 'departure_time')::time, i ->> 'departure_terminal'
  from jsonb_array_elements(p_insert) i
  on conflict (date, origin, destination, flight) do nothing;
end;
$$;
