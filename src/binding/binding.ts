/* eslint-disable @typescript-eslint/no-var-requires */
import binding from './import.cjs'

export enum ThreadPriority {
  Idle = -15,
  Lowest = -2,
  BelowNormal = -1,
  Normal = 0,
  AboveNormal = 1,
  Highest = 2,
  Realtime = 15, // THREAD_PRIORITY_TIME_CRITICAL
}

export enum ProcessPriority {
  Idle = 0x00000040, // IDLE_PRIORITY_CLASS
  BelowNormal = 0x00004000, // BELOW_NORMAL_PRIORITY_CLASS
  Normal = 0x00000020, // NORMAL_PRIORITY_CLASS
  AboveNormal = 0x00008000, // ABOVE_NORMAL_PRIORITY_CLASS
  Highest = 0x00000080, // HIGH_PRIORITY_CLASS
  Realtime = 0x00000100, // REALTIME_PRIORITY_CLASS
}

declare type Binding = {
  init(funcsCount: number): void
  rdtsc(): bigint
  mark0(): void
  mark1(): void
  minCycles(): bigint[]
  /** return previous priority */
  setThreadPriority(priority: ThreadPriority): ThreadPriority
  getThreadPriority(): ThreadPriority
  /** return previous priority */
  setProcessPriority(priority: ProcessPriority): ProcessPriority
  getProcessPriority(): ProcessPriority
  isWin: boolean
  /**
   * Adds the garbage collection callbacks of this thread, if init has not added them yet; the functions below need them.
   * Throws if V8 has no new_space or new_large_object_space, which the byte counters read
   */
  addGcCallbacks(): void
  /**
   * Saves the current byte counters; the three ...SinceMark functions return the change since this call.
   * After a full collection it first completes the sweeping that the collection started, which walks the old
   * generation: V8 corrects its count of the old generation when it uses swept pages, and the correction must not
   * fall between the mark and the readings.
   * Throws after a young collection other than the scavenger, such as the young mark-sweep of --minor-ms, under which
   * the counters are wrong
   */
  bytesMark(): void
  /** Bytes allocated in the young generation since bytesMark, including those that collections already removed */
  allocatedBytesSinceMark(): number
  /** Bytes of new objects after which a young collection starts */
  youngGenerationCapacity(): number
  /** Cycles of the last garbage collection, by the same counter as rdtsc */
  gcLastCycles(): number
  /** Bytes that young collections moved from the young generation to the old one since bytesMark */
  promotedBytesSinceMark(): number
  /** Bytes that V8 created directly in the old generation since bytesMark */
  allocatedInOldGenerationBytesSinceMark(): number
  /** Number of full garbage collections since the callbacks were added */
  fullGcCount(): number
}

export default binding as Binding
