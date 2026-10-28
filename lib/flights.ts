import airportsJson from "@/data/airports.json";

export type Flight = {
  id?: number;
  date: string;
  from: string;
  to: string;
  airline: string;
  flight?: string | null;
  pnr?: string | null;
};
export type Airport = { name: string; city: string; country: string; lat: number; lon: number };

export const airports = airportsJson as Record<string, Airport>;

// DB columns are origin/destination ("from"/"to" are SQL keywords); alias back to the app's shape.
export const FLIGHT_COLUMNS = "id, date, from:origin, to:destination, airline, flight, pnr";

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
