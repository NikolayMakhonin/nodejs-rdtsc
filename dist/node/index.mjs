import { setRdtscDefault } from '../rdtscDefault.mjs';
import { rdtscNative } from '../rdtscNative.mjs';
export { calcPerformance } from '../calcPerformance.mjs';
export { c as calcPerformanceAsync } from '../calcPerformanceAsync2.mjs';
export { rdtscJs } from '../rdtscJs.mjs';
export { getProcessPriority, getThreadPriority, isWin, rdtsc, setProcessPriority, setThreadPriority } from '../binding/index.mjs';
export { runInRealtimePriority } from '../runInRealtimePriority.mjs';
export { ProcessPriority, ThreadPriority } from '../binding/binding.mjs';
import '../binding/import.cjs';

setRdtscDefault(rdtscNative);
