import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopo from "world-atlas/countries-110m.json";
import { airports, type Flight } from "@/lib/flights";

const W = 800;
const H = 560;
const PAD = 48;

const topo = countriesTopo as unknown as Topology;
const land = feature(topo, topo.objects.countries as GeometryCollection);

// Direction-free key, shared with the list rows so hovering a row can light its route.
export const routeKey = (f: Pick<Flight, "from" | "to">) => [f.from, f.to].sort((x, y) => x.localeCompare(y)).join("-");

export function WorldMap({
  flights,
  label,
  highlight,
  className = "",
}: Readonly<{ flights: Flight[]; label: string; highlight?: string; className?: string }>) {
  const routes = new Map<string, [number, number][]>();
  for (const f of flights) {
    const a = airports[f.from];
    const b = airports[f.to];
    if (a && b) routes.set(routeKey(f), [[a.lon, a.lat], [b.lon, b.lat]]);
  }
  const visited = [...new Set(flights.flatMap((f) => [f.from, f.to]))].filter((c) => airports[c]);

  // Frame the flown world, not the whole globe: a decade of short-haul is a European map.
  const projection = geoNaturalEarth1();
  if (visited.length > 1) {
    projection.fitExtent(
      [[PAD, PAD], [W - PAD, H - PAD]],
      { type: "MultiPoint", coordinates: visited.map((c) => [airports[c].lon, airports[c].lat]) },
    );
  } else {
    projection.fitSize([W, H], { type: "Sphere" });
  }
  const path = geoPath(projection);

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className={`block w-full bg-ink ${className}`} role="img" aria-label={label}>
      <path d={path(land) ?? ""} className="fill-panel stroke-ink" strokeWidth={1} />
      {/* The highlighted route is drawn last so no other route covers it. */}
      {[...routes].sort(([a], [b]) => Number(a === highlight) - Number(b === highlight)).map(([key, coordinates]) => (
        <path
          key={key}
          data-route={key}
          d={path({ type: "LineString", coordinates }) ?? ""}
          className={`fill-none transition-[stroke-opacity,stroke-width] duration-200 ${
            highlight && key !== highlight ? "stroke-muted" : "stroke-sign"
          }`}
          strokeWidth={key === highlight ? 4 : 2}
          strokeLinecap="round"
        />
      ))}
      {visited.map((code) => {
        const p = projection([airports[code].lon, airports[code].lat]);
        return p ? <circle key={code} cx={p[0]} cy={p[1]} r={4} className="fill-white" /> : null;
      })}
    </svg>
  );
}
