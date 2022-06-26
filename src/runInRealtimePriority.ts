import {
  getProcessPriority,
  getThreadPriority,
  isWin,
  ProcessPriority,
  setProcessPriority, setThreadPriority,
  ThreadPriority,
} from 'src/binding'

export function runInRealtimePriority<T>(func: () => T): T {
  if (!isWin()) {
    return func()
  }

  const previousThreadPriority = getThreadPriority()
  const previousProcessPriority = getProcessPriority()

  try {
    setProcessPriority(ProcessPriority.Realtime)
    setThreadPriority(ThreadPriority.Realtime)

    return func()
  }
  finally {
    setProcessPriority(previousProcessPriority)
    setThreadPriority(previousThreadPriority)
  }
}
