import 'dotenv/config';
import { defineConfig } from 'prisma/config';

// Prisma CLI settings (migrate, generate, seed). The app itself reads
// DATABASE_URL through src/config/env.ts.
export default defineConfig({
  schema: 'prisma/schema.prisma',
  migrations: {
    path: 'prisma/migrations',
    seed: 'tsx prisma/seed.ts',
  },
  datasource: {
    // Not env('DATABASE_URL'), which throws when the variable is missing.
    // `prisma generate` runs on `npm install` (fresh clones, CI) and doesn't
    // need a database; commands that do will fail with a clear error.
    url: process.env.DATABASE_URL ?? '',
  },
});
