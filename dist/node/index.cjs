'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var rdtscDefault = require('../rdtscDefault.cjs');
var rdtscNative = require('../rdtscNative.cjs');
var calcPerformance = require('../calcPerformance.cjs');
var calcPerformanceAsync = require('../calcPerformanceAsync2.cjs');
var rdtscJs = require('../rdtscJs.cjs');
var binding_index = require('../binding/index.cjs');
var runInRealtimePriority = require('../runInRealtimePriority.cjs');
var binding_binding = require('../binding/binding.cjs');
require('../binding/import.cjs');

rdtscDefault.setRdtscDefault(rdtscNative.rdtscNative);

exports.calcPerformance = calcPerformance.calcPerformance;
exports.calcPerformanceAsync = calcPerformanceAsync.calcPerformanceAsync;
exports.rdtscJs = rdtscJs.rdtscJs;
exports.getProcessPriority = binding_index.getProcessPriority;
exports.getThreadPriority = binding_index.getThreadPriority;
exports.isWin = binding_index.isWin;
exports.rdtsc = binding_index.rdtsc;
exports.setProcessPriority = binding_index.setProcessPriority;
exports.setThreadPriority = binding_index.setThreadPriority;
exports.runInRealtimePriority = runInRealtimePriority.runInRealtimePriority;
Object.defineProperty(exports, 'ProcessPriority', {
	enumerable: true,
	get: function () { return binding_binding.ProcessPriority; }
});
Object.defineProperty(exports, 'ThreadPriority', {
	enumerable: true,
	get: function () { return binding_binding.ThreadPriority; }
});
