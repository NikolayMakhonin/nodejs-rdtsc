export declare function calcPerformanceAsync(testTimeMilliseconds: number, ...funcs: (() => any)[]): Promise<{
    calcInfo: {
        iterationCycles: number;
        iterations: number;
        funcsCount: number;
        testTime: number;
    };
    cycles: bigint[];
    absoluteDiff: number[];
    relativeDiff: number[];
}>;
