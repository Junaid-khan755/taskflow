import { z } from 'zod';
import { Priority } from '../generated/prisma/client.js';

// Shared validation rules for request bodies and URL params.

export const idParams = <K extends string>(...keys: K[]) =>
  z.object(Object.fromEntries(keys.map((k) => [k, z.uuid()])) as Record<K, z.ZodUUID>);

// Messages are written for the people using the app, because the frontend
// shows them as they are
const name = z
  .string()
  .trim()
  .min(1, "Name can't be empty")
  .max(100, 'Name must be 100 characters or less');
const description = z
  .string()
  .trim()
  .max(5000, 'Description must be 5000 characters or less')
  .nullable();
const position = z.number().int().min(0);

// PATCH bodies with no fields are almost always a client bug
const nonEmpty = <T extends object>(body: T) => Object.keys(body).length > 0;
const nonEmptyMessage = 'Provide at least one field to update';

export const workspaceCreate = z.object({
  name,
  slug: z
    .string()
    .min(2)
    .max(50)
    .regex(/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Use lowercase letters, numbers and single dashes'),
});

export const boardCreate = z.object({
  name,
  description: description.optional(),
  // New boards start with these columns unless the client sends its own
  columns: z.array(name).max(20).default(['To Do', 'In Progress', 'Done']),
});

export const boardUpdate = z
  .object({ name: name.optional(), description: description.optional() })
  .refine(nonEmpty, nonEmptyMessage);

export const columnCreate = z.object({ name, position: position.optional() });

export const columnUpdate = z
  .object({ name: name.optional(), position: position.optional() })
  .refine(nonEmpty, nonEmptyMessage);

const taskFields = {
  title: z
    .string()
    .trim()
    .min(1, "Title can't be empty")
    .max(200, 'Title must be 200 characters or less'),
  description: description.optional(),
  priority: z.enum(Priority).optional(),
  // ISO 8601 date-time, e.g. "2026-11-01T17:00:00Z"
  dueDate: z.iso
    .datetime({ offset: true })
    .transform((s) => new Date(s))
    .nullable()
    .optional(),
  assigneeId: z.uuid().nullable().optional(),
};

export const taskCreate = z.object(taskFields);

export const taskUpdate = z
  .object({ ...taskFields, title: taskFields.title.optional() })
  .refine(nonEmpty, nonEmptyMessage);

export const taskMove = z.object({ columnId: z.uuid(), position });

// Spaces are trimmed *before* checking the format, so " ann@example.com "
// is accepted. Lowercased so "Ann@Example.com" and "ann@example.com" are
// the same account.
const email = z
  .string()
  .trim()
  .toLowerCase()
  .pipe(z.email('Enter a valid email address').max(254, 'Email is too long'));

// The most-used passwords, which attackers always try first.
// Real apps check against much bigger lists (e.g. the "Have I Been Pwned" API).
const COMMON_PASSWORDS = new Set([
  '12345678',
  '123456789',
  '1234567890',
  '87654321',
  '11111111',
  '00000000',
  'password',
  'password1',
  'password12',
  'password123',
  'passw0rd',
  'qwerty123',
  'qwertyuiop',
  'abcdefgh',
  'abc12345',
  'iloveyou',
  'letmein1',
  'welcome1',
  'admin123',
  'taskflow',
  'taskflow1',
]);

const newPassword = z
  .string()
  .min(8, 'Password must be at least 8 characters')
  // A max length stops someone sending a huge "password" to burn CPU
  .max(128, 'Password must be 128 characters or less')
  .refine((password) => password.trim() !== '', "Password can't be only spaces")
  .refine(
    (password) => !COMMON_PASSWORDS.has(password.toLowerCase()),
    'This password is too common. Please choose one that is harder to guess.',
  );

export const register = z.object({
  name: z
    .string()
    .trim()
    .min(1, 'Please enter your name')
    .max(100, 'Name must be 100 characters or less'),
  email,
  password: newPassword,
});

// Login doesn't check strength: it only needs to match what was saved
export const login = z.object({
  email,
  password: z
    .string()
    .min(1, 'Please enter your password')
    .max(128, 'Password must be 128 characters or less'),
});

export const memberAdd = z.object({
  email,
  // Ownership can't be handed out by invitation
  role: z.enum(['ADMIN', 'MEMBER']).default('MEMBER'),
});
