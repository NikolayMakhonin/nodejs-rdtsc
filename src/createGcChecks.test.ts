import assert from 'assert'
import {describe, it} from 'vitest'
import {createGcChecks, type GcChecks} from './createGcChecks'
import type {GcTools} from './types'

describe('rdtsc > createGcChecks', () => {
  it('minimums of the checks minus those of the empty function', () => {
    const {counts, gcTools} = createFakeGcTools()

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
    ]

    const gcChecks = createGcChecks(gcTools, funcs)
    assert.deepStrictEqual(gcChecks.funcs.slice(1), funcs)
    for (let round = 0; round < 3; round++) {
      for (let k = 0, len = gcChecks.funcs.length; k < len; k++) {
        gcChecks.checkStart()
        gcChecks.funcs[k]()
        gcChecks.checkEnd(k)
      }
      // The second round still lowers minimums: the first call of funcs[0] allocated 1000 bytes, and the full
      // collection in the first call of funcs[2] left out its uncollected and old generation bytes
      assert.strictEqual(gcChecks.isRoundNeeded(), round < 2)
    }

    assert.deepStrictEqual(gcChecks.getMeasurement(), {
      allocatedBytes               : [48, 48, 48],
      uncollectedBytes             : [0, 32, 16],
      allocatedInOldGenerationBytes: [0, 0, 32],
      cyclesPerByte                : 2,
    })
  })

  it('getMeasurement throws where every check of a function had a full collection', () => {
    const {counts, gcTools} = createFakeGcTools()
    const gcChecks = createGcChecks(gcTools, [() => {
      counts.fullGcCount++
    }])
    checkRounds(gcChecks, 2)
    assert.throws(() => gcChecks.getMeasurement(), /every check of funcs\[0\] had a full collection/)
  })

  it('getMeasurement throws where a function reads below the empty function', () => {
    const {counts, gcTools} = createFakeGcTools()
    // Makes the old generation 8 bytes smaller in every call, so its uncollected bytes read -8
    const gcChecks = createGcChecks(gcTools, [() => {
      counts.promoted -= 8
    }])
    checkRounds(gcChecks, 2)
    assert.throws(
      () => gcChecks.getMeasurement(),
      /uncollectedBytes of funcs\[0\] \(-8\) are below those of the empty function/,
    )
  })
})

function checkRounds(gcChecks: GcChecks, roundsCount: number): void {
  for (let round = 0; round < roundsCount; round++) {
    for (let k = 0, len = gcChecks.funcs.length; k < len; k++) {
      gcChecks.checkStart()
      gcChecks.funcs[k]()
      gcChecks.checkEnd(k)
    }
  }
}

// Byte counters of a fake heap; the test functions change them directly
function createFakeGcTools(): {counts: FakeCounts, gcTools: GcTools} {
  const counts: FakeCounts = {allocated: 0, promoted: 0, allocatedInOldGeneration: 0, fullGcCount: 0}
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
  return {counts, gcTools}
}

type FakeCounts = {
  allocated: number,
  promoted: number,
  allocatedInOldGeneration: number,
  fullGcCount: number,
}
