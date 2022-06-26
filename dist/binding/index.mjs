export { ProcessPriority, ThreadPriority } from './binding.mjs';
import binding from './import.cjs';

const { init, mark0, mark1, minCycles, rdtsc, setThreadPriority, getThreadPriority, setProcessPriority, getProcessPriority, isWin, } = binding;

export { getProcessPriority, getThreadPriority, init, isWin, mark0, mark1, minCycles, rdtsc, setProcessPriority, setThreadPriority };
