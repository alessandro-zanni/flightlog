import { afterEach, expect, test } from "bun:test";
import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "./database.types";
import { departureOf, needsDepartureCheck, refreshDepartures } from "./departure";
import type { Flight } from "./flights";

// 12:00 in Rome on 9 November (UTC+1).
const noon = new Date("2026-11-09T11:00:00Z");
const flight = (extra: Partial<Flight> = {}): Flight & { id: number } => ({ id: 1, date: "2026-11-09", from: "BCN", to: "BLQ", airline: "Ryanair", flight: "FR575", time: "14:00:00", ...extra });

test("only flights about to leave, without a gate, not checked in the last half hour", () => {
  expect(needsDepartureCheck(flight(), noon)).toBe(true);
  expect(needsDepartureCheck(flight({ time: "19:00:00" }), noon)).toBe(false);
  expect(needsDepartureCheck(flight({ time: "11:00:00" }), noon)).toBe(false);
  expect(needsDepartureCheck(flight({ gate: "U34" }), noon)).toBe(false);
  expect(needsDepartureCheck(flight({ flight: null }), noon)).toBe(false);
  expect(needsDepartureCheck(flight({ status: "cancelled" }), noon)).toBe(false);
  expect(needsDepartureCheck(flight({ checkedAt: "2026-11-09T10:45:00Z" }), noon)).toBe(false);
  expect(needsDepartureCheck(flight({ checkedAt: "2026-11-09T10:15:00Z" }), noon)).toBe(true);
  // No time stored: the whole day of the flight, and no other.
  expect(needsDepartureCheck(flight({ time: null }), noon)).toBe(true);
  expect(needsDepartureCheck(flight({ time: null, date: "2026-11-10" }), noon)).toBe(false);
});

test("the leg leaving this airport, not another one with the same number", () => {
  const legs = [
    { departure: { airport: { iata: "BLQ" }, gate: "A1" } },
    { departure: { airport: { iata: "BCN" }, terminal: "2", gate: "U34" } },
  ];
  expect(departureOf(legs, "BCN")).toMatchObject({ terminal: "2", gate: "U34" });
  expect(departureOf(legs, "MLA")).toMatchObject({ terminal: undefined, gate: undefined });
});

const originalFetch = globalThis.fetch;
afterEach(() => {
  globalThis.fetch = originalFetch;
  delete process.env.AERODATABOX_API_KEY;
});

function fakeSupabase() {
  const saved: unknown[] = [];
  const client = { from: () => ({ update: (values: unknown) => ({ eq: async () => (saved.push(values), { error: null }) }) }) };
  return { saved, client: client as unknown as SupabaseClient<Database> };
}

test("a found gate is saved and returned; a stored terminal survives an answer without one", async () => {
  process.env.AERODATABOX_API_KEY = "k";
  globalThis.fetch = (async () => Response.json([{ departure: { airport: { iata: "BCN" }, gate: "U34" } }])) as unknown as typeof fetch;
  const { saved, client } = fakeSupabase();
  const [f] = await refreshDepartures(client, [flight({ terminal: "2" })], noon);
  expect(f).toMatchObject({ gate: "U34", terminal: "2", checkedAt: noon.toISOString() });
  expect(saved).toEqual([{ departure_checked_at: noon.toISOString(), departure_gate: "U34" }]);
});

test("a failing API leaves the flight as it was but still counts as a check", async () => {
  process.env.AERODATABOX_API_KEY = "k";
  globalThis.fetch = (async () => new Response(null, { status: 429 })) as unknown as typeof fetch;
  const { saved, client } = fakeSupabase();
  const [f] = await refreshDepartures(client, [flight()], noon);
  expect(f.gate).toBeUndefined();
  expect(saved).toEqual([{ departure_checked_at: noon.toISOString() }]);
});

test("no key, or no flight due: no call at all", async () => {
  let calls = 0;
  globalThis.fetch = (async () => (calls++, new Response(null, { status: 204 }))) as unknown as typeof fetch;
  const { client } = fakeSupabase();
  await refreshDepartures(client, [flight()], noon);
  process.env.AERODATABOX_API_KEY = "k";
  await refreshDepartures(client, [flight({ time: "19:00:00" })], noon);
  expect(calls).toBe(0);
  await refreshDepartures(client, [flight()], noon);
  expect(calls).toBe(1);
});

test("the arrival comes from the same answer; a time from the mail is kept", async () => {
  process.env.AERODATABOX_API_KEY = "k";
  const arrival = { airport: { iata: "BLQ" }, terminal: "1", gate: "B3", scheduledTime: { local: "2026-11-09 15:50+01:00" } };
  globalThis.fetch = (async () => Response.json([{ departure: { airport: { iata: "BCN" } }, arrival }])) as unknown as typeof fetch;
  const { saved, client } = fakeSupabase();
  const [f] = await refreshDepartures(client, [flight()], noon);
  expect(f).toMatchObject({ arrivalTerminal: "1", arrivalGate: "B3", arrivalTime: "15:50:00" });
  expect(saved[0]).toMatchObject({ arrival_terminal: "1", arrival_gate: "B3", arrival_time: "15:50:00" });
  const [g] = await refreshDepartures(client, [flight({ arrivalTime: "15:45:00" })], noon);
  expect(g.arrivalTime).toBe("15:45:00");
  expect(saved[1]).not.toContainKey("arrival_time");
});

test("the departure window uses the origin's timezone", () => {
  // 14:00 in New York is 19:00 UTC, 8 hours after noon in Rome: outside the 6-hour window.
  expect(needsDepartureCheck(flight({ from: "JFK" }), noon)).toBe(false);
  expect(needsDepartureCheck(flight({ from: "JFK", time: "09:00:00" }), noon)).toBe(true);
});
