import { createApp } from './app.js';
import { env } from './config/env.js';
import { pool } from './db.js';

const app = createApp();

// Express 5 passes startup errors (e.g. port already in use) to this callback
const server = app.listen(env.PORT, (err) => {
  if (err) {
    console.error(`Failed to start API on port ${env.PORT}:`, err.message);
    process.exit(1);
  }
  console.log(`API running on http://localhost:${env.PORT}`);
});

// Graceful shutdown: finish in-flight requests and close DB connections
// before exiting (important once this runs in Docker or on a server).
function shutdown(signal: string) {
  console.log(`${signal} received, shutting down...`);
  server.close(async () => {
    await pool.end();
    process.exit(0);
  });
}

process.on('SIGINT', () => shutdown('SIGINT'));
process.on('SIGTERM', () => shutdown('SIGTERM'));
