import { notFound } from "next/navigation";
import { deleteFlight, updateFlight } from "@/app/actions";
import { FlightPage } from "@/app/flights/flight-form";
import { FLIGHT_COLUMNS } from "@/lib/flights";
import { getI18n } from "@/lib/i18n";
import { createClient } from "@/lib/supabase/server";

// Reads the session on every request: blocking on the server is fine for a personal app.
export const instant = false;

export default async function EditFlightPage({ params, searchParams }: PageProps<"/flights/[id]">) {
  const [{ id }, { error }] = await Promise.all([params, searchParams]);
  const i18n = await getI18n();
  const { t } = i18n;
  const supabase = await createClient();
  const { data, error: dbError } = await supabase.from("flights").select(FLIGHT_COLUMNS);
  if (dbError) throw new Error(dbError.message);
  const flight = data.find((f) => f.id === Number(id));
  if (!flight) notFound();

  return (
    <FlightPage
      i18n={i18n}
      title={t.editFlight}
      flight={flight}
      allFlights={data}
      action={updateFlight}
      error={typeof error === "string" ? error : undefined}
      footer={
        // Delete stands alone, far from Save, and asks twice: open the disclosure, then confirm.
        <details className="mt-12 border-t-2 border-rule pt-6">
          <summary className="w-fit cursor-pointer list-none [&::-webkit-details-marker]:hidden border-2 border-alert px-4 py-2.5 font-semibold text-alert hover:bg-alert hover:text-white">
            {t.delete}
          </summary>
          <form action={deleteFlight} className="mt-4 flex flex-col items-start gap-3">
            <input type="hidden" name="id" value={flight.id} />
            <p className="text-muted">{t.deleteWarning}</p>
            <button className="bg-alert px-4 py-2.5 font-semibold text-white hover:bg-ink">{t.deleteConfirm}</button>
          </form>
        </details>
      }
    />
  );
}
