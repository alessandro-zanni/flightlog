import Anthropic from "@anthropic-ai/sdk";
import type { TablesInsert } from "@/lib/database.types";

// What the Cloudflare Email Worker posts to /api/inbound.
export type InboundEmail = { from: string; subject: string; date?: string; text?: string; html?: string };

type Extracted = { date: string; from: string; to: string; airline: string; flight: string | null; pnr: string | null };

const SCHEMA = {
  type: "object",
  properties: {
    flights: {
      type: "array",
      items: {
        type: "object",
        properties: {
          date: { type: "string", description: "Local departure date, YYYY-MM-DD" },
          from: { type: "string", description: "Departure airport IATA code" },
          to: { type: "string", description: "Arrival airport IATA code" },
          airline: { type: "string", description: "Operating airline name, e.g. Ryanair" },
          flight: { type: ["string", "null"], description: "Flight number, e.g. FR1234" },
          pnr: { type: ["string", "null"], description: "Booking reference" },
        },
        required: ["date", "from", "to", "airline", "flight", "pnr"],
        additionalProperties: false,
      },
    },
  },
  required: ["flights"],
  additionalProperties: false,
};

const SYSTEM = `You read one email forwarded by Alessandro Zanni and list the flight legs he is booked on.
- One entry per leg: a return trip is two entries, a connection is one entry per segment.
- Only legs with Alessandro Zanni among the passengers. If the email names no passengers, assume he is one.
- Skip legs the email says are cancelled or replaced, and anything that is not a confirmed booking
  (offers, abandoned carts, price alerts, newsletters, check-in reminders without the itinerary).
- Use the local departure date. Airports as 3-letter IATA codes.
- No flights in the email: return an empty list.`;

// ponytail: regex tag strip, enough for airline itineraries; use a real HTML parser if tables come out garbled
export function htmlToText(html: string): string {
  return html
    .replace(/<(style|script|head)[\s\S]*?<\/\1>/gi, " ")
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d)[^>]*>/gi, "\n")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/ *\n */g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Ryanair labels its HTML as text/plain: treat any HTML-looking part as HTML.
export function emailBody(email: InboundEmail): string {
  const text = email.text?.trim() ?? "";
  if (text && !/^<!DOCTYPE|<html[\s>]/i.test(text.slice(0, 500))) return text;
  return htmlToText(text || email.html || "");
}

// Model output -> DB rows; legs that would fail the table's checks are dropped, not the whole email.
export function toRows(flights: Extracted[]): TablesInsert<"flights">[] {
  const iata = /^[A-Z]{3}$/;
  return flights
    .map((f) => ({
      date: f.date,
      origin: f.from.trim().toUpperCase(),
      destination: f.to.trim().toUpperCase(),
      airline: f.airline.trim(),
      flight: f.flight?.replace(/\s+/g, "").toUpperCase() || null,
      pnr: f.pnr?.trim().toUpperCase() || null,
    }))
    .filter(
      (r) =>
        /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
        !Number.isNaN(Date.parse(r.date)) &&
        iata.test(r.origin) &&
        iata.test(r.destination) &&
        r.origin !== r.destination &&
        r.airline !== "",
    );
}

export async function extractFlights(email: InboundEmail, client = new Anthropic()): Promise<Extracted[]> {
  const body = emailBody(email);
  const response = await client.messages.create({
    model: "claude-haiku-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `From: ${email.from}\nDate: ${email.date ?? "unknown"}\nSubject: ${email.subject}\n\n${body}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error(`Extraction refused: ${response.stop_details?.category}`);
  if (response.stop_reason === "max_tokens") throw new Error("Extraction cut off at max_tokens");
  const text = response.content.find((b) => b.type === "text");
  if (!text) throw new Error("Extraction returned no text");
  return (JSON.parse(text.text) as { flights: Extracted[] }).flights;
}
