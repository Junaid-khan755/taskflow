import { z } from 'zod';
import { HttpError } from './http-error.js';

// Validates untrusted input (body, params) and returns it fully typed.
// Invalid input becomes a 400 with the message for each field.
export function parse<T extends z.ZodType>(schema: T, data: unknown): z.output<T> {
  const result = schema.safeParse(data);
  if (!result.success) {
    throw new HttpError(400, 'Validation failed', z.flattenError(result.error).fieldErrors);
  }
  return result.data;
}
