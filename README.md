[![NPM Version][npm-image]][npm-url]
[![NPM Downloads][downloads-image]][downloads-url]
[![Node.js Version][node-version-image]][node-version-url]
[![Build Status][travis-image]][travis-url]
[![Test Coverage][coveralls-image]][coveralls-url]

# Description

**The most high resolution timing in NodeJs**

This module provide cross platform function rdtsc().

rdtsc() return counts the number of cycles since computer start

If you run in on Windows it will call C++ function __rdtsc() that call processor command [RDTSC (Read Time Stamp Counter)](https://en.wikipedia.org/wiki/Time_Stamp_Counter)

(rdtsc() - rdtsc()) is always < 0

Notice: you should not use parallel threads since you calc performance

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

Accuracy: +/- 4 cycles

### Syntax
```js
/*

calcPerformance(testTimeMilliseconds, ...funcs)

result = {
    calcInfo: { 
        iterationCycles: 413.22476287663505,
        iterations: 5622917,
        funcsCount: 3,
        testTime: 1000 // milliseconds
    },
    cycles: [ 54n, 54n, 55n ], // is BigInt
    absoluteDiff: [ 0, 0 ], // cycles[i] - cycles[0]
    relativeDiff: undefined, // absoluteDiff[i] / absoluteDiff[0]
}

*/
```

### Examples

```js
const { calcPerformance } = require('rdtsc')

calcPerformance(1000, () => {}, () => {}, () => {})

/*
result = {
    calcInfo: { 
        iterationCycles: 413.22476287663505,
        iterations: 5622917,
        funcsCount: 3,
        testTime: 1000 // milliseconds
    },
    cycles: [ 54n, 54n, 54n ],
    absoluteDiff: [ 0, 0 ],
    relativeDiff: undefined,
}

OR

result = {
    ...
    cycles: [ 54n, 55n, 54n ],
    absoluteDiff: [ 1, 0 ],
    relativeDiff: [ 0 ],
}

OR

result = {
    ...
    cycles: [ 54n, 58n, 52n ],
    absoluteDiff: [ 4, -2 ],
    relativeDiff: [ -0.5 ],
}
*/

calcPerformance(1000, () => {}, () => {})

/*
result = {
    ...
    cycles: [ 54n, 54n ],
    absoluteDiff: [ 0 ],
    relativeDiff: undefined,
}
*/

calcPerformance(1000, () => {})

/*
result = {
    ...
    cycles: [ 54n ],
    absoluteDiff: undefined,
    relativeDiff: undefined,
}
*/

```

<!-- eslint-disable indent -->
```js
var { calcPerformance } = require('rdtsc')

var result = calcPerformance(
    1000,
    () => {

    },
    () => {
        Object.keys(Math)
    }
)

console.log('"Object.keys(Math)" min cycles =', result.absoluteDiff[0]) // about 20-40 cycles
```

## Thread Priority

Implemented only for Windows platform

### Examples

<!-- eslint-disable indent -->
```js

const { runInRealtimePriority, getThreadPriority, getProcessPriority } = require('rdtsc')

runInRealtimePriority(() => {
    console.log('getThreadPriority = ', getThreadPriority()) // === THREAD_PRIORITY_REALTIME
    console.log('getProcessPriority = ', getProcessPriority()) // === PROCESS_PRIORITY_REALTIME
})

```


<!-- eslint-disable indent -->
```js
const { setThreadPriority, getThreadPriority, isWin, THREAD_PRIORITY_REALTIME } = require('rdtsc')

if (isWin) {
    console.log(getThreadPriority()) // === THREAD_PRIORITY_NORMAL
} else {
    console.log(getThreadPriority()) // === undefined
}

var previousPriority = setThreadPriority(THREAD_PRIORITY_REALTIME)

try {
    // <your code>
} finally {
    setThreadPriority(previousPriority)
}
```

### Priorities list
```js
/*

const THREAD_PRIORITY_IDLE = -15
const THREAD_PRIORITY_LOWEST = -2
const THREAD_PRIORITY_BELOW_NORMAL = -1
const THREAD_PRIORITY_NORMAL = 0
const THREAD_PRIORITY_ABOVE_NORMAL = 1
const THREAD_PRIORITY_HIGHEST = 2
const THREAD_PRIORITY_REALTIME = 15 // THREAD_PRIORITY_REALTIME

*/
```

## Process Priority

Implemented only for Windows platform

### Example

<!-- eslint-disable indent -->
```js
const { setProcessPriority, getProcessPriority, isWin, PROCESS_PRIORITY_REALTIME } = require('rdtsc')

if (isWin) {
    console.log(getProcessPriority()) // === PROCESS_PRIORITY_NORMAL
} else {
    console.log(getProcessPriority()) // === undefined
}

var previousPriority = setProcessPriority(PROCESS_PRIORITY_REALTIME)

try {
    // <your code>
} finally {
    setProcessPriority(previousPriority)
}
```

### Priorities list
```js
/*

const PROCESS_PRIORITY_IDLE = 0x00000040 // IDLE_PRIORITY_CLASS
const PROCESS_PRIORITY_BELOW_NORMAL = 0x00004000 // BELOW_NORMAL_PRIORITY_CLASS
const PROCESS_PRIORITY_NORMAL = 0x00000020 // NORMAL_PRIORITY_CLASS
const PROCESS_PRIORITY_ABOVE_NORMAL = 0x00008000 // ABOVE_NORMAL_PRIORITY_CLASS
const PROCESS_PRIORITY_HIGHEST = 0x00000080 // HIGH_PRIORITY_CLASS
const PROCESS_PRIORITY_REALTIME = 0x00000100 // REALTIME_PRIORITY_CLASS

*/
```

# License

[CC0-1.0](LICENSE)

[npm-image]: https://img.shields.io/npm/v/rdtsc.svg
[npm-url]: https://npmjs.org/package/rdtsc
[node-version-image]: https://img.shields.io/node/v/rdtsc.svg
[node-version-url]: https://nodejs.org/en/download/
[travis-image]: https://travis-ci.org/NikolayMakhonin/nodejs-rdtsc.svg
[travis-url]: https://travis-ci.org/NikolayMakhonin/nodejs-rdtsc
[coveralls-image]: https://coveralls.io/repos/github/NikolayMakhonin/nodejs-rdtsc/badge.svg
[coveralls-url]: https://coveralls.io/github/NikolayMakhonin/nodejs-rdtsc
[downloads-image]: https://img.shields.io/npm/dm/rdtsc.svg
[downloads-url]: https://npmjs.org/package/rdtsc