[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Build Status][github-image]][github-url]

# Description

**The most high resolution timing in NodeJs**

This module provides cross platform function rdtsc().

On x86 processors rdtsc() returns the number of cycles of the time stamp counter of the processor since computer start, which the processor command [RDTSC (Read Time Stamp Counter)](https://en.wikipedia.org/wiki/Time_Stamp_Counter) reads. On processors since 2007 this counter runs at a fixed rate, the base frequency of the processor, whatever the current frequency of its cores, so its cycles measure time and equal the cycles of a core only while the core runs at the base frequency

On macOS rdtsc() returns `mach_absolute_time()`, and on 64-bit ARM processors the virtual counter of the system timer; both run at a fixed rate too, below the frequency of the processor

(rdtsc() - rdtsc()) is always < 0

Notice: measure in one thread at a time: threads that measure in parallel take the processor cores from each other, and the priority that runInRealtimePriority sets belongs to the whole process, so one thread can restore it while another still measures

# Verified environments

Each major version is checked by its tests in the environments below; browsers are not checked. Older environments are not supported. When a newer Node needs changes in rdtsc, its major version grows

- rdtsc 6: Node 22 (V8 12.4) on Linux, Windows, and macOS, each on x64 and arm64

rdtsc throws where it detects that something goes otherwise than in these environments, instead of giving numbers that cannot be trusted

# Install

```bash
npm i rdtsc
```
# Features

## RDTSC

```js
import { rdtsc } from 'rdtsc'

console.log(rdtsc()) // 2365808188508759n: the cycles of the counter since the computer started
console.log(rdtsc() - rdtsc()) // -540n: negative, because the second call reads the counter later
```

## Calc Performance

Accuracy: +/- 4 cycles where the time stamp counter of the processor changes by 1 cycle. Some processors add several cycles to it at once, about every 10 ns: AMD Ryzen 7 PRO 6850U adds 27, so there every minimum that the counter measures is a multiple of 27 and the accuracy is +/- 27 cycles, as in the examples below, which come from this processor

calcPerformance calls the functions in turn for `time` milliseconds and keeps the minimum cycles of one call of each. The first function is the base: `absoluteDiff` holds each other value minus its value, and `relativeDiff` each further `absoluteDiff` divided by the first one, where the first one is positive. In Node the time of the garbage collections during a call is left out of its cycles

With `timeGc`, it then calls each function between forced young collections for `timeGc` more milliseconds, and further while a round still lowers a minimum or a function has not read the same bytes twice in a row yet, and keeps of each byte count the smallest value that two checks of a function in a row read, because during a collection V8 frees the unused rest of the allocation buffers of its background threads, so a single check can read fewer bytes than the call keeps; `gc` of the result holds:
- `allocatedBytes` - bytes that the call puts into the young generation
- `uncollectedBytes` - the part of them that the young collections right after the call do not collect
- `allocatedInOldGenerationBytes` - bytes that the call creates straight in the old generation, as V8 does with the strings of fractional numbers
- `cyclesPerByte` - cycles that young collections take per byte of new objects, measured by forced young collections at the first call with `timeGc`, and again after V8 resizes the young generation
- `memory` - `allocatedBytes` times `cyclesPerByte`: the cycles of the young collections that the call causes
- `logic` - the cycles of the call itself, so that `cycles` is `logic` plus `memory`

`allocatedInOldGenerationBytes` has no price in `memory`, because these bytes burden the full collections, whose price is not measured. The memory can be measured in Node only: `isGcToolsSupported()` tells whether it can, and where it cannot, `gc` is null. A measurement with `timeGc` throws where a value would be wrong, instead of giving it: under the young mark-sweep of V8 (`node --minor-ms`), for a function that causes a full collection in every call, for a function that reads different bytes in every check, and where V8 counts its heap otherwise than in the verified environments. To force collections, the first measurement of the memory or the first call of `isGcToolsSupported()` in Node turns on `--expose-gc` for the process, so `gc` also appears in the contexts created after it

### Syntax

```js
const result = calcPerformance({
  // How long to call the functions in turn, in milliseconds: result.cycles gets the fewest cycles of one call of each
  time: 1000,
  // How long to measure the memory after that, in milliseconds: result.gc gets the bytes of one call of each;
  // null measures no memory, and result.gc is null
  timeGc: 1000,
  // The functions to measure; absoluteDiff and relativeDiff compare the others with the first one
  funcs: [func1, func2],
  // Optional: the counter; by default the native one in Node, and one that reads performance.now() in browsers
  rdtsc: null,
})
```

`calcPerformanceAsync` takes the same arguments, awaits every call, and returns a promise of the same result

### Examples

```js
import { calcPerformance } from 'rdtsc'

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

Implemented only for Windows platform. `runInRealtimePriority` runs a function at the realtime priority of the process and the thread. Without the privilege "Increase scheduling priority", which administrators have, Windows gives the process the high priority instead; `runInRealtimePriority` throws where the process gets less than high or the thread less than realtime

### Examples

```js
import { runInRealtimePriority, getThreadPriority, getProcessPriority } from 'rdtsc'

runInRealtimePriority(() => {
  console.log('getThreadPriority = ', getThreadPriority()) // === ThreadPriority.Realtime
  console.log('getProcessPriority = ', getProcessPriority()) // === ProcessPriority.Realtime, or Highest without the privilege
})
```

```js
import { setThreadPriority, getThreadPriority, isWin, ThreadPriority } from 'rdtsc'

if (isWin) {
  console.log(getThreadPriority()) // === ThreadPriority.Normal
} else {
  console.log(getThreadPriority()) // === undefined
}

const previousPriority = setThreadPriority(ThreadPriority.Realtime)

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

```js
import { setProcessPriority, getProcessPriority, isWin, ProcessPriority } from 'rdtsc'

if (isWin) {
  console.log(getProcessPriority()) // === ProcessPriority.Normal
} else {
  console.log(getProcessPriority()) // === undefined
}

const previousPriority = setProcessPriority(ProcessPriority.Realtime)

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
