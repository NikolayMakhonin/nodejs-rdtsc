import {ProcessPriority, ThreadPriority} from './enums'

/** return previous priority */
declare function setThreadPriority(priority: ThreadPriority): ThreadPriority
declare function getThreadPriority(): ThreadPriority
/** return previous priority */
declare function setProcessPriority(priority: ProcessPriority): ProcessPriority
declare function getProcessPriority(): ProcessPriority
declare function isWin(): boolean
