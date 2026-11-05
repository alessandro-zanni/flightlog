# Flighty-like app: analisi (2026-10-27)

## Cosa fa Flighty (da replicare)
1. **Storico + statistiche**: lista voli, mappa, km, ore, compagnie, aeroporti, aerei (Passport).
2. **Import**: inoltro mail di conferma (parsing), import da altre app.
3. **Tracking live**: stato volo, ritardi, gate/terminal, aereo in arrivo ("dov'è il mio aereo"), alert push.
4. **Integrazioni iOS**: Live Activities / Dynamic Island, widget, Wallet, Siri.
5. **Social**: condivisione volo con amici.

## Componenti e difficoltà
| Parte | Come | Difficoltà | Costo |
|---|---|---|---|
| Storico + stats + mappa | Next.js + Supabase, MapLibre, dati aeroporti OurAirports (gratis) | bassa | 0 |
| Import email | Gmail API (read-only) + estrazione LLM, o indirizzo di inoltro | media | pochi centesimi a mail |
| Dati live voli | AeroAPI (FlightAware, a consumo), AeroDataBox, AirLabs; OpenSky per posizione (gratis, limitato) | media | uso personale: ~1-10 €/mese |
| Alert ritardi/gate | cron/worker che interroga lo stato e confronta, poi push | media | incluso sopra |
| Push su iPhone | web push (PWA) o APNs (serve app nativa) | media | 0 / 99 €/anno Apple Developer |
| Live Activities, widget | solo app nativa SwiftUI + ActivityKit, aggiornate via APNs | alta | 99 €/anno |
| Qualità dati (ritardi previsti, aereo in arrivo) | Flighty usa fonti proprietarie + ML: non replicabile al 100% | alta | n/a |

## Rischi
- La qualità dei dati live dipende dal provider: gate e ritardi precisi sono la parte costosa/imperfetta.
- Live Activities impongono SwiftUI nativo, fuori dallo stack di default (Next.js).
- Termini d'uso dei provider: uso personale ok, distribuzione pubblica cambia i costi.

## Fasi proposte
1. **MVP web (1-2 weekend)**: tabella voli, import da `~/flights/*.csv` (storico già in estrazione), mappa e statistiche. Stack di default (Next.js 16, Supabase, Tailwind, shadcn).
2. **Import mail + tracking (2-3 weekend)**: Gmail read-only, estrazione LLM, worker su AeroAPI, alert via web push/Telegram.
3. **App iOS nativa (opzionale, settimane)**: SwiftUI, Live Activities, widget, push APNs; riusa lo stesso backend.

## Stato (2026-11-02)
- **Fase 1 fatta**: Supabase (tabella `flights`, login con registrazione chiusa) e Vercel, prod e staging.
  Storico importato da `data/flights.json`.
- **Fase 2 fatta, con perimetro ridotto**: solo import dalle mail, niente tracking live né AeroAPI (l'app resta
  stile Been, senza costi di API). Le mail arrivano da un Cloudflare Email Worker su `flights@alessandrozanni.dev`
  (inoltro da filtri Gmail), non da Gmail API: niente OAuth Google né token che scadono. Estrazione con Claude
  Haiku 5.5, circa 0,001 $ a mail; modifiche e cancellazioni aggiornano la tratta originale per PNR.
  Il worker accetta solo mail con `spf=pass` per l'envelope sender nell'`Authentication-Results` scritto da
  Cloudflare: il suo filtro (SPF o DKIM, su qualsiasi dominio) lascia passare un mittente falsificato.
  Per Ryanair le tratte vengono dal microdata schema.org `FlightReservation` della mail, prima del modello (#7,
  2026-11-02): indipendente dalla lingua del mercato (un itinerario in catalano era stato letto al contrario).
  Il modello decide ancora se la mail riguarda i miei voli, PNR, `complete` e `replaces`; l'aeroporto d'arrivo,
  spesso vuoto nel microdata, si prende dall'altra tratta.
- **Fase 3 (app iOS) scartata** (2026-10-29): l'interfaccia resta solo la web app React. Senza tracking live
  le Live Activities servono a poco e un'app nativa sarebbe una seconda interfaccia da tenere allineata.
- **Restyling fatto (#3)**: stile segnaletica d'aeroporto (sistema in `DESIGN.md`), interfaccia in inglese e
  italiano secondo la lingua del browser, pagina di modifica per ogni volo. La modifica usa un grant di update
  sulle sole colonne visibili all'utente: la migration va applicata su staging e prod prima del codice
  (fatto su entrambi il 2026-10-29).
- **Mappa MapLibre** (2026-11-02): MapLibre GL JS in proiezione globo, piatta (mercatore) da zoom 12, al posto
  del globo `react-globe.gl` del 2026-10-29. Tile vettoriali gratuite CARTO Dark Matter, ricolorate con i token del
  design; rotte come archi di cerchio massimo. Su touch la mappa si muove con due dita, così la pagina scorre.
  Il worker di MapLibre va passato a `setWorkerUrl` (Turbopack sposta il modulo). Chunk circa 290 KB gzip più
  il worker (circa 150 KB), in lazy. Mappa creata e distrutta in un effect: risolve anche #4 (globo vuoto dopo
  il back con `cacheComponents`).
- **Archi rialzati con deck.gl** (#6, 2026-11-02): `ArcLayer` in un `MapboxOverlay` interleaved, sotto i punti
  degli aeroporti, `cullMode: "none"` per il globo, atmosfera tenue con `sky`. Tenuto dopo la prova su iPhone
  nonostante il peso: mappa da 426 a 638 KB gzip (worker compreso), sempre in lazy. Il cambio di colore al
  passaggio sulla riga è istantaneo (le transitions di deck interpolerebbero gli archi sbagliati).
- **Filtri dell'elenco** (#5, 2026-11-02): anno, compagnia, futuri/passati e ricerca testuale, in un form GET
  (stato nei search params, senza JavaScript). Si applica col pulsante "Mostra voli", scelta voluta. Filtrano
  anche mappa e numeri; la fascia "prossimo volo" no. Palette Cmd+K non fatta.
- **Stato del volo** (2026-11-05): enum `flight_status` (migration `flight_status`), modificabile dalla pagina
  del volo: Prenotato, Check-in fatto, Non partito (perso o rinunciato), Imbarco negato (overbooking), Cancellato.
  "Volato" non è uno stato: mappa e numeri contano un volo con il check-in fatto, o prenotato il cui giorno è
  arrivato; gli altri tre restano nell'elenco barrati e non contano mai. La fascia "prossimo volo" li salta.
  - Check-in dall'import: nessuna compagnia manda una mail di check-in fatto. Ryanair rimanda lo stesso
    itinerario (stesso mittente, oggetto e microdata) per ogni modifica, anche per il bagaglio comprato al
    check-in. Quindi una mail su una tratta già presente, ricevuta da due giorni prima della partenza al giorno
    stesso, porta Prenotato a Check-in fatto. Euristica: un acquisto in quei due giorni conta come check-in; un
    check-in senza acquisti non genera mail, si segna a mano o il volo conta comunque dal suo giorno.
  - Una tratta cancellata dalla mail diventa Cancellato invece di essere eliminata; riconfermata torna Prenotato.
    Un itinerario completo che non elenca più una tratta la elimina ancora (cambio non dichiarato).
  - Non partito e Imbarco negato si mettono solo a mano e l'import non tocca mai quelle righe: una mail di
    riprotezione aggiunge il volo nuovo e quello vecchio resta registrato.
- **Prossimo lavoro**: recupero dei voli storici mancanti (#2).
- **Da fare** (richieste del 2026-10-30; mappa e archi sono fatti, sopra):
  - **Dettagli volo**: orario, giorno, terminal e gate, solo da fonti gratuite: i dati già nelle mail importate
    più un'API con quota gratuita interrogata solo per i voli imminenti (il gate compare poche ore prima).
  - **Pull to refresh** nella web app installata da Safari su iPhone.
  - **Live Activities**: restano spente, niente API a pagamento.

## Dati storici: stato (2026-10-27)
- Ryanair myRyanair: elenco prenotazioni passate, dettaglio visibile solo per le recenti. Dettagli presi da email Itinerary. Elenco in `docs/ryanair-bookings.md`.
- Takeout account terziario: 989 messaggi (2015-2026), nessun volo. Script riusabile: `scripts/mbox-flights.py`.
- Takeout account secondario (`~/flights/takeout/alessandro-1998/`): 16111 messaggi, 18 itinerari Ryanair 2019-2026. Aggiunte 12 tratte 2019-2024. Esclusi: XXXXXX (familiari), XXXXXX (altro passeggero), XXXXXX (cancellato COVID, sostituito da XXXXXX + XXXXXX), eDreams 2021 (carrelli abbandonati).
- Inseriti a mano, da ricordo (nessuna mail, la mailbox dell'account secondario parte da giugno 2017): BLQ-OLB-BLQ 10-24 ago 2015 (Wizz Air da confermare), BGY-SHJ-BGY Air Arabia 14-21 ott 2023 (G9711/G9710, dal pacchetto agenzia "Vivere a Dubai").
- `mbox-flights.py` tronca il body a 4000 caratteri: per Ryanair resta solo la parte text/plain, gli itinerari vanno letti dall'HTML.
