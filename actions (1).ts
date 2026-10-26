"use server";
import { redirect } from "next/navigation";
import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { postLoginPath } from "@/server/auth/roles";

const schema = z.object({ email: z.string().email(), password: z.string().min(8).max(128) });

export type LoginState = { error?: string };

export async function signIn(_: LoginState, form: FormData): Promise<LoginState> {
  const parsed = schema.safeParse({ email: form.get("email"), password: form.get("password") });
  if (!parsed.success) return { error: "Enter a valid email and a password of at least 8 characters." };
  const supabase = createClient();
  const { data, error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error || !data.user) return { error: "Incorrect email or password." }; // do not reveal which part failed
  const { data: rows } = await supabase.from("restaurant_members").select("restaurant_id, role").eq("user_id", data.user.id);
  redirect(postLoginPath(form.get("next"), rows ?? []));
}

export async function signOut() {
  await createClient().auth.signOut();
  redirect("/login");
}
