import { defineConfig, mergeConfig } from 'vitest/config'
import configBase from './vite.config'

export default mergeConfig(
  configBase,
  defineConfig({
    test: {
      // Each project inherits include from vite.config.ts, which matches all test files, so the exclude of each project
      // lists all suffixes except its own
      projects: [
        {
          extends: true,
          resolve: {
            conditions: ['node'],
          },
          test: {
            name: 'node',
            exclude: [
              '**/*.{browser,chrome,perf,manual,stress,api,e2e}.{js,ts}',
            ],
          },
        },
        {
          extends: true,
          resolve: {
            conditions: ['node'],
          },
          test: {
            name: 'stress',
            exclude: [
              '**/*.{test,node,browser,chrome,perf,manual,api,e2e}.{js,ts}',
            ],
          },
        },
      ],
    },
  }),
)
