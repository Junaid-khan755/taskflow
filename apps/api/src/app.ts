import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { workspacesRouter } from './routes/workspaces.js';
import { boardsRouter } from './routes/boards.js';
import { columnsRouter } from './routes/columns.js';
import { tasksRouter } from './routes/tasks.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

// The app is built separately from index.ts (which starts the server)
// so tests can import it without opening a real port.
export function createApp() {
  const app = express();

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());

  app.use('/api/health', healthRouter);
  app.use('/api/workspaces', workspacesRouter);
  app.use('/api/boards', boardsRouter);
  app.use('/api/columns', columnsRouter);
  app.use('/api/tasks', tasksRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
