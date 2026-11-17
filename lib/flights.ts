import airportsJson from "@/data/airports.json";
import { Constants, type Enums } from "@/lib/database.types";

export type Flight = {
  id?: number;
  date: string;
  from: string;
  to: string;
  airline: string;
  flight?: string | null;
  pnr?: string | null;
  status?: FlightStatus;
  time?: string | null;
  terminal?: string | null;
  gate?: string | null;
  checkedAt?: string | null;
  arrivalTime?: string | null;
  arrivalTerminal?: string | null;
  arrivalGate?: string | null;
};
export type FlightStatus = Enums<"flight_status">;
export const FLIGHT_STATUSES = Constants.public.Enums.flight_status;

export type Airport = { name: string; city: string; country: string; lat: number; lon: number; tz?: string };

export const airports = airportsJson as Record<string, Airport>;

// DB columns are origin/destination ("from"/"to" are SQL keywords); alias back to the app's shape.
export const FLIGHT_COLUMNS =
  "id, date, from:origin, to:destination, airline, flight, pnr, status, time:departure_time, terminal:departure_terminal, gate:departure_gate, checkedAt:departure_checked_at";

// "Flown" is not stored: a booked flight counts in stats and on the map once its day comes, a checked-in one
// at once. Missed, denied and cancelled flights stay in the list and never count.
export const counts = (f: Flight, now: string) => f.status === "checked_in" || (active(f) && f.date <= now);

// Booked or checked in: a flight that happens or happened. The others are kept on record, struck through.
export const active = (f: Flight) => f.status === undefined || f.status === "booked" || f.status === "checked_in";

const EARTH_KM = 6371;
const rad = (d: number) => (d * Math.PI) / 180;

export function distanceKm(a: Airport, b: Airport): number {
  const h =
    Math.sin(rad(b.lat - a.lat) / 2) ** 2 +
    Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(rad(b.lon - a.lon) / 2) ** 2;
  return 2 * EARTH_KM * Math.asin(Math.sqrt(h));
}

// Wall clock of an instant in an IANA zone, as epoch ms read as if it were UTC.
export const wallClock = (d: Date, tz: string) =>
  Date.parse(`${d.toLocaleString("sv-SE", { timeZone: tz }).replace(" ", "T")}Z`);

// Epoch ms of a local date and time ("2026-01-01", "08:10") in an IANA zone.
// ponytail: one correction pass, can be 1h off right at a DST switch; iterate if that ever matters.
export function utcOf(date: string, time: string, tz: string): number {
  const guess = Date.parse(`${date}T${time}Z`);
  return guess - (wallClock(new Date(guess), tz) - guess);
}

// No arrival date is stored: an arrival not after departure lands the next day (flights are under 24h).
export function durationMin(f: Flight, db: Record<string, Airport> = airports): number | undefined {
  const tzFrom = db[f.from]?.tz;
  const tzTo = db[f.to]?.tz;
  if (!f.time || !f.arrivalTime || !tzFrom || !tzTo) return undefined;
  const dep = utcOf(f.date, f.time, tzFrom);
  let arr = utcOf(f.date, f.arrivalTime, tzTo);
  if (arr <= dep) arr += 24 * 3600_000;
  return Math.round((arr - dep) / 60_000);
}

export function stats(list: Flight[], db: Record<string, Airport> = airports) {
  const known = list.filter((f) => db[f.from] && db[f.to]);
  const km = known.reduce((s, f) => s + distanceKm(db[f.from], db[f.to]), 0);
  // ponytail: flights without a known duration still use a flat 800 km/h block speed
  const minutes = known.reduce((s, f) => s + (durationMin(f, db) ?? (distanceKm(db[f.from], db[f.to]) / 800) * 60), 0);
  const codes = new Set(list.flatMap((f) => [f.from, f.to]));
  return {
    flights: list.length,
    km: Math.round(km),
    airports: codes.size,
    countries: new Set([...codes].map((c) => db[c]?.country).filter(Boolean)).size,
    airlines: new Set(list.map((f) => f.airline)).size,
    hours: Math.round(minutes / 60),
  };
}

export type FlightFilter = { year?: string; airline?: string; when?: string; q?: string };

const squash = (s: string) => s.toLowerCase().replaceAll(/[\s-]/g, "");

// Search ignores case, spaces and dashes: "blq-bcn", "BLQ BCN", "bologna", "fr 1234" all match.
export function filterFlights<T extends Flight>(list: T[], f: FlightFilter, now: string, db = airports): T[] {
  const q = squash(f.q ?? "");
  return list.filter((x) => {
    if (f.year && !x.date.startsWith(f.year)) return false;
    if (f.airline && x.airline !== f.airline) return false;
    if (f.when === "upcoming" && x.date < now) return false;
    if (f.when === "past" && x.date >= now) return false;
    const fields = [x.from + x.to, db[x.from]?.city, db[x.to]?.city, x.flight];
    return !q || fields.some((s) => s && squash(s).includes(q));
  });
}
