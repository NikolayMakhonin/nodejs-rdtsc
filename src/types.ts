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

/** Functions of the runtime for measuring garbage collection */
export type GcTools = {
  /** Saves the current byte counters; the three ...SinceMark functions return the change since this call */
  bytesMark: () => void,
  /** Bytes allocated in the young generation since bytesMark, including those that collections already removed */
  allocatedBytesSinceMark: () => number,
  /** Cycles of young garbage collection per allocated byte */
  getCyclesPerByte: () => number,
  /** Runs a young garbage collection; throws if none ran */
  collectYoungGeneration: () => void,
  /** Bytes that young collections moved from the young generation to the old one since bytesMark */
  promotedBytesSinceMark: () => number,
  /** Bytes that V8 created directly in the old generation since bytesMark */
  allocatedInOldGenerationBytesSinceMark: () => number,
  /** Number of full garbage collections so far */
  fullGcCount: () => number,
}

export type CalcPerformanceArgs = {
  /** The counter; by default the native one in Node and the JavaScript one in browsers */
  rdtsc?: null | Rdtsc,
  /** Time in milliseconds for measuring the cycles of the functions */
  time: number,
  /**
   * Time in milliseconds for measuring memory (the gc field of the result), after the cycles are measured.
   * The memory is measured in at least two rounds of calls, which can take longer than timeGc.
   * null: memory is not measured, and gc of the result is null.
   * calcPerformance throws where it cannot trust a value of the memory, instead of giving it.
   * The first call with timeGc also measures the cost of a young garbage collection, and measures it again
   * after V8 changes the size of the young generation.
   * In Node the first call with timeGc runs v8.setFlagsFromString('--expose-gc') for the whole process, to be able
   * to force collections; after that the global gc function exists in every new vm context
   */
  timeGc: null | number,
  /** The functions to measure, called in turn; the first one is the base of absoluteDiff and relativeDiff */
  funcs: (() => unknown)[],
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
  /** Cycles of one call of each function; if gc is not null, they include the cost of garbage collection (gc.memory) */
  cycles: CalcPerformanceValues<bigint>,
  /**
   * Memory: the cycles split into the function's own code and garbage collection, and the bytes.
   * null if timeGc is null or the runtime cannot measure memory (see isGcToolsSupported)
   */
  gc: null | CalcPerformanceGc,
}

/** Values of one call of each function and their differences from the first function */
export type CalcPerformanceValues<Value extends bigint | number> = {
  /** Value of one call of each function */
  values: Value[],
  /** For each function after the first: values[i] - values[0]; absent if there is only one function */
  absoluteDiff?: number[],
  /**
   * For each function after the second: absoluteDiff[i] / absoluteDiff[0]; absent if there are fewer than
   * 3 functions or absoluteDiff[0] <= 0
   */
  relativeDiff?: number[],
}

export type CalcPerformanceGc = {
  /** Cycles of the function's own code, without garbage collection; creating objects is included */
  logic: CalcPerformanceValues<bigint>,
  /** Estimated cycles of the young garbage collections that the function's allocations cause: allocatedBytes * cyclesPerByte */
  memory: CalcPerformanceValues<bigint>,
  /** Bytes that one call allocates in the young generation */
  allocatedBytes: CalcPerformanceValues<number>,
  /**
   * Bytes allocated by one call that are still alive after the young collections right after the call (the call keeps
   * them, for example in a variable or an array). calcPerformance throws if a full collection happened during every
   * check of the function: a full collection changes the old generation, so these bytes cannot be counted
   */
  uncollectedBytes: CalcPerformanceValues<number>,
  /**
   * Bytes that one call allocates directly in the old generation; V8 does this, for example, with strings of
   * fractional numbers (Math.random() + ''). Not included in allocatedBytes and memory: these bytes cost time
   * in full collections, which are not measured. calcPerformance throws if a full collection happened during every
   * check of the function
   */
  allocatedInOldGenerationBytes: CalcPerformanceValues<number>,
  /** Cost of young garbage collection per allocated byte, in cycles */
  cyclesPerByte: number,
}
