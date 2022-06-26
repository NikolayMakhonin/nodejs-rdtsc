/* eslint-disable @typescript-eslint/no-var-requires */
import {ProcessPriority, ThreadPriority} from './enums'

const binding = require('../../build/Release/binding.node')

export declare function init(funcsCount: number): void
export declare function rdtsc(): bigint
export declare function mark0(): void
export declare function mark1(): void
export declare function minCycles(): bigint[]

/** return previous priority */
export declare function setThreadPriority(priority: ThreadPriority): ThreadPriority
export declare function getThreadPriority(): ThreadPriority
/** return previous priority */
export declare function setProcessPriority(priority: ProcessPriority): ProcessPriority
export declare function getProcessPriority(): ProcessPriority
export declare const isWin: boolean

export default binding as {
  init,
  mark0,
  mark1,
  minCycles,
  rdtsc,
  setThreadPriority,
  getThreadPriority,
  setProcessPriority,
  getProcessPriority,
  isWin,
}
