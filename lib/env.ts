import { z } from "zod";

const ServerEnvSchema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().min(1, "NEXT_PUBLIC_SUPABASE_URL is required"),
  SUPABASE_SECRET_KEY: z.string().min(1, "SUPABASE_SECRET_KEY is required"),
  OPENROUTER_API_KEY: z.string().min(1, "OPENROUTER_API_KEY is required"),
});

// Throws at module load with a descriptive error if any required server env var is absent.
// Never import this from client components — server-side only.
export const serverEnv = ServerEnvSchema.parse(process.env);
