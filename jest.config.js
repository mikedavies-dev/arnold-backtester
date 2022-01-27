module.exports = {
  preset: 'ts-jest',
  testEnvironment: 'node',
  testPathIgnorePatterns: [
    'node_modules',
    'dist/tests',
    'src/tests/test-utils',
    'src/tests/test-data',
  ],
  collectCoverageFrom: [
    './src/**/*.ts',
    '!src/strategies/**/*.ts',
    '!src/bin/**/*.ts',
    '!src/backtest/controller.ts',
    '!src/**/*.test.{ts,tsx}',
    '!./src/__TESTS_UI__/jest.ts',
    '!src/web/**',
  ],
  projects: [
    {
      preset: 'ts-jest',
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/**/__TESTS__/**/*.test.{ts,tsx}'],
    },
    {
      preset: 'ts-jest',
      displayName: 'ui',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/**/__TESTS_UI__/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['./src/__TESTS_UI__/jest.ts'],
    },
  ],
};
