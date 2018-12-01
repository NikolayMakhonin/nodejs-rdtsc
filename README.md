The most high resolution timing in NodeJs

This module provide function rdtsc() that call C++ function __rdtsc() that call processor command [RDTSC (Read Time Stamp Counter)](https://en.wikipedia.org/wiki/Time_Stamp_Counter)

rdtsc() return counts the number of cycles since computer start

(rdtsc() - rdtsc()) is always < 0

** Tested on Windows **

Example:
```js
var { rdtsc, calcPerformance } = require('rdtsc');

// calcPerformance(func0, func1, testTimeMilliseconds);
// result = <min time of func1> - <min time of func0>;

var result = calcPerformance(
() => {

},
() => {
	Object.keys(Math);
},
1000);

console.log('"Object.keys(Math)" time =', result);
```
