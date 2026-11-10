import assert from 'assert'
import {
  calcPerformance,
  calcPerformanceAsync,
  getProcessPriority,
  getThreadPriority,
  isGcToolsSupported,
  isWin,
  ProcessPriority,
  rdtsc,
  runInRealtimePriority,
  setProcessPriority,
  setThreadPriority,
  ThreadPriority,
  type CalcPerformanceResult,
} from '.'
import { describe, it } from 'vitest'
import { objectToString } from '../-test/helpers/objectToString'
import { rdtscNative } from '../rdtscNative'
import { bindingPath } from '../binding/binding'

console.log('isWin =', isWin)

describe('All tests', () => {
  it('Base tests', () => {
    assert.ok(rdtsc() > 0)
    assert.ok(rdtsc() - rdtsc() < 0)
    console.log('rdtsc() =', rdtsc())
    console.log('rdtsc() - rdtsc() =', rdtsc() - rdtsc())
  })

  it('the binding loads a second time', () => {
    // The binding is context aware (NODE_MODULE_INITIALIZER), so Node runs its initializer again for a new module
    // object, which gets new functions
    const secondModule: { exports: { rdtsc?: () => bigint } } = { exports: {} }
    process.dlopen(secondModule, bindingPath)
    const secondRdtsc = secondModule.exports.rdtsc
    if (secondRdtsc == null) {
      assert.fail('the second load of the binding exported no rdtsc')
    }
    assert.notStrictEqual(secondRdtsc, rdtsc)
    assert.ok(secondRdtsc() > 0)
    assert.ok(secondRdtsc() - secondRdtsc() < 0)
  })

  it('runInRealtimePriority', () => {
    assert.ok(runInRealtimePriority(() => rdtsc() - rdtsc()))
    console.log(
      'rdtsc() - rdtsc() =',
      runInRealtimePriority(() => rdtsc() - rdtsc()),
    )

    console.log('previous ThreadPriority =', getThreadPriority())
    console.log('previous ProcessPriority =', getProcessPriority())

    runInRealtimePriority(() => {
      let threadPriority: ThreadPriority
      let processPriority: ProcessPriority
      console.log('ThreadPriority =', (threadPriority = getThreadPriority())) // === THREAD_PRIORITY_REALTIME
      console.log('ProcessPriority =', (processPriority = getProcessPriority())) // === PROCESS_PRIORITY_REALTIME
      if (isWin) {
        assert.strictEqual(threadPriority, ThreadPriority.Realtime)
        assertRaisedProcessPriority(processPriority)
      } else {
        assert.strictEqual(threadPriority, void 0)
        assert.strictEqual(processPriority, void 0)
      }
    })
  })

  it('runInRealtimePriority async', async () => {
    const previousThreadPriority = getThreadPriority()
    const previousProcessPriority = getProcessPriority()

    await runInRealtimePriority(async () => {
      await new Promise(resolve => {
        setTimeout(resolve, 1)
      })
      if (isWin) {
        assert.strictEqual(getThreadPriority(), ThreadPriority.Realtime)
        assertRaisedProcessPriority(getProcessPriority())
      }
    })

    assert.strictEqual(getThreadPriority(), previousThreadPriority)
    assert.strictEqual(getProcessPriority(), previousProcessPriority)
  })

  it('runInRealtimePriority async overlapping', async () => {
    const previousThreadPriority = getThreadPriority()
    const previousProcessPriority = getProcessPriority()

    let resolveFirst: () => void = null!
    let resolveSecond: () => void = null!
    const first = runInRealtimePriority(
      () =>
        new Promise<void>(resolve => {
          resolveFirst = () => {
            resolve()
          }
        }),
    )
    const second = runInRealtimePriority(
      () =>
        new Promise<void>(resolve => {
          resolveSecond = () => {
            resolve()
          }
        }),
    )

    resolveFirst()
    await first
    if (isWin) {
      // The second call still runs, so it keeps the priority
      assert.strictEqual(getThreadPriority(), ThreadPriority.Realtime)
      assertRaisedProcessPriority(getProcessPriority())
    }

    resolveSecond()
    await second
    assert.strictEqual(getThreadPriority(), previousThreadPriority)
    assert.strictEqual(getProcessPriority(), previousProcessPriority)
  })

  it('Thread priority', () => {
    const previousPriority = setThreadPriority(ThreadPriority.Highest)
    console.log('previousPriority =', previousPriority)
    if (isWin) {
      assert.notStrictEqual(previousPriority, void 0)
    } else {
      assert.strictEqual(previousPriority, void 0)
    }

    let priority = getThreadPriority()
    console.log('priority =', priority)
    if (isWin) {
      assert.strictEqual(priority, ThreadPriority.Highest)
    } else {
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

  it('Process priority', () => {
    const previousPriority = setProcessPriority(ProcessPriority.Highest)
    console.log('previousPriority =', previousPriority)
    if (isWin) {
      assert.notStrictEqual(previousPriority, void 0)
    } else {
      assert.strictEqual(previousPriority, void 0)
    }

    let priority = getProcessPriority()
    console.log('priority =', priority)
    if (isWin) {
      assert.strictEqual(priority, ProcessPriority.Highest)
    } else {
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

  it('throw catch', () => {
    function testErrorFunc() {
      throw new Error('test error')
    }

    let exception: unknown
    try {
      calcPerformance({
        rdtsc: rdtscNative,
        time: 100,
        timeGc: null,
        funcs: [
          () => {
            testErrorFunc()
          },
          () => {
            // do nothing
          },
        ],
      })
    } catch (ex) {
      exception = ex
    }

    assert.ok(exception instanceof Error)
    assert.ok(exception.stack)
    assert.ok(exception.stack.indexOf('calcPerformance') > 0)
  })

  it('calcPerformance throws', () => {
    assert.throws(() => {
      calcPerformance({
        rdtsc: rdtscNative,
        time: 1000,
        timeGc: null,
        funcs: [null!, null!],
      })
    }, Error)
    assert.throws(() => {
      calcPerformance({
        rdtsc: rdtscNative,
        time: 1000,
        timeGc: null,
        funcs: [null!],
      })
    }, Error)
    assert.throws(() => {
      calcPerformance({
        rdtsc: rdtscNative,
        time: 1000,
        timeGc: null,
        funcs: null!,
      })
    }, Error)
    assert.throws(() => {
      calcPerformance({
        rdtsc: rdtscNative,
        time: 0,
        timeGc: null,
        funcs: [() => {}],
      })
    }, Error)
    assert.throws(() => {
      calcPerformance({
        rdtsc: rdtscNative,
        time: null!,
        timeGc: null,
        funcs: [() => {}],
      })
    }, Error)
    assert.throws(() => {
      calcPerformance({
        rdtsc: rdtscNative,
        time: 1000,
        timeGc: -1,
        funcs: [() => {}],
      })
    }, Error)
    assert.throws(() => {
      calcPerformance({
        rdtsc: rdtscNative,
        time: 1000,
        timeGc: NaN,
        funcs: [() => {}],
      })
    }, Error)
    assert.throws(() => {
      calcPerformance({
        rdtsc: rdtscNative,
        time: Infinity,
        timeGc: null,
        funcs: [() => {}],
      })
    }, Error)
    assert.throws(() => {
      calcPerformance({
        rdtsc: rdtscNative,
        time: 1000,
        timeGc: Infinity,
        funcs: [() => {}],
      })
    }, Error)
  })

  it('calcPerformanceAsync rejects invalid arguments', async () => {
    await assert.rejects(
      calcPerformanceAsync({
        rdtsc: rdtscNative,
        time: 0,
        timeGc: null,
        funcs: [() => {}],
      }),
      Error,
    )
  })

  it('gc is measured in Node unless timeGc is null', () => {
    assert.strictEqual(isGcToolsSupported(), true)

    const result = calcPerformance({
      rdtsc: rdtscNative,
      time: 50,
      timeGc: 50,
      funcs: [() => {}],
    })
    assert.ok(result.gc, objectToString(result))

    const resultWithoutGc = calcPerformance({
      rdtsc: rdtscNative,
      time: 50,
      timeGc: null,
      funcs: [() => {}],
    })
    assert.strictEqual(resultWithoutGc.gc, null)
  })

  it('calcPerformance self cycles', () => {
    const result = calcPerformance({
      rdtsc: rdtscNative,
      time: 1000,
      timeGc: null,
      funcs: [() => {}],
    })

    console.log(result)
    // 0 where one step of the counter is longer than the call, as on arm64 and on some virtual machines
    assert.ok(result.cycles.values[0] >= 0)
    assert.strictEqual(result.cycles.absoluteDiff, void 0)
  })

  it('rdtsc self cycles', () => {
    const result = calcPerformance({
      rdtsc: rdtscNative,
      time: 1000,
      timeGc: null,
      funcs: [
        () => {},
        () => {
          rdtsc()
        },
      ],
    })

    console.log('rdtsc() self =', result.cycles.absoluteDiff![0])
    // 0 where one step of the counter is longer than a call of rdtsc(), as on arm64
    assert.ok(result.cycles.absoluteDiff![0] >= 0)
    assert.strictEqual(result.cycles.relativeDiff, void 0)
  })

  it('rdtsc self cycles 2', () => {
    const result = calcPerformance({
      rdtsc: rdtscNative,
      time: 1000,
      timeGc: null,
      funcs: [
        () => {},
        () => {
          rdtsc()
        },
      ],
    })

    console.log('rdtsc() self 2 =', result.cycles.absoluteDiff![0])
    // 0 where one step of the counter is longer than a call of rdtsc(), as on arm64
    assert.ok(result.cycles.absoluteDiff![0] >= 0)
    assert.strictEqual(result.cycles.relativeDiff, void 0)
  })

  it('calc Object.keys performance', () => {
    const values: string[] = []
    const result = calcPerformance({
      rdtsc: rdtscNative,
      time: 1000,
      timeGc: null,
      funcs: [
        () => {},
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
    // 0 where one step of the counter is longer than a call of the function, as on arm64
    assert.ok(result.cycles.absoluteDiff![0] >= 0, objectToString(result))
    assert.strictEqual(
      result.cycles.relativeDiff != null,
      result.cycles.absoluteDiff![0] > 0,
      objectToString(result),
    )
  })

  it('calc performance relativeDiff', { timeout: 1000 * 100 + 15000 }, () => {
    let count = 100
    let result: CalcPerformanceResult
    do {
      result = calcPerformance({
        rdtsc: rdtscNative,
        time: 1000,
        timeGc: null,
        funcs: [() => {}, () => {}, () => {}],
      })
    } while (result.cycles.absoluteDiff![0] !== 0 && --count >= 0)

    const absoluteDiff = result.cycles.absoluteDiff!
    assert.ok(absoluteDiff[0] <= 0)
    console.log(result)
    assert.strictEqual(absoluteDiff.length, 2)
    assert.strictEqual(result.cycles.relativeDiff, void 0)
  })
})

// Windows gives the high priority class instead of the realtime one without the privilege "Increase scheduling priority"
function assertRaisedProcessPriority(priority: ProcessPriority): void {
  assert.ok(
    priority === ProcessPriority.Realtime ||
      priority === ProcessPriority.Highest,
    `process priority ${priority}`,
  )
}
