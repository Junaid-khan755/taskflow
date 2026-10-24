import { z } from 'zod';
import { Priority } from '../generated/prisma/client.js';

// Shared validation rules for request bodies and URL params.

export const idParams = <K extends string>(...keys: K[]) =>
  z.object(Object.fromEntries(keys.map((k) => [k, z.uuid()])) as Record<K, z.ZodUUID>);

const name = z.string().trim().min(1).max(100);
const description = z.string().trim().max(5000).nullable();
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
  title: z.string().trim().min(1).max(200),
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
