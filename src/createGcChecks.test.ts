import {createGcChecks} from './createGcChecks'
import type {GcTools} from './types'

describe('rdtsc > createGcChecks', function () {
  it('minimums of the checks minus those of the empty function', function () {
    // Byte counters of a fake heap; the test functions below change them directly
    const counts = {allocated: 0, promoted: 0, allocatedInOldGeneration: 0, fullGcCount: 0}
    const marks = {allocated: 0, promoted: 0, allocatedInOldGeneration: 0}
    const gcTools: GcTools = {
      getCyclesPerByte      : () => 2,
      collectYoungGeneration: () => {
        // Every collection adds 24 bytes, a constant cost that every check pays; the empty function measures it,
        // and it is subtracted
        counts.promoted += 24
      },
      bytesMark: () => {
        marks.allocated = counts.allocated
        marks.promoted = counts.promoted
        marks.allocatedInOldGeneration = counts.allocatedInOldGeneration
      },
      allocatedBytesSinceMark               : () => counts.allocated - marks.allocated,
      promotedBytesSinceMark                : () => counts.promoted - marks.promoted,
      allocatedInOldGenerationBytesSinceMark: () => counts.allocatedInOldGeneration - marks.allocatedInOldGeneration,
      fullGcCount                           : () => counts.fullGcCount,
    }

    let isFirstGarbageCall = true
    let isFirstFullGcCall = true
    const funcs = [
      // Allocates 48 bytes of garbage; the first call allocates 1000 (like a first call that compiles code)
      () => {
        counts.allocated += isFirstGarbageCall ? 1000 : 48
        isFirstGarbageCall = false
      },
      // Allocates 48 bytes and keeps 32 of them alive
      () => {
        counts.allocated += 48
        counts.promoted += 32
      },
      // Allocates 48 bytes and keeps 16 of them alive, allocates 32 directly in the old generation;
      // a full collection happens in its first call only
      () => {
        counts.allocated += 48
        counts.promoted += 16
        counts.allocatedInOldGeneration += 32
        if (isFirstFullGcCall) {
          counts.fullGcCount++
          isFirstFullGcCall = false
        }
      },
      // Allocates 16 bytes and keeps them alive, allocates 32 directly in the old generation;
      // a full collection happens in every call
      () => {
        counts.allocated += 16
        counts.promoted += 16
        counts.allocatedInOldGeneration += 32
        counts.fullGcCount++
      },
    ]

    const gcChecks = createGcChecks(gcTools, funcs)
    assert.deepStrictEqual(gcChecks.funcs.slice(1), funcs)
    for (let round = 0; round < 3; round++) {
      for (let k = 0, len = gcChecks.funcs.length; k < len; k++) {
        gcChecks.checkStart()
        gcChecks.funcs[k]()
        gcChecks.checkEnd(k)
      }
    }

    assert.deepStrictEqual(gcChecks.getMeasurement(), {
      allocatedBytes               : [48, 48, 48, 16],
      uncollectedBytes             : [0, 32, 16, NaN],
      allocatedInOldGenerationBytes: [0, 0, 32, NaN],
      cyclesPerByte                : 2,
    })
  })
})
