import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest/presets/default-esm',
  testEnvironment: 'node',
  roots: ['<rootDir>/tests'],
  transform: {
    '^.+\\.ts$': ['ts-jest', { useESM: true }],
  },
  transformIgnorePatterns: ['/node_modules/(?!(interview-dsh-shared)/)'],
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^shared/(.*)$': '<rootDir>/../shared/src/$1',
  },
  extensionsToTreatAsEsm: ['.ts'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
};

export default config;
