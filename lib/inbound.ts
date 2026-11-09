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
// Drops <style>, <script> and <head> blocks in one linear pass: a lazy regex backtracks on an unclosed tag.
function dropBlocks(html: string): string {
  const lower = html.toLowerCase();
  let out = "";
  let i = 0;
  for (const m of lower.matchAll(/<(style|script|head)[\s>]/g)) {
    if (m.index < i) continue;
    const close = `</${m[1]}>`;
    const end = lower.indexOf(close, m.index);
    if (end < 0) break;
    out += html.slice(i, m.index) + " ";
    i = end + close.length;
  }
  return out + html.slice(i);
}

export function htmlToText(html: string): string {
  return dropBlocks(html)
    .replace(/<(br|\/p|\/div|\/tr|\/li|\/h\d)[^<>]*>/gi, "\n")
    .replace(/<[^<>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&#(\d+);/g, (_, n) => String.fromCodePoint(Number(n)))
    .replace(/[ \t]+/g, " ")
    .replace(/ ?\n ?/g, "\n")
    .replace(/\n{2,}/g, "\n")
    .trim();
}

// Ryanair labels its HTML as text/plain: treat any HTML-looking part as HTML.
const looksHtml = (s: string) => /(^<!DOCTYPE)|(<html[\s>])/i.test(s.slice(0, 500));

export function emailHtml(email: InboundEmail): string {
  const text = email.text?.trim() ?? "";
  return looksHtml(text) ? text : (email.html ?? "");
}

export function emailBody(email: InboundEmail): string {
  const text = email.text?.trim() ?? "";
  return text && !looksHtml(text) ? text : htmlToText(emailHtml(email));
}

const code = (s: string) => s.trim().toUpperCase();

// schema.org FlightReservation microdata, as in Ryanair itineraries: codes and times, whatever the
// mail's language. The model once read a Catalan itinerary backwards (issue #7); these win over it.
type MicroLeg = { date: string; from: string; to: string; flight: string | null; airline: string; status: Leg["status"] | null };

const attr = (tag: string, name: string) => new RegExp(String.raw`\s${name}=["']([^"']*)["']`, "i").exec(tag)?.[1];

// itemprop -> value for one reservation. iataCode and name are keyed by the item they belong to
// (departureAirport.iataCode): the last itemprop that opened an itemscope.
function reservationProps(chunk: string): Map<string, string> {
  const props = new Map<string, string>();
  let scope = "";
  for (const m of chunk.matchAll(/<[^<>]*\sitemprop=["']([^"']+)["'][^<>]*>/gi)) {
    const [tag, name] = m;
    if (/\sitemscope[\s=>]/i.test(tag)) {
      scope = name;
      continue;
    }
    const key = name === "iataCode" || name === "name" ? `${scope}.${name}` : name;
    const text = /^[^<]*/.exec(chunk.slice(m.index + tag.length))![0];
    if (!props.has(key)) props.set(key, (attr(tag, "content") ?? attr(tag, "href") ?? text).trim());
  }
  return props;
}

function microLeg(p: Map<string, string>): MicroLeg | null {
  const date = p.get("departureTime")?.slice(0, 10) ?? "";
  const from = code(p.get("departureAirport.iataCode") ?? "");
  if (!date || !from) return null;
  const number = (p.get("flightNumber") ?? "").replace(/\s+/g, "").toUpperCase();
  const prefix = /^\d+$/.test(number) ? code(p.get("airline.iataCode") ?? "") : "";
  const status = p.get("reservationStatus");
  let legStatus: MicroLeg["status"] = null;
  if (status) legStatus = /cancel/i.test(status) ? "cancelled" : "confirmed";
  return {
    date,
    from,
    to: code(p.get("arrivalAirport.iataCode") ?? ""),
    flight: prefix + number || null,
    airline: p.get("airline.name") ?? "",
    status: legStatus,
  };
}

// One reservation per passenger and leg: keep one per leg.
export function microdataLegs(html: string): MicroLeg[] {
  const chunks = html.split(/<[^<>]*\sitemtype=["']https?:\/\/schema\.org\/FlightReservation["'][^<>]*>/i).slice(1);
  const legs = chunks.map((c) => microLeg(reservationProps(c))).filter((l) => l !== null);
  return legs.filter((l, i) => legs.findIndex((o) => o.date === l.date && o.from === l.from && o.flight === l.flight) === i);
}

// Microdata legs replace the model's. The model still decides whether the mail is about Alessandro's
// flights at all (no legs: unchanged), the PNR and completeness, and fills what the markup leaves out:
// an empty arrival code comes from the model's leg that day, else from the next leg (round trip).
export function applyMicrodata(ex: Extraction, html: string): Extraction {
  const micro = microdataLegs(html);
  if (!micro.length || !ex.legs.length) return ex;
  const legs = micro.map((l, i): Leg => {
    const model = ex.legs.find((m) => m.date === l.date && [code(m.from), code(m.to)].includes(l.from));
    const modelTo = model && [code(model.from), code(model.to)].find((c) => c !== l.from);
    return {
      date: l.date,
      from: l.from,
      to: l.to || modelTo || (micro[i + 1] ?? micro[0]).from,
      airline: model?.airline || l.airline,
      flight: l.flight ?? model?.flight ?? null,
      status: l.status ?? model?.status ?? "confirmed",
      replaces: model?.replaces ?? null,
    };
  });
  return { ...ex, legs };
}
const validRoute = (r: Route) =>
  /^\d{4}-\d{2}-\d{2}$/.test(r.date) &&
  !Number.isNaN(Date.parse(r.date)) &&
  /^[A-Z]{3}$/.test(code(r.from)) &&
  /^[A-Z]{3}$/.test(code(r.to)) &&
  code(r.from) !== code(r.to);
const sameRoute = (row: Row, r: Route) =>
  row.date === r.date && row.origin === code(r.from) && row.destination === code(r.to);

// No airline mails a "checked in" notice, but Ryanair resends the itinerary at check-in. A mail about a leg
// we already have, received from two days before departure to the day itself, marks it checked in.
// ponytail: date heuristic, a bag bought in those two days counts too; a flight counts anyway once it departs.
export function isCheckIn(receivedAt: string | undefined, departure: string): boolean {
  const days = (Date.parse(departure) - Date.parse(receivedAt ?? "")) / 86_400_000;
  return days > -1 && days <= 2;
}

// Set by hand after the fact (missed the flight, denied boarding): the import never touches these rows, so a
// rebooking mail adds the new flight and the old one stays on record.
const manual = (r: Row) => r.status === "missed" || r.status === "denied";

// The status a mail confirming this leg moves the row to, if any: checked in near departure, or back to
// booked when the airline confirms a leg it had cancelled.
function nextStatus(row: Row, receivedAt: string | undefined): Row["status"] | undefined {
  if (row.status === "cancelled") return "booked";
  if (row.status === "booked" && isCheckIn(receivedAt, row.date)) return "checked_in";
  return undefined;
}

const legValues = (leg: Leg, pnr: string | null) => ({
  date: leg.date,
  origin: code(leg.from),
  destination: code(leg.to),
  airline: leg.airline.trim(),
  flight: leg.flight?.replace(/\s+/g, "").toUpperCase() || null,
  pnr,
});

function replacedRow(candidates: Row[], leg: Leg): Row | undefined {
  const old = leg.replaces;
  return old && validRoute(old) ? candidates.find((r) => sameRoute(r, old)) : undefined;
}

// Adds this leg's write to the plan and returns the id of the existing row it matched, if any.
function planLeg(plan: Plan, leg: Leg, candidates: Row[], pnr: string | null, receivedAt?: string): number | undefined {
  const values = legValues(leg, pnr);
  const current = candidates.find((r) => sameRoute(r, leg));

  if (leg.status === "cancelled") {
    if (current && current.status !== "cancelled") plan.update.push({ id: current.id, values: { ...values, status: "cancelled" } });
    return current?.id;
  }
  const target = current ?? replacedRow(candidates, leg);
  if (!target) {
    plan.insert.push(values);
    return undefined;
  }
  const status = nextStatus({ ...target, date: values.date }, receivedAt);
  const next: TablesUpdate<"flights"> = status ? { ...values, status } : values;
  const changed = Object.entries(next).some(([k, v]) => v !== null && v !== target[k as keyof Row]);
  if (changed) plan.update.push({ id: target.id, values: next });
  return target.id;
}

// Model output + the rows it may touch -> what to write. Legs that would fail the table's checks are
// dropped, not the whole email. A complete itinerary is the booking's current state: its other legs go.
// A cancelled leg stays on record with status cancelled.
export function planChanges(existing: Row[], ex: Extraction, receivedAt?: string): Plan {
  const pnr = ex.pnr?.trim().toUpperCase() || null;
  // A row belongs to this booking if it has the same PNR, or no PNR at all (entered by hand).
  const candidates = existing.filter((r) => !manual(r) && (!pnr || r.pnr === pnr || r.pnr === null));
  const plan: Plan = { insert: [], update: [], remove: [] };
  const kept = new Set<number>();

  for (const leg of ex.legs) {
    if (!validRoute(leg) || !leg.airline.trim()) continue;
    const id = planLeg(plan, leg, candidates, pnr, receivedAt);
    if (id !== undefined) kept.add(id);
  }

  if (ex.complete && pnr) plan.remove = candidates.filter((r) => r.pnr === pnr && !kept.has(r.id)).map((r) => r.id);
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
  return applyMicrodata(JSON.parse(text.text) as Extraction, emailHtml(email));
}
