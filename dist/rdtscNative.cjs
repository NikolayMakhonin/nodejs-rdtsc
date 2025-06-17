'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var binding_index = require('./binding/index.cjs');
var runInRealtimePriority = require('./runInRealtimePriority.cjs');
require('./binding/binding.cjs');
require('./binding/import.cjs');

const rdtscNative = {
    init: binding_index.init,
    mark0: binding_index.mark0,
    mark1: binding_index.mark1,
    minCycles: binding_index.minCycles,
    rdtsc: binding_index.rdtsc,
    runInRealtimePriority: runInRealtimePriority.runInRealtimePriority,
};

exports.rdtscNative = rdtscNative;
