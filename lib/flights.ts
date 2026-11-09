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
};
export type FlightStatus = Enums<"flight_status">;
export const FLIGHT_STATUSES = Constants.public.Enums.flight_status;

export type Airport = { name: string; city: string; country: string; lat: number; lon: number };

export const airports = airportsJson as Record<string, Airport>;

// DB columns are origin/destination ("from"/"to" are SQL keywords); alias back to the app's shape.
export const FLIGHT_COLUMNS =
  "id, date, from:origin, to:destination, airline, flight, pnr, status, time:departure_time, terminal:departure_terminal";

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

export function stats(list: Flight[], db: Record<string, Airport> = airports) {
  const known = list.filter((f) => db[f.from] && db[f.to]);
  const km = known.reduce((s, f) => s + distanceKm(db[f.from], db[f.to]), 0);
  const codes = new Set(list.flatMap((f) => [f.from, f.to]));
  return {
    flights: list.length,
    km: Math.round(km),
    airports: codes.size,
    countries: new Set([...codes].map((c) => db[c]?.country).filter(Boolean)).size,
    airlines: new Set(list.map((f) => f.airline)).size,
    // ponytail: flat 800 km/h block speed, replace with real durations when we store them
    hours: Math.round(km / 800),
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
