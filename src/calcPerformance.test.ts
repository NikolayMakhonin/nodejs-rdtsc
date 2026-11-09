import * as vm from 'vm'
import {createTestVariants} from '@flemist/test-variants'
import {calcPerformance} from './calcPerformance'
import {calcPerformanceAsync} from './calcPerformanceAsync'
import {objectToString} from './-test/helpers/objectToString'
import {rdtscNative} from './rdtscNative'
import {rdtscJs} from './rdtscJs'
import type {CalcPerformanceValues} from './types'
import {setGcToolsDefault} from './gcToolsDefault'
import {getGcToolsNative} from './getGcToolsNative'
import {youngGenerationCapacity} from './binding'
import {setRdtscDefault} from './rdtscDefault'

// Holds the last created object, so that V8 cannot remove the allocations as unused. The tests read it at the end,
// so that rollup does not remove the writes in the built copies of the tests
let sink: unknown = null

describe('rdtsc > calcPerformance', function () {
  this.timeout(600000)

  before(function () {
    setGcToolsDefault(getGcToolsNative)
    // Creates the tools, which set --expose-gc, so that every test can get the global gc from a new vm context
    getGcToolsNative()
  })

  const MAX_TIME_ERROR = 30
  // The memory measurement checks the functions in at least two rounds and stops only after a whole round, so it can
  // take up to two rounds longer than timeGc; a round forces 2 young collections per function
  const MAX_GC_ROUND_TIME = 100

  const testVariants = createTestVariants(async ({
    async,
    timeGc,
    time,
    funcsSize1,
    funcsSize2,
    funcsSize3,
    funcsSize4,
  }: {
    async: boolean,
    timeGc: null | number,
    time: number,
    funcsSize1: number,
    funcsSize2: number|undefined|null,
    funcsSize3: number|undefined|null,
    funcsSize4: number|undefined|null,
  }) => {
    const startTime = process.hrtime.bigint()

    const funcsSizes: number[] = []
    if (funcsSize1 != null) {
      funcsSizes.push(funcsSize1)
    }
    if (funcsSize2 != null) {
      funcsSizes.push(funcsSize2)
    }
    if (funcsSize3 != null) {
      funcsSizes.push(funcsSize3)
    }
    if (funcsSize4 != null) {
      funcsSizes.push(funcsSize4)
    }

    const funcs = funcsSizes.map(size => {
      switch (size) {
        case 0:
          return () => {}
        case 1:
          return () => {
            Object.keys(Math)
          }
        case 2:
          return () => {
            Object.keys(Math)
            Object.keys(Math)
          }
        case 3:
          return () => {
            Object.keys(Math)
            Object.keys(Math)
            Object.keys(Math)
          }
        default:
          throw new Error('Unsupported func size: ' + size)
      }
    })

    const result = async
      ? await calcPerformanceAsync({rdtsc: rdtscNative, time: time, timeGc, funcs})
      : calcPerformance({rdtsc: rdtscNative, time: time, timeGc, funcs})

    const elapsedTime = Number(process.hrtime.bigint() - startTime) / 1e6
    const maxTime = time + (timeGc == null ? 0 : timeGc + MAX_GC_ROUND_TIME) + MAX_TIME_ERROR
    if (elapsedTime < time - 1 || elapsedTime > maxTime) {
      assert.fail(`elapsedTime = ${elapsedTime}; ${time}`)
    }

    // calcInfo
    if (result.calcInfo.testTime < time - 1 || result.calcInfo.testTime > time + MAX_TIME_ERROR) {
      assert.fail(`result.calcInfo.testTime = ${result.calcInfo.testTime}`)
    }
    assert.ok(result.calcInfo.iterationCycles > 0)
    assert.ok(result.calcInfo.iterations > 0)
    assert.strictEqual(result.calcInfo.funcsCount, funcsSizes.length)

    checkValues(result.cycles, funcsSizes.length)
    for (let i = 0; i < funcsSizes.length; i++) {
      // 0 where one step of the counter is longer than a call of the function, as on arm64
      assert.ok(result.cycles.values[i] >= 0)
    }

    if (timeGc == null) {
      assert.strictEqual(result.gc, null)
    }
    else {
      assert.ok(result.gc, objectToString(result))
      checkValues(result.gc.logic, funcsSizes.length)
      checkValues(result.gc.memory, funcsSizes.length)
      checkValues(result.gc.allocatedBytes, funcsSizes.length)
      checkValues(result.gc.uncollectedBytes, funcsSizes.length)
      checkValues(result.gc.allocatedInOldGenerationBytes, funcsSizes.length)
      assert.ok(result.gc.cyclesPerByte > 0 && Number.isFinite(result.gc.cyclesPerByte), objectToString(result))
      for (let i = 0; i < funcsSizes.length; i++) {
        assert.strictEqual(result.cycles.values[i], result.gc.logic.values[i] + result.gc.memory.values[i])
      }
    }

    const logicCycles = result.gc ? result.gc.logic.values : result.cycles.values
    let cyclesSum = BigInt(0)
    for (let i = 0; i < funcsSizes.length; i++) {
      cyclesSum += logicCycles[i]
    }
    // Each function ran at least `rounds` times, and each call took at least its minimum, so rounds * (sum of
    // the minimums) cannot exceed the cycles of all iterations
    const rounds = Math.floor(result.calcInfo.iterations / funcsSizes.length)
    assert.ok(
      Number(cyclesSum) * rounds <= result.calcInfo.iterationCycles * result.calcInfo.iterations,
      objectToString(result),
    )
  })

  it('variants', async function () {
    await rdtscNative.runInRealtimePriority(() => {
      return testVariants({
        async     : [false, true],
        timeGc    : [null, 10],
        time      : [1, 50, 100],
        funcsSize1: [0, 1, 2, 3],
        funcsSize2: ({funcsSize1}) => funcsSize1 == null ? [null] : [null, 0, 2, 3],
        funcsSize3: ({funcsSize2}) => funcsSize2 == null ? [null] : [null, 0, 1, 3],
        funcsSize4: ({funcsSize3}) => funcsSize3 == null ? [null] : [null, 0, 1, 2],
      })()
    })
  })

  it('rdtscJs keeps the minimum of all calls', function () {
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

  it('allocatedBytes follow the objects that the functions create', function () {
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
    assert.ok(sink != null, objectToString(result))
  })

  it('allocatedBytes count what collections inside a call take out of the young generation', function () {
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
    assert.ok(sink != null, objectToString(result))
  })

  it('uncollectedBytes count what a call leaves in use', function () {
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
    assert.ok(sink != null && kept.length > 0, objectToString(result))
  })

  it('what V8 creates straight in the old generation counts in allocatedInOldGenerationBytes, not in uncollectedBytes', function () {
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
    assert.ok(sink != null, objectToString(result))
  })

  it('calcPerformance throws for a function with a full collection in every call', function () {
    // The global gc exists because before() set --expose-gc; gc() without arguments runs a full collection
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

  it('cycles of a call leave out the collections during it', function () {
    // The global gc exists because before() set --expose-gc
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

  it('calcPerformance reads the clock a few dozen times', async function () {
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

  it('calcPerformance without rdtsc throws a clear error where no entry set a default', function () {
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

function checkValues(values: CalcPerformanceValues<bigint | number>, funcsCount: number): void {
  assert.strictEqual(values.values.length, funcsCount)

  if (funcsCount > 1) {
    assert.strictEqual(values.absoluteDiff!.length, funcsCount - 1)
    for (let i = 0; i < funcsCount - 1; i++) {
      checkNumber(values.absoluteDiff![i], Number(values.values[i + 1]) - Number(values.values[0]))
    }
  }
  else {
    assert.strictEqual(values.absoluteDiff, void 0)
  }

  if (funcsCount > 2 && values.absoluteDiff![0] > 0) {
    assert.strictEqual(values.relativeDiff!.length, funcsCount - 2)
    for (let i = 0; i < funcsCount - 2; i++) {
      checkNumber(values.relativeDiff![i], values.absoluteDiff![i + 1] / values.absoluteDiff![0])
    }
  }
  else {
    assert.strictEqual(values.relativeDiff, void 0)
  }
}

function checkNumber(actual: number, expected: number): void {
  assert.ok(Math.abs(actual - expected) < 0.000001, `${actual} instead of ${expected}`)
}
