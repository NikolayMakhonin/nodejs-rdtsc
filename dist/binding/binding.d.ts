export declare enum ThreadPriority {
    Idle = -15,
    Lowest = -2,
    BelowNormal = -1,
    Normal = 0,
    AboveNormal = 1,
    Highest = 2,
    Realtime = 15
}
export declare enum ProcessPriority {
    Idle = 64,
    BelowNormal = 16384,
    Normal = 32,
    AboveNormal = 32768,
    Highest = 128,
    Realtime = 256
}
declare type Binding = {
    init(funcsCount: number): void;
    rdtsc(): bigint;
    mark0(): void;
    mark1(): void;
    minCycles(): bigint[];
    /** return previous priority */
    setThreadPriority(priority: ThreadPriority): ThreadPriority;
    getThreadPriority(): ThreadPriority;
    /** return previous priority */
    setProcessPriority(priority: ProcessPriority): ProcessPriority;
    getProcessPriority(): ProcessPriority;
    isWin: boolean;
};
declare const _default: Binding;
export default _default;
