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
  }

  function getMeasurement(): GcMeasurement {
    const allocatedBytes: number[] = []
    const uncollectedBytes: number[] = []
    const allocatedInOldGenerationBytes: number[] = []
    for (let i = 1, len = checkedFuncs.length; i < len; i++) {
      allocatedBytes.push(bytesMins[i] - bytesMins[0])
      // Infinity if every check of this function, or of the empty function, had a full collection: then nothing
      // was measured, and the result is NaN
      const uncollected = uncollectedBytesMins[i] - uncollectedBytesMins[0]
      uncollectedBytes.push(Number.isFinite(uncollected) ? uncollected : NaN)
      const allocatedInOldGeneration = allocatedInOldGenerationBytesMins[i] - allocatedInOldGenerationBytesMins[0]
      allocatedInOldGenerationBytes.push(Number.isFinite(allocatedInOldGeneration) ? allocatedInOldGeneration : NaN)
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
    getMeasurement,
  }
}

function emptyFunc(): void {
  // Does nothing: its values are what the checking code itself adds
}
