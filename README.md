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

## Deploy

Account dedicati (`azanni-flightlog` su Vercel, org "Flightlog" su Supabase), token in `.envrc`
(direnv, non committato).

| Ramo      | Supabase (eu-central-1)                      | Vercel (fra1)                           |
| --------- | -------------------------------------------- | --------------------------------------- |
| `main`    | `flightlog` (`ttqhycpthnrvzjhcxysq`)         | `flightlog` → flightlog-taupe.vercel.app |
| `develop` | `flightlog-staging` (`aakiprqmkshlcatajady`) | `flightlog-staging`, dietro login Vercel |

- Push su `main`/`develop` → `.github/workflows/deploy.yml` (lint, typecheck, test, deploy). Unico
  secret GitHub: `VERCEL_TOKEN`.
- Migration: `supabase link --project-ref <ref>` + `supabase db push --linked`, prima su staging, poi
  su prod, **prima** del push del codice che le usa. Poi advisor su entrambi.
- Prod senza protezione Vercel (l'app ha il suo login; `flightlog.vercel.app` è di un altro).
- Login: utenti creati dall'API admin, password nel Portachiavi (`flightlog-login-prod`,
  `flightlog-login-staging`).
- Password dei database nel Portachiavi (`supabase-db-flightlog`, `supabase-db-flightlog-staging`).

## Static analysis

SonarQube in locale, istanza condivisa in `~/projects/sonarqube` (Docker, non in CI), project key
`flightlog`: `bun run sonar` (test con copertura + scan). Copertura misurata solo su `lib/`.
Scan prima di un rilascio e dopo cambi grossi.
