import type { Metadata } from "next";
import Link from "next/link";
import { Arrow } from "@/components/pictograms";
import { getI18n } from "@/lib/i18n";

// The language follows the browser, read on every request like the other pages.
export const instant = false;

export const metadata: Metadata = { title: "Privacy · Flightlog" };

// Kept out of the public repo: set per environment, the placeholder makes a missing value visible.
const CONTACT = process.env.PRIVACY_CONTACT_EMAIL ?? "[PRIVACY_CONTACT_EMAIL not set]";
const UPDATED = "2026-11-14";

type Notice = { title: string; updated: string; sections: { h: string; p: string[] }[] };

const it: Notice = {
  title: "Informativa privacy",
  updated: "Ultimo aggiornamento",
  sections: [
    {
      h: "Chi tratta i dati",
      p: [
        `Titolare del trattamento è Alessandro Zanni, che ha creato e usa Flightlog come diario personale dei propri voli. Per qualsiasi richiesta sulla privacy scrivi a ${CONTACT}.`,
        "Questa informativa è resa ai sensi dell'art. 13 del Regolamento (UE) 2016/679 (GDPR).",
      ],
    },
    {
      h: "Quali dati e perché",
      p: [
        "Account: email e password per accedere, gestiti da Supabase Auth. La registrazione è chiusa: esiste un solo utente, il titolare. Base giuridica: esecuzione del servizio (art. 6.1.b).",
        "Voli: data, aeroporti, compagnia, numero di volo, codice di prenotazione, orario, terminal, gate e stato di ciascun volo del titolare, salvati in un database Supabase. Base giuridica: esecuzione del servizio (art. 6.1.b).",
        "Mail di conferma volo: le mail inoltrate all'indirizzo di importazione sono ricevute da un Cloudflare Email Worker, che accetta solo mittenti autorizzati e rifiuta le altre. Il testo della mail (mittente, oggetto, data, contenuto) passa all'API di Anthropic (modello Claude) per estrarre le tratte del titolare. La mail non viene salvata dall'app: restano solo i dati del volo estratti. Una mail può contenere dati di altre persone (per esempio altri passeggeri della prenotazione): vengono letti solo per estrarre le tratte e non sono conservati. Base giuridica: legittimo interesse del titolare a tenere il proprio storico voli (art. 6.1.f).",
        "Gate e terminal: per i voli in partenza a breve, numero di volo e data sono inviati ad AeroDataBox tramite RapidAPI per ottenere gate e terminal. Non viene inviato nessun nome o dato personale. Base giuridica: esecuzione del servizio (art. 6.1.b).",
        "Log tecnici: Vercel, che ospita l'app, registra dati delle richieste (come indirizzo IP, data e pagina richiesta) per il funzionamento e la sicurezza. Base giuridica: legittimo interesse alla sicurezza del servizio (art. 6.1.f).",
        "Statistiche: Vercel Analytics e Speed Insights misurano visite e prestazioni delle pagine in forma aggregata, senza cookie. Base giuridica: legittimo interesse a capire se l'app funziona bene (art. 6.1.f).",
      ],
    },
    {
      h: "Cookie",
      p: [
        "Flightlog usa solo cookie tecnici: quelli di sessione di Supabase, che tengono l'accesso attivo. Non ci sono cookie di profilazione né di terze parti, quindi non serve un banner di consenso.",
      ],
    },
    {
      h: "Fornitori",
      p: [
        "I dati sono trattati per conto del titolare da questi fornitori, ciascuno come responsabile del trattamento:",
        "Vercel Inc.: hosting dell'app (region Francoforte), log, Analytics e Speed Insights.",
        "Supabase Inc.: database e autenticazione (region Francoforte).",
        "Cloudflare Inc.: ricezione delle mail inoltrate (Email Routing ed Email Worker).",
        "Anthropic PBC: lettura delle mail per estrarre le tratte.",
        "RapidAPI e AeroDataBox: gate e terminal a partire da numero di volo e data.",
        "Alcuni fornitori hanno sede negli Stati Uniti: i trasferimenti avvengono con le garanzie previste dagli artt. 44 e seguenti del GDPR (Data Privacy Framework UE-USA o clausole contrattuali standard), secondo le condizioni di ciascun fornitore.",
      ],
    },
    {
      h: "Per quanto tempo",
      p: [
        "Account e voli: finché il titolare non li cancella. Un volo si cancella in qualsiasi momento dalla sua pagina.",
        "Mail inoltrate: l'app non le conserva. Cloudflare e Anthropic le trattano solo per il tempo indicato nelle loro condizioni.",
        "Log e statistiche: per il periodo previsto da Vercel.",
      ],
    },
    {
      h: "I tuoi diritti",
      p: [
        `Puoi chiedere l'accesso ai tuoi dati, la rettifica, la cancellazione, la limitazione del trattamento, la portabilità e opporti al trattamento basato sul legittimo interesse (artt. 15-22 GDPR), scrivendo a ${CONTACT}.`,
        "Se ritieni che il trattamento violi il GDPR puoi proporre reclamo al Garante per la protezione dei dati personali (garanteprivacy.it) o all'autorità del Paese in cui vivi o lavori.",
      ],
    },
  ],
};

const en: Notice = {
  title: "Privacy notice",
  updated: "Last updated",
  sections: [
    {
      h: "Who processes the data",
      p: [
        `The controller is Alessandro Zanni, who built Flightlog and uses it as a personal log of his own flights. For any privacy request write to ${CONTACT}.`,
        "This notice is given under Article 13 of Regulation (EU) 2016/679 (GDPR).",
      ],
    },
    {
      h: "What data and why",
      p: [
        "Account: email and password to sign in, handled by Supabase Auth. Sign-up is closed: there is a single user, the controller. Legal basis: providing the service (Art. 6(1)(b)).",
        "Flights: date, airports, airline, flight number, booking reference, time, terminal, gate and status of each of the controller's flights, stored in a Supabase database. Legal basis: providing the service (Art. 6(1)(b)).",
        "Flight confirmation emails: emails forwarded to the import address are received by a Cloudflare Email Worker, which accepts authorised senders only and rejects the rest. The email (sender, subject, date, body) is passed to the Anthropic API (Claude model) to extract the controller's flights. The app does not store the email: only the extracted flight data is kept. An email may contain other people's data (for example other passengers on the booking): it is read only to extract the flights and is not kept. Legal basis: the controller's legitimate interest in keeping his own flight history (Art. 6(1)(f)).",
        "Gate and terminal: for flights departing soon, the flight number and date are sent to AeroDataBox through RapidAPI to get the gate and terminal. No name or other personal data is sent. Legal basis: providing the service (Art. 6(1)(b)).",
        "Server logs: Vercel, which hosts the app, logs request data (such as IP address, time and requested page) to run and secure the service. Legal basis: legitimate interest in securing the service (Art. 6(1)(f)).",
        "Statistics: Vercel Analytics and Speed Insights measure page visits and performance in aggregate, without cookies. Legal basis: legitimate interest in knowing the app works well (Art. 6(1)(f)).",
      ],
    },
    {
      h: "Cookies",
      p: [
        "Flightlog only uses technical cookies: Supabase session cookies that keep you signed in. There are no profiling or third-party cookies, so no consent banner is needed.",
      ],
    },
    {
      h: "Providers",
      p: [
        "These providers process data on the controller's behalf, each as a processor:",
        "Vercel Inc.: app hosting (Frankfurt region), logs, Analytics and Speed Insights.",
        "Supabase Inc.: database and authentication (Frankfurt region).",
        "Cloudflare Inc.: receiving forwarded emails (Email Routing and Email Worker).",
        "Anthropic PBC: reading emails to extract flights.",
        "RapidAPI and AeroDataBox: gate and terminal from flight number and date.",
        "Some providers are based in the United States: transfers rely on the safeguards in Articles 44 ff. GDPR (EU-US Data Privacy Framework or standard contractual clauses), under each provider's terms.",
      ],
    },
    {
      h: "How long",
      p: [
        "Account and flights: until the controller deletes them. A flight can be deleted at any time from its page.",
        "Forwarded emails: the app does not keep them. Cloudflare and Anthropic process them only for the time set out in their terms.",
        "Logs and statistics: for the period set by Vercel.",
      ],
    },
    {
      h: "Your rights",
      p: [
        `You can ask for access to your data, rectification, erasure, restriction of processing and portability, and object to processing based on legitimate interest (Arts. 15-22 GDPR), by writing to ${CONTACT}.`,
        "If you believe the processing breaches the GDPR you can lodge a complaint with the Italian data protection authority, the Garante per la protezione dei dati personali (garanteprivacy.it), or with the authority where you live or work.",
      ],
    },
  ],
};

export default async function PrivacyPage() {
  const { locale, date } = await getI18n();
  const n = locale === "it" ? it : en;
  return (
    <main className="flex flex-1 flex-col">
      <header className="flex h-14 items-center bg-ink px-4 text-white">
        <Link href="/" className="flex items-center gap-2 font-semibold hover:text-sign">
          <Arrow className="size-5 rotate-180" />
          Flightlog
        </Link>
      </header>
      <div className="bg-sign px-4 py-6">
        <h1 className="text-4xl leading-none font-extrabold tracking-tight">{n.title}</h1>
      </div>
      <article className="mx-auto w-full max-w-2xl px-4 py-8">
        <p className="text-sm text-muted">
          {n.updated}: {date(UPDATED, { dateStyle: "long" })}
        </p>
        {n.sections.map((s) => (
          <section key={s.h} className="mt-8">
            <h2 className="text-lg font-semibold">{s.h}</h2>
            {s.p.map((p) => (
              <p key={p} className="mt-3">{p}</p>
            ))}
          </section>
        ))}
      </article>
    </main>
  );
}
