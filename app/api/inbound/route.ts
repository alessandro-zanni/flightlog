import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { extractFlights, toRows, type InboundEmail } from "@/lib/inbound";

// Called by the Cloudflare Email Worker for each mail sent to flights@alessandrozanni.dev.
export async function POST(request: Request) {
  const expected = Buffer.from(`Bearer ${process.env.INBOUND_SECRET ?? ""}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  if (!process.env.INBOUND_SECRET || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const email = (await request.json()) as InboundEmail;
  const rows = toRows(await extractFlights(email));
  if (rows.length === 0) return Response.json({ extracted: 0, inserted: 0 });

  // Secret key: no user session here, RLS is bypassed on purpose.
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const { data, error } = await supabase
    .from("flights")
    .upsert(rows, { onConflict: "date,origin,destination,flight", ignoreDuplicates: true })
    .select("date, origin, destination, flight");
  if (error) return Response.json({ error: error.message }, { status: 500 });
  return Response.json({ extracted: rows.length, inserted: data.length, flights: data });
}
