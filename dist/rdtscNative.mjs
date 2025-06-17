import { init, mark0, mark1, minCycles, rdtsc } from './binding/index.mjs';
import { runInRealtimePriority } from './runInRealtimePriority.mjs';
import './binding/binding.mjs';
import './binding/import.cjs';

const rdtscNative = {
    init,
    mark0,
    mark1,
    minCycles,
    rdtsc,
    runInRealtimePriority,
};

export { rdtscNative };
