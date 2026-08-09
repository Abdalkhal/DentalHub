import { z } from "zod";

export function validate<T>(
  schema: z.ZodSchema<T>,
  data: unknown,
): { success: true; data: T } | { success: false; error: string } {
  const result = schema.safeParse(data);
  if (result.success) return { success: true, data: result.data };
  return { success: false, error: result.error.errors.map((e) => `${e.path.join(".")}: ${e.message}`).join(", ") };
}

export function assertValid<T>(schema: z.ZodSchema<T>, data: unknown): T {
  const result = validate(schema, data);
  if (!result.success) throw new Error(`Validation failed: ${result.error}`);
  return result.data;
}
