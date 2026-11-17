import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { active, airports, wallClock, type Flight } from "@/lib/flights";

const HOST = "aerodatabox.p.rapidapi.com";
const WINDOW_MS = 6 * 3_600_000;
const DAY_MS = 24 * 3_600_000;
const RECHECK_MS = 30 * 60_000;

type Live = Flight & { id: number };
type ApiEnd = { airport?: { iata?: string }; terminal?: string; gate?: string; scheduledTime?: { local?: string } };
type ApiFlight = { departure?: ApiEnd; arrival?: ApiEnd };

// Each lookup spends free quota: only flights about to leave, without a gate yet, at most every half hour.
// The departure time is local to the origin: compared with the wall clock there (Rome if the zone is unknown).
// ponytail: a gate changed after the first reading is not picked up.
export function needsDepartureCheck(f: Live, now: Date): boolean {
  if (!f.flight || !active(f) || f.gate) return false;
  if (f.checkedAt && now.getTime() - Date.parse(f.checkedAt) < RECHECK_MS) return false;
  // Without a time (added by hand), the whole day of the flight counts.
  const left = Date.parse(`${f.date}T${f.time ?? "23:59:59"}Z`) - wallClock(now, airports[f.from]?.tz ?? "Europe/Rome");
  return left >= 0 && left <= (f.time ? WINDOW_MS : DAY_MS);
}

// A flight number can fly several legs a day: take the one leaving this airport. The arrival comes with the
// same answer, so it costs no extra call; its gate is often not known yet before departure.
export function departureOf(list: ApiFlight[], origin: string) {
  const leg = list.find((x) => x.departure?.airport?.iata === origin);
  const d = leg?.departure;
  const a = leg?.arrival;
  // "2026-11-09 16:05+01:00": local time at the destination.
  const arrivalTime = a?.scheduledTime?.local?.slice(11, 16);
  return { terminal: d?.terminal, gate: d?.gate, arrivalTerminal: a?.terminal, arrivalGate: a?.gate, arrivalTime: arrivalTime && `${arrivalTime}:00` };
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
        ...(found.arrivalTerminal && { arrival_terminal: found.arrivalTerminal }),
        ...(found.arrivalGate && { arrival_gate: found.arrivalGate }),
        // The mail's time wins: the lookup only fills a missing one.
        ...(!f.arrivalTime && found.arrivalTime && { arrival_time: found.arrivalTime }),
      };
      const { error } = await supabase.from("flights").update(values).eq("id", f.id);
      if (error) console.error(`Departure save failed for flight ${f.id}:`, error.message);
      return {
        ...f,
        checkedAt,
        gate: found.gate ?? f.gate,
        terminal: found.terminal ?? f.terminal,
        arrivalTerminal: found.arrivalTerminal ?? f.arrivalTerminal,
        arrivalGate: found.arrivalGate ?? f.arrivalGate,
        arrivalTime: f.arrivalTime ?? found.arrivalTime,
      };
    }),
  );
  return flights.map((f) => fresh.find((x) => x.id === f.id) ?? f);
}
