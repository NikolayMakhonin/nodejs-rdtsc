import assert from 'assert'
import {
  calcPerformance,
  getProcessPriority,
  getThreadPriority,
  isWin,
  ProcessPriority,
  rdtsc,
  runInRealtimePriority,
  setProcessPriority,
  setThreadPriority,
  ThreadPriority,
} from '.'
import {objectToString} from 'src/-test/helpers/objectToString'
import {rdtscNative} from 'src/rdtscNative'

console.log('isWin =', isWin)

describe('All tests', function () {
  it('Base tests', function () {
    assert.ok(rdtsc() > 0)
    assert.ok(rdtsc() - rdtsc() < 0)
    console.log('rdtsc() =', rdtsc())
    console.log('rdtsc() - rdtsc() =', rdtsc() - rdtsc())
  })

  if (typeof require !== 'undefined') {
    xit('Test multiple loading of the same module', function () {
      const bindingPath = require.resolve('../build/Release/binding.node')
      delete require.cache[bindingPath]
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const {rdtsc: requireRdtsc} = require('.')
      assert.ok(rdtsc() > 0)
      assert.ok(rdtsc() - rdtsc() < 0)
      assert.notStrictEqual(rdtsc, requireRdtsc)
    })
  }

  it('runInRealtimePriority', function () {
    assert.ok(runInRealtimePriority(() => rdtsc() - rdtsc()))
    console.log('rdtsc() - rdtsc() =', runInRealtimePriority(() => rdtsc() - rdtsc()))

    console.log('previous ThreadPriority =', getThreadPriority())
    console.log('previous ProcessPriority =', getProcessPriority())

    runInRealtimePriority(() => {
      let threadPriority: ThreadPriority
      let processPriority: ProcessPriority
      console.log('ThreadPriority =', threadPriority = getThreadPriority()) // === THREAD_PRIORITY_REALTIME
      console.log('ProcessPriority =', processPriority = getProcessPriority()) // === PROCESS_PRIORITY_REALTIME
      if (isWin) {
        assert.strictEqual(threadPriority, ThreadPriority.Realtime)
        assert.strictEqual(processPriority, ProcessPriority.Realtime)
      }
      else {
        assert.strictEqual(threadPriority, void 0)
        assert.strictEqual(processPriority, void 0)
      }
    })
  })

  it('Thread priority', function () {
    const previousPriority = setThreadPriority(ThreadPriority.Highest)
    console.log('previousPriority =', previousPriority)
    if (isWin) {
      assert.notStrictEqual(previousPriority, void 0)
    }
    else {
      assert.strictEqual(previousPriority, void 0)
    }

    let priority = getThreadPriority()
    console.log('priority =', priority)
    if (isWin) {
      assert.strictEqual(priority, ThreadPriority.Highest)
    }
    else {
      assert.strictEqual(priority, void 0)
    }

    if (isWin) {
      const testPriority = setThreadPriority(previousPriority)
      assert.strictEqual(testPriority, ThreadPriority.Highest)
      priority = getThreadPriority()
      console.log('priority =', priority)
      assert.strictEqual(priority, previousPriority)
    }
  })

  it('Process priority', function () {
    const previousPriority = setProcessPriority(ProcessPriority.Highest)
    console.log('previousPriority =', previousPriority)
    if (isWin) {
      assert.notStrictEqual(previousPriority, void 0)
    }
    else {
      assert.strictEqual(previousPriority, void 0)
    }

    let priority = getProcessPriority()
    console.log('priority =', priority)
    if (isWin) {
      assert.strictEqual(priority, ProcessPriority.Highest)
    }
    else {
      assert.strictEqual(priority, void 0)
    }

    if (isWin) {
      const testPriority = setProcessPriority(previousPriority)
      assert.strictEqual(testPriority, ProcessPriority.Highest)
      priority = getProcessPriority()
      console.log('priority =', priority)
      assert.strictEqual(priority, previousPriority)
    }
  })

  it('throw catch', function () {
    function testErrorFunc() {
      throw new Error('test error')
    }

    let exception: Error | undefined
    try {
      calcPerformance({rdtsc               : rdtscNative,
        testTimeMilliseconds:
        100,
        funcs: [
          () => {
            testErrorFunc()
          },
          () => {
          // do nothing
          },
        ]})
    }
    catch (ex) {
      exception = ex
    }

    // console.log('Test exception:');
    // console.log(JSON.stringify(exception), exception.stack);

    assert.ok(exception)
    assert.ok(exception.stack)
    assert.ok(exception.stack.indexOf('calcPerformance') > 0)
  })

  it('calcPerformance throws', function () {
    assert.throws(() => {
      calcPerformance({rdtsc: rdtscNative, testTimeMilliseconds: 1000, funcs: [null!, null!]})
    }, Error)
    assert.throws(() => {
      calcPerformance({rdtsc: rdtscNative, testTimeMilliseconds: 1000, funcs: [null!]})
    }, Error)
    assert.throws(() => {
      calcPerformance({rdtsc: rdtscNative, testTimeMilliseconds: 1000, funcs: null! })
    }, Error)
    assert.throws(() => {
      calcPerformance({rdtsc: rdtscNative, testTimeMilliseconds: 0, funcs: [() => {}]})
    }, Error)
    assert.throws(() => {
      calcPerformance({rdtsc: rdtscNative, testTimeMilliseconds: null!, funcs: [() => {}]})
    }, Error)
  })

  it('calcPerformance self cycles', function () {
    this.timeout(15000)

    const result = calcPerformance({
      rdtsc               : rdtscNative,
      testTimeMilliseconds: 1000,
      funcs               : [() => {
      }],
    })

    console.log(result)
    assert.ok(result.cycles[0] > 1)
    assert.strictEqual(result.absoluteDiff, void 0)
  })

  it('rdtsc self cycles', function () {
    const result = calcPerformance({
      rdtsc               : rdtscNative,
      testTimeMilliseconds: 1000,
      funcs               : [
        () => {

        },
        () => {
          rdtsc()
        },
      ],
    })

    console.log('rdtsc() self =', result.absoluteDiff![0])
    assert.ok(result.absoluteDiff![0] > 1)
    assert.strictEqual(result.relativeDiff, void 0)
  })

  it('rdtsc self cycles 2', function () {
    const result = calcPerformance({
      rdtsc               : rdtscNative,
      testTimeMilliseconds: 1000,
      funcs               : [
        () => {
        },
        () => {
          rdtsc()
        },
      ],
    })

    console.log('rdtsc() self 2 =', result.absoluteDiff![0])
    assert.ok(result.absoluteDiff![0] > 1)
    assert.strictEqual(result.relativeDiff, void 0)
  })

  it('calc Object.keys performance', function () {
    const values: string[] = []
    const result = calcPerformance({
      rdtsc               : rdtscNative,
      testTimeMilliseconds: 1000,
      funcs               : [
        () => {

        },
        () => {
          values.push(Math.random() + '')
        },
        () => {
          values.push(Math.random() + '')
        },
      ],
    })
    console.log(values)
    console.log(result)
    assert.ok(result.absoluteDiff![0] > 1, objectToString(result))
    assert.ok(result.relativeDiff![0], objectToString(result))
  })

  it('calc performance relativeDiff', function () {
    this.timeout(1000 * 100 + 15000)

    let count = 100
    let result: any
    do {
      result = calcPerformance({
        rdtsc               : rdtscNative,
        testTimeMilliseconds: 1000,
        funcs               : [
          () => {

          },
          () => {

          },
          () => {

          }],
      })
    } while ((result.absoluteDiff[0] !== 0 || result.absoluteDiff[0] !== 0) && --count >= 0)

    assert.ok(result.absoluteDiff[0] <= 0)
    console.log(result)
    assert.strictEqual(result.absoluteDiff.length, 2)
    assert.strictEqual(result.relativeDiff, void 0)
  })
})
