import assert from 'assert'
import { describe, it } from 'vitest'
import { createGcChecks, type GcChecks } from './createGcChecks'
import type { GcTools } from './types'

describe('rdtsc > createGcChecks', () => {
  it('minimums of the checks minus those of the empty function', () => {
    const { counts, gcTools } = createFakeGcTools()

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
    for (let round = 0; round < 4; round++) {
      for (let k = 0, len = gcChecks.funcs.length; k < len; k++) {
        gcChecks.checkStart()
        gcChecks.funcs[k]()
        gcChecks.checkEnd(k)
      }
      // A minimum comes from two checks in a row with the same value, so the third round still lowers minimums: the
      // first call of funcs[0] allocated 1000 bytes, and the full collection in the first call of funcs[2] left out its
      // uncollected and old generation bytes
      assert.strictEqual(gcChecks.isRoundNeeded(), round < 3)
    }

    assert.deepStrictEqual(gcChecks.getMeasurement(), {
      allocatedBytes: [48, 48, 48],
      uncollectedBytes: [0, 32, 16],
      allocatedInOldGenerationBytes: [0, 0, 32],
      cyclesPerByte: 2,
    })
  })

  it('a value that no two checks in a row read changes no minimum', () => {
    const { counts, gcTools } = createFakeGcTools()
    let callIndex = 0
    // Keeps 32 bytes in every call; in the third and the fifth checks the old generation reads 1000 bytes smaller, as
    // when a collection frees the allocation buffers of other threads
    const gcChecks = createGcChecks(gcTools, [
      () => {
        callIndex++
        counts.promoted += callIndex === 3 || callIndex === 5 ? 32 - 1000 : 32
      },
    ])
    checkRounds(gcChecks, 6)
    assert.strictEqual(gcChecks.isRoundNeeded(), false)
    assert.deepStrictEqual(gcChecks.getMeasurement().uncollectedBytes, [32])
  })

  it('getMeasurement throws where every check of a function had a full collection', () => {
    const { counts, gcTools } = createFakeGcTools()
    const gcChecks = createGcChecks(gcTools, [
      () => {
        counts.fullGcCount++
      },
    ])
    checkRounds(gcChecks, 2)
    assert.throws(
      () => gcChecks.getMeasurement(),
      /every check of funcs\[0\] had a full collection/,
    )
  })

  it('getMeasurement throws where a function reads below the empty function', () => {
    const { counts, gcTools } = createFakeGcTools()
    // Makes the old generation 8 bytes smaller in every call, so its uncollected bytes read -8
    const gcChecks = createGcChecks(gcTools, [
      () => {
        counts.promoted -= 8
      },
    ])
    checkRounds(gcChecks, 2)
    assert.throws(
      () => gcChecks.getMeasurement(),
      /uncollectedBytes of funcs\[0\] \(-8\) are below those of the empty function/,
    )
  })

  it('checkEnd throws where 20 checks of a function never read the same bytes twice in a row', () => {
    const { counts, gcTools } = createFakeGcTools()
    let callIndex = 0
    // Allocates 8 bytes more in every call, so no two of its checks read the same allocated bytes
    const gcChecks = createGcChecks(gcTools, [
      () => {
        callIndex++
        counts.allocated += 8 * callIndex
      },
    ])
    assert.throws(() => {
      checkRounds(gcChecks, 20)
    }, /20 checks of funcs\[0\] never read the same allocatedBytes twice in a row/)
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
function createFakeGcTools(): { counts: FakeCounts; gcTools: GcTools } {
  const counts: FakeCounts = {
    allocated: 0,
    promoted: 0,
    allocatedInOldGeneration: 0,
    fullGcCount: 0,
  }
  const marks = { allocated: 0, promoted: 0, allocatedInOldGeneration: 0 }
  const gcTools: GcTools = {
    getCyclesPerByte: () => 2,
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
    allocatedBytesSinceMark: () => counts.allocated - marks.allocated,
    promotedBytesSinceMark: () => counts.promoted - marks.promoted,
    allocatedInOldGenerationBytesSinceMark: () =>
      counts.allocatedInOldGeneration - marks.allocatedInOldGeneration,
    fullGcCount: () => counts.fullGcCount,
  }
  return { counts, gcTools }
}

type FakeCounts = {
  allocated: number
  promoted: number
  allocatedInOldGeneration: number
  fullGcCount: number
}
