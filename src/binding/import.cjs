'use strict'

// eslint-disable-next-line node/no-unpublished-require -- npm publishes binding.gyp and src/binding instead of build, and the install script compiles build/Release/binding.node from them on every install
module.exports = require('../../build/Release/binding.node')
