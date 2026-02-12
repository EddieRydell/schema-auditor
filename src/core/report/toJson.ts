import type { AuditResult } from './reportTypes.js';

/**
 * Serialize an AuditResult to a deterministic JSON string.
 * Keys are sorted for stable diffing.
 */
export function toJson(result: AuditResult, pretty: boolean): string {
  const sorted = sortKeysDeep(result);
  return pretty
    ? JSON.stringify(sorted, null, 2)
    : JSON.stringify(sorted);
}

/** Recursively sort object keys for deterministic output. */
function sortKeysDeep(value: unknown): unknown {
  if (Array.isArray(value)) {
    return value.map(sortKeysDeep);
  }
  if (value !== null && typeof value === 'object') {
    const obj = value as Record<string, unknown>;
    const keys = Object.keys(obj).sort();
    const sorted: Record<string, unknown> = {};
    for (const key of keys) {
      sorted[key] = sortKeysDeep(obj[key]);
    }
    return sorted;
  }
  return value;
}
