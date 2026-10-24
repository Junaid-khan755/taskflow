import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from './generated/prisma/client.js';
import { env } from './config/env.js';

// One shared client for the whole app. Under the hood the pg adapter keeps
// a connection pool, so connections are reused across requests.
export const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: env.DATABASE_URL }),
});
