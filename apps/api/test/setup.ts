import { afterAll, beforeEach } from 'vitest';
import { prisma } from '../src/db.js';

// Every test starts from an empty database. CASCADE also clears the tables
// that reference these (members, boards, columns, tasks).
beforeEach(async () => {
  await prisma.$executeRaw`TRUNCATE users, workspaces CASCADE`;
});

afterAll(() => prisma.$disconnect());
