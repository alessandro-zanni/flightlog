import { addFlight } from "@/app/actions";
import { FlightPage } from "@/app/flights/flight-form";
import { getI18n } from "@/lib/i18n";

// Reads the session on every request: blocking on the server is fine for a personal app.
export const instant = false;

export default async function NewFlightPage({ searchParams }: PageProps<"/flights/new">) {
  const { error } = await searchParams;
  const i18n = await getI18n();
  return (
    <FlightPage
      i18n={i18n}
      title={i18n.t.newFlight}
      allFlights={[]}
      action={addFlight}
      error={typeof error === "string" ? error : undefined}
    />
  );
}
