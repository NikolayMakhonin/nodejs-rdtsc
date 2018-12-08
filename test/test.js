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
		let previousPriority = setThreadPriority(THREAD_PRIORITY_HIGHEST)
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
			let testPriority = setThreadPriority(previousPriority)
			assert.strictEqual(testPriority, THREAD_PRIORITY_HIGHEST)
			priority = getThreadPriority()
			console.log('priority =', priority)
			assert.strictEqual(priority, previousPriority)
		}
	})

	it('Process priority', function () {
		let previousPriority = setProcessPriority(PROCESS_PRIORITY_HIGHEST)
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
			let testPriority = setProcessPriority(previousPriority)
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

		// console.log('Test exeption:');
		// console.log(JSON.stringify(exception), exception.stack);

		assert.ok(exception)
		assert.ok(exception.stack)
		assert.ok(exception.stack.indexOf('calcPerformance') > 0)
	})

	it('calcPerformance both funcs is null', function () {
		let result = calcPerformance(
			null,
			null,
			1000
		)

		console.log('calcPerformance both funcs is null =', result)
		assert.strictEqual(result, undefined)
	})

	it('calcPerformance self cycles', function () {
		let result = calcPerformance(
			null,
			() => {
			},
			1000
		)

		console.log('calcPerformance() self =', result)
		assert.ok(result.cycles > 10)
	})

	it('rdtsc self cycles', function () {
		let result = calcPerformance(
			() => {

			},
			() => {
				rdtsc()
			},
			1000
		)

		console.log('rdtsc() self =', result)
		assert.ok(result.cycles > 5)
	})

	it('rdtsc self cycles 2', function () {
		let result = calcPerformance(
			() => {
			},
			() => {
				rdtsc()
			},
			1000
		)

		console.log('rdtsc() self 2 =', result)
		assert.ok(result.cycles > 5)
	})

	it('calc Object.keys performance', function () {
		let object = { x: 1 }
		let result = calcPerformance(
			() => {

			},
			() => {
				Object.keys(object)
			},
			1000
		)
		console.log('Object.keys({ 1 item }) =', result)
		assert.ok(result.cycles > 5)
	})
})
