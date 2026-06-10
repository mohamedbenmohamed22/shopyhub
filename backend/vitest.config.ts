import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    // Unit tests only — fast, no DB. Spec files live next to the code.
    include: ['src/**/*.spec.ts'],
    environment: 'node',
    globals: false,
  },
});
