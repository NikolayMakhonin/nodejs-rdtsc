import type { Rdtsc } from './types'

let rdtscDefault: null | Rdtsc = null
export function setRdtscDefault(rdtsc: null | Rdtsc): void {
  rdtscDefault = rdtsc
}
export function getRdtscDefault(): Rdtsc {
  if (rdtscDefault == null) {
    throw new Error(
      '[getRdtscDefault] no default rdtsc: pass rdtsc to calcPerformance' +
        ', or import rdtsc/node or rdtsc/browser, which set the default',
    )
  }
  return rdtscDefault
}
