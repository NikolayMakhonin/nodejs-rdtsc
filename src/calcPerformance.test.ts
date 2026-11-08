import {createTestVariants} from '@flemist/test-variants'
import {calcPerformance} from 'src/calcPerformance'
import {calcPerformanceAsync} from 'src/calcPerformanceAsync'
import {objectToString} from 'src/-test/helpers/objectToString'
import {rdtscNative} from 'src/rdtscNative'
import {rdtscJs} from 'src/rdtscJs'

describe('rdtsc > calcPerformance', function () {
  this.timeout(600000)

  const MAX_TIME_ERROR = 30

  const testVariants = createTestVariants(async ({
    async,
    time,
    funcsSize1,
    funcsSize2,
    funcsSize3,
    funcsSize4,
  }: {
    async: boolean,
    time: number,
    funcsSize1: number,
    funcsSize2: number|undefined|null,
    funcsSize3: number|undefined|null,
    funcsSize4: number|undefined|null,
  }) => {
    const startTime = process.hrtime.bigint()

    const funcsSizes: any[] = []
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
      ? await calcPerformanceAsync({rdtsc: rdtscNative, time: time, funcs })
      : calcPerformance({rdtsc: rdtscNative, time: time, funcs })

    const elapsedTime = Number(process.hrtime.bigint() - startTime) / 1e6
    if (elapsedTime < time - 1 || elapsedTime > time + MAX_TIME_ERROR) {
      assert.fail(`elapsedTime = ${elapsedTime}; ${time}`)
    }

    // calcInfo
    if (result.calcInfo.testTime < time - 1 || result.calcInfo.testTime > time + MAX_TIME_ERROR) {
      assert.fail(`result.calcInfo.testTime = ${result.calcInfo.testTime}`)
    }
    assert.ok(result.calcInfo.iterationCycles > 0)
    assert.ok(result.calcInfo.iterations > 0)
    assert.strictEqual(result.calcInfo.funcsCount, funcsSizes.length)

    assert.strictEqual(result.cycles.length, funcsSizes.length)
    let cyclesSum = BigInt(0)
    for (let i = 0; i < funcsSizes.length; i++) {
      assert.ok(result.cycles[i] > 0)
      cyclesSum += result.cycles[i]
    }
    // An iteration calls one function, so the minimum of a function slower than the others can exceed
    // the average iteration, while a round of all functions cannot take less than the sum of their minimums
    assert.ok(
      Number(cyclesSum) <= result.calcInfo.iterationCycles * funcsSizes.length,
      objectToString(result),
    )

    if (funcsSizes.length > 1) {
      assert.strictEqual(result.absoluteDiff!.length, funcsSizes.length - 1)
      for (let i = 0; i < funcsSizes.length - 1; i++) {
        assert.strictEqual(result.cycles[0] + BigInt(result.absoluteDiff![i]), result.cycles[i + 1])
      }
    }
    else {
      assert.strictEqual(result.absoluteDiff, void 0)
    }

    if (funcsSizes.length > 2 && result.absoluteDiff![0] > 0) {
      assert.strictEqual(result.relativeDiff!.length, funcsSizes.length - 2)
      for (let i = 0; i < funcsSizes.length - 2; i++) {
        assert.ok(Math.abs(result.absoluteDiff![0] * result.relativeDiff![i] - result.absoluteDiff![i + 1]) < 0.000001)
      }
    }
    else {
      assert.strictEqual(result.relativeDiff, void 0)
    }
  })

  it('variants', async function () {
    await rdtscNative.runInRealtimePriority(() => {
      return testVariants({
        async     : [false, true],
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
      rdtsc: rdtscJs,
      time : 100,
      funcs: [() => {
        if (isFirstCall) {
          isFirstCall = false
          const endTime = performance.now() + 10
          while (performance.now() < endTime) {
            // The first call takes 10 ms, so that a result of the first call alone shows
          }
        }
      }],
    })
    // rdtsc of rdtscJs counts nanoseconds in Node
    assert.ok(result.cycles[0] < BigInt(1000000), objectToString(result))
  })

  it('calcPerformance reads the clock a few dozen times', async function () {
    const originalNow = performance.now
    let clockReads = 0
    performance.now = () => {
      clockReads++
      return originalNow.call(performance)
    }
    try {
      const result = calcPerformance({rdtsc: rdtscNative, time: 100, funcs: [() => {}]})
      assert.ok(clockReads < 1000, objectToString({clockReads, iterations: result.calcInfo.iterations}))

      clockReads = 0
      const resultAsync = await calcPerformanceAsync({rdtsc: rdtscNative, time: 100, funcs: [() => {}]})
      assert.ok(clockReads < 1000, objectToString({clockReads, iterations: resultAsync.calcInfo.iterations}))
    }
    finally {
      performance.now = originalNow
    }
  })
})
