import { z } from "zod";

export class NotFoundError extends Error {
  constructor(what: string) {
    super(`${what} not found.`);
  }
}

export class ValidationError extends Error {
  constructor(readonly fields: Record<string, string[] | undefined>) {
    super("Some fields are not valid.");
  }
}

// Parses at the service boundary so web and MCP share one set of rules and one error shape.
export function parseInput<Schema extends z.ZodType>(schema: Schema, input: unknown): z.output<Schema> {
  const result = schema.safeParse(input);
  if (!result.success) throw new ValidationError(z.flattenError(result.error).fieldErrors as Record<string, string[]>);
  return result.data;
}
