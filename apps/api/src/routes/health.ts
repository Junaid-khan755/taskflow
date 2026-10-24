import { Router } from 'express';
import { pool } from '../db.js';

export const healthRouter = Router();

// Used by Docker, load balancers, and CI to check the app is alive
// and can reach the database.
healthRouter.get('/', async (_req, res) => {
  try {
    await pool.query('SELECT 1');
    res.json({ status: 'ok', database: 'up', uptime: process.uptime() });
  } catch {
    res.status(503).json({ status: 'degraded', database: 'down', uptime: process.uptime() });
  }
});
