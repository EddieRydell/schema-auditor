import { readFileSync } from 'node:fs';
import { invariantsFileSchema } from './schema.js';
import type { InvariantsFile } from './schema.js';
import type { FunctionalDependency } from '../analysis/inferFds.js';

/**
 * Parse and validate an invariants JSON file.
 * Returns the validated invariants or throws on invalid input.
 */
export function parseInvariantsFile(filePath: string): InvariantsFile {
  const content = readFileSync(filePath, 'utf-8');
  const raw: unknown = JSON.parse(content);
  return invariantsFileSchema.parse(raw);
}

/**
 * Convert parsed invariants into FunctionalDependency objects.
 */
export function invariantsToFds(invariants: InvariantsFile): readonly FunctionalDependency[] {
  const fds: FunctionalDependency[] = [];

  for (const [modelName, modelInvariants] of Object.entries(invariants)) {
    if (modelInvariants.functionalDependencies !== undefined) {
      for (const fd of modelInvariants.functionalDependencies) {
        fds.push({
          determinant: fd.determinant,
          dependent: fd.dependent,
          model: modelName,
          source: 'invariant',
        });
      }
    }
  }

  return fds;
}
