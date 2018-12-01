'use strict';
const assert = require('assert');
const bindingPath = require.resolve('./build/Release/binding');
const binding = require(bindingPath);
assert.ok(binding.rdtsc() > 0);
assert.ok(binding.rdtsc() - binding.rdtsc() < 0);
console.log('rdtsc() - rdtsc() =', binding.rdtsc() - binding.rdtsc());

// Test multiple loading of the same module.
delete require.cache[bindingPath];
const rebinding = require(bindingPath);
assert.ok(binding.rdtsc() > 0);
assert.ok(binding.rdtsc() - binding.rdtsc() < 0);
assert.notStrictEqual(binding.rdtsc, rebinding.rdtsc);

// calcPerformance
var x = Math.random();
var y = Math.random();

var result = binding.calcPerformance(
() => {

},
() => {
	Object.keys(Math);
},
1000);

console.log('(x + y) time =', result);

assert.ok(result > 5);
