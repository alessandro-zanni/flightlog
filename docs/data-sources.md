# Data sources and known limits

- The `flights` table in Supabase is the source of truth (one row per leg). `data/flights.json` is the
  hand-curated import file: `bun run db:import` loads it, skipping legs already present (unique on
  date + route + flight number).
- Airports: OurAirports (public domain) plus the IANA timezone from OpenFlights `airports.dat` ->
  `bun scripts/build-airports.ts <airports.csv> [airports.dat]` -> `data/airports.json`. About 540 airports have
  no timezone: their flights show no duration.
- Flight emails: Google Takeout mbox -> `python3 -I scripts/mbox-flights.py <file.mbox> <out.jsonl>`.
- Departure details: the time comes from the mails. The terminal comes from the mails where stated (easyJet, not
  Ryanair) and from AeroDataBox (RapidAPI free plan, 400 units a month, no commercial use). The gate comes only
  from AeroDataBox, looked up when the home page loads, for flights leaving within 6 hours, at most every 30
  minutes, until a gate is found. Coverage varies: on 2026-11-09 BCN had a gate and terminal, BLQ had neither
  hours before departure. The departure window uses the origin airport's timezone (Rome if unknown).
- Arrival details: time and terminal from the mails (Ryanair microdata, the model for the others) or typed by
  hand; the AeroDataBox answer fetched for the departure gate also brings arrival terminal, gate and scheduled
  time (filling only a missing time), at no extra quota. The arrival gate is often unknown before departure.
  No arrival date is stored: an arrival not after the departure is the next day.
- Duration: local departure and arrival times converted with the two airports' timezones. Stats hours use it
  where known and fall back to a flat 800 km/h; distances are great-circle.
- Flighty only imports unmodified exports of OpenFlights, myFlightRadar24, App in the Air, LogMyFlight,
  JetLovers and FlightMemory. Plan: generate an OpenFlights CSV, upload it to openflights.org, import the
  original export into Flighty (OpenFlights upload not verified yet). Without Pro: last 12 months only.
