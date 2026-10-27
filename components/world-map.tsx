import { geoNaturalEarth1, geoPath } from "d3-geo";
import { feature } from "topojson-client";
import type { GeometryCollection, Topology } from "topojson-specification";
import countriesTopo from "world-atlas/countries-110m.json";
import { airports, type Flight } from "@/lib/flights";

const W = 960;
const H = 500;

export function WorldMap({ flights }: { flights: Flight[] }) {
  const topo = countriesTopo as unknown as Topology;
  const land = feature(topo, topo.objects.countries as GeometryCollection);
  const projection = geoNaturalEarth1().fitSize([W, H], { type: "Sphere" });
  const path = geoPath(projection);

  const routes = new Map<string, [number, number][]>();
  for (const f of flights) {
    const a = airports[f.from];
    const b = airports[f.to];
    if (!a || !b) continue;
    routes.set([f.from, f.to].sort().join("-"), [
      [a.lon, a.lat],
      [b.lon, b.lat],
    ]);
  }
  const visited = new Set(flights.flatMap((f) => [f.from, f.to]));

  return (
    <svg viewBox={`0 0 ${W} ${H}`} className="w-full rounded-xl bg-slate-900" role="img" aria-label="Map of flown routes">
      <path d={path({ type: "Sphere" }) ?? ""} className="fill-slate-900" />
      {land.features.map((c, i) => (
        <path key={i} d={path(c) ?? ""} className="fill-slate-700 stroke-slate-900" strokeWidth={0.5} />
      ))}
      {[...routes.values()].map((coordinates, i) => (
        <path
          key={i}
          d={path({ type: "LineString", coordinates }) ?? ""}
          className="fill-none stroke-amber-400"
          strokeWidth={1.2}
          strokeOpacity={0.8}
        />
      ))}
      {[...visited].map((code) => {
        const a = airports[code];
        const p = a && projection([a.lon, a.lat]);
        return p ? <circle key={code} cx={p[0]} cy={p[1]} r={2.5} className="fill-white" /> : null;
      })}
    </svg>
  );
}
