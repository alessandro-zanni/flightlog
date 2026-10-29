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
| `main`    | `flightlog` (`ttqhycpthnrvzjhcxysq`)         | `flightlog` → flightlog.alessandrozanni.dev |
| `develop` | `flightlog-staging` (`aakiprqmkshlcatajady`) | `flightlog-staging` → staging.flightlog.alessandrozanni.dev, dietro login Vercel |

- Push su `main`/`develop` → `.github/workflows/deploy.yml` (lint, typecheck, test, deploy). Unico
  secret GitHub: `VERCEL_TOKEN`.
- Migration: `supabase link --project-ref <ref>` + `supabase db push --linked`, prima su staging, poi
  su prod, **prima** del push del codice che le usa. Poi advisor su entrambi.
- DNS su Cloudflare (CNAME "DNS only" + TXT `_vercel`: il dominio appartiene all'account Vercel
  personale). Prod senza protezione Vercel: l'app ha il suo login.
- Login: utenti creati dall'API admin, password nel Portachiavi (`flightlog-login-prod`,
  `flightlog-login-staging`).
- Password dei database nel Portachiavi (`supabase-db-flightlog`, `supabase-db-flightlog-staging`).

## Import da mail

Inoltra (a mano o con un filtro Gmail) le conferme di volo a `flights@alessandrozanni.dev`.

1. Cloudflare Email Routing: regola `flights@` → Email Worker `flightlog-inbound` (`worker/`). Gli
   altri indirizzi restano sul catch-all verso Gmail. Inoltri automatici: vincoli nel `CLAUDE.md` di
   `~/projects/personal/gmail-filters` (sezione "Inoltro a flightlog").
2. Il Worker accetta solo i mittenti in `ALLOWED_FROM` (senza il `+tag` dell'inoltro automatico
   Gmail), legge la mail con `postal-mime` e la manda a `POST /api/inbound` con `INBOUND_SECRET`.
   La mail di conferma inoltro di Gmail passa a `FORWARD_TO`.
3. `/api/inbound` chiede a Claude Haiku 5.5 PNR e tratte in cui Alessandro è passeggero, con stato
   (confermata/cancellata), tratta originale sostituita e se la mail elenca tutta la prenotazione
   (`complete`). `planChanges` le confronta con le righe dello stesso PNR (o senza PNR, inserite a mano):
   - nuova tratta → insert; tratta già presente → aggiorna volo/PNR se cambiano;
   - cancellata → delete; modificata con `replaces` → update della riga originale;
   - itinerario completo → è lo stato della prenotazione: le tratte di quel PNR che non elenca più vanno.
   Una mail senza tratte non tocca niente. Costo: circa 0,001 $ a mail.
4. Nessun volo trovato o errore → il Worker rifiuta la mail: arriva un bounce al mittente, nessuna
   mail si perde in silenzio.

- Deploy del Worker: `bun run worker:deploy` (token Cloudflare in `~/.zshrc`). Secret:
  `wrangler secret put INBOUND_SECRET -c worker/wrangler.toml`, valore nel Portachiavi
  (`flightlog-inbound-secret`), lo stesso che c'è su Vercel prod.
- Su Vercel prod, oltre alle variabili Supabase: `INBOUND_SECRET`, `SUPABASE_SECRET_KEY`,
  `ANTHROPIC_API_KEY`. Staging non riceve mail.

## Static analysis

SonarQube in locale, istanza condivisa in `~/projects/sonarqube` (Docker, non in CI), project key
`flightlog`: `bun run sonar` (test con copertura + scan). Copertura misurata solo su `lib/`.
Scan prima di un rilascio e dopo cambi grossi.
