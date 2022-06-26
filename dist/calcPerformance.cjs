'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var binding_index = require('./binding/index.cjs');
var runInRealtimePriority = require('./runInRealtimePriority.cjs');
require('./binding/binding.cjs');
require('./binding/import.cjs');

function calcPerformance(testTimeMilliseconds, ...funcs) {
    return runInRealtimePriority.runInRealtimePriority(() => {
        const testTime = testTimeMilliseconds;
        if (!testTime || testTime <= 0) {
            throw new Error(`testTime ${testTime} <= 0`);
        }
        const f = funcs;
        f.forEach(o => {
            if (typeof o !== 'function') {
                throw new Error(`argument (${o}) is not a function`);
            }
        });
        const funcsCount = f.length;
        if (!funcsCount) {
            throw new Error('functions count == 0');
        }
        const m0 = binding_index.mark0;
        const m1 = binding_index.mark1;
        const endTime = process.hrtime.bigint() + BigInt(testTime) * BigInt(1000000);
        let i = 0;
        let count = funcsCount;
        binding_index.init(funcsCount);
        const startCycles = binding_index.rdtsc();
        do {
            const fn = f[i % funcsCount];
            m0();
            fn();
            m1();
            i++;
            if (i >= count) {
                const remainingTime = endTime - process.hrtime.bigint();
                if (remainingTime <= 0) {
                    break;
                }
                count = ~~Math.ceil(i * testTime / (testTime + Number(remainingTime) / 1000000));
                count = (~~(count / funcsCount)) * funcsCount;
            }
        } while (true);
        const cycles = binding_index.minCycles();
        const absoluteDiff = funcsCount > 1
            ? cycles.filter((o, i) => i).map(o => Number(o - cycles[0]))
            : void 0;
        const relativeDiff = funcsCount > 2 && absoluteDiff[0] > 0
            ? absoluteDiff.filter((o, i) => i).map(o => o / absoluteDiff[0])
            : void 0;
        return {
            calcInfo: {
                iterationCycles: Number(binding_index.rdtsc() - startCycles) / i,
                iterations: i,
                funcsCount,
                testTime,
            },
            cycles,
            absoluteDiff,
            relativeDiff,
        };
    });
}

exports.calcPerformance = calcPerformance;
