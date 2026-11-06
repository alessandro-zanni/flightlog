import { expect, test } from "bun:test";
import { counts, distanceKm, filterFlights, stats } from "./flights";

const db = {
  BLQ: { name: "Bologna", city: "Bologna", country: "IT", lat: 44.5354, lon: 11.2887 },
  BCN: { name: "Barcelona", city: "Barcelona", country: "ES", lat: 41.2971, lon: 2.0785 },
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
