import { ThreadPriority, ProcessPriority } from "./binding";
declare const init: (funcsCount: number) => void, mark0: () => void, mark1: () => void, minCycles: () => bigint[], rdtsc: () => bigint, setThreadPriority: (priority: ThreadPriority) => ThreadPriority, getThreadPriority: () => ThreadPriority, setProcessPriority: (priority: ProcessPriority) => ProcessPriority, getProcessPriority: () => ProcessPriority, isWin: boolean;
export { init, mark0, mark1, minCycles, rdtsc, ThreadPriority, ProcessPriority, setThreadPriority, getThreadPriority, setProcessPriority, getProcessPriority, isWin, };
