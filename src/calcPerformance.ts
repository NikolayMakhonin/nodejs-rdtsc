import {
  init,
  mark0,
  mark1,
  minCycles,
  rdtsc,
} from 'src/binding'
import {runInRealtimePriority} from 'src/runInRealtimePriority'

export function calcPerformance(testTimeMilliseconds: number, ...funcs: (() => any)[]) {
  return runInRealtimePriority(() => {
    const testTime = testTimeMilliseconds
    if (!testTime || testTime <= 0) {
      throw new Error(`testTime ${testTime} <= 0`)
    }

    const f = funcs
      .filter(o => {
        if (typeof o !== 'function') {
          throw new Error(`argument (${o}) is not a function`)
        }
        return true
      })

    const funcsCount = f.length

    if (!funcsCount) {
      throw new Error('functions count == 0')
    }

    const m0 = mark0
    const m1 = mark1
    const endTime = process.hrtime()
    endTime[0] += ~~(testTime / 1000)
    endTime[1] += testTime % 1000

    let i = 0
    let count = funcsCount
    init(funcsCount)
    const startCycles = rdtsc()
    do {
      const fn = f[i % funcsCount]
      m0()
      fn()
      m1()

      i++
      if (i >= count) {
        const time = process.hrtime(endTime)
        if (time[0] >= 0) {
          break
        }
        count = ~~Math.ceil(i * testTime / (testTime + time[0] * 1000 + time[1] / 1000000))
        count = (~~(count / funcsCount)) * funcsCount
      }
    } while (true)

    const cycles = minCycles()

    const absoluteDiff = funcsCount > 1
      ? cycles.filter((o, i) => i).map(o => Number(o - cycles[0]))
      : void 0

    const relativeDiff = funcsCount > 2 && absoluteDiff[0] > 0
      ? absoluteDiff.filter((o, i) => i).map(o => o / absoluteDiff[0])
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
