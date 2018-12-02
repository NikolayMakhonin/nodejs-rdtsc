# Description

**The most high resolution timing in NodeJs**

This module provide function rdtsc() that call C++ function __rdtsc() that call processor command [RDTSC (Read Time Stamp Counter)](https://en.wikipedia.org/wiki/Time_Stamp_Counter)

rdtsc() return counts the number of cycles since computer start

(rdtsc() - rdtsc()) is always < 0

Tested on Windows

# Install

```bash
npm i rdtsc -S
```
# Features

## RDTSC

```js
var { rdtsc } = require('rdtsc');
console.log(rdtsc()); // 3864063236708616 cycles
console.log(rdtsc() - rdtsc()); // -2971 cycles
```

## Cacl Performance

### Syntax
```js
calcPerformance(func0, func1, testTimeMilliseconds);
// result = <min time of func1> - <min time of func0>;

calcPerformance(null, func1, testTimeMilliseconds);
// result = <min time of func1>;

calcPerformance(func0, null, testTimeMilliseconds);
// result = <min time of func0>
```

### Example
```js
var { calcPerformance } = require('rdtsc');

var result = calcPerformance(
() => {

},
() => {
	Object.keys(Math);
},
1000);

console.log('"Object.keys(Math)" min cycles =', result); //about 20-40 cycles
```

## Thread Prioriies

Implemented only for Windows platform

### Example

```js
const { setThreadPriority, getThreadPriority, isWin, THREAD_PRIORITY_TIME_CRITICAL } = require('rdtsc');

if (isWin) {
	console.log(getThreadPriority()); // === THREAD_PRIORITY_NORMAL
} else {
	console.log(getThreadPriority()); // === undefined
}

var previousPriority = setThreadPriority(THREAD_PRIORITY_TIME_CRITICAL);

try {
	<your code>
} finally {
	setThreadPriority(previousPriority);
}
```

### Priorities list
```js
const THREAD_PRIORITY_IDLE = -15;
const THREAD_PRIORITY_LOWEST = -2;
const THREAD_PRIORITY_BELOW_NORMAL = -1;
const THREAD_PRIORITY_NORMAL = 0;
const THREAD_PRIORITY_ABOVE_NORMAL = 1;
const THREAD_PRIORITY_HIGHEST = 2;
const THREAD_PRIORITY_TIME_CRITICAL = 15;
```
