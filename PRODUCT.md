# Product

<!-- impeccable:product-schema 1 -->

## Platform

web

## Users

One person: the owner, Alessandro. A frequent short-haul flyer (mostly low-cost carriers in Europe) who
wants a complete record of every flight taken since 2015. He uses the app on the phone as much as on the
desktop, and there is no native app.

He opens it to:

- look back at the history: the map, the totals (flights, distance, hours, airports, countries, airlines);
- check upcoming flights that arrived from booking emails: dates, routes, booking references;
- show the map and numbers to friends, on his own phone, in person;
- fix the data by hand when the email import gets something wrong: add, edit or delete a flight.

## Product Purpose

A personal flight log in the spirit of Been: where I have flown, how much, and what is next. Success means
the record is complete and correct without manual bookkeeping, and that looking at it is a pleasure.

## Positioning

The log fills itself: booking confirmations forwarded from Gmail are read by an AI model, and new bookings,
changes and cancellations update the right flight by booking reference. No live tracking and no paid flight
APIs, by choice: it is a history, not a flight tracker like Flighty.

## Operating Context

- Flights arrive by email, usually without opening the app; the app is where the result is checked.
- A failed import bounces back to Gmail with the reason, so the app does not need to report import errors.
- The historical data was reconstructed from old mailboxes; some trips are still missing or unverified, so
  manual correction is a normal, recurring task, not an edge case.

## Capabilities and Constraints

- Private: one user behind an email and password login, no sign-up. A public read-only link was considered
  and deliberately not planned (it would expose where and when the owner travels); revisit only on request.
- Data per flight: date, origin and destination (IATA codes), airline, flight number, booking reference
  (PNR). Airports come from a bundled OurAirports dataset (city, country, coordinates).
- Upcoming and past flights live in the same table; "upcoming" is any flight dated after today.
- Interface language follows the user's browser: English and Italian, with dates and numbers formatted for
  that locale. Code and identifiers stay in English.
- Stack: Next.js 16 App Router, React 19, Tailwind v4, Supabase; deployed on Vercel.

## Evidence on Hand

- Real data: about a decade of flights in Supabase (prod), seeded locally from `data/flights.json`.
- Airport dataset: `data/airports.json`.
- No logo, brand assets or imagery exist yet. No testimonials or third-party users: none to invent.

## Product Principles

1. The record is the product: completeness and correctness come before decoration.
2. Glanceable on a phone: the history and the next flight read in seconds, one-handed.
3. Proud to show: the map and totals should feel like something worth handing a phone across the table for.
4. Corrections are first-class: editing a flight is quick and safe, never a buried admin task.
5. Private by default: nothing about the owner's travel leaves the login.
