// noinspection ES6TopLevelAwaitExpression
// Skip Husky install in production and CI
// !! If you use docker, you should add CI=true to your docker file

if (process.env.NODE_ENV === 'production' || process.env.CI === 'true') {
  process.exit(0)
}
const husky = (await import('husky')).default
console.log(husky())
