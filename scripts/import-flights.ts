// Loads data/flights.json into Supabase. Idempotent: legs already present are skipped.
// Usage: NEXT_PUBLIC_SUPABASE_URL=... SUPABASE_SECRET_KEY=... bun scripts/import-flights.ts [file.json]
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import type { Flight } from "@/lib/flights";

const file = process.argv[2] ?? "data/flights.json";
const flights: Flight[] = await Bun.file(file).json();
const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);

const { data, error } = await supabase
  .from("flights")
  .upsert(
    flights.map((f) => ({
      date: f.date,
      origin: f.from,
      destination: f.to,
      airline: f.airline,
      flight: f.flight ?? null,
      pnr: f.pnr ?? null,
    })),
    { onConflict: "date,origin,destination,flight", ignoreDuplicates: true },
  )
  .select("id");
if (error) throw new Error(error.message);
console.log(`${flights.length} in file, ${data.length} inserted into ${process.env.NEXT_PUBLIC_SUPABASE_URL}`);
