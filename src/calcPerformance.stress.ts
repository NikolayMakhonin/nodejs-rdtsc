import assert from 'assert'
import {beforeAll, describe, it} from 'vitest'
import {createTestVariants} from '@flemist/test-variants'
import {calcPerformance} from './calcPerformance'
import {calcPerformanceAsync} from './calcPerformanceAsync'
import {objectToString} from './-test/helpers/objectToString'
import {rdtscNative} from './rdtscNative'
import type {CalcPerformanceValues} from './types'
import {setGcToolsDefault} from './gcToolsDefault'
import {getGcToolsNative} from './getGcToolsNative'

describe('rdtsc > calcPerformance', () => {
  beforeAll(() => {
    setGcToolsDefault(getGcToolsNative)
  })

  // How much longer than time and timeGc a call may take: the memory measurement ends only after a whole round (at
  // least two), the first measurement of cyclesPerByte forces 100 young collections, and the shared runners of the CI
  // pause the thread. Together they took up to 165 ms on the macOS runners of the CI, while a regression that makes
  // calls take seconds still fails
  const MAX_TIME_EXCESS = 1000

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
    const maxTime = time + (timeGc ?? 0) + MAX_TIME_EXCESS
    if (elapsedTime < time - 1 || elapsedTime > maxTime) {
      assert.fail(`elapsedTime = ${elapsedTime}; ${time}`)
    }

    // calcInfo
    if (result.calcInfo.testTime < time - 1 || result.calcInfo.testTime > time + MAX_TIME_EXCESS) {
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

  // About 110 s here and on the CI runners; the limit catches a call that never returns
  it('variants', {timeout: 300000}, async () => {
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
})

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
