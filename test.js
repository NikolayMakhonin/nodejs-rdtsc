'use strict';
const assert = require('assert');
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
} = require('./index');

//base tests
console.log("== Base tests ==");

assert.ok(rdtsc() > 0);
assert.ok(rdtsc() - rdtsc() < 0);
console.log('rdtsc() =', rdtsc());
console.log('rdtsc() - rdtsc() =', rdtsc() - rdtsc());

console.log();

//runInRealtimePriority
console.log("== runInRealtimePriority ==");

console.log('rdtsc() - rdtsc() =', runInRealtimePriority(() => rdtsc() - rdtsc()));	

console.log("previous ThreadPriority = ", getThreadPriority()); 
console.log("previous ProcessPriority = ", getProcessPriority()); 

runInRealtimePriority(() => {
	let threadPriority, processPriority;
	console.log("ThreadPriority = ", threadPriority = getThreadPriority()); // === THREAD_PRIORITY_REALTIME
	console.log("ProcessPriority = ", processPriority = getProcessPriority()); // === PROCESS_PRIORITY_REALTIME
	if (isWin) {
		assert.strictEqual(threadPriority, THREAD_PRIORITY_REALTIME);
		assert.strictEqual(processPriority, PROCESS_PRIORITY_REALTIME);
	} else {
		assert.strictEqual(threadPriority, undefined);
		assert.strictEqual(processPriority, undefined);
	}
});

console.log();

// Test multiple loading of the same module.
console.log("== Test multiple loading of the same module ==");

const bindingPath = require.resolve('./build/Release/binding');
delete require.cache[bindingPath];
const { rerdtsc } = require('./index');
assert.ok(rdtsc() > 0);
assert.ok(rdtsc() - rdtsc() < 0);
assert.notStrictEqual(rdtsc, rerdtsc);

console.log();

//thread priority
console.log("== Thread priority ==");

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

console.log();

//process priority
console.log("== Process priority ==");

var previousPriority = setProcessPriority(PROCESS_PRIORITY_HIGHEST);
console.log("previousPriority = ", previousPriority);
if (isWin) {
	assert.notEqual(previousPriority, undefined);
} else {
	assert.strictEqual(previousPriority, undefined);
}

var priority = getProcessPriority();
console.log("priority = ", priority);
if (isWin) {
	assert.equal(priority, PROCESS_PRIORITY_HIGHEST);
} else {
	assert.strictEqual(priority, undefined);
}

if (isWin) {
	var testPriority = setProcessPriority(previousPriority);
	assert.equal(testPriority, PROCESS_PRIORITY_HIGHEST);
	priority = getProcessPriority();
	console.log("priority = ", priority);
	assert.equal(priority, previousPriority);
}

console.log();

//try catch
console.log("== try catch ==");

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

assert.ok(exception);
assert.ok(exception.stack);

console.log();

// calcPerformance self
console.log("== calcPerformance self cycles ==");

var result = calcPerformance(
	null,
	() => {},
	1000
);

console.log('calcPerformance() self =', result);
assert.ok(result > 50);

console.log();

// rdtsc self
console.log("== rdtsc self cycles ==");

var minCycles;

calcPerformance(
	null,
	() => {
		var cycles = -(rdtsc() - rdtsc());
		if (minCycles == null || cycles < minCycles) {
			minCycles = cycles;
		}
	},
	1000
);

console.log('rdtsc() self =', minCycles);
assert.ok(minCycles > 50);

console.log();

// rdtsc self 2
console.log("== rdtsc self cycles 2 ==");

var minCycles;

result = calcPerformance(
	() => {},
	() => {
		rdtsc();
	},
	1000
);

console.log('rdtsc() self 2 =', result);
assert.ok(result > 50);

console.log();

//calc Object.keys performance
console.log("== calc Object.keys performance ==");

var object = { x: 1 };
result = calcPerformance(
	() => {},
	() => {return Object.keys(object)},
	1000
);
console.log('Object.keys({ 1 item }) =', result);
assert.ok(result > 10);

console.log();
