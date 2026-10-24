import pg from 'pg';
import { env } from './config/env.js';

// A pool keeps a few connections open and reuses them, instead of
// opening a new connection (slow) for every request.
export const pool = new pg.Pool({ connectionString: env.DATABASE_URL });
