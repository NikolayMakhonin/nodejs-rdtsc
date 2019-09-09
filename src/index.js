const {
	rdtsc,
	init,
	mark0,
	mark1,
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

	const previousThreadPriority = getThreadPriority()
	const previousProcessPriority = getProcessPriority()

	try {
		setProcessPriority(PROCESS_PRIORITY_REALTIME)
		setThreadPriority(THREAD_PRIORITY_REALTIME)

		return func()
	} finally {
		setProcessPriority(previousProcessPriority)
		setThreadPriority(previousThreadPriority)
	}
}

// https://stackoverflow.com/a/39838385/5221762
const flatMap = (arr, callbackfn) =>
	arr.reduce((result, item) =>
		result.concat(callbackfn(item)), [])

const calcPerformance = function (testTimeMilliseconds, ...funcs) {
	return runInRealtimePriority(() => {
		const testTime = testTimeMilliseconds
		if (!testTime || testTime <= 0) {
			throw new Error(`testTime ${testTime} <= 0`)
		}

		const f = flatMap(
			funcs,
			o => {
				if (o == null) {
					return []
				}
				if (Array.isArray(o)) {
					return o
				}
				return [o]
			})
			.filter(o => {
				if (typeof o !== 'function') {
					throw new Error(`argument (${o}) is not a function`)
				}
				return true
			})

		const funcsCount = f.length

		if (!funcsCount) {
			throw new Error('functions count == 0')
		}

		const m0 = mark0
		const m1 = mark1
		const endTime = process.hrtime()
		endTime[0] += ~~(testTime / 1000)
		endTime[1] += testTime % 1000

		let i = 0
		let count = funcsCount
		init(funcsCount)
		const startCycles = rdtsc()
		do {
			const fn = f[i % funcsCount]
			m0()
			fn()
			m1()

			i++
			if (i >= count) {
				const time = process.hrtime(endTime)
				if (time[0] >= 0) {
					break
				}
				count = ~~Math.ceil(i * testTime / (testTime + time[0] * 1000 + time[1] / 1000000))
				count = (~~(count / funcsCount)) * funcsCount
			}
		} while (true)

		const cycles = minCycles()

		const absoluteDiff = funcsCount > 1
			? cycles.filter((o, i) => i).map(o => Number(o - cycles[0]))
			: undefined

		const relativeDiff = funcsCount > 2 && absoluteDiff[0] > 0
			? absoluteDiff.filter((o, i) => i).map(o => o / absoluteDiff[0])
			: undefined

		return {
			calcInfo: {
				iterationCycles: Number(rdtsc() - startCycles) / i,
				iterations: i,
				funcsCount,
				testTime
			},
			cycles,
			absoluteDiff,
			relativeDiff
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
