'use strict'
const assert = require('assert')
const {
	rdtsc,
	calcPerformance,
	setThreadPriority,
	getThreadPriority,
	setProcessPriority,
	getProcessPriority,
	isWin,
	THREAD_PRIORITY_HIGHEST,
	PROCESS_PRIORITY_HIGHEST,
	THREAD_PRIORITY_REALTIME,
	PROCESS_PRIORITY_REALTIME,
	runInRealtimePriority
} = require('../')

console.log('isWin =', isWin)

describe('All tests', function () {
	it('Base tests', function () {
		assert.ok(rdtsc() > 0)
		assert.ok(rdtsc() - rdtsc() < 0)
		console.log('rdtsc() =', rdtsc())
		console.log('rdtsc() - rdtsc() =', rdtsc() - rdtsc())
	})

	it('Test multiple loading of the same module', function () {
		const bindingPath = require.resolve('../build/Release/binding')
		delete require.cache[bindingPath]
		const { rerdtsc } = require('../')
		assert.ok(rdtsc() > 0)
		assert.ok(rdtsc() - rdtsc() < 0)
		assert.notStrictEqual(rdtsc, rerdtsc)
	})

	it('runInRealtimePriority', function () {
		assert.ok(runInRealtimePriority(() => rdtsc() - rdtsc()))
		console.log('rdtsc() - rdtsc() =', runInRealtimePriority(() => rdtsc() - rdtsc()))

		console.log('previous ThreadPriority =', getThreadPriority())
		console.log('previous ProcessPriority =', getProcessPriority())

		runInRealtimePriority(() => {
			let threadPriority, processPriority
			console.log('ThreadPriority =', threadPriority = getThreadPriority()) // === THREAD_PRIORITY_REALTIME
			console.log('ProcessPriority =', processPriority = getProcessPriority()) // === PROCESS_PRIORITY_REALTIME
			if (isWin) {
				assert.strictEqual(threadPriority, THREAD_PRIORITY_REALTIME)
				assert.strictEqual(processPriority, PROCESS_PRIORITY_REALTIME)
			} else {
				assert.strictEqual(threadPriority, undefined)
				assert.strictEqual(processPriority, undefined)
			}
		})
	})

	it('Thread priority', function () {
		const previousPriority = setThreadPriority(THREAD_PRIORITY_HIGHEST)
		console.log('previousPriority =', previousPriority)
		if (isWin) {
			assert.notStrictEqual(previousPriority, undefined)
		} else {
			assert.strictEqual(previousPriority, undefined)
		}

		let priority = getThreadPriority()
		console.log('priority =', priority)
		if (isWin) {
			assert.strictEqual(priority, THREAD_PRIORITY_HIGHEST)
		} else {
			assert.strictEqual(priority, undefined)
		}

		if (isWin) {
			const testPriority = setThreadPriority(previousPriority)
			assert.strictEqual(testPriority, THREAD_PRIORITY_HIGHEST)
			priority = getThreadPriority()
			console.log('priority =', priority)
			assert.strictEqual(priority, previousPriority)
		}
	})

	it('Process priority', function () {
		const previousPriority = setProcessPriority(PROCESS_PRIORITY_HIGHEST)
		console.log('previousPriority =', previousPriority)
		if (isWin) {
			assert.notStrictEqual(previousPriority, undefined)
		} else {
			assert.strictEqual(previousPriority, undefined)
		}

		let priority = getProcessPriority()
		console.log('priority =', priority)
		if (isWin) {
			assert.strictEqual(priority, PROCESS_PRIORITY_HIGHEST)
		} else {
			assert.strictEqual(priority, undefined)
		}

		if (isWin) {
			const testPriority = setProcessPriority(previousPriority)
			assert.strictEqual(testPriority, PROCESS_PRIORITY_HIGHEST)
			priority = getProcessPriority()
			console.log('priority =', priority)
			assert.strictEqual(priority, previousPriority)
		}
	})

	it('throw catch', function () {
		function testErrorFunc () {
			throw new Error('test error')
		}

		let exception
		try {
			calcPerformance(
				() => {
					testErrorFunc()
				},
				() => {

				},
				100)
		} catch (ex) {
			exception = ex
		}

		// console.log('Test exception:');
		// console.log(JSON.stringify(exception), exception.stack);

		assert.ok(exception)
		assert.ok(exception.stack)
		assert.ok(exception.stack.indexOf('calcPerformance') > 0)
	})

	it('calcPerformance throws', function () {
		assert.throws(() => { calcPerformance(1000, null, null) }, Error)
		assert.throws(() => { calcPerformance(1000, null) }, Error)
		assert.throws(() => { calcPerformance(1000) }, Error)
		assert.throws(() => { calcPerformance(1000, []) }, Error)
		assert.throws(() => { calcPerformance(1000, null, []) }, Error)
		assert.throws(() => { calcPerformance(0, () => {}) }, Error)
		assert.throws(() => { calcPerformance(null, () => {}) }, Error)
	})

	it('calcPerformance self cycles', function () {
		this.timeout(15000)

		const result = calcPerformance(
			1000,
			() => {
			}
		)

		console.log(result)
		assert.ok(result.cycles[0] > 1)
		assert.strictEqual(result.absoluteDiff, undefined)
	})

	it('rdtsc self cycles', function () {
		const result = calcPerformance(
			1000,
			() => {

			},
			() => {
				rdtsc()
			}
		)

		console.log('rdtsc() self =', result.absoluteDiff[0])
		assert.ok(result.absoluteDiff[0] > 1)
		assert.strictEqual(result.relativeDiff, undefined)
	})

	it('rdtsc self cycles 2', function () {
		const result = calcPerformance(
			1000,
			() => {
			},
			() => {
				rdtsc()
			}
		)

		console.log('rdtsc() self 2 =', result.absoluteDiff[0])
		assert.ok(result.absoluteDiff[0] > 1)
		assert.strictEqual(result.relativeDiff, undefined)
	})

	it('calc Object.keys performance', function () {
		const result = calcPerformance(
			1000,
			() => {

			},
			() => {
				Object.keys(Math)
			},
			() => {
				Object.keys(Math)
			}
		)
		console.log(result)
		assert.ok(result.absoluteDiff[0] > 1)
		assert.ok(result.relativeDiff[0])
	})

	it('calc performance relativeDiff', function () {
		this.timeout(1000 * 100 + 5000)

		let count = 100
		let result
		do {
			result = calcPerformance(
				1000,
				() => {

				},
				() => {

				},
				() => {

				}
			)
		} while ((result.absoluteDiff[0] !== 0 || result.absoluteDiff[0] !== 0) && --count >= 0)

		assert.ok(result.absoluteDiff[0] <= 0)
		console.log(result)
		assert.strictEqual(result.absoluteDiff.length, 2)
		assert.strictEqual(result.relativeDiff, undefined)
	})
})
