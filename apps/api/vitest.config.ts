import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './test/test-db.js';

export default defineConfig({
  test: {
    env: {
      NODE_ENV: 'test',
      DATABASE_URL: TEST_DATABASE_URL,
      JWT_SECRET: 'test-secret-that-is-at-least-32-characters-long',
    },
    globalSetup: './test/global-setup.ts',
    setupFiles: './test/setup.ts',
    // All test files share one database, so run them one at a time
    fileParallelism: false,
  },
});
