import Anthropic from "@anthropic-ai/sdk";
import type { Tables, TablesInsert, TablesUpdate } from "@/lib/database.types";

// What the Cloudflare Email Worker posts to /api/inbound.
export type InboundEmail = { from: string; subject: string; date?: string; text?: string; html?: string };

type Route = { date: string; from: string; to: string };
type Leg = Route & {
  airline: string;
  flight: string | null;
  status: "confirmed" | "cancelled";
  replaces: Route | null;
};
export type Extraction = { pnr: string | null; complete: boolean; legs: Leg[] };

type Row = Tables<"flights">;
export type Plan = { insert: TablesInsert<"flights">[]; update: { id: number; values: TablesUpdate<"flights"> }[]; remove: number[] };

const ROUTE = {
  date: { type: "string", description: "Local departure date, YYYY-MM-DD" },
  from: { type: "string", description: "Departure airport IATA code" },
  to: { type: "string", description: "Arrival airport IATA code" },
};

const SCHEMA = {
  type: "object",
  properties: {
    pnr: { type: ["string", "null"], description: "Booking reference" },
    complete: {
      type: "boolean",
      description: "True if the email lists every current leg of the booking (a full itinerary or confirmation)",
    },
    legs: {
      type: "array",
      items: {
        type: "object",
        properties: {
          ...ROUTE,
          airline: { type: "string", description: "Operating airline name, e.g. Ryanair" },
          flight: { type: ["string", "null"], description: "Flight number, e.g. FR1234" },
          status: { type: "string", enum: ["confirmed", "cancelled"] },
          replaces: {
            anyOf: [
              { type: "null" },
              { type: "object", properties: ROUTE, required: ["date", "from", "to"], additionalProperties: false },
            ],
            description: "For a changed leg: the original leg it replaces",
          },
        },
        required: ["date", "from", "to", "airline", "flight", "status", "replaces"],
        additionalProperties: false,
      },
    },
  },
  required: ["pnr", "complete", "legs"],
  additionalProperties: false,
};

const SYSTEM = `You read one email forwarded by Alessandro Zanni about his flights: a booking confirmation,
an itinerary, a schedule change or a cancellation. List the legs it is about.
- One entry per leg: a return trip is two entries, a connection is one entry per segment.
- Only legs with Alessandro Zanni among the passengers. If the email names no passengers, assume he is one.
- status "cancelled" for legs the email cancels. For a leg moved to another time, date or route, give the new
  leg as "confirmed" with "replaces" set to the original leg when the email states it.
- complete = true only if the email lists every current leg of the booking (confirmations and itineraries do;
  a notice about one changed or cancelled leg does not).
- Offers, abandoned carts, price alerts, newsletters, check-in reminders without the itinerary: no legs.
- Use the local departure date. Airports as 3-letter IATA codes.`;

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

const code = (s: string) => s.trim().toUpperCase();
const validRoute = (r: Route) =>
  /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
  !Number.isNaN(Date.parse(r.date)) &&
  /^[A-Z]{3}$/.test(code(r.from)) &&
  /^[A-Z]{3}$/.test(code(r.to)) &&
  code(r.from) !== code(r.to);
const sameRoute = (row: Row, r: Route) =>
  row.date === r.date && row.origin === code(r.from) && row.destination === code(r.to);

// Model output + the rows it may touch -> what to write. Legs that would fail the table's checks are
// dropped, not the whole email. A complete itinerary is the booking's current state: its other legs go.
export function planChanges(existing: Row[], ex: Extraction): Plan {
  const pnr = ex.pnr?.trim().toUpperCase() || null;
  // A row belongs to this booking if it has the same PNR, or no PNR at all (entered by hand).
  const candidates = existing.filter((r) => !pnr || r.pnr === pnr || r.pnr === null);
  const plan: Plan = { insert: [], update: [], remove: [] };
  const kept = new Set<number>();

  for (const leg of ex.legs) {
    if (!validRoute(leg) || !leg.airline.trim()) continue;
    const values = {
      date: leg.date,
      origin: code(leg.from),
      destination: code(leg.to),
      airline: leg.airline.trim(),
      flight: leg.flight?.replace(/\s+/g, "").toUpperCase() || null,
      pnr,
    };
    const current = candidates.find((r) => sameRoute(r, leg));

    if (leg.status === "cancelled") {
      if (current) plan.remove.push(current.id);
      continue;
    }
    const replaced = leg.replaces && validRoute(leg.replaces) ? candidates.find((r) => sameRoute(r, leg.replaces!)) : undefined;
    const target = current ?? replaced;
    if (!target) {
      plan.insert.push(values);
      continue;
    }
    kept.add(target.id);
    const changed = (Object.keys(values) as (keyof typeof values)[]).some((k) => values[k] !== null && values[k] !== target[k]);
    if (changed) plan.update.push({ id: target.id, values });
  }

  if (ex.complete && pnr) {
    for (const r of existing) if (r.pnr === pnr && !kept.has(r.id) && !plan.remove.includes(r.id)) plan.remove.push(r.id);
  }
  return plan;
}

// Every date the extraction mentions: the rows planChanges may need, besides those with the same PNR.
export function mentionedDates(ex: Extraction): string[] {
  const dates = ex.legs.flatMap((l) => [l.date, l.replaces?.date ?? ""]);
  return [...new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))];
}

export async function extractFlights(email: InboundEmail, client = new Anthropic()): Promise<Extraction> {
  const response = await client.messages.create({
    model: "claude-haiku-5-5",
    max_tokens: 16000,
    output_config: { effort: "low", format: { type: "json_schema", schema: SCHEMA } },
    system: SYSTEM,
    messages: [
      {
        role: "user",
        content: `From: ${email.from}\nDate: ${email.date ?? "unknown"}\nSubject: ${email.subject}\n\n${emailBody(email)}`,
      },
    ],
  });
  if (response.stop_reason === "refusal") throw new Error(`Extraction refused: ${response.stop_details?.category}`);
  if (response.stop_reason === "max_tokens") throw new Error("Extraction cut off at max_tokens");
  const text = response.content.find((b) => b.type === "text");
  if (!text) throw new Error("Extraction returned no text");
  return JSON.parse(text.text) as Extraction;
}
