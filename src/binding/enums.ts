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
