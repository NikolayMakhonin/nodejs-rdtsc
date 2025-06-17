/******************************************************************************
Copyright (c) Microsoft Corporation.

Permission to use, copy, modify, and/or distribute this software for any
purpose with or without fee is hereby granted.

THE SOFTWARE IS PROVIDED "AS IS" AND THE AUTHOR DISCLAIMS ALL WARRANTIES WITH
REGARD TO THIS SOFTWARE INCLUDING ALL IMPLIED WARRANTIES OF MERCHANTABILITY
AND FITNESS. IN NO EVENT SHALL THE AUTHOR BE LIABLE FOR ANY SPECIAL, DIRECT,
INDIRECT, OR CONSEQUENTIAL DAMAGES OR ANY DAMAGES WHATSOEVER RESULTING FROM
LOSS OF USE, DATA OR PROFITS, WHETHER IN AN ACTION OF CONTRACT, NEGLIGENCE OR
OTHER TORTIOUS ACTION, ARISING OUT OF OR IN CONNECTION WITH THE USE OR
PERFORMANCE OF THIS SOFTWARE.
***************************************************************************** */

function __awaiter(thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
}

function calcPerformanceAsync({ rdtsc: _rdtsc, time, funcs, }) {
    const { init, mark0, mark1, minCycles, rdtsc, runInRealtimePriority, } = _rdtsc;
    return runInRealtimePriority(() => __awaiter(this, void 0, void 0, function* () {
        const testTime = time;
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
        const m0 = mark0;
        const m1 = mark1;
        const endTime = process.hrtime.bigint() + BigInt(testTime) * BigInt(1000000);
        let i = 0;
        let count = funcsCount;
        init(funcsCount);
        const startCycles = rdtsc();
        do {
            const fn = f[i % funcsCount];
            m0();
            yield fn();
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
        const cycles = minCycles();
        const absoluteDiff = funcsCount > 1
            ? cycles.filter((_, i) => i).map(o => Number(o - cycles[0]))
            : void 0;
        const relativeDiff = funcsCount > 2 && absoluteDiff[0] > 0
            ? absoluteDiff.filter((_, i) => i).map(o => o / absoluteDiff[0])
            : void 0;
        return {
            calcInfo: {
                iterationCycles: Number(rdtsc() - startCycles) / i,
                iterations: i,
                funcsCount,
                testTime,
            },
            cycles,
            absoluteDiff,
            relativeDiff,
        };
    }));
}

export { __awaiter as _, calcPerformanceAsync as c };
