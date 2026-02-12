import { describe, it, expect } from 'vitest';
import { resolve } from 'node:path';
import { parseSchema } from '../../src/core/prismaSchema/parse.js';
import { extractContract } from '../../src/core/prismaSchema/contract.js';

const FIXTURES_DIR = resolve(import.meta.dirname, '../fixtures/schemas');

describe('extractContract', () => {
  it('extracts PKs, uniques, FKs from basic schema', async () => {
    const parsed = await parseSchema(resolve(FIXTURES_DIR, 'basic.prisma'));
    const contract = extractContract(parsed);

    expect(contract.models).toHaveLength(2);

    // Models are sorted alphabetically
    expect(contract.models[0]!.name).toBe('Post');
    expect(contract.models[1]!.name).toBe('User');

    // User model
    const user = contract.models.find((m) => m.name === 'User')!;
    expect(user.primaryKey).toEqual({ fields: ['id'], isComposite: false });
    expect(user.uniqueConstraints).toEqual([
      { name: null, fields: ['email'], isComposite: false },
    ]);
    expect(user.foreignKeys).toHaveLength(0);

    // Post model
    const post = contract.models.find((m) => m.name === 'Post')!;
    expect(post.primaryKey).toEqual({ fields: ['id'], isComposite: false });
    expect(post.foreignKeys).toHaveLength(1);
    expect(post.foreignKeys[0]).toMatchObject({
      fields: ['authorId'],
      referencedModel: 'User',
      referencedFields: ['id'],
    });
  });

  it('extracts composite PKs', async () => {
    const parsed = await parseSchema(resolve(FIXTURES_DIR, 'composite.prisma'));
    const contract = extractContract(parsed);

    const postTag = contract.models.find((m) => m.name === 'PostTag')!;
    expect(postTag.primaryKey).toEqual({
      fields: ['postId', 'tagId'],
      isComposite: true,
    });
  });

  it('excludes object/relation fields from field contracts', async () => {
    const parsed = await parseSchema(resolve(FIXTURES_DIR, 'basic.prisma'));
    const contract = extractContract(parsed);

    const user = contract.models.find((m) => m.name === 'User')!;
    // User has id, email, name as scalar fields; posts is a relation field and should be excluded
    const fieldNames = user.fields.map((f) => f.name);
    expect(fieldNames).not.toContain('posts');
    expect(fieldNames).toContain('id');
    expect(fieldNames).toContain('email');
    expect(fieldNames).toContain('name');
  });

  it('fields are sorted alphabetically', async () => {
    const parsed = await parseSchema(resolve(FIXTURES_DIR, 'basic.prisma'));
    const contract = extractContract(parsed);

    for (const model of contract.models) {
      const names = model.fields.map((f) => f.name);
      const sorted = [...names].sort();
      expect(names).toEqual(sorted);
    }
  });

  it('captures nullability and defaults', async () => {
    const parsed = await parseSchema(resolve(FIXTURES_DIR, 'basic.prisma'));
    const contract = extractContract(parsed);

    const post = contract.models.find((m) => m.name === 'Post')!;
    const published = post.fields.find((f) => f.name === 'published')!;
    expect(published.isNullable).toBe(false);
    expect(published.hasDefault).toBe(true);

    const content = post.fields.find((f) => f.name === 'content')!;
    expect(content.isNullable).toBe(true);
    expect(content.hasDefault).toBe(false);
  });
});
