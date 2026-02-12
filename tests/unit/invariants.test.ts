import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseInvariantsFile, invariantsToFds } from '../../src/core/invariants/parse.js';

const FIXTURES_DIR = resolve(import.meta.dirname, '../fixtures/invariants');

describe('parseInvariantsFile', () => {
  it('parses a valid invariants file', () => {
    const invariants = parseInvariantsFile(resolve(FIXTURES_DIR, '3nf-invariants.json'));

    expect(invariants).toHaveProperty('Employee');
    expect(invariants.Employee?.functionalDependencies).toHaveLength(1);
    expect(invariants.Employee?.functionalDependencies?.[0]?.determinant).toEqual([
      'departmentId',
    ]);
    expect(invariants.Employee?.functionalDependencies?.[0]?.dependent).toEqual([
      'deptName',
      'deptLocation',
    ]);
  });

  it('converts invariants to FDs', () => {
    const invariants = parseInvariantsFile(resolve(FIXTURES_DIR, '3nf-invariants.json'));
    const fds = invariantsToFds(invariants);

    expect(fds).toHaveLength(1);
    expect(fds[0]?.model).toBe('Employee');
    expect(fds[0]?.source).toBe('invariant');
    expect(fds[0]?.determinant).toEqual(['departmentId']);
    expect(fds[0]?.dependent).toEqual(['deptName', 'deptLocation']);
  });

  it('handles multiple models and FDs', () => {
    const invariants = parseInvariantsFile(resolve(FIXTURES_DIR, 'basic-invariants.json'));
    const fds = invariantsToFds(invariants);

    expect(fds).toHaveLength(1);
    expect(fds[0]?.model).toBe('User');
  });
});
