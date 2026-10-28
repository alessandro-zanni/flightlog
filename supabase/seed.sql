-- Synthetic data for local and staging only: real flights go in with scripts/import-flights.ts.
insert into public.flights (date, origin, destination, airline, flight) values
  ('2024-03-01', 'BLQ', 'BCN', 'Ryanair', 'FR0001'),
  ('2024-03-05', 'BCN', 'BLQ', 'Ryanair', 'FR0002'),
  ('2025-07-10', 'MXP', 'JFK', 'Example Air', 'XX123');
