'use strict';

Object.defineProperty(exports, '__esModule', { value: true });

var rdtscDefault = require('../rdtscDefault.cjs');
var rdtscJs = require('../rdtscJs.cjs');
var calcPerformance = require('../calcPerformance.cjs');
var calcPerformanceAsync = require('../calcPerformanceAsync2.cjs');

rdtscDefault.setRdtscDefault(rdtscJs.rdtscJs);

exports.rdtscJs = rdtscJs.rdtscJs;
exports.calcPerformance = calcPerformance.calcPerformance;
exports.calcPerformanceAsync = calcPerformanceAsync.calcPerformanceAsync;
