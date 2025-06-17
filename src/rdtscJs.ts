import {Rdtsc} from 'src/types'
import {setRdtscDefault} from 'src/rdtscDefault'

export const rdtsc = typeof process === 'undefined'
  ? () => BigInt(performance.now())
  : () => {
    return process.hrtime.bigint()
  }

const result: bigint[] = []
let index = 0

function init(funcsCount: number): void {
  result.length = funcsCount
  index = 0
}

let m0: bigint = BigInt(0)
function mark0(): void {
  m0 = rdtsc()
}

function mark1(): void {
  const m1 = rdtsc()
  const diff = m1 - m0
  if (diff < result[index]) {
    result[index] = diff
  }
  index++
}

function minCycles(): bigint[] {
  return result
}

export function runInRealtimePriority<T>(func: () => Promise<T>): Promise<T>
export function runInRealtimePriority<T>(func: () => T): T
export function runInRealtimePriority<T>(func: () => Promise<T>|T): Promise<T>|T {
  return func()
}

export const rdtscJs: Rdtsc = {
  init,
  mark0,
  mark1,
  minCycles,
  rdtsc,
  runInRealtimePriority,
}

if (typeof process === 'undefined') {
  setRdtscDefault(rdtscJs)
}
