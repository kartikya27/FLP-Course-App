import { defineConfig } from 'vitest/config';
import { TEST_DATABASE_URL } from './test/setup/test-db-config.js';

export default defineConfig({
  test: {
    environment: 'node',
    include: ['test/**/*.test.ts'],
    globalSetup: ['test/setup/global.ts'],
    // Database tests share one schema and truncate between tests, so files run one at a time.
    fileParallelism: false,
    env: { TEST_DATABASE_URL },
  },
});
