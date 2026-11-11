import type { CalcPerformanceArgs, GcTools } from './types'
import type { GcMeasurement } from './createCalcPerformanceResult'

/**
 * Measures the memory of one call of each function. One check = one call of one function, followed by two forced young
 * collections. Every function is checked many times, and of each of its byte counts the smallest value that two of its
 * checks in a row read is kept: the noise of other code mostly adds bytes to a check, but during a collection V8 also
 * frees the unused rest of the allocation buffers of its background threads, which the old generation counts as used
 * until then, so the uncollected bytes of a single check can be fewer than the call keeps
 */
export type GcChecks = {
  /**
   * The first is an empty function, the others are the given functions. The empty function measures what the checking
   * code itself allocates (for example, the promise of an await); this is subtracted from the other functions
   */
  funcs: CalcPerformanceArgs['funcs']
  /** Starts a check: saves the byte counters */
  checkStart: () => void
  /**
   * Ends the check of funcs[funcIndex]: reads its bytes, forces two young collections, and keeps the smallest values that
   * two checks of the function in a row read; throws where 20 checks of a function read no value of a count twice in a
   * row, because then the function does not do the same work on every call
   */
  checkEnd: (funcIndex: number) => void
  /**
   * Whether one more round of checks is needed after timeGc: as long as the last round lowered a minimum, or a function
   * read values of a count but none twice in a row yet. A function does the same work on every call, so its minimums
   * stop dropping once it had two checks in a row without noise. The first check of the empty function read 192 more
   * promoted bytes, and once 1232 more bytes in the old generation, than its later checks, by measurement, and on a slow
   * runner of the CI its second check read 80 more bytes. A full collection in one check can be a coincidence: after a
   * full collection V8 raises the limit of the old generation, so the next one needs many checks, and the next rounds
   * read the values that this check left out; a function with a full collection in every call reads none of them, so
   * they need no more rounds
   */
  isRoundNeeded: () => boolean
  /** Returns, for each given function, its minimums minus those of the empty function, and the cycles per byte */
  getMeasurement: () => GcMeasurement
}

/**
 * Creates the checks of the given functions. The first time, it also measures the cost of a young collection,
 * which takes a while, so start the timer of timeGc after this call
 */
export function createGcChecks(
  gcTools: GcTools,
  funcs: CalcPerformanceArgs['funcs'],
): GcChecks {
  const checkedFuncs = [emptyFunc, ...funcs]
  const allocatedBytes = createByteCount('allocatedBytes', checkedFuncs.length)
  const uncollectedBytes = createByteCount(
    'uncollectedBytes',
    checkedFuncs.length,
  )
  const allocatedInOldGenerationBytes = createByteCount(
    'allocatedInOldGenerationBytes',
    checkedFuncs.length,
  )
  const cyclesPerByte = gcTools.getCyclesPerByte()
  // Every call comes after two young collections: these two, or the two at the end of the previous check. After two
  // young collections every older object is either freed or moved to the old generation, so what a call keeps alive
  // is what the two collections after it move to the old generation
  gcTools.collectYoungGeneration()
  gcTools.collectYoungGeneration()
  let fullGcCountBefore = 0
  let hasRoundLoweredMinimum = false
  let hasLastRoundLoweredMinimum = true

  function checkStart(): void {
    fullGcCountBefore = gcTools.fullGcCount()
    gcTools.bytesMark()
  }

  function checkEnd(funcIndex: number): void {
    // Read before the collections, because the calls of gc allocate bytes of their own
    const allocatedBytesOfCall = gcTools.allocatedBytesSinceMark()
    const allocatedInOldGenerationBytesOfCall =
      gcTools.allocatedInOldGenerationBytesSinceMark()
    // After two young collections everything that the call keeps is in the old generation, so the bytes moved there
    // are the bytes that the call keeps. The young generation is left out: V8 counted up to 32 KB of unused space
    // as used in it after some collections, by measurement
    gcTools.collectYoungGeneration()
    gcTools.collectYoungGeneration()
    // Stored only after the collections. With this store before them, the collections counted 16 more uncollected
    // bytes in most checks of every function, by measurement
    keepMinimum(allocatedBytes, funcIndex, allocatedBytesOfCall)
    // A full collection also frees objects in the old generation, so the uncollected and the old generation bytes
    // of this check are wrong: they are not kept
    if (gcTools.fullGcCount() === fullGcCountBefore) {
      keepMinimum(uncollectedBytes, funcIndex, gcTools.promotedBytesSinceMark())
      keepMinimum(
        allocatedInOldGenerationBytes,
        funcIndex,
        allocatedInOldGenerationBytesOfCall,
      )
    }
    // The check of the last function ends a round
    if (funcIndex === checkedFuncs.length - 1) {
      hasLastRoundLoweredMinimum = hasRoundLoweredMinimum
      hasRoundLoweredMinimum = false
    }
  }

  function isRoundNeeded(): boolean {
    return (
      hasLastRoundLoweredMinimum ||
      hasValuesWithoutMinimum(allocatedBytes) ||
      hasValuesWithoutMinimum(uncollectedBytes) ||
      hasValuesWithoutMinimum(allocatedInOldGenerationBytes)
    )
  }

  // Lowers the minimum exclusively to a value that the previous check of the function read too, because a check alone
  // can read fewer bytes than the call takes
  function keepMinimum(
    count: ByteCount,
    funcIndex: number,
    value: number,
  ): void {
    if (
      value === count.lastValues[funcIndex] &&
      value < count.mins[funcIndex]
    ) {
      count.mins[funcIndex] = value
      hasRoundLoweredMinimum = true
    }
    count.lastValues[funcIndex] = value
    count.checksCounts[funcIndex]++
    if (
      count.mins[funcIndex] === Infinity &&
      count.checksCounts[funcIndex] >= CHECKS_WITHOUT_REPEAT_MAX
    ) {
      throw new Error(
        `[checkEnd] ${CHECKS_WITHOUT_REPEAT_MAX} checks of ${getFuncName(funcIndex)}` +
          ` never read the same ${count.name} twice in a row;` +
          ' calcPerformance measures functions that do the same work on every call',
      )
    }
  }

  function getMeasurement(): GcMeasurement {
    for (let i = 0, len = checkedFuncs.length; i < len; i++) {
      // No check counted the uncollected bytes of the function if every check had a full collection, in all the rounds
      // that isRoundNeeded asked for
      if (uncollectedBytes.checksCounts[i] === 0) {
        throw new Error(
          `[getMeasurement] every check of ${getFuncName(i)}` +
            ' had a full collection, so its uncollected bytes cannot be measured;' +
            ' a function that causes a full collection in every call can be measured with timeGc null only',
        )
      }
    }
    return {
      allocatedBytes: getBytesOfFuncs(allocatedBytes),
      uncollectedBytes: getBytesOfFuncs(uncollectedBytes),
      allocatedInOldGenerationBytes: getBytesOfFuncs(
        allocatedInOldGenerationBytes,
      ),
      cyclesPerByte,
    }
  }

  return {
    funcs: checkedFuncs,
    checkStart,
    checkEnd,
    isRoundNeeded,
    getMeasurement,
  }
}

// After this many checks of a count without a value read twice in a row, the function does not do the same work on
// every call. By measurement under Node 22, the most frequent value of a count covered 96-100% of the checks of a
// function; even with a quarter of the checks disturbed, a function that does the same work on every call reads no
// value twice in a row in 20 checks with a chance below 0.0001
const CHECKS_WITHOUT_REPEAT_MAX = 20

function emptyFunc(): void {
  // Does nothing: its values are what the checking code itself adds
}

// The minimums of the given functions minus that of the empty function. They cannot be negative: the empty function
// does nothing, and every check runs the same code around the call
function getBytesOfFuncs(count: ByteCount): number[] {
  const emptyFuncBytes = getMinimum(count, 0)
  const bytesOfFuncs: number[] = []
  for (let i = 1, len = count.mins.length; i < len; i++) {
    const bytes = getMinimum(count, i) - emptyFuncBytes
    if (bytes < 0) {
      throw new Error(
        `[getMeasurement] ${count.name} of funcs[${i - 1}] (${bytes}) are below those of the empty function`,
      )
    }
    bytesOfFuncs.push(bytes)
  }
  return bytesOfFuncs
}

// The minimum is missing exclusively where the rounds of checks ended before isRoundNeeded allowed it, because
// isRoundNeeded asks for rounds until every function read a value twice in a row
function getMinimum(count: ByteCount, funcIndex: number): number {
  const min = count.mins[funcIndex]
  if (min === Infinity) {
    throw new Error(
      `[getMeasurement] no two checks of ${getFuncName(funcIndex)} in a row read the same ${count.name}`,
    )
  }
  return min
}

// The name of a checked function in messages: the first is the empty function, the others are the given functions
function getFuncName(funcIndex: number): string {
  return funcIndex === 0 ? 'the empty function' : `funcs[${funcIndex - 1}]`
}

// Whether a function read values of the count, but no value twice in a row yet
function hasValuesWithoutMinimum(count: ByteCount): boolean {
  for (let i = 0, len = count.mins.length; i < len; i++) {
    if (count.checksCounts[i] > 0 && count.mins[i] === Infinity) {
      return true
    }
  }
  return false
}

/** One byte count of all checked functions: allocated, uncollected, or allocated in the old generation */
type ByteCount = {
  /** The name of the count in the result and in messages */
  name: string
  /** For each function, the smallest value that two of its checks in a row read; Infinity until two of them do */
  mins: number[]
  /** For each function, the value that its last check of the count read; NaN before its first check */
  lastValues: number[]
  /** For each function, the number of its checks that read the count */
  checksCounts: number[]
}

function createByteCount(name: string, funcsCount: number): ByteCount {
  const count: ByteCount = {
    name,
    mins: [],
    lastValues: [],
    checksCounts: [],
  }
  for (let i = 0; i < funcsCount; i++) {
    count.mins.push(Infinity)
    count.lastValues.push(NaN)
    count.checksCounts.push(0)
  }
  return count
}
