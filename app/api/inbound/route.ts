import { timingSafeEqual } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/database.types";
import { extractFlights, mentionedDates, planChanges, type InboundEmail } from "@/lib/inbound";

// Called by the Cloudflare Email Worker for each mail sent to flights@alessandrozanni.dev.
export async function POST(request: Request) {
  const expected = Buffer.from(`Bearer ${process.env.INBOUND_SECRET ?? ""}`);
  const given = Buffer.from(request.headers.get("authorization") ?? "");
  if (!process.env.INBOUND_SECRET || given.length !== expected.length || !timingSafeEqual(given, expected)) {
    return Response.json({ error: "unauthorized" }, { status: 401 });
  }

  const extraction = await extractFlights((await request.json()) as InboundEmail);
  if (extraction.legs.length === 0) return Response.json({ extracted: 0 });
  // The PNR ends up in a PostgREST filter string: accept only what a booking reference looks like.
  const pnr = extraction.pnr?.trim().toUpperCase() ?? "";
  extraction.pnr = /^[A-Z0-9]{5,8}$/.test(pnr) ? pnr : null;

  // Secret key: no user session here, RLS is bypassed on purpose.
  const supabase = createClient<Database>(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SECRET_KEY!);
  const dates = mentionedDates(extraction).join(",");
  const filters = [extraction.pnr && `pnr.eq.${extraction.pnr}`, dates && `date.in.(${dates})`].filter(Boolean);
  const existing = filters.length ? await supabase.from("flights").select().or(filters.join(",")) : { data: [], error: null };
  if (existing.error) return Response.json({ error: existing.error.message }, { status: 500 });

  // ponytail: three statements, not one transaction; a failure halfway leaves part of the change applied
  const plan = planChanges(existing.data, extraction);
  if (plan.remove.length) {
    const { error } = await supabase.from("flights").delete().in("id", plan.remove);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  for (const { id, values } of plan.update) {
    const { error } = await supabase.from("flights").update(values).eq("id", id);
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  if (plan.insert.length) {
    const { error } = await supabase
      .from("flights")
      .upsert(plan.insert, { onConflict: "date,origin,destination,flight", ignoreDuplicates: true });
    if (error) return Response.json({ error: error.message }, { status: 500 });
  }
  return Response.json({
    extracted: extraction.legs.length,
    inserted: plan.insert.length,
    updated: plan.update.length,
    removed: plan.remove.length,
  });
}
