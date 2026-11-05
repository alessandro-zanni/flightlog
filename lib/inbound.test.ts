import { expect, test } from "bun:test";
import type Anthropic from "@anthropic-ai/sdk";
import { applyMicrodata, emailBody, extractFlights, htmlToText, isCheckIn, planChanges, type Extraction } from "./inbound";

const row = (id: number, date: string, origin: string, destination: string, pnr: string | null, flight: string | null = null) => ({
  id, date, origin, destination, pnr, flight, airline: "Ryanair", created_at: "", status: "booked" as Row["status"],
});
type Row = Parameters<typeof planChanges>[0][number];
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

test("cancellation keeps only the matching leg of that booking, marked cancelled", () => {
  const existing = [row(1, "2026-11-04", "BCN", "BLQ", "ABC123"), row(2, "2026-11-11", "BLQ", "BCN", "ABC123"), row(3, "2026-11-04", "BCN", "BLQ", "OTHER1")];
  const cancel = { pnr: "ABC123", complete: true, legs: [leg("2026-11-04", "BCN", "BLQ"), leg("2026-11-11", "BLQ", "BCN", { status: "cancelled" })] };
  expect(planChanges(existing, cancel)).toEqual({
    insert: [],
    update: [{ id: 2, values: { date: "2026-11-11", origin: "BLQ", destination: "BCN", airline: "Ryanair", flight: null, pnr: "ABC123", status: "cancelled" } }],
    remove: [],
  });
  // Already cancelled: nothing to do. Confirmed again later: back to booked.
  const cancelled = [{ ...existing[1], status: "cancelled" as const }];
  expect(planChanges(cancelled, cancel).update).toEqual([]);
  expect(planChanges(cancelled, { pnr: "ABC123", complete: false, legs: [leg("2026-11-11", "BLQ", "BCN")] }).update).toEqual([
    { id: 2, values: { date: "2026-11-11", origin: "BLQ", destination: "BCN", airline: "Ryanair", flight: null, pnr: "ABC123", status: "booked" } },
  ]);
});

test("rows marked missed or denied by hand are left alone, a rebooking adds the new flight", () => {
  const existing = [{ ...row(1, "2026-11-11", "BLQ", "BCN", "ABC123", "FR2097"), status: "denied" as const }];
  const plan = planChanges(existing, {
    pnr: "ABC123",
    complete: true,
    legs: [leg("2026-11-11", "BLQ", "BCN", { flight: "FR2099", replaces: { date: "2026-11-11", from: "BLQ", to: "BCN" } })],
  }, "2026-11-11T09:00:00Z");
  expect(plan).toEqual({
    insert: [{ date: "2026-11-11", origin: "BLQ", destination: "BCN", airline: "Ryanair", flight: "FR2099", pnr: "ABC123" }],
    update: [],
    remove: [],
  });
  const missed = [{ ...existing[0], status: "missed" as const }];
  expect(planChanges(missed, { pnr: "ABC123", complete: true, legs: [leg("2026-11-11", "BLQ", "BCN", { status: "cancelled" })] })).toEqual({ insert: [], update: [], remove: [] });
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

test("a mail about a known leg in the last two days marks it checked in, the booking mail does not", () => {
  expect(isCheckIn("2026-11-03T17:48:39Z", "2026-11-04")).toBe(true); // YB6MUH resent at check-in
  expect(isCheckIn("2026-10-23T18:11:39Z", "2026-11-04")).toBe(false); // the booking itself
  expect(isCheckIn("Wed, 4 Nov 2026 05:10:00 +0100", "2026-11-04")).toBe(true); // morning of the flight
  expect(isCheckIn("2026-11-05T08:00:00Z", "2026-11-04")).toBe(false);
  expect(isCheckIn(undefined, "2026-11-04")).toBe(false);

  const existing = [row(1, "2026-11-04", "BCN", "BLQ", "YB6MUH", "FR575"), row(2, "2026-11-11", "BLQ", "BCN", "YB6MUH", "FR2097")];
  const ex: Extraction = { pnr: "YB6MUH", complete: true, legs: [leg("2026-11-04", "BCN", "BLQ", { flight: "FR575" }), leg("2026-11-11", "BLQ", "BCN", { flight: "FR2097" })] };
  expect(planChanges(existing, ex, "2026-11-03T17:48:39Z")).toEqual({
    insert: [],
    update: [{ id: 1, values: { date: "2026-11-04", origin: "BCN", destination: "BLQ", airline: "Ryanair", flight: "FR575", pnr: "YB6MUH", status: "checked_in" } }],
    remove: [],
  });
  expect(planChanges([{ ...existing[0], status: "checked_in" }], ex, "2026-11-03T17:48:39Z").update).toEqual([]);
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

test("htmlToText drops script and head blocks and survives an unclosed one", () => {
  expect(htmlToText("<head><title>x</title></head><p>A</p><script>1</script><p>B</p>")).toBe("A\nB");
  expect(htmlToText("<header>H</header>")).toBe("H");
  expect(htmlToText("<p>A</p><style>never closed " + "a".repeat(50_000))).toContain("A");
});

// Ryanair itinerary in Catalan (issue #7), trimmed: one FlightReservation per passenger and leg,
// flight number without the airline prefix, empty arrival codes. Fake PNR and passengers.
const reservation = (passenger: string, flight: string, from: string, departure: string) => `
<div itemscope itemtype="http://schema.org/FlightReservation">
  <meta itemprop="reservationNumber" content="QZ4KTP">
  <link itemprop="reservationStatus" href="http://schema.org/ReservationConfirmed">
  <div itemprop="underName" itemscope itemtype="http://schema.org/Person"><meta itemprop="name" content="${passenger}"></div>
  <div itemprop="reservationFor" itemscope itemtype="http://schema.org/Flight">
    <meta itemprop="flightNumber" content="${flight}">
    <div itemprop="airline" itemscope itemtype="http://schema.org/Airline"><meta itemprop="name" content="Ryanair"><meta itemprop="iataCode" content="FR"></div>
    <div itemprop="departureAirport" itemscope itemtype="http://schema.org/Airport"><meta itemprop="iataCode" content="${from}"></div>
    <meta itemprop="departureTime" content="${departure}">
    <div itemprop="arrivalAirport" itemscope itemtype="http://schema.org/Airport"><meta itemprop="iataCode" content=""></div>
  </div>
</div>`;
const catalanItinerary = `<!DOCTYPE html><html><body>
<h1>El teu itinerari</h1><p>Codi de reserva: QZ4KTP</p>
<h2>Vol d'anada</h2><p>A Bolonya</p><p>dc., 04 de nov. Barcelona 08:20 Bolonya 10:05 FR 575</p>
<h2>Vol de tornada</h2><p>A Barcelona</p><p>dc., 11 de nov. Bolonya 19:00 Barcelona 20:45 FR2097</p>
${["Alessandro Zanni", "Maria Rossi"].map((p) => reservation(p, "575", "BCN", "2026-11-04T08:20:00") + reservation(p, "2097", "BLQ", "2026-11-11T19:00:00")).join("")}
</body></html>`;

test("Ryanair microdata wins over a model that read the Catalan itinerary backwards", async () => {
  // What the model saved for the real booking: directions swapped, no flight numbers.
  const model: Extraction = { pnr: "QZ4KTP", complete: true, legs: [leg("2026-11-04", "BLQ", "BCN"), leg("2026-11-11", "BCN", "BLQ")] };
  const client = { messages: { create: async () => ({ stop_reason: "end_turn", content: [{ type: "text", text: JSON.stringify(model) }] }) } };
  // Ryanair sends the HTML as text/plain.
  const ex = await extractFlights({ from: "itinerary@ryanair.com", subject: "El teu itinerari", text: catalanItinerary }, client as unknown as Anthropic);
  expect(ex).toEqual({
    pnr: "QZ4KTP",
    complete: true,
    legs: [leg("2026-11-04", "BCN", "BLQ", { flight: "FR575" }), leg("2026-11-11", "BLQ", "BCN", { flight: "FR2097" })],
  });
  // Re-forwarding the mail fixes the wrong rows: the right legs go in, the swapped ones go.
  const plan = planChanges([row(1, "2026-11-04", "BLQ", "BCN", "QZ4KTP"), row(2, "2026-11-11", "BCN", "BLQ", "QZ4KTP")], ex);
  expect(plan.insert.map((r) => [r.date, r.origin, r.destination, r.flight])).toEqual([
    ["2026-11-04", "BCN", "BLQ", "FR575"],
    ["2026-11-11", "BLQ", "BCN", "FR2097"],
  ]);
  expect(plan.remove).toEqual([1, 2]);
});

test("microdata fills an empty arrival from the model's leg that day, not from the other leg", () => {
  const html = reservation("Alessandro Zanni", "FR 9369", "BLQ", "2026-12-06T07:00:00");
  const ex = applyMicrodata({ pnr: null, complete: false, legs: [leg("2026-12-06", "MLA", "BLQ")] }, html);
  expect(ex.legs).toEqual([leg("2026-12-06", "BLQ", "MLA", { flight: "FR9369" })]);
  // No legs from the model (not his flight, an offer): the markup alone adds nothing.
  expect(applyMicrodata({ pnr: null, complete: false, legs: [] }, html).legs).toEqual([]);
});
