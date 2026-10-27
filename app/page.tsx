import { WorldMap } from "@/components/world-map";
import { airports, flights, stats } from "@/lib/flights";

const city = (code: string) => airports[code]?.city || code;

export default function Home() {
  const s = stats(flights);
  const cards: [string, number][] = [
    ["Flights", s.flights],
    ["Distance (km)", s.km],
    ["Hours", s.hours],
    ["Airports", s.airports],
    ["Countries", s.countries],
    ["Airlines", s.airlines],
  ];

  return (
    <main className="mx-auto flex max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <h1 className="text-2xl font-semibold">Flightlog</h1>
      <WorldMap flights={flights} />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-700 p-4">
            <div className="text-3xl font-semibold tabular-nums">{value.toLocaleString("en")}</div>
            <div className="text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </section>
      <ul className="divide-y divide-slate-800">
        {flights.map((f) => (
          <li key={`${f.date}-${f.from}-${f.to}-${f.flight}`} className="flex items-baseline justify-between gap-4 py-3">
            <div>
              <span className="font-medium">{f.from}</span> → <span className="font-medium">{f.to}</span>
              <span className="ml-2 text-sm text-slate-400">
                {city(f.from)} → {city(f.to)}
              </span>
            </div>
            <div className="shrink-0 text-right text-sm text-slate-400">
              {f.date} · {f.flight ?? f.airline}
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
