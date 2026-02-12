import { z } from 'zod/v4';

/**
 * Zod schema for a single functional dependency declaration in invariants.
 */
const functionalDependencySchema = z.object({
  determinant: z.array(z.string()).min(1),
  dependent: z.array(z.string()).min(1),
  note: z.string().optional(),
  rule: z.string().optional(),
});

/**
 * Zod schema for model-level invariants.
 */
const modelInvariantsSchema = z.object({
  functionalDependencies: z.array(functionalDependencySchema).optional(),
});

/**
 * Zod schema for the full invariants file.
 * Top-level keys are model names, values are model invariants.
 */
export const invariantsFileSchema = z.record(z.string(), modelInvariantsSchema);

/**
 * Zod schema for the suppress array.
 * Format: RULE_CODE:ModelName or RULE_CODE:ModelName.fieldName
 */
export const suppressArraySchema = z.array(
  z.string().regex(/^[A-Z][A-Z0-9_]*:[A-Za-z][A-Za-z0-9_]*(\.[A-Za-z][A-Za-z0-9_]*)?$/),
);

/** Parsed type for a functional dependency. */
export type InvariantFd = z.infer<typeof functionalDependencySchema>;

/** Parsed type for the full invariants file. */
export type InvariantsFile = z.infer<typeof invariantsFileSchema>;
