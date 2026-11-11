6.0.1 / 2026-11-11
===================

* Fixed: a young collection that made the old generation smaller threw from every function that reads the byte counters, also on Node 22, while V8 frees the unused rest of the allocation buffers of its background threads during a collection
* The memory measurement keeps of each byte count the smallest value that two checks of a function in a row read, so a single disturbed check no longer sets the result; it throws for a function whose checks read no value twice in a row in 20 checks

6.0.0 / 2026-11-10
===================

* Breaking: `calcPerformance` and `calcPerformanceAsync` require `timeGc`: `null` measures no garbage collection, a number of milliseconds measures it after the loop of the cycles
* Breaking: the result holds `cycles` (`values`, `absoluteDiff`, `relativeDiff`) instead of top-level arrays, and `gc`: logic and memory cycles, `allocatedBytes`, `uncollectedBytes`, `allocatedInOldGenerationBytes`, `cyclesPerByte`; `null` with `timeGc: null`
* Added `isGcToolsSupported`
* The cycles of a call leave out the garbage collections during it
* Throws at every situation that would give wrong numbers: unexpected collections, a priority below high for the process or below realtime for the thread, invalid arguments, no default counter
* Fixed: the priority was restored before an async function finished, overlapping async calls left the realtime priority, the browser fallback kept the first call instead of the minimum, the clock was read on every iteration
* Per-thread state of the native counter, safe in worker threads
* Requires Node 22.22.2 or later; verified on Node 22 on Linux, Windows, and macOS, each on x64 and arm64
* Entries `rdtsc`, `rdtsc/node`, `rdtsc/browser` as ES modules and CommonJS, built by vite; no runtime dependencies

5.0.0 / 2025-06-17
===================

* Added `rdtscJs`, the browser fallback, and `rdtscNative`
* `calcPerformance` takes the counter by its `rdtsc` argument

4.0.0 / 2025-06-04
===================

* Supports Node 20

3.0.0 / 2022-06-26
===================

* Big refactoring
* Added TypeScript definitions
* Added async functions
* Improved tests

2.0.0 / 2018-12-12
===================

* Support node v12.4.0
* Tested on node v10.9.0 - v12.10.0

1.3.1 / 2018-12-12
===================

  * calcPerformance function can evaluate performance of many functions

1.2.2 / 2018-12-03
===================

  * Improved calcPerformance function
  * Removed dependencies

1.2.1 / 2018-12-03
===================

  * Removed rdtsc0, rdtsc1 functions
  * Improved calcPerformance function

1.1.7 / 2018-12-03
===================

  * Changed minimal node version to 10.9.0

1.1.4 / 2018-12-03
===================

  * Improved code quality

1.1.2 / 2018-12-02
===================

  * Fix int64 type for support not windows platforms

1.1.1 / 2018-12-02
===================

  * Change license to CC0-1.0

1.1.0 / 2018-12-02
===================

  * Added function: rdtsc0, rdtsc1 for better quality resolution. Examlpe to use: rdtsc0();func();cycles=rdtsc1();
  * Improved calcPerformance function

1.0.6 / 2018-12-02
===================

  * Added function: runInRealtimePriority
  
1.0.3 / 2018-12-02
===================

  * Added functions: setProcessPriority, getProcessPriority
  * Improved calcPerformance function
  
1.0.1 / 2018-12-02
===================

  * Added functions: setThreadPriority, getThreadPriority
  * Improved calcPerformance function