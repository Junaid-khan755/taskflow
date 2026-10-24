import 'dotenv/config';
import { PrismaPg } from '@prisma/adapter-pg';
import { PrismaClient } from '../src/generated/prisma/client.js';
import { hashPassword } from '../src/lib/password.js';

const DEMO_PASSWORD = 'password123';

// Fills the dev database with demo data: `npm run db:seed -w apps/api`.
// It wipes existing data first, so never point it at production.

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  // Deleting workspaces cascades to members, boards, columns and tasks
  await prisma.workspace.deleteMany();
  await prisma.user.deleteMany();

  // Both demo users log in with this password
  const passwordHash = await hashPassword(DEMO_PASSWORD);
  const [alice, bob] = await Promise.all([
    prisma.user.create({ data: { email: 'alice@example.com', name: 'Alice Chen', passwordHash } }),
    prisma.user.create({ data: { email: 'bob@example.com', name: 'Bob Martin', passwordHash } }),
  ]);

  const workspace = await prisma.workspace.create({
    data: {
      name: 'Acme Inc',
      slug: 'acme',
      members: {
        create: [
          { userId: alice.id, role: 'OWNER' },
          { userId: bob.id, role: 'MEMBER' },
        ],
      },
    },
  });

  const board = await prisma.board.create({
    data: {
      workspaceId: workspace.id,
      name: 'Website relaunch',
      description: 'Everything needed to ship the new marketing site',
      columns: {
        create: ['To Do', 'In Progress', 'Done'].map((name, position) => ({ name, position })),
      },
    },
    include: { columns: { orderBy: { position: 'asc' } } },
  });

  const [todo, doing, done] = board.columns;
  const tasks = [
    { columnId: todo.id, title: 'Write pricing page copy', priority: 'HIGH', assigneeId: bob.id },
    { columnId: todo.id, title: 'Collect customer logos', priority: 'LOW' },
    { columnId: doing.id, title: 'Build hero section', priority: 'URGENT', assigneeId: alice.id },
    { columnId: done.id, title: 'Pick a font pairing', priority: 'MEDIUM', assigneeId: alice.id },
  ] as const;

  // Position = order within each column
  const counts = new Map<string, number>();
  for (const task of tasks) {
    const position = counts.get(task.columnId) ?? 0;
    counts.set(task.columnId, position + 1);
    await prisma.task.create({ data: { ...task, position } });
  }

  console.log(`Seeded workspace "${workspace.name}" with board "${board.name}"`);
  console.log(
    `Log in as alice@example.com (owner) or bob@example.com (member), password: ${DEMO_PASSWORD}`,
  );
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
