[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][github-image]][github-url]
[![Test Coverage][coveralls-image]][coveralls-url]

# Description

**The most high resolution timing in NodeJs**

This module provides cross platform function rdtsc().

On x86 processors rdtsc() returns the number of cycles of the time stamp counter of the processor since computer start, which the processor command [RDTSC (Read Time Stamp Counter)](https://en.wikipedia.org/wiki/Time_Stamp_Counter) reads. On processors since 2007 this counter runs at a fixed rate, the base frequency of the processor, whatever the current frequency of its cores, so its cycles measure time and equal the cycles of a core only while the core runs at the base frequency

On macOS rdtsc() returns `mach_absolute_time()`, and on 64-bit ARM processors the virtual counter of the system timer; both run at a fixed rate too, below the frequency of the processor

(rdtsc() - rdtsc()) is always < 0

Notice: measure in one thread at a time: threads that measure in parallel take the processor cores from each other, and the priority that runInRealtimePriority sets belongs to the whole process, so one thread can restore it while another still measures

# Install

```bash
npm i rdtsc -S
```
# Features

## RDTSC

```js
var { rdtsc } = require('rdtsc')
console.log(rdtsc()) // 3864063236708616 cycles
console.log(rdtsc() - rdtsc()) // -2971 cycles, minimum = -130 cycles
```

## Calc Performance

Accuracy: +/- 4 cycles where the time stamp counter of the processor changes by 1 cycle. Some processors add several cycles to it at once, about every 10 ns: AMD Ryzen 7 PRO 6850U adds 27, so there every minimum that the counter measures is a multiple of 27 and the accuracy is +/- 27 cycles, as in the examples below, which come from this processor

calcPerformance calls the functions in turn for `time` milliseconds and keeps the minimum cycles of one call of each. The first function is the base: `absoluteDiff` holds each other value minus its value, and `relativeDiff` each further `absoluteDiff` divided by the first one, where the first one is positive. In Node the time of the garbage collections during a call is left out of its cycles

With `timeGc`, it then calls each function between forced young collections for `timeGc` more milliseconds and keeps the minimum bytes of one call; `gc` of the result holds:
- `allocatedBytes` - bytes that the call puts into the young generation
- `uncollectedBytes` - the part of them that the young collections right after the call do not collect
- `allocatedInOldGenerationBytes` - bytes that the call creates straight in the old generation, as V8 does with the strings of fractional numbers
- `cyclesPerByte` - cycles that young collections take per byte of new objects, measured by forced young collections at the first call with `timeGc`, and again after V8 resizes the young generation
- `memory` - `allocatedBytes` times `cyclesPerByte`: the cycles of the young collections that the call causes
- `logic` - the cycles of the call itself, so that `cycles` is `logic` plus `memory`

`allocatedInOldGenerationBytes` has no price in `memory`, because these bytes burden the full collections, whose price is not measured. The memory can be measured in Node only: `isGcToolsSupported()` tells whether it can, and where it cannot, `gc` is null. Under the young mark-sweep of V8 (`node --minor-ms`) the byte counts would be wrong, so a measurement with `timeGc` throws there. To force collections, the first measurement of the memory or the first call of `isGcToolsSupported()` in Node turns on `--expose-gc` for the process, so `gc` also appears in the contexts created after it

### Syntax

```js
const result = calcPerformance({
  time: 1000, // milliseconds for the cycles
  timeGc: 1000, // milliseconds for the memory, or null for the cycles alone
  funcs: [func1, func2],
  rdtsc: null, // optional: the counter, by default the native one in Node and the JavaScript one in browsers
})
```

`calcPerformanceAsync` takes the same arguments, awaits every call, and returns a promise of the same result

### Examples

```js
const { calcPerformance } = require('rdtsc')

calcPerformance({
  time  : 1000,
  timeGc: null,
  funcs : [
    () => {},
    () => {},
  ],
})

/*
{
  calcInfo: {
    iterationCycles: 112.54394673220558,
    iterations: 23945876,
    funcsCount: 2,
    testTime: 1000
  },
  cycles: {
    values: [ 27n, 27n ],
    absoluteDiff: [ 0 ],
    relativeDiff: undefined
  },
  gc: null
}
*/

calcPerformance({
  time  : 1000,
  timeGc: 1000,
  funcs : [
    () => {},
    () => ({ value: 1 }),
    () => Math.random() + '',
  ],
})

/*
{
  calcInfo: {
    iterationCycles: 299.7027986112038,
    iterations: 8991960,
    funcsCount: 3,
    testTime: 1000
  },
  cycles: {
    values: [ 27n, 28n, 405n ],
    absoluteDiff: [ 1, 378 ],
    relativeDiff: [ 378 ]
  },
  gc: {
    logic: {
      values: [ 27n, 27n, 405n ],
      absoluteDiff: [ 0, 378 ],
      relativeDiff: undefined
    },
    memory: {
      values: [ 0n, 1n, 0n ],
      absoluteDiff: [ 1, 0 ],
      relativeDiff: [ 0 ]
    },
    allocatedBytes: {
      values: [ 0, 32, 16 ],
      absoluteDiff: [ 32, 16 ],
      relativeDiff: [ 0.5 ]
    },
    uncollectedBytes: {
      values: [ 0, 0, 16 ],
      absoluteDiff: [ 0, 16 ],
      relativeDiff: undefined
    },
    allocatedInOldGenerationBytes: {
      values: [ 0, 0, 32 ],
      absoluteDiff: [ 0, 32 ],
      relativeDiff: undefined
    },
    cyclesPerByte: 0.020495324248786622
  }
}
*/
```

## Thread Priority

Implemented only for Windows platform

### Examples

<!-- eslint-disable indent -->
```js

const { runInRealtimePriority, getThreadPriority, getProcessPriority } = require('rdtsc')

runInRealtimePriority(() => {
    console.log('getThreadPriority = ', getThreadPriority()) // === ThreadPriority.Realtime
    console.log('getProcessPriority = ', getProcessPriority()) // === ProcessPriority.Realtime
})

```


<!-- eslint-disable indent -->
```js
const { setThreadPriority, getThreadPriority, isWin, ThreadPriority } = require('rdtsc')

if (isWin) {
    console.log(getThreadPriority()) // === ThreadPriority.Normal
} else {
    console.log(getThreadPriority()) // === undefined
}

var previousPriority = setThreadPriority(ThreadPriority.Realtime)

try {
    // <your code>
} finally {
    setThreadPriority(previousPriority)
}
```

### Priorities list
```js
/*

ThreadPriority.Idle = -15
ThreadPriority.Lowest = -2
ThreadPriority.BelowNormal = -1
ThreadPriority.Normal = 0
ThreadPriority.AboveNormal = 1
ThreadPriority.Highest = 2
ThreadPriority.Realtime = 15 // THREAD_PRIORITY_TIME_CRITICAL

*/
```

## Process Priority

Implemented only for Windows platform

### Example

<!-- eslint-disable indent -->
```js
const { setProcessPriority, getProcessPriority, isWin, ProcessPriority } = require('rdtsc')

if (isWin) {
    console.log(getProcessPriority()) // === ProcessPriority.Normal
} else {
    console.log(getProcessPriority()) // === undefined
}

var previousPriority = setProcessPriority(ProcessPriority.Realtime)

try {
    // <your code>
} finally {
    setProcessPriority(previousPriority)
}
```

### Priorities list
```js
/*

ProcessPriority.Idle = 0x00000040 // IDLE_PRIORITY_CLASS
ProcessPriority.BelowNormal = 0x00004000 // BELOW_NORMAL_PRIORITY_CLASS
ProcessPriority.Normal = 0x00000020 // NORMAL_PRIORITY_CLASS
ProcessPriority.AboveNormal = 0x00008000 // ABOVE_NORMAL_PRIORITY_CLASS
ProcessPriority.Highest = 0x00000080 // HIGH_PRIORITY_CLASS
ProcessPriority.Realtime = 0x00000100 // REALTIME_PRIORITY_CLASS

*/
```

# License

[Unlimited Free](LICENSE)

[npm-image]: https://img.shields.io/npm/v/rdtsc.svg
[npm-url]: https://npmjs.org/package/rdtsc
[downloads-image]: https://img.shields.io/npm/dm/rdtsc.svg
[downloads-url]: https://npmjs.org/package/rdtsc
[github-image]: https://github.com/NikolayMakhonin/nodejs-rdtsc/actions/workflows/test.yml/badge.svg
[github-url]: https://github.com/NikolayMakhonin/nodejs-rdtsc/actions
[coveralls-image]: https://coveralls.io/repos/github/NikolayMakhonin/nodejs-rdtsc/badge.svg
[coveralls-url]: https://coveralls.io/github/NikolayMakhonin/nodejs-rdtsc
