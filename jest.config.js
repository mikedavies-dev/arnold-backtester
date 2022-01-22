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
    '!src/**/jest-client-setup.ts',
  ],
  projects: [
    {
      preset: 'ts-jest',
      displayName: 'backend',
      testEnvironment: 'node',
      testMatch: ['<rootDir>/src/tests/backend/**/*.test.{ts,tsx}'],
    },
    {
      preset: 'ts-jest',
      displayName: 'ui',
      testEnvironment: 'jsdom',
      testMatch: ['<rootDir>/src/tests/ui/**/*.test.{ts,tsx}'],
      setupFilesAfterEnv: ['./src/tests/jest-client-setup.ts'],
    },
  ],
};
