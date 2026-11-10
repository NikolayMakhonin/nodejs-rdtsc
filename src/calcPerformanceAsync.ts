import type { CalcPerformanceArgs, CalcPerformanceResult } from './types'
import { getRdtscDefault } from './rdtscDefault'
import { getGcToolsDefault } from './gcToolsDefault'
import {
  createCalcPerformanceResult,
  type GcMeasurement,
} from './createCalcPerformanceResult'
import { createGcChecks } from './createGcChecks'
import { validateCalcPerformanceArgs } from './validateCalcPerformanceArgs'

export function calcPerformanceAsync(
  args: CalcPerformanceArgs,
): Promise<CalcPerformanceResult> {
  const rdtscTools = args.rdtsc || getRdtscDefault()
  const gcTools = args.timeGc == null ? null : getGcToolsDefault()
  return rdtscTools.runInRealtimePriority(async () => {
    // Copied into local variables of this function: the loop below reads mark1 inside the measured time,
    // and a local variable is read faster than a variable of the outer function calcPerformanceAsync
    const { time, timeGc, funcs } = args
    const { init, mark0, mark1, minCycles, rdtsc } = rdtscTools
    validateCalcPerformanceArgs(args)
    const funcsCount = funcs.length

    const endTime = performance.now() + time
    let i = 0
    let count = funcsCount
    init(funcsCount)
    const startCycles = rdtsc()
    while (true) {
      const func = funcs[i % funcsCount]
      mark0()
      await func()
      mark1()

      i++
      if (i >= count) {
        const remainingTime = endTime - performance.now()
        if (remainingTime <= 0) {
          break
        }
        // Reading the clock (performance.now) is slow, so the loop reads it only a few dozen times. The next reading
        // is planned for the middle of the remaining time, by the speed so far, but no later than after as many
        // iterations again as done so far, so that a wrong early estimate cannot run much past the end time
        const elapsedTime = time - remainingTime
        const halfwayIterations =
          elapsedTime > 0 ? Math.ceil((i * remainingTime) / elapsedTime / 2) : i
        count = i + Math.min(i, halfwayIterations)
        count = Math.floor(count / funcsCount) * funcsCount
      }
    }

    const loopCycles = Number(rdtsc() - startCycles)
    const logicCycles = minCycles()

    let gc: null | GcMeasurement = null
    if (gcTools != null && timeGc != null) {
      const gcChecks = createGcChecks(gcTools, funcs)
      const gcEndTime = performance.now() + timeGc
      do {
        for (let k = 0, len = gcChecks.funcs.length; k < len; k++) {
          const func = gcChecks.funcs[k]
          gcChecks.checkStart()
          await func()
          gcChecks.checkEnd(k)
        }
      } while (performance.now() < gcEndTime || gcChecks.isRoundNeeded())
      gc = gcChecks.getMeasurement()
    }

    return createCalcPerformanceResult({
      calcInfo: {
        iterationCycles: loopCycles / i,
        iterations: i,
        funcsCount,
        testTime: time,
      },
      logicCycles,
      gc,
    })
  })
}
