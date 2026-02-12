import { readFileSync } from 'node:fs';
import { getDMMF } from '@prisma/internals';
import type { AuditField, AuditModel, AuditUniqueIndex, ParseResult } from './types.js';

/**
 * Parse a Prisma schema file and return an internal representation.
 * Uses getDMMF from @prisma/internals to parse the schema into DMMF,
 * then transforms DMMF models/fields into our AuditModel[] structure.
 */
export async function parseSchema(schemaPath: string): Promise<ParseResult> {
  const schemaContent = readFileSync(schemaPath, 'utf-8');
  const dmmf = await getDMMF({ datamodel: schemaContent });

  const models: AuditModel[] = dmmf.datamodel.models.map((model) => {
    const fields: AuditField[] = model.fields.map((field) => ({
      name: field.name,
      type: field.type,
      kind: field.kind,
      isList: field.isList,
      isRequired: field.isRequired,
      isId: field.isId,
      isUnique: field.isUnique,
      hasDefaultValue: field.hasDefaultValue,
      relationName: field.relationName ?? null,
      relationFromFields:
        field.relationFromFields !== undefined && field.relationFromFields.length > 0
          ? field.relationFromFields
          : null,
      relationToFields:
        field.relationToFields !== undefined && field.relationToFields.length > 0
          ? [...field.relationToFields]
          : null,
      relationOnDelete: field.relationOnDelete ?? null,
      relationOnUpdate: field.relationOnUpdate ?? null,
      documentation: field.documentation ?? null,
    }));

    const uniqueIndexes: AuditUniqueIndex[] = model.uniqueIndexes.map((idx) => ({
      name: idx.name,
      fields: idx.fields,
    }));

    return {
      name: model.name,
      fields,
      primaryKey: model.primaryKey !== null ? { fields: model.primaryKey.fields } : null,
      uniqueIndexes,
      documentation: model.documentation ?? null,
    };
  });

  return { models };
}
