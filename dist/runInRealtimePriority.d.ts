import { ProcessPriority, ThreadPriority } from "./binding";
export declare function threadPriorityToString(priority: ThreadPriority): string;
export declare function processPriorityToString(priority: ProcessPriority): string;
export declare function runInRealtimePriority<T>(func: () => Promise<T>): Promise<T>;
export declare function runInRealtimePriority<T>(func: () => T): T;
