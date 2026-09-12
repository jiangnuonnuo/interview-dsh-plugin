import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { useESM: true }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^interview-dsh-shared/(.*)$': '<rootDir>/../shared/src/$1',
  },
  extensionsToTreatAsEsm: ['.ts', '.tsx'],
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
};

export default config;
