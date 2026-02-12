import { describe, it, expect } from 'vitest';
import { attributeClosure, isSuperkey } from '../../src/core/analysis/inferFds.js';
import type { FunctionalDependency } from '../../src/core/analysis/inferFds.js';

describe('attributeClosure', () => {
  const fds: FunctionalDependency[] = [
    { determinant: ['A'], dependent: ['B'], model: 'T', source: 'invariant' },
    { determinant: ['B'], dependent: ['C'], model: 'T', source: 'invariant' },
    { determinant: ['C', 'D'], dependent: ['E'], model: 'T', source: 'invariant' },
  ];

  it('computes transitive closure: A → B → C', () => {
    const closure = attributeClosure(['A'], fds, 'T');
    expect(closure.has('A')).toBe(true);
    expect(closure.has('B')).toBe(true);
    expect(closure.has('C')).toBe(true);
  });

  it('does not include attributes outside the closure', () => {
    const closure = attributeClosure(['A'], fds, 'T');
    expect(closure.has('D')).toBe(false);
    expect(closure.has('E')).toBe(false);
  });

  it('handles composite determinants', () => {
    const closure = attributeClosure(['A', 'D'], fds, 'T');
    // A → B → C; {C, D} → E
    expect(closure.has('B')).toBe(true);
    expect(closure.has('C')).toBe(true);
    expect(closure.has('E')).toBe(true);
  });

  it('returns just the input when no FDs apply', () => {
    const closure = attributeClosure(['D'], fds, 'T');
    expect(closure.size).toBe(1);
    expect(closure.has('D')).toBe(true);
  });

  it('filters by model name', () => {
    const closure = attributeClosure(['A'], fds, 'OtherModel');
    expect(closure.size).toBe(1);
    expect(closure.has('A')).toBe(true);
  });
});

describe('isSuperkey', () => {
  const fds: FunctionalDependency[] = [
    { determinant: ['id'], dependent: ['name', 'email', 'age'], model: 'User', source: 'pk' },
  ];
  const allFields = ['id', 'name', 'email', 'age'];

  it('returns true for a key that determines all fields', () => {
    expect(isSuperkey(['id'], allFields, fds, 'User')).toBe(true);
  });

  it('returns false for a non-key', () => {
    expect(isSuperkey(['name'], allFields, fds, 'User')).toBe(false);
  });

  it('returns true for a superset of a key', () => {
    expect(isSuperkey(['id', 'name'], allFields, fds, 'User')).toBe(true);
  });
});
