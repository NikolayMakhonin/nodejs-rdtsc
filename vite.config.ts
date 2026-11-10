import { configDefaults, defineConfig } from 'vitest/config'
import dts from 'vite-plugin-dts'
import { builtinModules } from 'module'

export default defineConfig({
  plugins: [
    dts({
      include: ['src/**/*.ts'],
      exclude: [
        '**/*.{test,node,browser,chrome,perf,manual,stress,api,e2e}.ts',
        '**/-test/**',
      ],
      // The declarations keep the layout of src, where the types of package.json point: dist/node/index.d.ts, etc.
      // Without it, TypeScript writes them relative to the common folder of all files of tsconfig.json, which also lists
      // the configs of the project root, and they land in dist/src
      compilerOptions: {
        rootDir: 'src',
      },
      staticImport: true,
    }),
  ],
  build: {
    lib: {
      entry: {
        'common/index': 'src/common/index.ts',
        'node/index': 'src/node/index.ts',
        'browser/index': 'src/browser/index.ts',
      },
    },
    rollupOptions: {
      // Without it, the CommonJS build turns import.meta.url into undefined, and createRequire of the binding throws
      platform: 'node',
      external: [...builtinModules, ...builtinModules.map(o => `node:${o}`)],
      output: [
        {
          format: 'es',
          entryFileNames: '[name].mjs',
        },
        {
          format: 'cjs',
          entryFileNames: '[name].cjs',
        },
      ],
    },
    target: 'node22',
    minify: true,
    sourcemap: false,
    // node-gyp builds the binding into build
    outDir: 'dist',
  },
  test: {
    include: [
      '**/*.{test,node,browser,chrome,perf,manual,stress,api,e2e}.{js,ts}',
    ],
    exclude: [
      ...configDefaults.exclude,
      '**/{tmp,temp,-tmp,-temp}/**',
      './*.ts',
    ],
    testTimeout: 10000,
    hookTimeout: 10000,
    // The tests measure time, so test files measuring in parallel processes would slow each other down
    fileParallelism: false,
    coverage: {
      provider: 'v8',
      include: ['src/**'],
      exclude: ['**/{tmp,temp,-tmp,-temp}/**'],
      reportsDirectory: 'tmp/coverage',
      clean: true,
      cleanOnRerun: true,
      reportOnFailure: true,
    },
  },
})
