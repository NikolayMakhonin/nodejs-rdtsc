import {setRdtscDefault} from 'src/rdtscDefault'
import {
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

setRdtscDefault(rdtscNative)
