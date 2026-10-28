import { addFlight, deleteFlight, signOut } from "@/app/actions";
import { WorldMap } from "@/components/world-map";
import { airports, FLIGHT_COLUMNS, stats } from "@/lib/flights";
import { createClient } from "@/lib/supabase/server";

// Reads the session on every request: blocking on the server is fine for a personal app.
export const instant = false;

const city = (code: string) => airports[code]?.city || code;
const input = "rounded-lg border border-slate-700 bg-transparent px-3 py-2";

export default async function Home() {
  const supabase = await createClient();
  const { data, error } = await supabase.from("flights").select(FLIGHT_COLUMNS).order("date", { ascending: false });
  if (error) throw new Error(error.message);
  const flights = data;
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
    <main className="mx-auto flex w-full max-w-4xl flex-col gap-6 p-4 sm:p-8">
      <header className="flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Flightlog</h1>
        <form action={signOut}>
          <button className="text-sm text-slate-400 hover:text-slate-200">Sign out</button>
        </form>
      </header>
      <WorldMap flights={flights} />
      <section className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {cards.map(([label, value]) => (
          <div key={label} className="rounded-xl border border-slate-700 p-4">
            <div className="text-3xl font-semibold tabular-nums">{value.toLocaleString("en")}</div>
            <div className="text-sm text-slate-400">{label}</div>
          </div>
        ))}
      </section>
      <form action={addFlight} className="grid grid-cols-2 gap-2 sm:grid-cols-7">
        <input className={input} name="date" type="date" aria-label="Date" required />
        <input className={input} name="from" placeholder="From" aria-label="From (IATA)" pattern="[A-Za-z]{3}" maxLength={3} required />
        <input className={input} name="to" placeholder="To" aria-label="To (IATA)" pattern="[A-Za-z]{3}" maxLength={3} required />
        <input className={input} name="airline" placeholder="Airline" aria-label="Airline" required />
        <input className={input} name="flight" placeholder="Flight no." aria-label="Flight number" />
        <input className={input} name="pnr" placeholder="PNR" aria-label="Booking reference" />
        <button className="rounded-lg bg-slate-100 px-3 py-2 font-medium text-slate-900">Add</button>
      </form>
      <ul className="divide-y divide-slate-800">
        {flights.map((f) => (
          <li key={f.id} className="flex items-baseline justify-between gap-4 py-3">
            <div>
              <span className="font-medium">{f.from}</span> → <span className="font-medium">{f.to}</span>
              <span className="ml-2 text-sm text-slate-400">
                {city(f.from)} → {city(f.to)}
              </span>
            </div>
            <div className="flex shrink-0 items-baseline gap-3 text-right text-sm text-slate-400">
              {f.date} · {f.flight ?? f.airline}
              <form action={deleteFlight}>
                <input type="hidden" name="id" value={f.id} />
                <button aria-label={`Delete ${f.from}-${f.to} on ${f.date}`} className="hover:text-red-400">
                  ×
                </button>
              </form>
            </div>
          </li>
        ))}
      </ul>
    </main>
  );
}
