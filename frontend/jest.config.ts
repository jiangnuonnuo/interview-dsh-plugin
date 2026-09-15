import type { Config } from 'jest';

const config: Config = {
  preset: 'ts-jest',
  testEnvironment: 'jsdom',
  roots: ['<rootDir>/tests', '<rootDir>/src'],
  setupFilesAfterEnv: ['<rootDir>/tests/setup.ts'],
  transform: {
    '^.+\\.(ts|tsx)$': ['ts-jest', { tsconfig: { module: 'commonjs', isolatedModules: true, jsx: 'react-jsx' } }],
  },
  moduleNameMapper: {
    '^(\\.{1,2}/.*)\\.js$': '$1',
    '^interview-dsh-shared$': '<rootDir>/../shared/src/index.ts',
    '^interview-dsh-shared/(.*)$': '<rootDir>/../shared/src/$1',
    '\\.module\\.css$': '<rootDir>/tests/css-modules-stub.cjs',
  },
  testMatch: ['**/?(*.)+(spec|test).[tj]s?(x)'],
};

export default config;
