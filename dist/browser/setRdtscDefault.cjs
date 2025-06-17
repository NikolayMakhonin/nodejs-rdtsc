'use strict';

var rdtscDefault = require('../rdtscDefault.cjs');
var rdtscJs = require('../rdtscJs.cjs');

rdtscDefault.setRdtscDefault(rdtscJs.rdtscJs);
