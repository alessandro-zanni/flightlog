import { geoInterpolate } from "d3-geo";

export type Point = { lat: number; lon: number };

// MapLibre draws a line as straight in mercator: a route is passed as its great circle, sampled.
export function greatCircle(from: Point, to: Point, steps = 64): [number, number][] {
  const at = geoInterpolate([from.lon, from.lat], [to.lon, to.lat]);
  const line: [number, number][] = [];
  for (let i = 0; i <= steps; i++) {
    const [lon, lat] = at(i / steps);
    const prev = line.at(-1)?.[0] ?? lon;
    // Keep longitudes continuous across the antimeridian instead of jumping from 180 to -180.
    line.push([lon + 360 * Math.round((prev - lon) / 360), lat]);
  }
  return line;
}
