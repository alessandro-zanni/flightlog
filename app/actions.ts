"use server";

import { refresh } from "next/cache";
import { RedirectType, redirect } from "next/navigation";
import { createClient, requireUser } from "@/lib/supabase/server";

export async function signIn(formData: FormData) {
  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({
    email: String(formData.get("email")),
    password: String(formData.get("password")),
  });
  redirect(error ? "/login?error=1" : "/");
}

export async function signOut() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/login");
}

function flightFromForm(formData: FormData) {
  const code = (key: string) => String(formData.get(key)).trim().toUpperCase();
  const optional = (key: string) => String(formData.get(key) ?? "").trim() || null;
  return {
    date: String(formData.get("date")),
    origin: code("from"),
    destination: code("to"),
    airline: String(formData.get("airline")).trim(),
    flight: optional("flight")?.toUpperCase() ?? null,
    pnr: optional("pnr")?.toUpperCase() ?? null,
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
