// Tests use their own database so they can wipe it freely.
// CI can point at a different server with TEST_DATABASE_URL.
export const TEST_DATABASE_URL =
  process.env.TEST_DATABASE_URL ?? 'postgresql://taskflow:taskflow@localhost:5433/taskflow_test';
