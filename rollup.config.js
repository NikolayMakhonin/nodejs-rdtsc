import resolve from '@rollup/plugin-node-resolve'
import multiInput from 'rollup-plugin-multi-input'
import multiEntry from '@rollup/plugin-multi-entry'
import del from 'rollup-plugin-delete'
import typescript from '@rollup/plugin-typescript'
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import polyfills from 'rollup-plugin-node-polyfills'
import inject from '@rollup/plugin-inject'
import babel from '@rollup/plugin-babel'
import istanbul from 'rollup-plugin-istanbul'
import tsTransformPaths from '@zerollup/ts-transform-paths'
import nycrc from './nyc.config.mjs'
import { terser } from 'rollup-plugin-terser'
import path from 'path'
import pkg from './package.json'

const dev = !!process.env.ROLLUP_WATCH

const onwarnRollup = (warning, onwarn) => {
  // prevent warn: (!) `this` has been rewritten to `undefined`
  // if ( warning.code === 'THIS_IS_UNDEFINED' ) {
  //   return false
  // }
  // if ( warning.code === 'EVAL' ) {
  //   return false
  // }
  // if ( warning.code === 'SOURCEMAP_ERROR' ) {
  //   return false
  // }
  // if ( warning.plugin === 'typescript' && /Rollup 'sourcemap' option must be set to generate source maps/.test(warning.message)) {
  //   return false
  // }

  console.warn('onwarnRollup',
    [
      `${warning.code}: ${warning.message}`,
      warning.loc && `${warning.loc.file}:${warning.loc.line}:${warning.loc.column}`,
      warning.plugin && `plugin: ${warning.plugin}`,
      warning.pluginCode && `pluginCode: ${warning.pluginCode}`,
      warning.hook && `hook: ${warning.hook}`,
      warning.frame,
    ]
      .map(o => o?.toString()?.trim())
      .filter(o => o)
      .join('\r\n') + '\r\n',
  )

  return false
}

const aliasOptions = {
  entries: [
    {
      find       : 'src',
      replacement: path.resolve(__dirname, 'src'),
    },
    {
      find       : '~',
      replacement: path.resolve(__dirname),
    },
  ],
}

const nodeConfig = ({
  input, outputDir, relative, format, extension,
}) => ({
  cache : true,
  input,
  output: {
    dir           : outputDir,
    format        : format,
    exports       : 'named',
    entryFileNames: '[name].' + extension,
    chunkFileNames: '[name].' + extension,
    sourcemap     : dev,
  },
  plugins: [
    multiInput({relative}),
    alias(aliasOptions),
    json(),
    replace({
      preventAssignment: true,
    }),
    resolve(),
    commonjs({
      transformMixedEsModules: true,
    }),
    typescript({
      sourceMap     : dev,
      declarationDir: outputDir,
      declaration   : true,
      transformers  : {
        afterDeclarations: [
          {
            type   : 'program',
            factory: (program) => {
              return tsTransformPaths(program).afterDeclarations
            },
          },
        ],
      },
    }),
  ],
  onwarn  : onwarnRollup,
  external: []
    .concat(Object.keys(pkg.dependencies))
    .concat(Object.keys(pkg.devDependencies))
    .concat(require('module').builtinModules || Object.keys(process.binding('natives'))),
})

const browserConfig = ({input, outputDir, outputFile}) => ({
  cache : true,
  input,
  output: {
    dir           : outputDir,
    format        : 'iife',
    exports       : 'named',
    entryFileNames: outputFile,
    chunkFileNames: outputFile,
    sourcemap     : dev && 'inline',
  },
  plugins: [
    del({ targets: path.join(outputDir, outputFile) }),
    alias(aliasOptions),
    json(),
    replace({
      preventAssignment: true,
    }),
    resolve({
      browser: true,
    }),
    commonjs({
      transformMixedEsModules: true,
    }),
    typescript({
      sourceMap      : dev,
      compilerOptions: {
        target: 'es5',
      },
    }),
    // babel({
    //   extensions  : ['.ts', '.js', '.cjs', '.mjs'],
    //   babelHelpers: 'runtime',
    //   exclude     : [
    //     'node_modules/rollup*/**',
    //     'node_modules/tslib/**',
    //     'node_modules/@babel/**',
    //     'node_modules/core-js*/**',
    //   ],
    // }),
    terser({
      mangle: true,
      module: false,
      ecma  : 5,
      output: {
        max_line_len: 50,
      },
    }),
  ],
  onwarn: onwarnRollup,
})

const browserTestsConfig = {
  cache: true,
  input: [
    'node_modules/@flemist/test-utils/dist/lib/register/show-useragent.mjs',
    'node_modules/@flemist/test-utils/dist/lib/register/register.mjs',
    'src/**/*.test.ts',
  ],
  output: {
    dir      : 'dist/bundle',
    format   : 'iife',
    exports  : 'named',
    sourcemap: 'inline',
  },
  plugins: [
    del({ targets: 'dist/bundle/browser.test.js' }),
    multiEntry({
      entryFileName: 'browser.test.js',
    }),
    alias(aliasOptions),
    json(),
    replace({
      preventAssignment: true,
    }),
    resolve({
      browser       : true,
      preferBuiltins: false,
    }),
    commonjs({
      transformMixedEsModules: true,
    }),
    inject({
      global: require.resolve('rollup-plugin-node-polyfills/polyfills/global.js'),
    }),
    polyfills(),
    typescript({
      sourceMap      : true,
      compilerOptions: {
        target: 'es5',
      },
    }),
    istanbul({
      ...nycrc,
    }),
    babel({
      configFile  : path.resolve(__dirname, '.babelrc.cjs'), // enable babel for node_modules
      extensions  : ['.ts', '.js', '.cjs', '.mjs'],
      babelHelpers: 'runtime',
      exclude     : [
        '**/node_modules/rollup*/**',
        '**/node_modules/@babel/**',
        '**/node_modules/core-js*/**',
      ],
    }),
  ],
  onwarn: onwarnRollup,
}

export default [
  nodeConfig({
    input    : ['src/**/*.ts'],
    outputDir: 'dist/lib',
    relative : 'src',
    format   : 'es',
    extension: 'mjs',
  }),
  nodeConfig({
    input    : ['src/**/*.ts'],
    outputDir: 'dist/lib',
    relative : 'src',
    format   : 'cjs',
    extension: 'cjs',
  }),
  browserConfig({
    input     : ['src/index.ts'],
    outputDir : 'dist/bundle',
    outputFile: 'browser.js',
  }),
  browserTestsConfig,
]
