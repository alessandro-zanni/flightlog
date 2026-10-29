-- The app edits a flight on its own page: only the user-facing columns, never id or created_at.
grant update (date, origin, destination, airline, flight, pnr) on public.flights to authenticated;
