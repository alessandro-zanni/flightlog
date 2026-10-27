# Data sources and known limits

- `data/flights.json` is the source of truth for the app (one row per leg).
- Airports: OurAirports (public domain) -> `bun scripts/build-airports.ts <airports.csv>` -> `data/airports.json`.
- Flight emails: Google Takeout mbox -> `python3 -I scripts/mbox-flights.py <file.mbox> <out.jsonl>`.
- Approximations to replace with real data: hours use a flat 800 km/h; distances are great-circle.
- No Supabase/Vercel/shadcn yet: personal MVP without login. Add the database when flights must be
  entered from the UI or read from several devices (then follow `~/brain/resources/vercel-supabase-project-setup.md`).
- Flighty only imports unmodified exports of OpenFlights, myFlightRadar24, App in the Air, LogMyFlight,
  JetLovers and FlightMemory. Plan: generate an OpenFlights CSV, upload it to openflights.org, import the
  original export into Flighty (OpenFlights upload not verified yet). Without Pro: last 12 months only.
