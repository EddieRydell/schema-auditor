import type { ConstraintContract, Finding } from '../../report/reportTypes.js';

/**
 * Check for soft-delete consistency issues.
 *
 * For each model with a soft-delete field (deleted_at or deletedAt, DateTime type),
 * every unique constraint should include the soft-delete field. Otherwise, uniqueness
 * is not scoped to active records, and "deleted" rows can conflict with new ones.
 */
export function checkSoftDelete(contract: ConstraintContract): readonly Finding[] {
  const findings: Finding[] = [];

  for (const model of contract.models) {
    const softDeleteField = model.fields.find(
      (f) => (f.name === 'deleted_at' || f.name === 'deletedAt') && f.type === 'DateTime',
    );

    // Check unique constraints include soft-delete field
    if (softDeleteField !== undefined) {
      for (const uq of model.uniqueConstraints) {
        if (!uq.fields.includes(softDeleteField.name)) {
          const existingFields = uq.fields.join(', ');
          findings.push({
            rule: 'SOFTDELETE_MISSING_IN_UNIQUE',
            severity: 'warning',
            normalForm: 'SCHEMA',
            model: model.name,
            field: softDeleteField.name,
            message: `Unique constraint (${existingFields}) on "${model.name}" does not include soft-delete field "${softDeleteField.name}". Deleted rows may conflict with active records.`,
            fix: `Add '${softDeleteField.name}' to this unique constraint: @@unique([${existingFields}, ${softDeleteField.name}])`,
          });
        }
      }
    }

    // Check deleted_at / deleted_by pairing
    const deletedByField = model.fields.find(
      (f) => f.name === 'deleted_by' || f.name === 'deletedBy',
    );

    if (softDeleteField !== undefined && deletedByField === undefined) {
      findings.push({
        rule: 'SOFTDELETE_AT_WITHOUT_BY',
        severity: 'info',
        normalForm: 'SCHEMA',
        model: model.name,
        field: softDeleteField.name,
        message: `Model "${model.name}" has "${softDeleteField.name}" but no "deleted_by"/"deletedBy" field to track who performed the soft-delete.`,
        fix: `Add a 'deleted_by' field to "${model.name}" to record the actor.`,
      });
    } else if (deletedByField !== undefined && softDeleteField === undefined) {
      findings.push({
        rule: 'SOFTDELETE_BY_WITHOUT_AT',
        severity: 'info',
        normalForm: 'SCHEMA',
        model: model.name,
        field: deletedByField.name,
        message: `Model "${model.name}" has "${deletedByField.name}" but no "deleted_at"/"deletedAt" DateTime field. The soft-delete pattern is incomplete.`,
        fix: `Add a 'deleted_at DateTime?' field to "${model.name}" to complete the soft-delete pattern.`,
      });
    }
  }

  return findings;
}
