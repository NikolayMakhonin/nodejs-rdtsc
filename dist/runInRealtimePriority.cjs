'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var binding_index = require('./binding/index.cjs');
var binding_binding = require('./binding/binding.cjs');
require('./binding/import.cjs');

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

exports.runInRealtimePriority = runInRealtimePriority;
