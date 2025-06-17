import { CalcPerformanceResult, Rdtsc } from "./types";
export declare function calcPerformance({ rdtsc: _rdtsc, testTimeMilliseconds, funcs, }: {
    rdtsc: Rdtsc;
    /** Test time in milliseconds */
    testTimeMilliseconds: number;
    funcs: (() => any)[];
}): CalcPerformanceResult;
