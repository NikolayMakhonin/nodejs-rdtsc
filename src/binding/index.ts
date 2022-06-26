import _default from './binding'

export {
  ThreadPriority,
  ProcessPriority,
} from './enums'

const {
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
} = _default

console.log(isWin)

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
