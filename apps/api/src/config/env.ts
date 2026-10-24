import { z } from 'zod';

// Validate environment variables once at startup so the app fails fast
// with a clear message instead of crashing later on a missing value.
const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().url(),
  CORS_ORIGIN: z.string().url().default('http://localhost:5173'),
  // How many proxies sit in front of the API. 0 locally. Most hosts (Render,
  // Railway, Fly) use 1. Without this, every visitor looks like the proxy's
  // address, and the rate limiter would block everyone together.
  TRUST_PROXY: z.coerce.number().int().min(0).default(0),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  console.error('Invalid environment variables:', z.treeifyError(parsed.error));
  process.exit(1);
}

export const env = parsed.data;
