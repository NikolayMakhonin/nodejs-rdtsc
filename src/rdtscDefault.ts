import {Rdtsc} from 'src/types'

let rdtscDefault: Rdtsc  = null!
export function setRdtscDefault(rdtsc: Rdtsc): void {
  rdtscDefault = rdtsc
}
export function getRdtscDefault(): Rdtsc {
  return rdtscDefault
}
