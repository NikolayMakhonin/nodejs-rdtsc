import {
  getProcessPriority,
  getThreadPriority,
  isWin,
  ProcessPriority,
  setProcessPriority, setThreadPriority,
  ThreadPriority,
} from 'src/binding'

export function runInRealtimePriority<T>(func: () => Promise<T>): Promise<T>
export function runInRealtimePriority<T>(func: () => T): T
export function runInRealtimePriority<T>(func: () => Promise<T>|T): Promise<T>|T {
  if (!isWin) {
    return func()
  }

  const previousThreadPriority = getThreadPriority()
  const previousProcessPriority = getProcessPriority()

  function _finally() {
    setProcessPriority(previousProcessPriority)
    setThreadPriority(previousThreadPriority)
  }

  try {
    setProcessPriority(ProcessPriority.Realtime)
    setThreadPriority(ThreadPriority.Realtime)

    const result = func()

    if (result != null && typeof result === 'object' && typeof (result as any).then === 'function') {
      return (result as any).then(o => {
        _finally()
        return o
      }, (err) => {
        _finally()
        throw err
      })
    }

    return result
  }
  finally {
    _finally()
  }
}
