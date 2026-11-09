import type {CalcPerformanceArgs, GcTools} from './types'
import type {GcMeasurement} from './createCalcPerformanceResult'

/**
 * Measures the memory of one call of each function. One check = one call of one function, followed by two forced young
 * collections. Every function is checked many times, and its smallest values are kept, to remove random noise
 */
export type GcChecks = {
  /**
   * The first is an empty function, the others are the given functions. The empty function measures what the checking
   * code itself allocates (for example, the promise of an await); this is subtracted from the other functions
   */
  funcs: CalcPerformanceArgs['funcs'],
  /** Starts a check: saves the byte counters */
  checkStart: () => void,
  /** Ends the check of funcs[funcIndex]: reads its bytes, forces two young collections, and keeps the smallest values */
  checkEnd: (funcIndex: number) => void,
  /**
   * Whether one more round of checks is needed after timeGc: the checks need at least two rounds. The first check
   * of the empty function read 192 more promoted bytes, and once 1232 more bytes in the old generation, than its later
   * checks, by measurement, so a single round would leave them in its minimums. A full collection in one check can be
   * a coincidence: after a full collection V8 raises the limit of the old generation, so the next one needs many
   * checks; a full collection in two checks of a function in a row means that the function causes one in every call
   */
  isRoundNeeded: () => boolean,
  /** Returns, for each given function, its smallest bytes minus those of the empty function, and the cycles per byte */
  getMeasurement: () => GcMeasurement,
}

/**
 * Creates the checks of the given functions. The first time, it also measures the cost of a young collection,
 * which takes a while, so start the timer of timeGc after this call
 */
export function createGcChecks(gcTools: GcTools, funcs: CalcPerformanceArgs['funcs']): GcChecks {
  const checkedFuncs = [emptyFunc, ...funcs]
  const bytesMins: number[] = []
  const uncollectedBytesMins: number[] = []
  const allocatedInOldGenerationBytesMins: number[] = []
  for (let i = 0, len = checkedFuncs.length; i < len; i++) {
    bytesMins.push(Infinity)
    uncollectedBytesMins.push(Infinity)
    allocatedInOldGenerationBytesMins.push(Infinity)
  }
  const cyclesPerByte = gcTools.getCyclesPerByte()
  // Every call comes after two young collections: these two, or the two at the end of the previous check. After two
  // young collections every older object is either freed or moved to the old generation, so what a call keeps alive
  // is what the two collections after it move to the old generation
  gcTools.collectYoungGeneration()
  gcTools.collectYoungGeneration()
  let fullGcCountBefore = 0
  let roundsCount = 0

  function checkStart(): void {
    fullGcCountBefore = gcTools.fullGcCount()
    gcTools.bytesMark()
  }

  function checkEnd(funcIndex: number): void {
    // Read before the collections, because the calls of gc allocate bytes of their own
    const allocatedBytesOfCall = gcTools.allocatedBytesSinceMark()
    const allocatedInOldGenerationBytesOfCall = gcTools.allocatedInOldGenerationBytesSinceMark()
    // After two young collections everything that the call keeps is in the old generation, so the bytes moved there
    // are the bytes that the call keeps. The young generation is left out: V8 counted up to 32 KB of unused space
    // as used in it after some collections, by measurement
    gcTools.collectYoungGeneration()
    gcTools.collectYoungGeneration()
    // Stored only after the collections. With this store before them, the collections counted 16 more uncollected
    // bytes in most checks of every function, by measurement
    bytesMins[funcIndex] = Math.min(bytesMins[funcIndex], allocatedBytesOfCall)
    // A full collection also frees objects in the old generation, so the uncollected and the old generation bytes
    // of this check are wrong: they are not kept
    if (gcTools.fullGcCount() === fullGcCountBefore) {
      uncollectedBytesMins[funcIndex] = Math.min(uncollectedBytesMins[funcIndex], gcTools.promotedBytesSinceMark())
      allocatedInOldGenerationBytesMins[funcIndex] = Math.min(
        allocatedInOldGenerationBytesMins[funcIndex],
        allocatedInOldGenerationBytesOfCall,
      )
    }
    // The check of the last function ends a round
    if (funcIndex === checkedFuncs.length - 1) {
      roundsCount++
    }
  }

  function isRoundNeeded(): boolean {
    return roundsCount < 2
  }

  function getMeasurement(): GcMeasurement {
    for (let i = 0, len = checkedFuncs.length; i < len; i++) {
      // Infinity if every check of the function had a full collection, in at least two rounds by isRoundNeeded
      if (uncollectedBytesMins[i] === Infinity) {
        throw new Error(`[getMeasurement] every check of ${i === 0 ? 'the empty function' : `funcs[${i - 1}]`}`
          + ' had a full collection, so its uncollected bytes cannot be measured;'
          + ' a function that causes a full collection in every call can be measured with timeGc null only')
      }
    }
    const allocatedBytes: number[] = []
    const uncollectedBytes: number[] = []
    const allocatedInOldGenerationBytes: number[] = []
    for (let i = 1, len = checkedFuncs.length; i < len; i++) {
      allocatedBytes.push(getBytesOfFunc(bytesMins, i, 'allocatedBytes'))
      uncollectedBytes.push(getBytesOfFunc(uncollectedBytesMins, i, 'uncollectedBytes'))
      allocatedInOldGenerationBytes.push(
        getBytesOfFunc(allocatedInOldGenerationBytesMins, i, 'allocatedInOldGenerationBytes'),
      )
    }
    return {
      allocatedBytes,
      uncollectedBytes,
      allocatedInOldGenerationBytes,
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

function emptyFunc(): void {
  // Does nothing: its values are what the checking code itself adds
}

// The bytes of a call minus those of the empty function. They cannot be negative: the empty function does nothing,
// and every check runs the same code around the call
function getBytesOfFunc(bytesMins: number[], funcIndex: number, name: string): number {
  const bytes = bytesMins[funcIndex] - bytesMins[0]
  if (bytes < 0) {
    throw new Error(`[getMeasurement] ${name} of funcs[${funcIndex - 1}] (${bytes}) are below those of the empty function`)
  }
  return bytes
}
