import { geoCentroid, geoDistance } from "d3-geo";

export type Point = { lat: number; lon: number };

// Altitude is in globe radii above the surface: close enough for a city pair, never past the whole sphere.
const MIN_ALTITUDE = 0.9;
const MAX_ALTITUDE = 2.5;

// Where the camera sits to frame a set of points: over their centroid, high enough to see the farthest one.
// Two points frame a route, all airports frame the home view.
export function viewOf(points: Point[]) {
  const coords = points.map((p): [number, number] => [p.lon, p.lat]);
  const [lng, lat] = geoCentroid({ type: "MultiPoint", coordinates: coords });
  // Antipodal points have no centroid: look at the first one and let the user turn the globe.
  const center: [number, number] = Number.isFinite(lat) ? [lng, lat] : coords[0];
  const spread = Math.max(0, ...coords.map((c) => geoDistance(center, c)));
  const altitude = Math.min(MAX_ALTITUDE, MIN_ALTITUDE + spread * 1.4);
  return { lat: center[1], lng: center[0], altitude };
}
