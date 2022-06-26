import binding from './import.cjs';
export { default } from './import.cjs';

/* eslint-disable @typescript-eslint/no-var-requires */
var ThreadPriority;
(function (ThreadPriority) {
    ThreadPriority[ThreadPriority["Idle"] = -15] = "Idle";
    ThreadPriority[ThreadPriority["Lowest"] = -2] = "Lowest";
    ThreadPriority[ThreadPriority["BelowNormal"] = -1] = "BelowNormal";
    ThreadPriority[ThreadPriority["Normal"] = 0] = "Normal";
    ThreadPriority[ThreadPriority["AboveNormal"] = 1] = "AboveNormal";
    ThreadPriority[ThreadPriority["Highest"] = 2] = "Highest";
    ThreadPriority[ThreadPriority["Realtime"] = 15] = "Realtime";
})(ThreadPriority || (ThreadPriority = {}));
var ProcessPriority;
(function (ProcessPriority) {
    ProcessPriority[ProcessPriority["Idle"] = 64] = "Idle";
    ProcessPriority[ProcessPriority["BelowNormal"] = 16384] = "BelowNormal";
    ProcessPriority[ProcessPriority["Normal"] = 32] = "Normal";
    ProcessPriority[ProcessPriority["AboveNormal"] = 32768] = "AboveNormal";
    ProcessPriority[ProcessPriority["Highest"] = 128] = "Highest";
    ProcessPriority[ProcessPriority["Realtime"] = 256] = "Realtime";
})(ProcessPriority || (ProcessPriority = {}));

export { ProcessPriority, ThreadPriority };
