export type RunInRealtimePriority = {
  <T>(func: () => Promise<T>): Promise<T>
  <T>(func: () => T): T
  <T>(func: () => (Promise<T> | T)): (Promise<T> | T)
}

export type Rdtsc = {
  init: (funcsCount: number) => void;
  minCycles: () => bigint[];
  rdtsc: () => bigint;
  mark1: () => void;
  mark0: () => void
  runInRealtimePriority: RunInRealtimePriority;
}

export type CalcPerformanceArgs = {
  rdtsc: Rdtsc,
  /** Test time in milliseconds */
  time: number,
  funcs: (() => any)[]
}

export type CalcPerformanceResult = {
  calcInfo: {
    /** Average cycles per iteration */
    iterationCycles: number,
    /** Total iterations count */
    iterations: number,
    /** Functions count */
    funcsCount: number,
    /** Test time in milliseconds */
    testTime: number,
  },
  /** Cycles for each function */
  cycles: bigint[],
  /** Absolute difference between first and other functions in cycles */
  absoluteDiff?: number[],
  /** Relative difference between first and other functions in percents */
  relativeDiff?: number[],
}
