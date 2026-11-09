import type {CalcPerformanceArgs} from './types'

/** Throws if an argument of calcPerformance is invalid */
export function validateCalcPerformanceArgs(args: CalcPerformanceArgs): void {
  const {time, timeGc, funcs} = args
  if (!Number.isFinite(time) || time <= 0) {
    throw new Error(`[validateCalcPerformanceArgs] time (${time}) is not a positive finite number`)
  }
  if (timeGc != null && (!Number.isFinite(timeGc) || timeGc < 0)) {
    throw new Error(`[validateCalcPerformanceArgs] timeGc (${timeGc}) is not a finite number of 0 or more`)
  }

  funcs.forEach(o => {
    if (typeof o !== 'function') {
      throw new Error(`[validateCalcPerformanceArgs] funcs item (${o}) is not a function`)
    }
  })

  if (!funcs.length) {
    throw new Error('[validateCalcPerformanceArgs] funcs is empty')
  }
}
