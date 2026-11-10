import assert from 'assert'
import * as vm from 'vm'
import {beforeAll, describe, it} from 'vitest'
import {calcPerformance} from './calcPerformance'
import {calcPerformanceAsync} from './calcPerformanceAsync'
import {objectToString} from './-test/helpers/objectToString'
import {rdtscNative} from './rdtscNative'
import {rdtscJs} from './rdtscJs'
import {setGcToolsDefault} from './gcToolsDefault'
import {getGcToolsNative} from './getGcToolsNative'
import {youngGenerationCapacity} from './binding'
import {setRdtscDefault} from './rdtscDefault'

// Holds the last created object, so that V8 cannot remove the allocations as unused
let sink: unknown = null

describe('rdtsc > calcPerformance', () => {
  beforeAll(() => {
    setGcToolsDefault(getGcToolsNative)
    // Creates the tools, which set --expose-gc, so that every test can get the global gc from a new vm context
    getGcToolsNative()
  })

  it('rdtscJs keeps the minimum of all calls', () => {
    let isFirstCall = true
    const result = calcPerformance({
      rdtsc : rdtscJs,
      time  : 100,
      timeGc: null,
      funcs : [() => {
        if (isFirstCall) {
          isFirstCall = false
          const endTime = performance.now() + 10
          while (performance.now() < endTime) {
            // The first call takes 10 ms: if the result kept the first call instead of the minimum, the check below
            // would fail
          }
        }
      }],
    })
    // rdtsc of rdtscJs counts nanoseconds in Node
    assert.ok(result.cycles.values[0] < BigInt(1000000), objectToString(result))
  })

  it('allocatedBytes follow the objects that the functions create', () => {
    const result = calcPerformance({
      rdtsc : rdtscNative,
      time  : 100,
      timeGc: 100,
      funcs : [
        () => {},
        () => {
          createObjects(10)
        },
        () => {
          createObjects(100)
        },
      ],
    })
    assert.ok(result.gc, objectToString(result))
    // The empty function allocates nothing; 0 here shows that the measurement itself adds no bytes
    assert.strictEqual(result.gc.allocatedBytes.values[0], 0, objectToString(result))
    const bytesDiff = result.gc.allocatedBytes.absoluteDiff!
    // Ten times as many of the same objects take ten times as many bytes
    assert.ok(Math.abs(bytesDiff[1] / bytesDiff[0] - 10) < 0.5, objectToString(result))
    assert.ok(result.gc.memory.values[2] > result.gc.memory.values[1], objectToString(result))
  })

  it('allocatedBytes count what collections inside a call take out of the young generation', () => {
    const result = calcPerformance({
      rdtsc : rdtscNative,
      time  : 100,
      timeGc: 300,
      funcs : [
        () => {
          createObjects(100000)
        },
        () => {
          createObjects(1000000)
        },
      ],
    })
    assert.ok(result.gc, objectToString(result))
    const bytes = result.gc.allocatedBytes.values
    // A million objects take more than the young generation holds, so collections run inside every call
    assert.ok(bytes[1] > youngGenerationCapacity(), objectToString(result))
    // Ten times as many of the same objects take ten times as many bytes
    assert.ok(Math.abs(bytes[1] / bytes[0] - 10) < 0.5, objectToString(result))
  })

  it('uncollectedBytes count what a call leaves in use', () => {
    const kept: unknown[] = []
    const result = calcPerformance({
      rdtsc : rdtscNative,
      time  : 1,
      timeGc: 100,
      funcs : [
        () => {},
        () => {
          createObjects(100)
        },
        () => {
          createObjects(1000)
        },
        () => {
          kept.push({value: 0})
        },
      ],
    })
    assert.ok(result.gc, objectToString(result))
    const uncollected = result.gc.uncollectedBytes.values
    // The empty function keeps and allocates nothing; 0 here shows that the measurement itself adds no bytes
    assert.strictEqual(uncollected[0], 0, objectToString(result))
    assert.strictEqual(result.gc.allocatedInOldGenerationBytes.values[0], 0, objectToString(result))
    // createObjects keeps only its last object (in sink), however many it creates; the last function keeps one
    // object of the same shape per call (in kept). So all three keep the bytes of one object
    assert.ok(uncollected[1] > 0, objectToString(result))
    assert.strictEqual(uncollected[2], uncollected[1], objectToString(result))
    assert.strictEqual(uncollected[3], uncollected[1], objectToString(result))
  })

  it('what V8 creates straight in the old generation counts in allocatedInOldGenerationBytes, not in uncollectedBytes', () => {
    const result = calcPerformance({
      rdtsc : rdtscNative,
      time  : 1,
      timeGc: 100,
      funcs : [
        () => {
          // V8 creates the string of a fractional number directly in the old generation. If uncollectedBytes
          // counted it, uncollectedBytes would be larger than allocatedBytes
          sink = Math.random() + ''
        },
      ],
    })
    assert.ok(result.gc, objectToString(result))
    assert.ok(
      result.gc.uncollectedBytes.values[0] <= result.gc.allocatedBytes.values[0],
      objectToString(result),
    )
    assert.ok(result.gc.allocatedInOldGenerationBytes.values[0] > 0, objectToString(result))
  })

  it('calcPerformance throws for a function with a full collection in every call', () => {
    // The global gc exists because beforeAll() set --expose-gc; gc() without arguments runs a full collection
    const gc: () => void = vm.runInNewContext('gc')
    assert.throws(
      () => calcPerformance({
        rdtsc : rdtscNative,
        time  : 1,
        timeGc: 100,
        funcs : [() => {
          gc()
        }],
      }),
      /every check of funcs\[0\] had a full collection/,
    )
  })

  it('cycles of a call leave out the collections during it', () => {
    // The global gc exists because beforeAll() set --expose-gc
    const gc: (options: {type: 'minor'}) => void = vm.runInNewContext('gc')
    let collectionCyclesMin = Infinity
    for (let i = 0; i < 10; i++) {
      const start = rdtscNative.rdtsc()
      gc({type: 'minor'})
      collectionCyclesMin = Math.min(collectionCyclesMin, Number(rdtscNative.rdtsc() - start))
    }
    const result = calcPerformance({
      rdtsc : rdtscNative,
      time  : 100,
      timeGc: null,
      funcs : [() => {
        gc({type: 'minor'})
      }],
    })
    // mark1 subtracts the time between the garbage collection callbacks; only the call of gc() itself stays in
    // the result (12-28 µs by measurement), which is much less than half of a collection
    assert.ok(
      Number(result.cycles.values[0]) < collectionCyclesMin / 2,
      objectToString({collectionCyclesMin, result}),
    )
  })

  it('calcPerformance reads the clock a few dozen times', async () => {
    const originalNow = performance.now
    let clockReads = 0
    performance.now = () => {
      clockReads++
      return originalNow.call(performance)
    }
    try {
      const result = calcPerformance({rdtsc: rdtscNative, time: 100, timeGc: null, funcs: [() => {}]})
      assert.ok(clockReads < 1000, objectToString({clockReads, iterations: result.calcInfo.iterations}))

      clockReads = 0
      const resultAsync = await calcPerformanceAsync({rdtsc: rdtscNative, time: 100, timeGc: null, funcs: [() => {}]})
      assert.ok(clockReads < 1000, objectToString({clockReads, iterations: resultAsync.calcInfo.iterations}))
    }
    finally {
      performance.now = originalNow
    }
  })

  it('calcPerformance without rdtsc throws a clear error where no entry set a default', () => {
    setRdtscDefault(null)
    try {
      assert.throws(() => {
        calcPerformance({time: 1, timeGc: null, funcs: [() => {}]})
      }, /no default rdtsc/)
    }
    finally {
      setRdtscDefault(rdtscNative)
    }
  })
})

function createObjects(count: number): void {
  for (let i = 0; i < count; i++) {
    sink = {value: i}
  }
}
