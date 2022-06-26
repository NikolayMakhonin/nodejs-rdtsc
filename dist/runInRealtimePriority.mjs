import { isWin, getThreadPriority, getProcessPriority, setProcessPriority, setThreadPriority } from './binding/index.mjs';
import { ProcessPriority, ThreadPriority } from './binding/binding.mjs';
import './binding/import.cjs';

function runInRealtimePriority(func) {
    if (!isWin) {
        return func();
    }
    const previousThreadPriority = getThreadPriority();
    const previousProcessPriority = getProcessPriority();
    function _finally() {
        setProcessPriority(previousProcessPriority);
        setThreadPriority(previousThreadPriority);
    }
    try {
        setProcessPriority(ProcessPriority.Realtime);
        setThreadPriority(ThreadPriority.Realtime);
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

export { runInRealtimePriority };
