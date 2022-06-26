export default {
  include     : ['src/**/*.ts'],
  exclude     : ['**/test/**', '**/*.{test,perf}.*'],
  reporter    : ['json'],
  'temp-dir'  : `./tmp/coverage/mocha/tmp`,
  'report-dir': `./tmp/coverage/mocha/json`,
}
