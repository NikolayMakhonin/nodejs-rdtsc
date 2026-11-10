import resolve from '@rollup/plugin-node-resolve'
import multiInput from 'rollup-plugin-multi-input'
import typescript from '@rollup/plugin-typescript'
import pkg from './package.json'
import { createFilter } from '@rollup/pluginutils'

const dev = !!process.env.ROLLUP_WATCH

const onwarnRollup = (warning) => {
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
    resolve(),
    typescript({
      sourceMap     : dev,
      rootDir       : 'src',
      declarationDir: outputDir,
      declaration   : true,
    }),
  ],
  onwarn  : onwarnRollup,
  external: createFilter([
    'src/**/*.{js,cjs,mjs}',
    ...[
      ...Object.keys(pkg.dependencies),
      ...Object.keys(pkg.devDependencies),
      ...require('module').builtinModules || Object.keys(process.binding('natives')),
    ].map(o => `node_modules/${o}/**`),
  ]),
})

// The inputs leave out src/types.ts, which holds exclusively types,
// because rollup writes such an input as an empty types.mjs and types.cjs with the warning EMPTY_BUNDLE.
// The typescript plugin still emits types.d.ts, because it emits the declarations of all files of tsconfig.json
export default [
  nodeConfig({
    input    : ['src/**/*.ts', '!src/types.ts'],
    outputDir: 'dist',
    relative : 'src',
    format   : 'es',
    extension: 'mjs',
  }),
  nodeConfig({
    input    : ['src/**/*.ts', '!src/types.ts'],
    outputDir: 'dist',
    relative : 'src',
    format   : 'cjs',
    extension: 'cjs',
  }),
]
