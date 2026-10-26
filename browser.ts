"use client";
import { createBrowserClient } from "@supabase/ssr";

// Only the public anon key is ever used in the browser. Access is limited by RLS.
export const createClient = () =>
  createBrowserClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!);
