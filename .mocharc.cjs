'use strict'

module.exports = {
  require: [
    'ts-node/register',
    '@flemist/test-utils/register',
  ],
  'watch-files': ['./src/**'],
  ignore       : ['./**/*.d.ts'],
  'node-option': [
    // Turns off the type stripping of Node 22.18 and later, so that mocha loads every .ts test through ts-node at once:
    // mocha tries import() before require, and with stripping Node parses each test there as an ES module,
    // prints MODULE_TYPELESS_PACKAGE_JSON, and fails on its imports without extensions.
    // Stripping cannot replace ts-node, because it cannot run the enums of the code
    'no-experimental-strip-types',
    // 'prof',
  ],
}
