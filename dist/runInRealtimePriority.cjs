'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var binding_index = require('./binding/index.cjs');
var binding_binding = require('./binding/binding.cjs');
require('./binding/import.cjs');

function threadPriorityToString(priority) {
    switch (priority) {
        case binding_binding.ThreadPriority.Idle: return 'Idle';
        case binding_binding.ThreadPriority.Lowest: return 'Lowest';
        case binding_binding.ThreadPriority.BelowNormal: return 'BelowNormal';
        case binding_binding.ThreadPriority.Normal: return 'Normal';
        case binding_binding.ThreadPriority.AboveNormal: return 'AboveNormal';
        case binding_binding.ThreadPriority.Highest: return 'Highest';
        case binding_binding.ThreadPriority.Realtime: return 'Realtime';
        default: return `Unknown(${priority})`;
    }
}
function processPriorityToString(priority) {
    switch (priority) {
        case binding_binding.ProcessPriority.Idle: return 'Idle';
        case binding_binding.ProcessPriority.BelowNormal: return 'BelowNormal';
        case binding_binding.ProcessPriority.Normal: return 'Normal';
        case binding_binding.ProcessPriority.AboveNormal: return 'AboveNormal';
        case binding_binding.ProcessPriority.Highest: return 'Highest';
        case binding_binding.ProcessPriority.Realtime: return 'Realtime';
        default: return `Unknown(${priority})`;
    }
}
function runInRealtimePriority(func) {
    if (!binding_index.isWin) {
        return func();
    }
    const previousThreadPriority = binding_index.getThreadPriority();
    const previousProcessPriority = binding_index.getProcessPriority();
    function _finally() {
        binding_index.setProcessPriority(previousProcessPriority);
        binding_index.setThreadPriority(previousThreadPriority);
    }
    try {
        binding_index.setProcessPriority(binding_binding.ProcessPriority.Realtime);
        binding_index.setThreadPriority(binding_binding.ThreadPriority.Realtime);
        const threadPriority = binding_index.getThreadPriority();
        const processPriority = binding_index.getProcessPriority();
        if (threadPriority !== binding_binding.ThreadPriority.Realtime || processPriority !== binding_binding.ProcessPriority.Realtime) {
            console.warn(`Failed to set realtime priority: process=${processPriorityToString(processPriority)}, thread=${threadPriorityToString(threadPriority)}`);
        }
        const result = func();
        if (result != null && typeof result === 'object' && typeof result.then === 'function') {
            return result.then(o => {
                _finally();
                return o;
            }, (err) => {
                _finally();
                throw err;
            });
        }
        return result;
    }
    finally {
        _finally();
    }
}

exports.processPriorityToString = processPriorityToString;
exports.runInRealtimePriority = runInRealtimePriority;
exports.threadPriorityToString = threadPriorityToString;
