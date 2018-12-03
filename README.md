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
for calc performance you can use functions **rdtsc0** and **rdtsc1**:

```js
var { rdtsc0, rdtsc1 } = require('rdtsc')

var cycles

rdtsc0()
// yourFunc()
cycles = rdtsc1() // minimum = 31

console.log(cycles)

```

## Calc Performance

Accuracy: +/- 4 cycles

### Syntax
```js
/*

calcPerformance(func0, func1, testTimeMilliseconds)
result = <min cycles of func1> - <min cycles of func0>

calcPerformance(null, func1, testTimeMilliseconds)
result = <min cycles of func1>

calcPerformance(func0, null, testTimeMilliseconds)
result = <min cycles of func0>

*/
```

### Example
```js
var { calcPerformance } = require('rdtsc')

var result = calcPerformance(
  () => {

  },
  () => {
    Object.keys(Math)
  },
  1000
)

console.log('"Object.keys(Math)" min cycles =', result) // about 20-40 cycles
```

## Thread Priority

Implemented only for Windows platform

### Examples

```js

const { runInRealtimePriority, getThreadPriority, getProcessPriority } = require('rdtsc')

runInRealtimePriority(() => {
  console.log('getThreadPriority = ', getThreadPriority()) // === THREAD_PRIORITY_REALTIME
  console.log('getProcessPriority = ', getProcessPriority()) // === PROCESS_PRIORITY_REALTIME
})

```


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
[travis-image]: https://travis-ci.org/NikolayMakhonin/nodejs-rdtsc.svg?branch=master
[travis-url]: https://travis-ci.org/NikolayMakhonin/nodejs-rdtsc
[coveralls-image]: https://coveralls.io/repos/github/NikolayMakhonin/nodejs-rdtsc/badge.svg?branch=master
[coveralls-url]: https://coveralls.io/github/NikolayMakhonin/nodejs-rdtsc?branch=master
[downloads-image]: https://img.shields.io/npm/dm/rdtsc.svg
[downloads-url]: https://npmjs.org/package/rdtsc