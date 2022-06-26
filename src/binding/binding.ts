/* eslint-disable @typescript-eslint/no-var-requires */

// @ts-expect-error
import binding from '../../build/Release/binding.node'

// import { createRequire } from 'module'
// const _require = typeof require !== 'undefined'
//   ? require
//   // @ts-expect-error
//   : createRequire(import.meta.url)
//
// const binding = _require('../../build/Release/binding.node')

export declare function init(funcsCount: number): void
export declare function rdtsc(): bigint
export declare function mark0(): void
export declare function mark1(): void
export declare function minCycles(): bigint[]

export enum ThreadPriority {
  Idle = -15,
  Lowest = -2,
  BelowNormal = -1,
  Normal = 0,
  AboveNormal = 1,
  Highest = 2,
  Realtime = 15, // THREAD_PRIORITY_TIME_CRITICAL
}

export enum ProcessPriority {
  Idle = 0x00000040, // IDLE_PRIORITY_CLASS
  BelowNormal = 0x00004000, // BELOW_NORMAL_PRIORITY_CLASS
  Normal = 0x00000020, // NORMAL_PRIORITY_CLASS
  AboveNormal = 0x00008000, // ABOVE_NORMAL_PRIORITY_CLASS
  Highest = 0x00000080, // HIGH_PRIORITY_CLASS
  Realtime = 0x00000100, // REALTIME_PRIORITY_CLASS
}

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
