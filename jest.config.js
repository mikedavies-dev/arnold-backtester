module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    'node_modules',
    'dist/tests',
    'src/tests/test-utils',
    'src/tests/testing',
  ],
  collectCoverageFrom: [
    './src/**/*.ts',
    '!src/strategies/**/*.ts',
    '!src/bin/**/*.ts',
    '!src/ui/cli/**/*.ts',
    '!src/backtest/controller.ts',
    '!src/trader/controller.ts',
    '!src/**/*.test.{ts,tsx}',
    '!./src/utils/data-provider/**',
    '!./src/backtest/worker.ts',
    '!./src/__TESTS__/test-user-data/live-strategies/*.ts',
    '!./src/__TESTS__/test-user-data/test-strategies/*.ts',
    '!src/tests/testing/*.ts',
    '!src/utils/file-log.ts',
  ],
  projects: [
    {
      preset: 'ts-jest',
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/__TESTS__/**/*.test.{ts,tsx}'],
    },
  ],
};
