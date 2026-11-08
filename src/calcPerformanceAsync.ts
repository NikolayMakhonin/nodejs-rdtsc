import {CalcPerformanceArgs, CalcPerformanceResult} from 'src/types'
import {getRdtscDefault} from 'src/rdtscDefault'

export function calcPerformanceAsync({
  rdtsc: _rdtsc,
  time,
  funcs,
}: CalcPerformanceArgs): Promise<CalcPerformanceResult> {
  const {
    init,
    mark0,
    mark1,
    minCycles,
    rdtsc,
    runInRealtimePriority,
  } = _rdtsc || getRdtscDefault()
  return runInRealtimePriority(async () => {
    const testTime = time
    if (!testTime || testTime <= 0) {
      throw new Error(`testTime ${testTime} <= 0`)
    }

    const f = funcs
    f.forEach(o => {
      if (typeof o !== 'function') {
        throw new Error(`argument (${o}) is not a function`)
      }
    })
    const funcsCount = f.length

    if (!funcsCount) {
      throw new Error('functions count == 0')
    }

    const m0 = mark0
    const m1 = mark1
    const endTime = performance.now() + testTime
    let i = 0
    let count = funcsCount
    init(funcsCount)
    const startCycles = rdtsc()
    do {
      const fn = f[i % funcsCount]
      m0()
      await fn()
      m1()

      i++
      if (i >= count) {
        const remainingTime = endTime - performance.now()
        if (remainingTime <= 0) {
          break
        }
        // Plans the next check halfway to the end at the rate so far, and after at most as many iterations as done so far,
        // so that the clock is read a few dozen times and a rate of the first iterations cannot overshoot the test time
        const elapsedTime = testTime - remainingTime
        const halfwayIterations = elapsedTime > 0
          ? Math.ceil(i * remainingTime / elapsedTime / 2)
          : i
        count = i + Math.min(i, halfwayIterations)
        count = Math.floor(count / funcsCount) * funcsCount
      }
    } while (true)

    const cycles = minCycles()

    const absoluteDiff = funcsCount > 1
      ? cycles.filter((_, i) => i).map(o => Number(o - cycles[0]))
      : void 0

    const relativeDiff = funcsCount > 2 && absoluteDiff![0] > 0
      ? absoluteDiff!.filter((_, i) => i).map(o => o / absoluteDiff![0])
      : void 0

    return {
      calcInfo: {
        iterationCycles: Number(rdtsc() - startCycles) / i,
        iterations     : i,
        funcsCount,
        testTime,
      },
      cycles,
      absoluteDiff,
      relativeDiff,
    }
  })
}
