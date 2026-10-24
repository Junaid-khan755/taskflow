import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import cookieParser from 'cookie-parser';
import { env } from './config/env.js';
import { healthRouter } from './routes/health.js';
import { createAuthRouter } from './routes/auth.js';
import { workspacesRouter } from './routes/workspaces.js';
import { boardsRouter } from './routes/boards.js';
import { columnsRouter } from './routes/columns.js';
import { tasksRouter } from './routes/tasks.js';
import { requireAuth } from './middleware/auth.js';
import { errorHandler, notFound } from './middleware/error-handler.js';

// The app is built separately from index.ts (which starts the server)
// so tests can import it without opening a real port.
// Rate limits are on everywhere except tests (which can turn them on).
export function createApp({ rateLimit = env.NODE_ENV !== 'test' } = {}) {
  const app = express();

  // Behind a host's proxy, read the real visitor address from the proxy's
  // X-Forwarded-For header (see TRUST_PROXY in config/env.ts)
  app.set('trust proxy', env.TRUST_PROXY);

  app.use(helmet());
  app.use(cors({ origin: env.CORS_ORIGIN, credentials: true }));
  app.use(express.json());
  app.use(cookieParser());

  // Public routes
  app.use('/api/health', healthRouter);
  app.use('/api/auth', createAuthRouter({ rateLimit }));

  // Everything below needs a logged-in user. Each route then checks that
  // the user belongs to the workspace it's touching (see lib/access.ts).
  app.use('/api/workspaces', requireAuth, workspacesRouter);
  app.use('/api/boards', requireAuth, boardsRouter);
  app.use('/api/columns', requireAuth, columnsRouter);
  app.use('/api/tasks', requireAuth, tasksRouter);

  app.use(notFound);
  app.use(errorHandler);

  return app;
}
