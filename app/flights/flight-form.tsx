import Link from "next/link";
import { Arrow, Plane, Plate, Route } from "@/components/pictograms";
import { WorldMap, routeKey } from "@/components/world-map";
import type { Flight } from "@/lib/flights";
import type { getI18n } from "@/lib/i18n";

type I18n = Awaited<ReturnType<typeof getI18n>>;

const field = "block w-full border-2 border-ink bg-white px-3 py-2.5 text-lg";
const label = "block text-sm font-semibold";

// One page shape for adding and editing: the sign band names the leg, the form sits on white below.
export function FlightPage({
  i18n,
  title,
  flight,
  allFlights,
  action,
  error,
  footer,
}: Readonly<{
  i18n: I18n;
  title: string;
  flight?: Flight & { id: number };
  allFlights: Flight[];
  action: (formData: FormData) => Promise<void>;
  error?: string;
  footer?: React.ReactNode;
}>) {
  const { t } = i18n;
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-14 items-center bg-ink px-4 text-white">
        <Link href="/" className="flex items-center gap-2 font-semibold hover:text-sign">
          <Arrow className="size-5 rotate-180" />
          {t.back}
        </Link>
      </header>
      <div className="flex items-center gap-4 bg-sign px-4 py-4">
        <Plate>
          <Plane className="size-9" />
        </Plate>
        <h1 className="text-4xl leading-none font-extrabold tracking-tight sm:text-5xl">
          {flight ? <Route from={flight.from} to={flight.to} sep={t.routeTo} /> : title}
        </h1>
      </div>

      <div className="mx-auto grid w-full max-w-5xl gap-8 px-4 py-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)]">
        <div>
          <form action={action} className="grid grid-cols-2 content-start items-end gap-x-3 gap-y-4">
            {flight && <input type="hidden" name="id" value={flight.id} />}
            {error && (
              <p role="alert" className="col-span-2 border-2 border-alert px-3 py-2 font-semibold text-alert">
                {error === "duplicate" ? t.duplicate : t.saveFailed}
              </p>
            )}
            <label className="col-span-2">
              <span className={label}>{t.date}</span>
              <input className={field} name="date" type="date" defaultValue={flight?.date} required />
            </label>
            {(["from", "to"] as const).map((key) => (
              <label key={key}>
                <span className={label}>{t[key]}</span>
                <input
                  className={`${field} font-extrabold uppercase`}
                  name={key}
                  defaultValue={flight?.[key]}
                  placeholder="BLQ"
                  pattern="[A-Za-z]{3}"
                  maxLength={3}
                  autoCapitalize="characters"
                  autoComplete="off"
                  title={t.iataHint}
                  required
                />
              </label>
            ))}
            <label className="col-span-2">
              <span className={label}>{t.airline}</span>
              <input className={field} name="airline" defaultValue={flight?.airline} placeholder="Ryanair" required />
            </label>
            <label>
              <span className={label}>
                {t.flightNo} <span className="font-normal text-muted">({t.optional})</span>
              </span>
              <input
                className={`${field} uppercase`}
                name="flight"
                defaultValue={flight?.flight ?? ""}
                placeholder="FR1234"
                autoCapitalize="characters"
              />
            </label>
            <label>
              <span className={label}>
                {t.pnr} <span className="font-normal text-muted">({t.optional})</span>
              </span>
              <input
                className={`${field} uppercase`}
                name="pnr"
                defaultValue={flight?.pnr ?? ""}
                autoCapitalize="characters"
                autoComplete="off"
              />
            </label>
            <button className="col-span-2 mt-2 flex items-center justify-center gap-3 bg-ink px-4 py-3.5 text-lg font-semibold text-white hover:bg-sign hover:text-ink">
              {flight ? t.save : t.create}
              <Arrow className="size-5" />
            </button>
          </form>
          {footer}
        </div>
        {flight && <WorldMap flights={allFlights} label={t.mapLabel} highlight={routeKey(flight)} />}
      </div>
    </main>
  );
}
