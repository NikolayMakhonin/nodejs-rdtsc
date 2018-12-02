const { rdtsc, setThreadPriority, getThreadPriority, isWin } = require('./build/Release/binding');

const THREAD_PRIORITY_IDLE = -15;
const THREAD_PRIORITY_LOWEST = -2;
const THREAD_PRIORITY_BELOW_NORMAL = -1;
const THREAD_PRIORITY_NORMAL = 0;
const THREAD_PRIORITY_ABOVE_NORMAL = 1;
const THREAD_PRIORITY_HIGHEST = 2;
const THREAD_PRIORITY_TIME_CRITICAL = 15;

const calcPerformance = function (func0, func1, testTimeMilliseconds) {
    let lastResult;
    let minCycles0 = null;
    let minCycles1 = null;
    let startTime = process.hrtime.bigint();
    let testTime = testTimeMilliseconds * 1000000; //to nano time
	let previousPriority = setThreadPriority(THREAD_PRIORITY_TIME_CRITICAL);
	
	try {
		let i = 0;
		do {
			let cycles0, cycles1;

			if (i % 2) {
				if (func0) {
					cycles0=rdtsc();lastResult=func0();cycles0=rdtsc()-cycles0;
					if (minCycles0 == null || cycles0 < minCycles0) {
						minCycles0 = cycles0;
					}
				}
			} else {
				if (func1) {
					cycles1=rdtsc();lastResult=func1();cycles1=rdtsc()-cycles1;
					if (minCycles1 == null || cycles1 < minCycles1) {
						minCycles1 = cycles1;
					}
				}
			}
			i++;
		} while (process.hrtime.bigint() - startTime < testTime);

		return minCycles0 != null && minCycles1 != null
			? Number(minCycles1 - minCycles0)
			: (minCycles1 != null ? minCycles1 : minCycles0);
	} finally {
		setThreadPriority(previousPriority);
	}
};

module.exports = {
	rdtsc,
	calcPerformance,
	isWin: isWin(),
	setThreadPriority, //since only for Windows
	getThreadPriority, //since only for Windows
	THREAD_PRIORITY_IDLE,
	THREAD_PRIORITY_LOWEST,
	THREAD_PRIORITY_BELOW_NORMAL,
	THREAD_PRIORITY_NORMAL,
	THREAD_PRIORITY_ABOVE_NORMAL,
	THREAD_PRIORITY_HIGHEST,
	THREAD_PRIORITY_TIME_CRITICAL
};