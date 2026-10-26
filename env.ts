import "server-only";
import { z } from "zod";

export class ConfigError extends Error {}

const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(20),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(20),
  NEXT_PUBLIC_SITE_URL: z.string().url(),
  ORDER_TOKEN_SECRET: z.string().min(32),
});

export function serverEnv() {
  const parsed = schema.safeParse(process.env);
  if (!parsed.success) {
    const keys = parsed.error.issues.map((i) => i.path.join(".")).join(", ");
    throw new ConfigError(`Missing or invalid environment variables: ${keys}. See .env.example.`);
  }
  return parsed.data;
}
