'use strict';
const assert = require('assert');
const { rdtsc, calcPerformance, setThreadPriority, getThreadPriority, isWin, THREAD_PRIORITY_HIGHEST } = require('./index');

//base tests
assert.ok(rdtsc() > 0);
assert.ok(rdtsc() - rdtsc() < 0);
console.log('rdtsc() - rdtsc() =', rdtsc() - rdtsc());

// Test multiple loading of the same module.
const bindingPath = require.resolve('./build/Release/binding');
delete require.cache[bindingPath];
const { rerdtsc } = require('./index');
assert.ok(rdtsc() > 0);
assert.ok(rdtsc() - rdtsc() < 0);
assert.notStrictEqual(rdtsc, rerdtsc);

//thread priority
var previousPriority = setThreadPriority(THREAD_PRIORITY_HIGHEST);
console.log("previousPriority = ", previousPriority);
if (isWin) {
	assert.notEqual(previousPriority, undefined);
} else {
	assert.strictEqual(previousPriority, undefined);
}

var priority = getThreadPriority();
console.log("priority = ", priority);
if (isWin) {
	assert.equal(priority, THREAD_PRIORITY_HIGHEST);
} else {
	assert.strictEqual(priority, undefined);
}

if (isWin) {
	var testPriority = setThreadPriority(previousPriority);
	assert.equal(testPriority, THREAD_PRIORITY_HIGHEST);
	priority = getThreadPriority();
	console.log("priority = ", priority);
	assert.equal(priority, previousPriority);
}

//try catch
var exception;
try {
	calcPerformance(
	() => {
		throw new Error("test error");
	},
	() => {
		
	},
	100);	
} catch (ex) {
	exception = ex;
}

console.log("Test exeption:");
console.log(JSON.stringify(exception), exception.stack);
console.log();

assert.ok(exception);
assert.ok(exception.stack);

// calcPerformance self
var result = calcPerformance(
	null,
	() => {},
	2000
);

console.log('calcPerformance() self =', result);
assert.ok(result > 50);

// rdtsc self
var minCycles;

calcPerformance(
	null,
	() => {
		var cycles = -(rdtsc() - rdtsc());
		if (minCycles == null || cycles < minCycles) {
			minCycles = cycles;
		}
	},
	2000
);

console.log('rdtsc() self =', minCycles);
assert.ok(minCycles > 50);

// rdtsc self 2
var minCycles;

result = calcPerformance(
	() => {},
	() => {
		rdtsc();
	},
	2000
);

console.log('rdtsc() self 2 =', result);
assert.ok(result > 50);

//calc Object.keys performance
var object = { x: 1 };
result = calcPerformance(
	() => {},
	() => {return Object.keys(object)},
	2000
);
console.log('Object.keys({ 1 item }) =', result);
assert.ok(result > 10);
