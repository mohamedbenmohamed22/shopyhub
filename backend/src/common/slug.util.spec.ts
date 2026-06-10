import { describe, expect, it } from 'vitest';
import { slugify } from './slug.util';

describe('slugify', () => {
  it('lowercases and dashes spaces', () => {
    expect(slugify('Product Of The Week')).toBe('product-of-the-week');
  });

  it('strips accents (diacritics)', () => {
    expect(slugify('Crème Brûlée')).toBe('creme-brulee');
  });

  it('collapses repeated and trims leading/trailing separators', () => {
    expect(slugify('  Hello --- World!! ')).toBe('hello-world');
  });

  it('drops unsupported characters', () => {
    expect(slugify('Café #1 @ Tunis')).toBe('cafe-1-tunis');
  });

  it('returns an empty string when nothing is sluggable', () => {
    expect(slugify('!!!')).toBe('');
  });
});
