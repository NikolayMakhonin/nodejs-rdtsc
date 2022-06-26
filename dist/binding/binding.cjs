'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var binding = require('./import.cjs');

function _interopDefaultLegacy (e) { return e && typeof e === 'object' && 'default' in e ? e : { 'default': e }; }

var binding__default = /*#__PURE__*/_interopDefaultLegacy(binding);

/* eslint-disable @typescript-eslint/no-var-requires */
exports.ThreadPriority = void 0;
(function (ThreadPriority) {
    ThreadPriority[ThreadPriority["Idle"] = -15] = "Idle";
    ThreadPriority[ThreadPriority["Lowest"] = -2] = "Lowest";
    ThreadPriority[ThreadPriority["BelowNormal"] = -1] = "BelowNormal";
    ThreadPriority[ThreadPriority["Normal"] = 0] = "Normal";
    ThreadPriority[ThreadPriority["AboveNormal"] = 1] = "AboveNormal";
    ThreadPriority[ThreadPriority["Highest"] = 2] = "Highest";
    ThreadPriority[ThreadPriority["Realtime"] = 15] = "Realtime";
})(exports.ThreadPriority || (exports.ThreadPriority = {}));
exports.ProcessPriority = void 0;
(function (ProcessPriority) {
    ProcessPriority[ProcessPriority["Idle"] = 64] = "Idle";
    ProcessPriority[ProcessPriority["BelowNormal"] = 16384] = "BelowNormal";
    ProcessPriority[ProcessPriority["Normal"] = 32] = "Normal";
    ProcessPriority[ProcessPriority["AboveNormal"] = 32768] = "AboveNormal";
    ProcessPriority[ProcessPriority["Highest"] = 128] = "Highest";
    ProcessPriority[ProcessPriority["Realtime"] = 256] = "Realtime";
})(exports.ProcessPriority || (exports.ProcessPriority = {}));

Object.defineProperty(exports, 'default', {
    enumerable: true,
    get: function () { return binding__default["default"]; }
});
