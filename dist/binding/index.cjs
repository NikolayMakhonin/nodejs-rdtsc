'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var binding_binding = require('./binding.cjs');
var binding = require('./import.cjs');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var binding__default = /*#__PURE__*/_interopDefaultLegacy(binding);

const { init, mark0, mark1, minCycles, rdtsc, setThreadPriority, getThreadPriority, setProcessPriority, getProcessPriority, isWin, } = binding__default["default"];

Object.defineProperty(exports, 'ProcessPriority', {
	enumerable: true,
	get: function () { return binding_binding.ProcessPriority; }
});
Object.defineProperty(exports, 'ThreadPriority', {
	enumerable: true,
	get: function () { return binding_binding.ThreadPriority; }
});
exports.getProcessPriority = getProcessPriority;
exports.getThreadPriority = getThreadPriority;
exports.init = init;
exports.isWin = isWin;
exports.mark0 = mark0;
exports.mark1 = mark1;
exports.minCycles = minCycles;
exports.rdtsc = rdtsc;
exports.setProcessPriority = setProcessPriority;
exports.setThreadPriority = setThreadPriority;
