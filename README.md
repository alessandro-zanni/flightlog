# flightlog

App personale per tracciare i voli (storico + voli in corso), ispirata a Flighty. Stato: fase 1 in locale (Supabase + login), cloud non ancora creato (2026-10-28).

Analisi di fattibilità: [docs/analysis.md](docs/analysis.md).

## Local development

Supabase locale su porte 5642x (le 543xx e 553xx sono di altri progetti):

```sh
supabase start                       # migrations + seed sintetico
bun run db:import                    # voli reali da data/flights.json (opzionale)
bun run dev
```

`.env.local` (non committato) con `NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:56421`,
`NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` e `SUPABASE_SECRET_KEY` presi da `supabase status`.
Registrazione chiusa: l'unico utente si crea dall'API admin (`POST /auth/v1/admin/users` con la
secret key, `email_confirm: true`). Dopo una migration: `bun run db:types`.

## Static analysis

SonarQube in locale, istanza condivisa in `~/projects/sonarqube` (Docker, non in CI), project key
`flightlog`: `bun run sonar` (test con copertura + scan). Copertura misurata solo su `lib/`.
Scan prima di un rilascio e dopo cambi grossi.
