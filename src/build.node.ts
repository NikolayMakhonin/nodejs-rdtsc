import {beforeAll, describe, expect, it} from 'vitest'
import {execFile} from 'child_process'
import * as fs from 'fs'
import {createRequire} from 'module'
import * as path from 'path'
import {pathToFileURL} from 'url'
import {promisify} from 'util'

const execFileAsync = promisify(execFile)

const OUT_DIR = path.resolve('-tmp/-test/build')
const VITE_CLI = path.resolve('node_modules/vite/bin/vite.js')
const ENTRIES = ['common', 'node', 'browser']

/**
 * Runs the code in a new Node.js process and returns its output.
 * A new process, because vitest transforms the modules that a test imports
 */
async function runInNode(code: string): Promise<string> {
  const {stdout} = await execFileAsync(process.execPath, ['-e', code])
  return stdout.trim()
}

/**
 * Code that measures an empty function with the module of the given expression, which returns a promise of the node
 * entry, and prints whether the native counter gave a bigint and the measurement ran iterations
 */
function measureCode(importCode: string): string {
  return `${importCode}.then(({rdtsc, calcPerformance}) => {
    const result = calcPerformance({time: 10, timeGc: null, funcs: [() => {}]})
    console.log(typeof rdtsc() === 'bigint' && result.calcInfo.iterations > 0)
  })`
}

describe('build', {timeout: 2 * 60 * 1000}, () => {
  beforeAll(
    async () => {
      await execFileAsync(
        process.execPath,
        [VITE_CLI, 'build', '--outDir', OUT_DIR, '--logLevel', 'silent'],
        {env: {...process.env, NODE_ENV: 'production'}},
      )
    },
    2 * 60 * 1000,
  )

  it('cjs and esm entries export the same names', async () => {
    const require = createRequire(import.meta.url)
    for (let i = 0; i < ENTRIES.length; i++) {
      const entry = path.join(OUT_DIR, ENTRIES[i])
      const namesCjs = Object.keys(require(path.join(entry, 'index.cjs')))
      const namesEsm = JSON.parse(await runInNode(
        `import(${JSON.stringify(pathToFileURL(path.join(entry, 'index.mjs')).href)})
          .then(o => console.log(JSON.stringify(Object.keys(o))))`,
      ))
      expect(namesCjs.length).toBeGreaterThan(0)
      expect(namesCjs.sort()).toEqual(namesEsm.sort())
    }
  })

  it('contains the declarations of every entry', async () => {
    for (let i = 0; i < ENTRIES.length; i++) {
      await fs.promises.stat(path.join(OUT_DIR, ENTRIES[i], 'index.d.ts'))
    }
  })

  it('cjs node entry loads the binding and measures with it', async () => {
    const file = path.join(OUT_DIR, 'node/index.cjs')
    expect(await runInNode(measureCode(`Promise.resolve(require(${JSON.stringify(file)}))`))).toBe('true')
  })

  it('esm node entry loads the binding and measures with it', async () => {
    const url = pathToFileURL(path.join(OUT_DIR, 'node/index.mjs')).href
    expect(await runInNode(measureCode(`import(${JSON.stringify(url)})`))).toBe('true')
  })

  it('contains no test files', async () => {
    const files = await fs.promises.readdir(OUT_DIR, {recursive: true})
    const testFiles = files.filter(o => /\.(test|node|browser|chrome|perf|manual|stress|api|e2e)\.|[\\/]-test[\\/]/.test(o))
    expect(testFiles).toEqual([])
  })
})
