const {
	rdtsc,
	init,
	mark0,
	mark1,
	mark2,
	minCycles,
	setThreadPriority,
	getThreadPriority,
	setProcessPriority,
	getProcessPriority,
	isWin
} = require('../build/Release/binding')

const THREAD_PRIORITY_IDLE = -15
const THREAD_PRIORITY_LOWEST = -2
const THREAD_PRIORITY_BELOW_NORMAL = -1
const THREAD_PRIORITY_NORMAL = 0
const THREAD_PRIORITY_ABOVE_NORMAL = 1
const THREAD_PRIORITY_HIGHEST = 2
const THREAD_PRIORITY_REALTIME = 15 // THREAD_PRIORITY_TIME_CRITICAL

const PROCESS_PRIORITY_IDLE = 0x00000040 // IDLE_PRIORITY_CLASS
const PROCESS_PRIORITY_BELOW_NORMAL = 0x00004000 // BELOW_NORMAL_PRIORITY_CLASS
const PROCESS_PRIORITY_NORMAL = 0x00000020 // NORMAL_PRIORITY_CLASS
const PROCESS_PRIORITY_ABOVE_NORMAL = 0x00008000 // ABOVE_NORMAL_PRIORITY_CLASS
const PROCESS_PRIORITY_HIGHEST = 0x00000080 // HIGH_PRIORITY_CLASS
const PROCESS_PRIORITY_REALTIME = 0x00000100 // REALTIME_PRIORITY_CLASS

const runInRealtimePriority = function (func) {
	if (!isWin) {
		return func()
	}

	let previousThreadPriority = getThreadPriority()
	let previousProcessPriority = getProcessPriority()

	try {
		setProcessPriority(PROCESS_PRIORITY_REALTIME)
		setThreadPriority(THREAD_PRIORITY_REALTIME)

		return func()
	} finally {
		setProcessPriority(previousProcessPriority)
		setThreadPriority(previousThreadPriority)
	}
}

const calcPerformance = function (func0, func1, testTimeMilliseconds) {
	let calcCount = (time, count) => {
		return ~~Math.ceil(count * testTimeMilliseconds / (testTimeMilliseconds + time[0] * 1000 + time[1] / 1000000))
	}

	return runInRealtimePriority(() => {
		let endTime = process.hrtime()
		endTime[0] += ~~(testTimeMilliseconds / 1000)
		endTime[1] += testTimeMilliseconds % 1000

		if (!func0 || !func1) {
			func0 = func0 || func1
			if (!func0) {
				return undefined
			}

			let i = 0
			let count = 0
			init()
			let startCycles = rdtsc()
			do {
				mark0()
				func0()
				mark1()

				i++
				if (i >= count) {
					let time = process.hrtime(endTime)
					if (time[0] >= 0) {
						break
					}
					count = calcCount(time, i)
				}
			} while (true)

			return {
				calcInfo: {
					averageIterateCycles: Number(rdtsc() - startCycles) / i,
					count: i
				},
				cycles: minCycles()
			}
		}

		let i = 0
		let count = 0
		init()
		let startCycles = rdtsc()
		do {
			mark0()
			func0()
			mark1()
			func1()
			mark2()

			i++
			if (i >= count) {
				let time = process.hrtime(endTime)
				if (time[0] >= 0) {
					break
				}
				count = calcCount(time, i)
			}
		} while (true)

		return {
			calcInfo: {
				averageIterateCycles: Number(rdtsc() - startCycles) / i,
				count: i
			},
			cycles: minCycles()
		}
	})
}

module.exports = {
	rdtsc,
	calcPerformance,
	isWin,

	setThreadPriority, // since only for Windows
	getThreadPriority, // since only for Windows

	THREAD_PRIORITY_IDLE,
	THREAD_PRIORITY_LOWEST,
	THREAD_PRIORITY_BELOW_NORMAL,
	THREAD_PRIORITY_NORMAL,
	THREAD_PRIORITY_ABOVE_NORMAL,
	THREAD_PRIORITY_HIGHEST,
	THREAD_PRIORITY_REALTIME,

	setProcessPriority, // since only for Windows
	getProcessPriority, // since only for Windows

	PROCESS_PRIORITY_IDLE,
	PROCESS_PRIORITY_BELOW_NORMAL,
	PROCESS_PRIORITY_NORMAL,
	PROCESS_PRIORITY_ABOVE_NORMAL,
	PROCESS_PRIORITY_HIGHEST,
	PROCESS_PRIORITY_REALTIME,

	runInRealtimePriority // since only for Windows
}
