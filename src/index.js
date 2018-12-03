const { 
	rdtsc, rdtsc0, rdtsc1, 
	setThreadPriority, 
	getThreadPriority, 
	setProcessPriority, 
	getProcessPriority, 
	isWin
} = require('../build/Release/binding');

const THREAD_PRIORITY_IDLE = -15;
const THREAD_PRIORITY_LOWEST = -2;
const THREAD_PRIORITY_BELOW_NORMAL = -1;
const THREAD_PRIORITY_NORMAL = 0;
const THREAD_PRIORITY_ABOVE_NORMAL = 1;
const THREAD_PRIORITY_HIGHEST = 2;
const THREAD_PRIORITY_REALTIME = 15; // THREAD_PRIORITY_TIME_CRITICAL

const PROCESS_PRIORITY_IDLE = 0x00000040; // IDLE_PRIORITY_CLASS
const PROCESS_PRIORITY_BELOW_NORMAL = 0x00004000; // BELOW_NORMAL_PRIORITY_CLASS
const PROCESS_PRIORITY_NORMAL = 0x00000020; // NORMAL_PRIORITY_CLASS
const PROCESS_PRIORITY_ABOVE_NORMAL = 0x00008000; // ABOVE_NORMAL_PRIORITY_CLASS
const PROCESS_PRIORITY_HIGHEST = 0x00000080; // HIGH_PRIORITY_CLASS
const PROCESS_PRIORITY_REALTIME = 0x00000100; // REALTIME_PRIORITY_CLASS

const runInRealtimePriority = function(func) {
	if (!isWin) {
		return func();
	}
	
	let previousThreadPriority = getThreadPriority();
	let previousProcessPriority = getProcessPriority();
	
	try {
		setProcessPriority(PROCESS_PRIORITY_REALTIME);
		setThreadPriority(THREAD_PRIORITY_REALTIME);

		return func();
	} finally {
		setProcessPriority(previousProcessPriority);
		setThreadPriority(previousThreadPriority);
	}
};

const calcPerformance = function (func0, func1, testTimeMilliseconds) {
    let startTime = process.hrtime.bigint();
    let testTime = testTimeMilliseconds * 1000000; //to nano time
	
	return runInRealtimePriority(() => {
		let minCycles0 = null;
		let minCycles1 = null;

		if (!func0 || !func1) {
			func0 = func0 || func1;
			if (!func0) {
				return undefined;
			}
			
			let i = 0;
			do {
                let cycles0=(rdtsc0(),func0(),rdtsc1());
				
				if (minCycles0 == null || cycles0 < minCycles0) {
					minCycles0 = cycles0;
				}
			} while (process.hrtime.bigint() - startTime < testTime);

			return minCycles0;		
		}
		
		let i = 0;
		do {
			let cycles0, cycles1;

			if (i % 2) {
                cycles0=(rdtsc0(),func0(),rdtsc1());
                cycles1=(rdtsc0(),func1(),rdtsc1());
			} else {
                cycles1=(rdtsc0(),func1(),rdtsc1());
                cycles0=(rdtsc0(),func0(),rdtsc1());
			}

			if (minCycles0 == null || cycles0 < minCycles0) {
				minCycles0 = cycles0;
			}
			if (minCycles1 == null || cycles1 < minCycles1) {
				minCycles1 = cycles1;
			}

			i++;
		} while (process.hrtime.bigint() - startTime < testTime);

		return Number(minCycles1 - minCycles0);
	});
};

module.exports = {
	rdtsc, rdtsc0, rdtsc1,
	calcPerformance,
	isWin,
	
	setThreadPriority, //since only for Windows
	getThreadPriority, //since only for Windows
	
	THREAD_PRIORITY_IDLE,
	THREAD_PRIORITY_LOWEST,
	THREAD_PRIORITY_BELOW_NORMAL,
	THREAD_PRIORITY_NORMAL,
	THREAD_PRIORITY_ABOVE_NORMAL,
	THREAD_PRIORITY_HIGHEST,
	THREAD_PRIORITY_REALTIME,
	
	setProcessPriority, //since only for Windows
	getProcessPriority, //since only for Windows
	
	PROCESS_PRIORITY_IDLE,
	PROCESS_PRIORITY_BELOW_NORMAL,
	PROCESS_PRIORITY_NORMAL,
	PROCESS_PRIORITY_ABOVE_NORMAL,
	PROCESS_PRIORITY_HIGHEST,
	PROCESS_PRIORITY_REALTIME,
	
	runInRealtimePriority, //since only for Windows
};