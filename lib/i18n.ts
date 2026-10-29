import { headers } from "next/headers";

const en = {
  add: "Add flight",
  signOut: "Sign out",
  signIn: "Sign in",
  email: "Email",
  password: "Password",
  wrongLogin: "Wrong email or password. Try again.",
  mapLabel: "Map of flown routes",
  flights: "flights",
  km: "km",
  hours: "hours in the air",
  airports: "airports",
  countries: "countries",
  airlines: "airlines",
  upcoming: "Upcoming",
  routeTo: "to",
  empty: "No flights yet. Forward a booking email or add one by hand.",
  back: "All flights",
  newFlight: "New flight",
  editFlight: "Edit flight",
  date: "Date",
  from: "From",
  to: "To",
  iataHint: "3-letter airport code, e.g. BLQ",
  airline: "Airline",
  flightNo: "Flight number",
  pnr: "Booking reference",
  optional: "optional",
  save: "Save flight",
  create: "Add flight",
  delete: "Delete this flight",
  deleteConfirm: "Yes, delete it",
  deleteWarning: "The flight disappears from the map and the totals. This can't be undone.",
  saveFailed: "Couldn't save: check the airport codes and the date, then try again.",
  duplicate: "This flight is already in the log.",
};

const it: typeof en = {
  add: "Aggiungi volo",
  signOut: "Esci",
  signIn: "Accedi",
  email: "Email",
  password: "Password",
  wrongLogin: "Email o password errate. Riprova.",
  mapLabel: "Mappa delle rotte volate",
  flights: "voli",
  km: "km",
  hours: "ore in volo",
  airports: "aeroporti",
  countries: "paesi",
  airlines: "compagnie",
  upcoming: "Prossimi voli",
  routeTo: "a",
  empty: "Ancora nessun volo. Inoltra una mail di prenotazione o aggiungine uno a mano.",
  back: "Tutti i voli",
  newFlight: "Nuovo volo",
  editFlight: "Modifica volo",
  date: "Data",
  from: "Da",
  to: "A",
  iataHint: "Codice aeroporto di 3 lettere, es. BLQ",
  airline: "Compagnia",
  flightNo: "Numero di volo",
  pnr: "Codice prenotazione",
  optional: "facoltativo",
  save: "Salva volo",
  create: "Aggiungi volo",
  delete: "Elimina questo volo",
  deleteConfirm: "Sì, eliminalo",
  deleteWarning: "Il volo sparisce dalla mappa e dai totali. Non si può annullare.",
  saveFailed: "Salvataggio non riuscito: controlla i codici aeroporto e la data, poi riprova.",
  duplicate: "Questo volo è già nel registro.",
};

export type Locale = "en" | "it";

// Italian when the browser prefers it over English, English otherwise.
export function pickLocale(acceptLanguage: string | null): Locale {
  for (const part of (acceptLanguage ?? "").split(",")) {
    const lang = part.trim().slice(0, 2).toLowerCase();
    if (lang === "it" || lang === "en") return lang;
  }
  return "en";
}

export async function getI18n() {
  const locale = pickLocale((await headers()).get("accept-language"));
  const tag = locale === "it" ? "it-IT" : "en-GB";
  return {
    locale,
    t: locale === "it" ? it : en,
    number: (n: number) => n.toLocaleString(tag),
    // Dates are calendar days ("2026-11-04"): format at noon UTC so no timezone shifts the day.
    date: (iso: string, opts: Intl.DateTimeFormatOptions) =>
      new Date(`${iso}T12:00:00Z`).toLocaleDateString(tag, { timeZone: "UTC", ...opts }),
    inDays: (days: number) => new Intl.RelativeTimeFormat(tag, { numeric: "auto" }).format(days, "day"),
  };
}

// ponytail: "today" in the owner's timezone, make it per-user if the app ever has more than one
export const today = () => new Date().toLocaleDateString("sv-SE", { timeZone: "Europe/Rome" });

export const daysBetween = (from: string, to: string) =>
  Math.round((Date.parse(to) - Date.parse(from)) / 86_400_000);
