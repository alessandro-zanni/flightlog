import { expect, test } from "bun:test";
import { distanceKm, stats } from "./flights";

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
