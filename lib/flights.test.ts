import { expect, test } from "bun:test";
import { counts, distanceKm, durationMin, filterFlights, stats } from "./flights";

const db = {
  BLQ: { name: "Bologna", city: "Bologna", country: "IT", lat: 44.5354, lon: 11.2887, tz: "Europe/Rome" },
  BCN: { name: "Barcelona", city: "Barcelona", country: "ES", lat: 41.2971, lon: 2.0785, tz: "Europe/Madrid" },
  LHR: { name: "Heathrow", city: "London", country: "GB", lat: 51.47, lon: -0.4543, tz: "Europe/London" },
  JFK: { name: "John F. Kennedy", city: "New York", country: "US", lat: 40.6398, lon: -73.7789, tz: "America/New_York" },
  XXX: { name: "No tz", city: "Nowhere", country: "IT", lat: 44, lon: 11 },
};

test("BLQ-BCN is about 800 km", () => {
  expect(Math.round(distanceKm(db.BLQ, db.BCN) / 100)).toBe(8);
});

test("stats counts airports, countries and airlines", () => {
  const s = stats(
    [
      { date: "2026-01-01", from: "BLQ", to: "BCN", airline: "Ryanair" },
      { date: "2026-01-05", from: "BCN", to: "BLQ", airline: "Vueling" },
    ],
    db,
  );
  expect(s).toMatchObject({ flights: 2, airports: 2, countries: 2, airlines: 2 });
});

test("filterFlights combines year, airline, when and search", () => {
  const list = [
    { date: "2025-03-01", from: "BLQ", to: "BCN", airline: "Ryanair", flight: "FR 1234" },
    { date: "2026-12-01", from: "BCN", to: "BLQ", airline: "Vueling", flight: "VY6413" },
  ];
  const run = (f: Parameters<typeof filterFlights>[1]) => filterFlights(list, f, "2026-11-02", db).map((x) => x.flight);
  expect(run({})).toEqual(["FR 1234", "VY6413"]);
  expect(run({ year: "2025" })).toEqual(["FR 1234"]);
  expect(run({ airline: "Vueling" })).toEqual(["VY6413"]);
  expect(run({ when: "upcoming" })).toEqual(["VY6413"]);
  expect(run({ when: "past" })).toEqual(["FR 1234"]);
  expect(run({ q: "blq-bcn" })).toEqual(["FR 1234"]);
  expect(run({ q: "Barcelona" })).toEqual(["FR 1234", "VY6413"]);
  expect(run({ q: "fr1234" })).toEqual(["FR 1234"]);
  expect(run({ q: "vy 6413" })).toEqual(["VY6413"]);
  expect(run({ q: "bcn", when: "past" })).toEqual(["FR 1234"]);
  expect(run({ q: "lhr" })).toEqual([]);
});

test("a flight counts once checked in or once its day comes, never if missed, denied or cancelled", () => {
  const f = (date: string, status?: Parameters<typeof counts>[0]["status"]) => counts({ date, from: "BLQ", to: "BCN", airline: "Ryanair", status }, "2026-11-05");
  expect([f("2026-11-04"), f("2026-11-05", "booked"), f("2026-11-06", "booked"), f("2026-11-06", "checked_in")]).toEqual([true, true, false, true]);
  expect([f("2026-11-04", "missed"), f("2026-11-04", "denied"), f("2026-11-04", "cancelled")]).toEqual([false, false, false]);
});

test("durationMin uses both airports' timezones and rolls overnight arrivals to the next day", () => {
  const d = (from: string, to: string, time?: string, arrivalTime?: string, date = "2026-07-01") =>
    durationMin({ date, from, to, airline: "X", time, arrivalTime }, db);
  expect(d("BLQ", "BCN", "08:10", "10:15")).toBe(125);
  expect(d("BLQ", "LHR", "10:00", "11:15")).toBe(135);
  expect(d("BLQ", "LHR", "10:00", "11:15", "2026-01-15")).toBe(135);
  expect(d("JFK", "BLQ", "17:30", "07:45")).toBe(495);
  expect([d("BLQ", "XXX", "08:00", "09:00"), d("BLQ", "BCN", "08:00"), d("BLQ", "BCN", undefined, "09:00")]).toEqual([undefined, undefined, undefined]);
});

test("stats hours mix real durations and the 800 km/h estimate", () => {
  const km = distanceKm(db.BLQ, db.BCN);
  const s = stats(
    [
      { date: "2026-01-01", from: "BLQ", to: "BCN", airline: "Ryanair", time: "08:10", arrivalTime: "18:10" },
      { date: "2026-01-05", from: "BCN", to: "BLQ", airline: "Vueling" },
    ],
    db,
  );
  expect(s.hours).toBe(Math.round(10 + km / 800));
});
