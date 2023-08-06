export declare function calcPerformance(testTimeMilliseconds: number, ...funcs: (() => any)[]): {
    calcInfo: {
        iterationCycles: number;
        iterations: number;
        funcsCount: number;
        testTime: number;
    };
    cycles: bigint[];
    absoluteDiff: number[] | undefined;
    relativeDiff: number[] | undefined;
};
