import {init, mark0, mark1, minCycles, rdtsc} from './binding'
import type {Rdtsc} from './types'
import {runInRealtimePriority} from './runInRealtimePriority'

export const rdtscNative: Rdtsc = {
  init,
  mark0,
  mark1,
  minCycles,
  rdtsc,
  runInRealtimePriority,
}
