import Link from "next/link";
import { signOut } from "@/app/actions";
import { Plane, Plate, Plus, Route, SignArrow } from "@/components/pictograms";
import { routeKey, WorldMap } from "@/components/world-map";
import { airports, FLIGHT_COLUMNS, stats, type Flight } from "@/lib/flights";
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

export default async function Home() {
  const { t, number, date, inDays } = await getI18n();
  const supabase = await createClient();
  const { data, error } = await supabase.from("flights").select(FLIGHT_COLUMNS).order("date", { ascending: false });
  if (error) throw new Error(error.message);
  const flights = data;
  const now = today();
  const upcoming = flights.filter((f) => f.date >= now).reverse();
  const past = flights.filter((f) => f.date < now);
  const next = upcoming[0];
  const s = stats(flights);
  const figures: [number, string][] = [
    [s.flights, t.flights],
    [s.km, t.km],
    [s.hours, t.hours],
    [s.airports, t.airports],
    [s.countries, t.countries],
    [s.airlines, t.airlines],
  ];
  const years = Map.groupBy(past, (f) => f.date.slice(0, 4));

  const row = (f: Flight & { id: number }, withPnr: boolean) => (
    <li key={f.id}>
      <Link
        href={`/flights/${f.id}`}
        data-row={routeKey(f)}
        className="grid grid-cols-[4.5rem_1fr_auto] items-center gap-x-4 border-b border-rule px-4 py-3 hover:bg-sign focus-visible:bg-sign sm:grid-cols-[5rem_1fr_7rem_5rem_6rem]"
      >
        {/* Fixed columns: date, route, airline, then flight number and PNR on wider screens. */}
        <span className="text-sm text-muted">{date(f.date, { day: "numeric", month: "short" })}</span>
        <span className="min-w-0">
          <span className="block font-extrabold">
            <Route from={f.from} to={f.to} sep={t.routeTo} />
          </span>
          <span className="block truncate text-sm text-muted">
            <Route from={city(f.from)} to={city(f.to)} sep={t.routeTo} />
          </span>
        </span>
        <span className="text-right text-sm sm:text-left">{f.airline}</span>
        <span className="hidden text-sm sm:block">{f.flight}</span>
        <span className="hidden text-sm font-semibold tracking-wide sm:block">{withPnr ? f.pnr : ""}</span>
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
          Flightlog
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
              {next.flight ?? next.airline} · <strong className="font-extrabold">{inDays(daysBetween(now, next.date))}</strong>
            </span>
          </span>
          {/* The arrow is locked to the edge it points past, as on an overhead sign. */}
          <Plate className="size-14 sm:size-18">
            <SignArrow className="size-9 sm:size-12" />
          </Plate>
        </Link>
      )}

      {flights.length === 0 ? (
        <p className="mx-auto max-w-md px-4 py-16 text-center text-lg">{t.empty}</p>
      ) : (
        <div className="lg:grid lg:grid-cols-2 lg:items-start">
          <section className={`lg:sticky ${next ? "lg:top-41" : "lg:top-0"}`}>
            {/* Map and figures fit under the band on a laptop screen, so the lit route stays in view. */}
            <WorldMap flights={flights} label={t.mapLabel} className="lg:max-h-[calc(100dvh-26rem)]" />
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
          <button className="text-sm text-muted-dark hover:text-white">{t.signOut}</button>
        </form>
      </footer>
    </main>
  );
}
