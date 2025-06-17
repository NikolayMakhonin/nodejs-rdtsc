'use strict';

var rdtscDefault = require('../rdtscDefault.cjs');
var rdtscNative = require('../rdtscNative.cjs');
require('../binding/index.cjs');
require('../binding/binding.cjs');
require('../binding/import.cjs');
require('../runInRealtimePriority.cjs');

rdtscDefault.setRdtscDefault(rdtscNative.rdtscNative);
