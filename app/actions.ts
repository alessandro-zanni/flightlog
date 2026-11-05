"use server";

import { refresh } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { FLIGHT_STATUSES } from "@/lib/flights";
import { createClient, requireUser } from "@/lib/supabase/server";

// A form field as text: FormData may also hold a File, which String() would turn into "[object File]".
const field = (formData: FormData, key: string) => {
  const value = formData.get(key);
  return typeof value === "string" ? value : "";
};

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: field(formData, "email"),
    password: field(formData, "password"),
  });
  redirect(error ? "/login?error=1" : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function flightFromForm(formData: FormData) {
  const code = (key: string) => field(formData, key).trim().toUpperCase();
  const optional = (key: string) => field(formData, key).trim() || null;
  return {
    date: field(formData, "date"),
    origin: code("from"),
    destination: code("to"),
    airline: field(formData, "airline").trim(),
    flight: optional("flight")?.toUpperCase() ?? null,
    pnr: optional("pnr")?.toUpperCase() ?? null,
    status: FLIGHT_STATUSES.find((s) => s === field(formData, "status")) ?? "booked",
  };
}

// 23505 = the (date, origin, destination, flight) unique constraint: the leg is already logged.
const errorParam = (code: string) => (code === "23505" ? "duplicate" : "failed");

export async function addFlight(formData: FormData) {
  const supabase = await requireUser();
  const { error } = await supabase.from("flights").insert(flightFromForm(formData));
  if (error) redirect(`/flights/new?error=${errorParam(error.code)}`);
  refresh();
  // Replace, so Back from the list does not reopen the form just submitted.
  redirect("/", RedirectType.replace);
}

export async function updateFlight(formData: FormData) {
  const supabase = await requireUser();
  const id = Number(formData.get("id"));
  const { error } = await supabase.from("flights").update(flightFromForm(formData)).eq("id", id);
  if (error) redirect(`/flights/${id}?error=${errorParam(error.code)}`);
  refresh();
  // Replace, so Back from the list does not reopen the form just submitted.
  redirect("/", RedirectType.replace);
}

export async function deleteFlight(formData: FormData) {
  const supabase = await requireUser();
  const { error } = await supabase.from("flights").delete().eq("id", Number(formData.get("id")));
  if (error) throw new Error(error.message);
  refresh();
  // Replace, so Back from the list does not reopen the form just submitted.
  redirect("/", RedirectType.replace);
}
