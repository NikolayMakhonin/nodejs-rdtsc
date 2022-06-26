import {
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
// @ts-expect-error
} from '~/build/Release/binding.node'

declare function init(funcsCount: number): void
declare function rdtsc(): bigint
declare function mark0(): void
declare function mark1(): void
declare function minCycles(): bigint[]

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
declare function setThreadPriority(priority: ThreadPriority): ThreadPriority
declare function getThreadPriority(): ThreadPriority
/** return previous priority */
declare function setProcessPriority(priority: ProcessPriority): ProcessPriority
declare function getProcessPriority(): ProcessPriority
declare function isWin(): boolean

export {
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
