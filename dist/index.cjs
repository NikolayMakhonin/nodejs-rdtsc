'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var binding_index = require('./binding/index.cjs');
var calcPerformance = require('./calcPerformance.cjs');
var calcPerformanceAsync = require('./calcPerformanceAsync2.cjs');
var runInRealtimePriority = require('./runInRealtimePriority.cjs');
var binding_binding = require('./binding/binding.cjs');
require('./binding/import.cjs');



exports.getProcessPriority = binding_index.getProcessPriority;
exports.getThreadPriority = binding_index.getThreadPriority;
exports.isWin = binding_index.isWin;
exports.rdtsc = binding_index.rdtsc;
exports.setProcessPriority = binding_index.setProcessPriority;
exports.setThreadPriority = binding_index.setThreadPriority;
exports.calcPerformance = calcPerformance.calcPerformance;
exports.calcPerformanceAsync = calcPerformanceAsync.calcPerformanceAsync;
exports.runInRealtimePriority = runInRealtimePriority.runInRealtimePriority;
Object.defineProperty(exports, 'ProcessPriority', {
	enumerable: true,
	get: function () { return binding_binding.ProcessPriority; }
});
Object.defineProperty(exports, 'ThreadPriority', {
	enumerable: true,
	get: function () { return binding_binding.ThreadPriority; }
});
