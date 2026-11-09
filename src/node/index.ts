import {setRdtscDefault} from '../rdtscDefault'
import {setGcToolsDefault} from '../gcToolsDefault'
import {rdtscNative} from '../rdtscNative'
import {getGcToolsNative} from '../getGcToolsNative'

// In Node, calcPerformance uses the native counter by default and can measure garbage collection
setRdtscDefault(rdtscNative)
setGcToolsDefault(getGcToolsNative)

export {
  rdtscNative,
} from '../rdtscNative'
export * from '../common'
export {
  rdtsc,
  ThreadPriority,
  ProcessPriority,
  getThreadPriority,
  setThreadPriority,
  getProcessPriority,
  setProcessPriority,
  isWin,
} from '../binding'
export {
  runInRealtimePriority,
} from '../runInRealtimePriority'
