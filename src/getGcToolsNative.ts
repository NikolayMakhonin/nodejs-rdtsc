import * as v8 from 'v8'
import * as vm from 'vm'
import type { GcTools } from './types'
import { createCyclesPerByteGetter } from './createCyclesPerByteGetter'
import {
  addGcCallbacks,
  bytesMark,
  allocatedBytesSinceMark,
  gcLastCycles,
  youngGenerationCapacity,
  promotedBytesSinceMark,
  allocatedInOldGenerationBytesSinceMark,
  fullGcCount,
  youngGcCount,
} from './binding'

type GcRun = (options: { type: 'minor' }) => void

let gcTools: undefined | GcTools

/**
 * Returns the functions for measuring garbage collection in Node, created on the first call, which throws where
 * this Node cannot provide them
 */
export function getGcToolsNative(): GcTools {
  if (gcTools === void 0) {
    gcTools = createGcToolsNative()
  }
  return gcTools
}

function createGcToolsNative(): GcTools {
  const gc = exposeGc()
  addGcCallbacks()

  // Without a young collection the counters would stay as they were, and every call would read as keeping nothing
  function collectYoungGeneration(): void {
    const youngGcCountBefore = youngGcCount()
    gc({ type: 'minor' })
    if (youngGcCount() === youngGcCountBefore) {
      throw new Error(
        "[collectYoungGeneration] gc({type: 'minor'}) ran no young collection",
      )
    }
  }

  return {
    bytesMark,
    allocatedBytesSinceMark,
    getCyclesPerByte: createCyclesPerByteGetter(
      () => measureYoungGcCycles(collectYoungGeneration),
      youngGenerationCapacity,
    ),
    collectYoungGeneration,
    promotedBytesSinceMark,
    allocatedInOldGenerationBytesSinceMark,
    fullGcCount,
  }
}

// A library cannot require starting Node with --expose-gc, so the flag is set here. The gc function appears only
// in contexts created after that, so a new vm context is created to get it
function exposeGc(): GcRun {
  v8.setFlagsFromString('--expose-gc')
  const gc: null | GcRun = vm.runInNewContext(
    "typeof gc === 'function' ? gc : null",
  )
  if (gc == null) {
    throw new Error(
      "[exposeGc] no gc function after v8.setFlagsFromString('--expose-gc')",
    )
  }
  return gc
}

// Forces young collections in a row. After the first ones there is almost nothing left to copy, so the shortest
// one shows the fixed cost of every young collection; taking the shortest also drops interruptions of the thread
function measureYoungGcCycles(collectYoungGeneration: () => void): number {
  // On a busy machine the minimum still dropped between 50 and 100 collections, by measurement
  const COLLECTIONS_COUNT = 100
  let minCycles = Infinity
  for (let i = 0; i < COLLECTIONS_COUNT; i++) {
    collectYoungGeneration()
    const cycles = gcLastCycles()
    if (cycles < minCycles) {
      minCycles = cycles
    }
  }
  return minCycles
}
