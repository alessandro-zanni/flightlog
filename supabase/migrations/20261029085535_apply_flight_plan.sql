-- Applies the plan computed by planChanges (lib/inbound.ts) in one transaction: a mail either
-- changes the booking completely or not at all. Called by /api/inbound with the secret key.
create function public.apply_flight_plan(p_remove bigint[], p_update jsonb, p_insert jsonb)
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
      pnr = u -> 'values' ->> 'pnr'
  from jsonb_array_elements(p_update) u
  where f.id = (u ->> 'id')::bigint;

  insert into public.flights (date, origin, destination, airline, flight, pnr)
  select (i ->> 'date')::date, i ->> 'origin', i ->> 'destination', i ->> 'airline', i ->> 'flight', i ->> 'pnr'
  from jsonb_array_elements(p_insert) i
  on conflict (date, origin, destination, flight) do nothing;
end;
$$;

-- Functions are executable by everyone by default: only the server (secret key) may call this.
revoke execute on function public.apply_flight_plan from public, anon, authenticated;
grant execute on function public.apply_flight_plan to service_role;
