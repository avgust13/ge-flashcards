import { defineConfig } from 'vitest/config';

// Pure logic only: scheduler, session composer, grading, content validation,
// storage migration. No component tests.
export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts', 'scripts/**/*.test.ts'],
  },
});
