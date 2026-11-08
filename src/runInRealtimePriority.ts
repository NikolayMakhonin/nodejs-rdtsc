import {
  getProcessPriority,
  getThreadPriority,
  isWin,
  ProcessPriority,
  setProcessPriority, setThreadPriority,
  ThreadPriority,
} from 'src/binding'

export function threadPriorityToString(priority: ThreadPriority): string {
  switch (priority) {
    case ThreadPriority.Idle: return 'Idle'
    case ThreadPriority.Lowest: return 'Lowest'
    case ThreadPriority.BelowNormal: return 'BelowNormal'
    case ThreadPriority.Normal: return 'Normal'
    case ThreadPriority.AboveNormal: return 'AboveNormal'
    case ThreadPriority.Highest: return 'Highest'
    case ThreadPriority.Realtime: return 'Realtime'
    default: return `Unknown(${priority})`
  }
}

export function processPriorityToString(priority: ProcessPriority): string {
  switch (priority) {
    case ProcessPriority.Idle: return 'Idle'
    case ProcessPriority.BelowNormal: return 'BelowNormal'
    case ProcessPriority.Normal: return 'Normal'
    case ProcessPriority.AboveNormal: return 'AboveNormal'
    case ProcessPriority.Highest: return 'Highest'
    case ProcessPriority.Realtime: return 'Realtime'
    default: return `Unknown(${priority})`
  }
}

export function runInRealtimePriority<T>(func: () => Promise<T>): Promise<T>
export function runInRealtimePriority<T>(func: () => T): T
export function runInRealtimePriority<T>(func: () => Promise<T>|T): Promise<T>|T {
  if (!isWin) {
    return func()
  }

  realtimeStart()
  let result: Promise<T> | T
  try {
    result = func()
  }
  catch (err) {
    realtimeEnd()
    throw err
  }

  // An async func keeps the priority until its promise settles
  if (result != null && typeof result === 'object' && typeof (result as any).then === 'function') {
    return (result as any).then(o => {
      realtimeEnd()
      return o
    }, (err) => {
      realtimeEnd()
      throw err
    })
  }

  realtimeEnd()
  return result
}

// Calls that run at the same time share the realtime priority: the first one raises it, and the last one restores
// the priority from before the first, because async calls can end in any order
let realtimeCallsCount = 0
let previousThreadPriority: ThreadPriority
let previousProcessPriority: ProcessPriority

function realtimeStart(): void {
  if (realtimeCallsCount === 0) {
    previousThreadPriority = getThreadPriority()
    previousProcessPriority = getProcessPriority()
    setProcessPriority(ProcessPriority.Realtime)
    setThreadPriority(ThreadPriority.Realtime)

    const threadPriority = getThreadPriority()
    const processPriority = getProcessPriority()
    if (
      threadPriority !== ThreadPriority.Realtime || processPriority !== ProcessPriority.Realtime
    ) {
      console.warn(`Failed to set realtime priority: process=${processPriorityToString(processPriority)}, thread=${threadPriorityToString(threadPriority)}`)
    }
  }
  realtimeCallsCount++
}

function realtimeEnd(): void {
  realtimeCallsCount--
  if (realtimeCallsCount === 0) {
    setProcessPriority(previousProcessPriority)
    setThreadPriority(previousThreadPriority)
  }
}

