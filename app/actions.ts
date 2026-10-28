"use server";

import { refresh } from "next/cache";
import { redirect } from "next/navigation";
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

export async function addFlight(formData: FormData) {
  const supabase = await requireUser();
  const code = (key: string) => String(formData.get(key)).trim().toUpperCase();
  const optional = (key: string) => String(formData.get(key) ?? "").trim() || null;
  const { error } = await supabase.from("flights").insert({
    date: String(formData.get("date")),
    origin: code("from"),
    destination: code("to"),
    airline: String(formData.get("airline")).trim(),
    flight: optional("flight")?.toUpperCase() ?? null,
    pnr: optional("pnr")?.toUpperCase() ?? null,
  });
  if (error) throw new Error(error.message);
  refresh();
}

export async function deleteFlight(formData: FormData) {
  const supabase = await requireUser();
  const { error } = await supabase.from("flights").delete().eq("id", Number(formData.get("id")));
  if (error) throw new Error(error.message);
  refresh();
}
