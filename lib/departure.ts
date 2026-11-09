import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { active, type Flight } from "@/lib/flights";

const HOST = "aerodatabox.p.rapidapi.com";
const WINDOW_MS = 6 * 3_600_000;
const DAY_MS = 24 * 3_600_000;
const RECHECK_MS = 30 * 60_000;

type Live = Flight & { id: number };
type ApiFlight = { departure?: { airport?: { iata?: string }; terminal?: string; gate?: string } };

const romeWallClock = (d: Date) => Date.parse(`${d.toLocaleString("sv-SE", { timeZone: "Europe/Rome" }).replace(" ", "T")}Z`);

// Each lookup spends free quota: only flights about to leave, without a gate yet, at most every half hour.
// ponytail: departure time is local to the origin but compared with Rome time, a few hours off outside Europe;
// store the airport timezone if that ever matters. A gate changed after the first reading is not picked up.
export function needsDepartureCheck(f: Live, now: Date): boolean {
  if (!f.flight || !active(f) || f.gate) return false;
  if (f.checkedAt && now.getTime() - Date.parse(f.checkedAt) < RECHECK_MS) return false;
  // Without a time (added by hand), the whole day of the flight counts.
  const left = Date.parse(`${f.date}T${f.time ?? "23:59:59"}Z`) - romeWallClock(now);
  return left >= 0 && left <= (f.time ? WINDOW_MS : DAY_MS);
}

// A flight number can fly several legs a day: take the one leaving this airport.
export function departureOf(list: ApiFlight[], origin: string) {
  const d = list.find((x) => x.departure?.airport?.iata === origin)?.departure;
  return { terminal: d?.terminal, gate: d?.gate };
}

async function lookup(f: Live, key: string) {
  const url = `https://${HOST}/flights/number/${encodeURIComponent(f.flight!)}/${f.date}?withAircraftImage=false&withLocation=false`;
  const res = await fetch(url, { headers: { "X-RapidAPI-Key": key, "X-RapidAPI-Host": HOST }, signal: AbortSignal.timeout(3000) });
  if (!res.ok) throw new Error(`AeroDataBox ${res.status}`);
  return res.status === 204 ? departureOf([], f.from) : departureOf((await res.json()) as ApiFlight[], f.from);
}

// Never breaks the page: a failed lookup counts as a check, so a broken API cannot drain the quota either.
export async function refreshDepartures<T extends Live>(supabase: SupabaseClient<Database>, flights: T[], now = new Date()): Promise<T[]> {
  const key = process.env.AERODATABOX_API_KEY;
  if (!key) return flights;
  const due = flights.filter((f) => needsDepartureCheck(f, now));
  const fresh = await Promise.all(
    due.map(async (f) => {
      const found = await lookup(f, key).catch((e: unknown) => {
        console.error(`Departure lookup failed for flight ${f.id}:`, e);
        return departureOf([], f.from);
      });
      const checkedAt = now.toISOString();
      const values = {
        departure_checked_at: checkedAt,
        ...(found.gate && { departure_gate: found.gate }),
        ...(found.terminal && { departure_terminal: found.terminal }),
      };
      const { error } = await supabase.from("flights").update(values).eq("id", f.id);
      if (error) console.error(`Departure save failed for flight ${f.id}:`, error.message);
      return { ...f, checkedAt, gate: found.gate ?? f.gate, terminal: found.terminal ?? f.terminal };
    }),
  );
  return flights.map((f) => fresh.find((x) => x.id === f.id) ?? f);
}
