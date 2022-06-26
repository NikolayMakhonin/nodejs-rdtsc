import binding, {
  ThreadPriority,
  ProcessPriority,
} from 'src/binding/binding'

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
} = binding

export {
  init,
  mark0,
  mark1,
  minCycles,
  rdtsc,
  ThreadPriority,
  ProcessPriority,
  setThreadPriority,
  getThreadPriority,
  setProcessPriority,
  getProcessPriority,
  isWin,
}
