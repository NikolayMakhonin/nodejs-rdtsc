import {init, mark0, mark1, minCycles, rdtsc} from 'src/binding'
import {Rdtsc} from 'src/types'
import {runInRealtimePriority} from 'src/runInRealtimePriority'

export const rdtscNative: Rdtsc = {
  init,
  mark0,
  mark1,
  minCycles,
  rdtsc,
  runInRealtimePriority,
}
