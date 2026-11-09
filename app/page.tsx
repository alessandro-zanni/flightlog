import Link from "next/link";
import { signOut } from "@/app/actions";
import { Plane, Plate, Plus, Route, SignArrow } from "@/components/pictograms";
import { routeKey, WorldMap } from "@/components/world-map";
import { refreshDepartures } from "@/lib/departure";
import { active, airports, counts, FLIGHT_COLUMNS, filterFlights, stats, type Flight, type FlightFilter } from "@/lib/flights";
import { daysBetween, getI18n, today } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

// Reads the session on every request: blocking on the server is fine for a personal app.
export const instant = false;

const city = (code: string) => airports[code]?.city || code;

// Hovering or focusing a row lights its route on the map and dims the rest: pure CSS, one rule per route.
function routeHighlightCss(flights: Flight[]) {
  const keys = [...new Set(flights.map(routeKey))];
  const lit = (k: string) => `main:has([data-row="${k}"]:is(:hover,:focus-visible)) [data-route="${k}"]`;
  return [
    `main:has([data-row]:is(:hover,:focus-visible)) [data-route]{stroke-opacity:.2}`,
    ...keys.map((k) => `${lit(k)}{stroke-opacity:1;stroke-width:5}`),
  ].join("\n");
}

const field = "block w-full rounded-none border-2 border-ink bg-white px-3 py-2.5 text-lg";
const label = "block text-sm font-semibold";

export default async function Home({ searchParams }: Readonly<PageProps<"/">>) {
  const params = await searchParams;
  const filter = Object.fromEntries(
    ["year", "airline", "when", "q"].map((k) => [k, typeof params[k] === "string" ? params[k] : ""]),
  ) as Required<FlightFilter>;
  const filtered = Object.values(filter).some(Boolean);
  const { t, number, date, inDays } = await getI18n();
  const supabase = await createClient();
  const { data: rows, error } = await supabase.from("flights").select(FLIGHT_COLUMNS).order("date", { ascending: false });
  if (error) throw new Error(error.message);
  const data = await refreshDepartures(supabase, rows);
  const now = today();
  // The band always shows the real next flight; map, figures and list follow the filters.
  const next = data.findLast((f) => f.date >= now && active(f));
  const flights = filterFlights(data, filter, now);
  const upcoming = flights.filter((f) => f.date >= now).reverse();
  const past = flights.filter((f) => f.date < now);
  // Booked flights stay in the list but join figures and map only once checked in or flown.
  const counted = flights.filter((f) => counts(f, now));
  const yearOptions = [...new Set(data.map((f) => f.date.slice(0, 4)))];
  const airlineOptions = [...new Set(data.map((f) => f.airline))].sort((a, b) => a.localeCompare(b));
  const s = stats(counted);
  const figures: [number, string][] = [
    [s.flights, t.flights],
    [s.km, t.km],
    [s.hours, t.hours],
    [s.airports, t.airports],
    [s.countries, t.countries],
    [s.airlines, t.airlines],
  ];
  const years = Map.groupBy(past, (f) => f.date.slice(0, 4));

  const row = (f: Flight & { id: number }, upcomingRow: boolean) => (
    <li key={f.id}>
      <Link
        href={`/flights/${f.id}`}
        data-row={routeKey(f)}
        className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 border-b border-rule px-4 py-3 hover:bg-sign focus-visible:bg-sign sm:grid-cols-[5rem_1fr_7rem_5rem_6rem]"
      >
        {/* Fixed columns: date, route, airline, then flight number and PNR on wider screens. */}
        <span className="text-sm text-muted">
          {date(f.date, { day: "numeric", month: "short" })}
          {(upcomingRow || !active(f)) && (
            <span className="block text-xs font-semibold tracking-wide text-ink uppercase">{t[f.status ?? "booked"]}</span>
          )}
        </span>
        <span className="min-w-0">
          <span className={`block font-extrabold ${active(f) ? "" : "text-muted line-through"}`}>
            <Route from={f.from} to={f.to} sep={t.routeTo} />
          </span>
          <span className="block truncate text-sm text-muted">
            <Route from={city(f.from)} to={city(f.to)} sep={t.routeTo} />
          </span>
        </span>
        <span className="text-right text-sm sm:text-left">{f.airline}</span>
        <span className="hidden text-sm sm:block">{f.flight}</span>
        <span className="hidden text-sm font-semibold tracking-wide sm:block">{upcomingRow ? f.pnr : ""}</span>
      </Link>
    </li>
  );

  return (
    <main className="flex flex-1 flex-col">
      <style>{routeHighlightCss(flights)}</style>
      <header className="flex h-14 items-center justify-between gap-4 bg-ink px-4 text-white">
        <span className="flex items-center gap-2 text-lg font-extrabold">
          <span className="flex size-8 items-center justify-center bg-white text-ink">
            <Plane className="size-5" />
          </span>
          <span>Flightlog</span>
        </span>
        <Link
            href="/flights/new"
            className="flex shrink-0 items-center gap-2 border-2 border-sign px-3 py-1.5 text-sm font-semibold text-sign hover:bg-sign hover:text-ink"
          >
            <Plus className="size-4" />
            {t.add}
          </Link>
      </header>

      {next && (
        <Link
          href={`/flights/${next.id}`}
          className="sticky top-0 z-10 grid grid-cols-[3.5rem_1fr_3.5rem] items-center gap-x-4 bg-sign px-4 py-4 text-ink hover:bg-sign-deep sm:grid-cols-[4.5rem_1fr_4.5rem]"
        >
          <Plate className="size-14 sm:size-18">
            <Plane className="size-9 sm:size-12" />
          </Plate>
          <span className="min-w-0">
            <span className="block text-[3.5rem] leading-none font-extrabold tracking-tight sm:text-7xl">{next.to}</span>
            <span className="mt-1 block text-base font-semibold sm:text-lg">
              {city(next.to)} · {date(next.date, { weekday: "short", day: "numeric", month: "short" })}
            </span>
            <span className="block text-base sm:text-lg">
              {next.flight ?? next.airline}
              {next.gate && ` · ${t.gate} ${next.gate}`} · <strong className="font-extrabold">{inDays(daysBetween(now, next.date))}</strong>
            </span>
          </span>
          {/* The arrow is locked to the edge it points past, as on an overhead sign. */}
          <Plate className="size-14 sm:size-18">
            <SignArrow className="size-9 sm:size-12" />
          </Plate>
        </Link>
      )}

      {data.length > 0 && (
        // A plain GET form: the filters live in the URL, so a filtered view can be shared and Back undoes it.
        <form className="grid grid-cols-2 items-end gap-x-3 gap-y-4 border-b border-rule px-4 py-4 lg:grid-cols-[minmax(0,2fr)_repeat(3,minmax(0,1fr))_auto]">
          <label className="col-span-2 lg:col-span-1">
            <span className={label}>{t.search}</span>
            <input className={field} type="search" name="q" defaultValue={filter.q} placeholder={t.searchHint} />
          </label>
          <label>
            <span className={label}>{t.year}</span>
            <select className={field} name="year" defaultValue={filter.year}>
              <option value="">{t.allYears}</option>
              {yearOptions.map((y) => <option key={y}>{y}</option>)}
            </select>
          </label>
          <label>
            <span className={label}>{t.airline}</span>
            <select className={field} name="airline" defaultValue={filter.airline}>
              <option value="">{t.allAirlines}</option>
              {airlineOptions.map((a) => <option key={a}>{a}</option>)}
            </select>
          </label>
          <label>
            <span className={label}>{t.when}</span>
            <select className={field} name="when" defaultValue={filter.when}>
              <option value="">{t.anyTime}</option>
              <option value="upcoming">{t.upcoming}</option>
              <option value="past">{t.past}</option>
            </select>
          </label>
          <span className="flex items-center gap-4">
            <button type="submit" className="bg-ink px-4 py-3 text-lg font-semibold text-white hover:bg-sign hover:text-ink">
              {t.filter}
            </button>
            {filtered && <Link href="/" className="text-sm font-semibold underline hover:bg-sign">{t.clear}</Link>}
          </span>
        </form>
      )}

      {data.length === 0 ? (
        <p className="mx-auto max-w-md px-4 py-16 text-center text-lg">{t.empty}</p>
      ) : (
        <div className="lg:grid lg:grid-cols-2 lg:items-start">
          <section className={`lg:sticky ${next ? "lg:top-41" : "lg:top-0"}`}>
            {/* Map and figures fit under the band on a laptop screen, so the lit route stays in view. */}
            <WorldMap flights={counted} label={t.mapLabel} className="lg:max-h-[calc(100dvh-26rem)]" />
            {/* A directory sign: each figure set like a gate number, its label on the same line. */}
            <dl className="grid grid-cols-2 bg-ink text-white">
              {figures.map(([value, label]) => (
                <div
                  key={label}
                  className="flex flex-wrap items-baseline gap-x-3 border-t border-panel-line px-4 py-2.5 odd:border-r"
                >
                  <dt className="order-2 text-lg font-semibold text-muted-dark">{label}</dt>
                  <dd className="order-1 text-5xl leading-none sm:text-[3.5rem] font-extrabold tracking-tight">{number(value)}</dd>
                </div>
              ))}
            </dl>
          </section>

          <section className="lg:border-l lg:border-rule">
            {flights.length === 0 && <p className="px-4 py-16 text-center text-lg">{t.noMatch}</p>}
            {upcoming.length > 0 && (
              <>
                <h2 className="bg-ink px-4 py-2 font-extrabold text-sign">{t.upcoming}</h2>
                <ul>{upcoming.map((f) => row(f, true))}</ul>
              </>
            )}
            {[...years].map(([year, list]) => (
              <div key={year}>
                <h2 className="bg-ink px-4 py-2 font-extrabold text-white">{year}</h2>
                <ul>{list.map((f) => row(f, false))}</ul>
              </div>
            ))}
          </section>
        </div>
      )}
      <footer className="mt-auto flex justify-end bg-ink px-4 py-3">
        <form action={signOut}>
          <button type="submit" className="text-sm text-muted-dark hover:text-white">{t.signOut}</button>
        </form>
      </footer>
    </main>
  );
}
