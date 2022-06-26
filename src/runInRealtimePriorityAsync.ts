import {
  getProcessPriority,
  getThreadPriority,
  isWin,
  ProcessPriority,
  setProcessPriority, setThreadPriority,
  ThreadPriority,
} from 'src/binding'

export async function runInRealtimePriorityAsync<T>(func: () => Promise<T>|T): Promise<T> {
  if (!isWin()) {
    return func()
  }

  const previousThreadPriority = getThreadPriority()
  const previousProcessPriority = getProcessPriority()

  try {
    setProcessPriority(ProcessPriority.Realtime)
    setThreadPriority(ThreadPriority.Realtime)

    return await func()
  }
  finally {
    setProcessPriority(previousProcessPriority)
    setThreadPriority(previousThreadPriority)
  }
}
