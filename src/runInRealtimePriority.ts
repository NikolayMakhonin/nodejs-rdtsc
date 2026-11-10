import {
  getProcessPriority,
  getThreadPriority,
  isWin,
  ProcessPriority,
  setProcessPriority,
  setThreadPriority,
  ThreadPriority,
} from './binding'

export function threadPriorityToString(priority: ThreadPriority): string {
  switch (priority) {
    case ThreadPriority.Idle:
      return 'Idle'
    case ThreadPriority.Lowest:
      return 'Lowest'
    case ThreadPriority.BelowNormal:
      return 'BelowNormal'
    case ThreadPriority.Normal:
      return 'Normal'
    case ThreadPriority.AboveNormal:
      return 'AboveNormal'
    case ThreadPriority.Highest:
      return 'Highest'
    case ThreadPriority.Realtime:
      return 'Realtime'
    default:
      return `Unknown(${priority})`
  }
}

export function processPriorityToString(priority: ProcessPriority): string {
  switch (priority) {
    case ProcessPriority.Idle:
      return 'Idle'
    case ProcessPriority.BelowNormal:
      return 'BelowNormal'
    case ProcessPriority.Normal:
      return 'Normal'
    case ProcessPriority.AboveNormal:
      return 'AboveNormal'
    case ProcessPriority.Highest:
      return 'Highest'
    case ProcessPriority.Realtime:
      return 'Realtime'
    default:
      return `Unknown(${priority})`
  }
}

export function runInRealtimePriority<T>(func: () => Promise<T>): Promise<T>
export function runInRealtimePriority<T>(func: () => T): T
export function runInRealtimePriority<T>(
  func: () => Promise<T> | T,
): Promise<T> | T {
  if (!isWin) {
    return func()
  }

  realtimePriorityStart()
  let result: Promise<T> | T
  try {
    result = func()
  } catch (err) {
    realtimePriorityEnd()
    throw err
  }

  // An async func keeps the priority until its promise settles
  if (isPromise(result)) {
    return result.then(
      o => {
        realtimePriorityEnd()
        return o
      },
      err => {
        realtimePriorityEnd()
        throw err
      },
    )
  }

  realtimePriorityEnd()
  return result
}

// Several calls can run at the same time (async functions). The first call raises the priority, and the last call
// that ends restores the original priority; the calls are counted, because they can end in any order
let realtimePriorityCallsCount = 0
let previousThreadPriority: ThreadPriority
let previousProcessPriority: ProcessPriority

function realtimePriorityStart(): void {
  if (realtimePriorityCallsCount === 0) {
    previousThreadPriority = getThreadPriority()
    previousProcessPriority = getProcessPriority()
    setProcessPriority(ProcessPriority.Realtime)
    setThreadPriority(ThreadPriority.Realtime)

    const threadPriority = getThreadPriority()
    const processPriority = getProcessPriority()
    if (
      threadPriority !== ThreadPriority.Realtime ||
      processPriority !== ProcessPriority.Realtime
    ) {
      // No call holds the priority yet, so the previous one is restored before the throw
      setProcessPriority(previousProcessPriority)
      setThreadPriority(previousThreadPriority)
      throw new Error(
        `[runInRealtimePriority][realtimePriorityStart] failed to set realtime priority; processPriority: ${processPriorityToString(processPriority)}; threadPriority: ${threadPriorityToString(threadPriority)}`,
      )
    }
  }
  realtimePriorityCallsCount++
}

function realtimePriorityEnd(): void {
  realtimePriorityCallsCount--
  if (realtimePriorityCallsCount === 0) {
    setProcessPriority(previousProcessPriority)
    setThreadPriority(previousThreadPriority)
  }
}

// Checks for a then method instead of instanceof Promise: a promise from another context (for example vm)
// is not an instance of the Promise of this context
function isPromise<T>(value: Promise<T> | T): value is Promise<T> {
  return (
    value != null &&
    typeof value === 'object' &&
    typeof (value as Promise<T>).then === 'function'
  )
}
