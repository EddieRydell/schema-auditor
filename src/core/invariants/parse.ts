import { readFileSync } from 'node:fs';
import { invariantsFileSchema, suppressArraySchema } from './schema.js';
import type { InvariantsFile } from './schema.js';
import type { FunctionalDependency } from '../analysis/inferFds.js';
import type { ConstraintContract, Finding } from '../report/reportTypes.js';

/** Result of parsing an invariants file. */
export interface ParsedInvariants {
  readonly invariants: InvariantsFile;
  readonly suppress: readonly string[];
}

/**
 * Parse and validate an invariants JSON file.
 * Returns the validated invariants and suppress list, or throws on invalid input.
 */
export function parseInvariantsFile(filePath: string): ParsedInvariants {
  const content = readFileSync(filePath, 'utf-8');
  const raw: unknown = JSON.parse(content);

  // Extract suppress array before validating the rest as model record
  let suppress: readonly string[] = [];
  let modelData: unknown = raw;
  if (raw !== null && typeof raw === 'object' && !Array.isArray(raw)) {
    const obj = raw as Record<string, unknown>;
    if ('suppress' in obj) {
      suppress = suppressArraySchema.parse(obj['suppress']);
      const { suppress: _suppress, ...rest } = obj;
      modelData = rest;
    }
  }

  const invariants = invariantsFileSchema.parse(modelData);
  return { invariants, suppress };
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

/**
 * Validate that invariant-declared models and fields actually exist in the
 * constraint contract. Returns findings for any references that don't match,
 * so users get immediate feedback when their invariants file is stale or wrong.
 */
export function validateInvariantsAgainstContract(
  invariants: InvariantsFile,
  contract: ConstraintContract,
): readonly Finding[] {
  const findings: Finding[] = [];
  const modelMap = new Map(contract.models.map((m) => [m.name, m]));

  for (const [modelName, modelInvariants] of Object.entries(invariants)) {
    const model = modelMap.get(modelName);
    if (model === undefined) {
      findings.push({
        rule: 'INVARIANT_UNKNOWN_MODEL',
        severity: 'warning',
        normalForm: '3NF',
        model: modelName,
        field: null,
        message: `Invariants reference model "${modelName}" which does not exist in the schema.`,
        fix: `Update the invariants file to remove or rename model '${modelName}'.`,
      });
      continue;
    }

    const fieldNames = new Set(model.fields.map((f) => f.name));
    if (modelInvariants.functionalDependencies !== undefined) {
      // Collect constraint field arrays for enforcement check
      const constraintFieldSets: readonly string[][] = [
        ...(model.primaryKey !== null ? [model.primaryKey.fields as string[]] : []),
        ...model.uniqueConstraints.map((uq) => uq.fields as string[]),
      ];

      for (const fd of modelInvariants.functionalDependencies) {
        const allReferencedFields = new Set([...fd.determinant, ...fd.dependent]);
        let hasUnknownDeterminantField = false;
        for (const field of allReferencedFields) {
          if (!fieldNames.has(field)) {
            if (fd.determinant.includes(field)) {
              hasUnknownDeterminantField = true;
            }
            findings.push({
              rule: 'INVARIANT_UNKNOWN_FIELD',
              severity: 'warning',
              normalForm: '3NF',
              model: modelName,
              field,
              message: `Invariants reference field "${field}" which does not exist in model "${modelName}".`,
              fix: `Update the invariants file to remove or rename field '${field}' in model '${modelName}'.`,
            });
          }
        }

        // Check if determinant is enforced by any PK or unique constraint.
        // Skip if any determinant field doesn't exist (already reported above).
        if (!hasUnknownDeterminantField) {
          const detSet = new Set(fd.determinant);
          const isEnforced = constraintFieldSets.some((constraintFields) =>
            constraintFields.every((cf) => detSet.has(cf)),
          );
          if (!isEnforced) {
            const det = fd.determinant.join(', ');
            findings.push({
              rule: 'INVARIANT_DETERMINANT_NOT_ENFORCED',
              severity: 'warning',
              normalForm: 'SCHEMA',
              model: modelName,
              field: null,
              message: `Invariant FD {${det}} → {${fd.dependent.join(', ')}} on "${modelName}": determinant is not enforced by any PK or unique constraint.`,
              fix: `Add @@unique([${det}]) to enforce this functional dependency.`,
            });
          }
        }
      }
    }
  }

  return findings;
}
