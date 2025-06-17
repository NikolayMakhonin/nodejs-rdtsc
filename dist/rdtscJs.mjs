import { setRdtscDefault } from './rdtscDefault.mjs';

const rdtsc = typeof process === 'undefined'
    ? () => BigInt(performance.now())
    : () => {
        return process.hrtime.bigint();
    };
const result = [];
let index = 0;
function init(funcsCount) {
    result.length = funcsCount;
    index = 0;
}
let m0 = BigInt(0);
function mark0() {
    m0 = rdtsc();
}
function mark1() {
    const m1 = rdtsc();
    const diff = m1 - m0;
    if (diff < result[index]) {
        result[index] = diff;
    }
    index++;
}
function minCycles() {
    return result;
}
function runInRealtimePriority(func) {
    return func();
}
const rdtscJs = {
    init,
    mark0,
    mark1,
    minCycles,
    rdtsc,
    runInRealtimePriority,
};
if (typeof process === 'undefined') {
    setRdtscDefault(rdtscJs);
}

export { rdtsc, rdtscJs, runInRealtimePriority };
