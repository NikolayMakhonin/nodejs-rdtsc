import resolve from '@rollup/plugin-node-resolve'
import multiInput from 'rollup-plugin-multi-input'
// import del from 'rollup-plugin-delete'
import typescript from '@rollup/plugin-typescript'
import alias from '@rollup/plugin-alias'
import replace from '@rollup/plugin-replace'
import commonjs from '@rollup/plugin-commonjs'
import json from '@rollup/plugin-json'
import tsTransformPaths from '@zerollup/ts-transform-paths'
import path from 'path'
import pkg from './package.json'
import { createFilter } from '@rollup/pluginutils'

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
        before: [
          {
            type   : 'program',
            factory: (program) => {
              return tsTransformPaths(program).before
            },
          },
        ],
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
  external: createFilter([
    'src/**/*.{js,cjs,mjs}',
    ...[
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.devDependencies),
      ...require('module').builtinModules || Object.keys(process.binding('natives')),
    ].map(o => 'node_modules/' + o)
  ]),
})

export default [
  nodeConfig({
    input    : ['src/**/*.ts'],
    outputDir: 'dist',
    relative : 'src',
    format   : 'es',
    extension: 'mjs',
  }),
  nodeConfig({
    input    : ['src/**/*.ts'],
    outputDir: 'dist',
    relative : 'src',
    format   : 'cjs',
    extension: 'cjs',
  }),
]
