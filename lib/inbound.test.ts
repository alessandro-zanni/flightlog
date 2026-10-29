import { expect, test } from "bun:test";
import { emailBody, htmlToText, planChanges, type Extraction } from "./inbound";

const row = (id: number, date: string, origin: string, destination: string, pnr: string | null, flight: string | null = null) => ({
  id, date, origin, destination, pnr, flight, airline: "Ryanair", created_at: "",
});
const leg = (date: string, from: string, to: string, extra: Partial<Extraction["legs"][number]> = {}) => ({
  date, from, to, airline: "Ryanair", flight: null, status: "confirmed" as const, replaces: null, ...extra,
});

test("new booking: legs normalized, invalid ones dropped", () => {
  const plan = planChanges([], {
    pnr: "abc123",
    complete: true,
    legs: [
      leg("2026-11-04", "bcn", "BLQ ", { flight: "FR 575" }),
      leg("04/11/2026", "BLQ", "BCN"),
      leg("2026-11-11", "Bologna", "BCN"),
      leg("2026-11-11", "BLQ", "BLQ"),
    ],
  });
  expect(plan).toEqual({
    insert: [{ date: "2026-11-04", origin: "BCN", destination: "BLQ", airline: "Ryanair", flight: "FR575", pnr: "ABC123" }],
    update: [],
    remove: [],
  });
});

test("cancellation removes only the matching leg of that booking", () => {
  const existing = [row(1, "2026-11-04", "BCN", "BLQ", "ABC123"), row(2, "2026-11-11", "BLQ", "BCN", "ABC123"), row(3, "2026-11-04", "BCN", "BLQ", "OTHER1")];
  const plan = planChanges(existing, { pnr: "ABC123", complete: false, legs: [leg("2026-11-11", "BLQ", "BCN", { status: "cancelled" })] });
  expect(plan).toEqual({ insert: [], update: [], remove: [2] });
});

test("schedule change moves the original leg instead of adding a second one", () => {
  const existing = [row(1, "2026-11-11", "BLQ", "BCN", "ABC123", "FR2097")];
  const plan = planChanges(existing, {
    pnr: "ABC123",
    complete: false,
    legs: [leg("2026-11-12", "BLQ", "BCN", { flight: "FR2099", replaces: { date: "2026-11-11", from: "BLQ", to: "BCN" } })],
  });
  expect(plan.update).toEqual([
    { id: 1, values: { date: "2026-11-12", origin: "BLQ", destination: "BCN", airline: "Ryanair", flight: "FR2099", pnr: "ABC123" } },
  ]);
  expect(plan.insert).toEqual([]);
  expect(plan.remove).toEqual([]);
});

test("complete itinerary is the booking's state: legs no longer listed go", () => {
  const existing = [
    row(1, "2026-11-04", "BCN", "BLQ", "ABC123", "FR575"),
    row(2, "2026-11-11", "BLQ", "BCN", "ABC123", "FR2097"),
    row(3, "2026-11-20", "BLQ", "MAD", "OTHER1"),
  ];
  const plan = planChanges(existing, {
    pnr: "ABC123",
    complete: true,
    legs: [leg("2026-11-04", "BCN", "BLQ", { flight: "FR575" }), leg("2026-11-13", "BLQ", "BCN", { flight: "FR2097" })],
  });
  expect(plan).toEqual({
    insert: [{ date: "2026-11-13", origin: "BLQ", destination: "BCN", airline: "Ryanair", flight: "FR2097", pnr: "ABC123" }],
    update: [],
    remove: [2],
  });
});

test("a leg entered by hand gets the PNR instead of a duplicate", () => {
  const plan = planChanges([row(7, "2026-11-04", "BCN", "BLQ", null)], { pnr: "ABC123", complete: true, legs: [leg("2026-11-04", "BCN", "BLQ")] });
  expect(plan.update).toEqual([{ id: 7, values: { date: "2026-11-04", origin: "BCN", destination: "BLQ", airline: "Ryanair", flight: null, pnr: "ABC123" } }]);
  expect(plan.insert).toEqual([]);
});

test("htmlToText keeps table cells apart and drops styles", () => {
  const text = htmlToText("<style>td{}</style><table><tr><td>BLQ</td><td>BCN</td></tr><tr><td>FR&nbsp;9369</td></tr></table>");
  expect(text).toBe("BLQ BCN\nFR 9369");
});

test("emailBody converts HTML sent as text/plain", () => {
  expect(emailBody({ from: "", subject: "", text: "<!DOCTYPE html><html><body><p>FR2097</p></body></html>" })).toBe("FR2097");
  expect(emailBody({ from: "", subject: "", text: "Plain itinerary", html: "<p>x</p>" })).toBe("Plain itinerary");
  expect(emailBody({ from: "", subject: "", html: "<p>Only html</p>" })).toBe("Only html");
});
