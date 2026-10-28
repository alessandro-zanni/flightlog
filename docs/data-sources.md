# Data sources and known limits

- The `flights` table in Supabase is the source of truth (one row per leg). `data/flights.json` is the
  hand-curated import file: `bun run db:import` loads it, skipping legs already present (unique on
  date + route + flight number).
- Airports: OurAirports (public domain) -> `bun scripts/build-airports.ts <airports.csv>` -> `data/airports.json`.
- Flight emails: Google Takeout mbox -> `python3 -I scripts/mbox-flights.py <file.mbox> <out.jsonl>`.
- Approximations to replace with real data: hours use a flat 800 km/h; distances are great-circle.
- Flighty only imports unmodified exports of OpenFlights, myFlightRadar24, App in the Air, LogMyFlight,
  JetLovers and FlightMemory. Plan: generate an OpenFlights CSV, upload it to openflights.org, import the
  original export into Flighty (OpenFlights upload not verified yet). Without Pro: last 12 months only.
