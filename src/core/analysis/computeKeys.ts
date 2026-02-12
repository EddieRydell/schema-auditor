import type { ConstraintContract } from '../report/reportTypes.js';

/** A candidate key for a model. */
export interface CandidateKey {
  readonly fields: readonly string[];
  readonly model: string;
  readonly source: 'pk' | 'unique';
}

/**
 * Extract candidate keys from the constraint contract for a given model.
 * A candidate key is either the primary key or a unique constraint.
 */
export function extractCandidateKeys(
  contract: ConstraintContract,
  modelName: string,
): readonly CandidateKey[] {
  const model = contract.models.find((m) => m.name === modelName);
  if (model === undefined) {
    return [];
  }

  const keys: CandidateKey[] = [];

  if (model.primaryKey !== null) {
    keys.push({
      fields: model.primaryKey.fields,
      model: modelName,
      source: 'pk',
    });
  }

  for (const uq of model.uniqueConstraints) {
    keys.push({
      fields: uq.fields,
      model: modelName,
      source: 'unique',
    });
  }

  return keys;
}
