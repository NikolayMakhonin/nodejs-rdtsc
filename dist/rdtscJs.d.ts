import { Rdtsc } from "./types";
export declare const rdtsc: () => bigint;
export declare function runInRealtimePriority<T>(func: () => Promise<T>): Promise<T>;
export declare function runInRealtimePriority<T>(func: () => T): T;
export declare const rdtscJs: Rdtsc;
