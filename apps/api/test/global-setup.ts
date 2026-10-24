import { execSync } from 'node:child_process';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { TEST_DATABASE_URL } from './test-db.js';

// Runs once before all tests: creates the test database if it's missing,
// then applies every migration so its tables match the schema.
export async function setup() {
  const url = new URL(TEST_DATABASE_URL);
  const dbName = url.pathname.slice(1);

  // CREATE DATABASE must run while connected to a different database
  url.pathname = '/postgres';
  const admin = new PrismaClient({ adapter: new PrismaPg({ connectionString: url.toString() }) });
  try {
    const rows = await admin.$queryRaw<
      unknown[]
    >`SELECT 1 FROM pg_database WHERE datname = ${dbName}`;
    if (rows.length === 0) {
      // Identifiers can't be query parameters, hence the unsafe variant.
      // dbName comes from our own config, never from user input.
      await admin.$executeRawUnsafe(`CREATE DATABASE "${dbName}"`);
    }
  } finally {
    await admin.$disconnect();
  }

  execSync('npx prisma migrate deploy', {
    env: { ...process.env, DATABASE_URL: TEST_DATABASE_URL },
    stdio: 'ignore',
  });
}
