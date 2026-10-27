# flightlog

App personale per tracciare i voli (storico + voli in corso), ispirata a Flighty. Stato: idea, in cantiere (2026-10-27).

Analisi di fattibilità: [docs/analysis.md](docs/analysis.md).

## Static analysis

SonarQube in locale, istanza condivisa in `~/projects/sonarqube` (Docker, non in CI), project key
`flightlog`: `bun run sonar` (test con copertura + scan). Copertura misurata solo su `lib/`.
Scan prima di un rilascio e dopo cambi grossi.
