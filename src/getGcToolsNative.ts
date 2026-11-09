import * as v8 from 'v8'
import * as vm from 'vm'
import type {GcTools} from './types'
import {createCyclesPerByteGetter} from './createCyclesPerByteGetter'
import {
  addGcCallbacks,
  bytesMark,
  allocatedBytesSinceMark,
  gcLastCycles,
  youngGenerationCapacity,
  promotedBytesSinceMark,
  allocatedInOldGenerationBytesSinceMark,
  fullGcCount,
} from './binding'

type GcRun = (options: {type: 'minor'}) => void

let gcTools: undefined | null | GcTools

/** Returns the functions for measuring garbage collection in Node, or null if this Node cannot provide them; created on the first call */
export function getGcToolsNative(): null | GcTools {
  if (gcTools === void 0) {
    gcTools = createGcToolsNative()
  }
  return gcTools
}

function createGcToolsNative(): null | GcTools {
  // A library cannot require starting Node with --expose-gc, so the flag is set here. The gc function appears only
  // in contexts created after that, so a new vm context is created to get it
  v8.setFlagsFromString('--expose-gc')
  const gc: null | GcRun = vm.runInNewContext("typeof gc === 'function' ? gc : null")
  if (gc == null) {
    return null
  }
  addGcCallbacks()

  return {
    bytesMark,
    allocatedBytesSinceMark,
    getCyclesPerByte: createCyclesPerByteGetter(
      () => measureYoungGcCycles(gc),
      youngGenerationCapacity,
    ),
    collectYoungGeneration: () => {
      gc({type: 'minor'})
    },
    promotedBytesSinceMark,
    allocatedInOldGenerationBytesSinceMark,
    fullGcCount,
  }
}

// Forces young collections in a row. After the first ones there is almost nothing left to copy, so the shortest
// one shows the fixed cost of every young collection; taking the shortest also drops interruptions of the thread
function measureYoungGcCycles(gc: GcRun): number {
  // On a busy machine the minimum still dropped between 50 and 100 collections, by measurement
  const COLLECTIONS_COUNT = 100
  let minCycles = Infinity
  for (let i = 0; i < COLLECTIONS_COUNT; i++) {
    gc({type: 'minor'})
    const cycles = gcLastCycles()
    if (cycles < minCycles) {
      minCycles = cycles
    }
  }
  return minCycles
}
