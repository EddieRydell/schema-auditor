import type { ConstraintContract, Finding, ModelContract } from '../../report/reportTypes.js';
import type { FunctionalDependency } from '../inferFds.js';
import { extractCandidateKeys } from '../computeKeys.js';

/**
 * Check for 2NF violations (heuristic-based).
 *
 * Checks:
 * - NF2_PARTIAL_DEPENDENCY_SUSPECTED: Composite key models with fields that
 *   appear to depend on only part of the key (detected via FK relationships)
 * - NF2_JOIN_TABLE_DUPLICATED_ATTR_SUSPECTED: Join tables (composite PK with
 *   only FK fields) that carry extra non-key attributes
 */
export function check2nf(
  contract: ConstraintContract,
  fds: readonly FunctionalDependency[],
): readonly Finding[] {
  const findings: Finding[] = [];

  for (const model of contract.models) {
    const keys = extractCandidateKeys(contract, model.name);
    const compositePk = keys.find((k) => k.source === 'pk' && k.fields.length > 1);

    if (compositePk !== undefined) {
      checkPartialDependency(model, compositePk.fields, fds, findings);
      checkJoinTableDuplicatedAttr(model, compositePk.fields, findings);
    }
  }

  return findings;
}

/**
 * Detect possible partial dependencies: non-key fields that are functionally
 * determined by a proper subset of the composite PK (via FK relationships).
 */
function checkPartialDependency(
  model: ModelContract,
  pkFields: readonly string[],
  fds: readonly FunctionalDependency[],
  findings: Finding[],
): void {
  const nonKeyFields = model.fields
    .map((f) => f.name)
    .filter((name) => !pkFields.includes(name));

  // Check if any FK determinant is a proper subset of the PK
  const fkFds = fds.filter((fd) => fd.model === model.name && fd.source === 'fk');

  for (const fkFd of fkFds) {
    const isProperSubset =
      fkFd.determinant.length < pkFields.length &&
      fkFd.determinant.every((f) => pkFields.includes(f));

    if (isProperSubset) {
      // Find non-key fields that might depend on this FK subset
      const suspectedFields = nonKeyFields.filter((f) => !fkFd.determinant.includes(f));
      if (suspectedFields.length > 0) {
        for (const field of suspectedFields) {
          findings.push({
            rule: 'NF2_PARTIAL_DEPENDENCY_SUSPECTED',
            severity: 'warning',
            normalForm: '2NF',
            model: model.name,
            field,
            message: `Field "${field}" in composite-key model "${model.name}" may depend on only a subset of the primary key (${fkFd.determinant.join(', ')}). Consider extracting to a separate table.`,
          });
        }
      }
    }
  }
}

/**
 * Detect join tables with extra attributes. A join table has a composite PK
 * where all PK fields are also FK fields. Extra non-key attributes suggest
 * the table should be an entity with its own identity.
 */
function checkJoinTableDuplicatedAttr(
  model: ModelContract,
  pkFields: readonly string[],
  findings: Finding[],
): void {
  // Check if all PK fields are FK fields
  const fkFieldSets = model.foreignKeys.map((fk) => fk.fields).flat();
  const allPkFieldsAreFk = pkFields.every((f) => fkFieldSets.includes(f));

  if (!allPkFieldsAreFk) {
    return;
  }

  // Find non-key, non-FK fields
  const allFkFields = new Set(fkFieldSets);
  const extraFields = model.fields
    .map((f) => f.name)
    .filter((name) => !pkFields.includes(name) && !allFkFields.has(name));

  if (extraFields.length > 0) {
    findings.push({
      rule: 'NF2_JOIN_TABLE_DUPLICATED_ATTR_SUSPECTED',
      severity: 'warning',
      normalForm: '2NF',
      model: model.name,
      field: null,
      message: `Join table "${model.name}" has extra attributes [${extraFields.join(', ')}] beyond its composite key. Consider whether this should be a first-class entity.`,
    });
  }
}
