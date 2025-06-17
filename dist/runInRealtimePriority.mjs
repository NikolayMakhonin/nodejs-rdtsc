import { isWin, getThreadPriority, getProcessPriority, setProcessPriority, setThreadPriority } from './binding/index.mjs';
import { ThreadPriority, ProcessPriority } from './binding/binding.mjs';
import './binding/import.cjs';

function threadPriorityToString(priority) {
    switch (priority) {
        case ThreadPriority.Idle: return 'Idle';
        case ThreadPriority.Lowest: return 'Lowest';
        case ThreadPriority.BelowNormal: return 'BelowNormal';
        case ThreadPriority.Normal: return 'Normal';
        case ThreadPriority.AboveNormal: return 'AboveNormal';
        case ThreadPriority.Highest: return 'Highest';
        case ThreadPriority.Realtime: return 'Realtime';
        default: return `Unknown(${priority})`;
    }
}
function processPriorityToString(priority) {
    switch (priority) {
        case ProcessPriority.Idle: return 'Idle';
        case ProcessPriority.BelowNormal: return 'BelowNormal';
        case ProcessPriority.Normal: return 'Normal';
        case ProcessPriority.AboveNormal: return 'AboveNormal';
        case ProcessPriority.Highest: return 'Highest';
        case ProcessPriority.Realtime: return 'Realtime';
        default: return `Unknown(${priority})`;
    }
}
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
        const threadPriority = getThreadPriority();
        const processPriority = getProcessPriority();
        if (threadPriority !== ThreadPriority.Realtime || processPriority !== ProcessPriority.Realtime) {
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

export { processPriorityToString, runInRealtimePriority, threadPriorityToString };
