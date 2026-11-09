import type {CalcPerformanceResult, CalcPerformanceValues} from './types'

/** Memory measured by calcPerformance: the bytes of one call of each function, and the cost of one byte in cycles */
export type GcMeasurement = {
  allocatedBytes: number[],
  uncollectedBytes: number[],
  allocatedInOldGenerationBytes: number[],
  cyclesPerByte: number,
}

export type CreateCalcPerformanceResultArgs = {
  calcInfo: CalcPerformanceResult['calcInfo'],
  /** Minimum cycles of one call of each function, without garbage collection */
  logicCycles: bigint[],
  /** Null if memory was not measured */
  gc: null | GcMeasurement,
}

/** Builds the result of calcPerformance from what it measured */
export function createCalcPerformanceResult({
  calcInfo,
  logicCycles,
  gc,
}: CreateCalcPerformanceResultArgs): CalcPerformanceResult {
  if (gc == null) {
    return {
      calcInfo,
      cycles: createCalcPerformanceValues(logicCycles),
      gc    : null,
    }
  }

  // Rounded to whole cycles, so that cycles = logic + memory exactly
  const memoryCycles = gc.allocatedBytes.map(o => BigInt(Math.round(o * gc.cyclesPerByte)))
  return {
    calcInfo,
    cycles: createCalcPerformanceValues(logicCycles.map((o, i) => o + memoryCycles[i])),
    gc    : {
      logic                        : createCalcPerformanceValues(logicCycles),
      memory                       : createCalcPerformanceValues(memoryCycles),
      allocatedBytes               : createCalcPerformanceValues(gc.allocatedBytes),
      uncollectedBytes             : createCalcPerformanceValues(gc.uncollectedBytes),
      allocatedInOldGenerationBytes: createCalcPerformanceValues(gc.allocatedInOldGenerationBytes),
      cyclesPerByte                : gc.cyclesPerByte,
    },
  }
}

function createCalcPerformanceValues<Value extends bigint | number>(values: Value[]): CalcPerformanceValues<Value> {
  const absoluteDiff = values.length > 1
    ? values.slice(1).map(o => Number(o) - Number(values[0]))
    : void 0

  const relativeDiff = absoluteDiff != null && absoluteDiff.length > 1 && absoluteDiff[0] > 0
    ? absoluteDiff.slice(1).map(o => o / absoluteDiff[0])
    : void 0

  return {
    values,
    absoluteDiff,
    relativeDiff,
  }
}
