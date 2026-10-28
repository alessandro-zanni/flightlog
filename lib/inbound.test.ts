import { expect, test } from "bun:test";
import { emailBody, htmlToText, toRows } from "./inbound";

test("toRows normalizes legs and drops invalid ones", () => {
  const rows = toRows([
    { date: "2026-07-15", from: "blq", to: "BCN ", airline: " Ryanair", flight: "FR 9369", pnr: "xxxxxx" },
    { date: "15/07/2026", from: "BLQ", to: "BCN", airline: "Ryanair", flight: null, pnr: null },
    { date: "2026-07-15", from: "Bologna", to: "BCN", airline: "Ryanair", flight: null, pnr: null },
    { date: "2026-07-15", from: "BLQ", to: "BLQ", airline: "Ryanair", flight: null, pnr: null },
    { date: "2026-07-15", from: "BLQ", to: "BCN", airline: "Ryanair", flight: "", pnr: "" },
  ]);
  expect(rows).toEqual([
    { date: "2026-07-15", origin: "BLQ", destination: "BCN", airline: "Ryanair", flight: "FR9369", pnr: "XXXXXX" },
    { date: "2026-07-15", origin: "BLQ", destination: "BCN", airline: "Ryanair", flight: null, pnr: null },
  ]);
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
