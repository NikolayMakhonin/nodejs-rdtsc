#ifdef _WIN32
#include <windows.h>
#endif

#include <node.h>
#include <v8.h>
#include <cstring>
#include <vector>
#include "cycleclock.h"

using namespace v8;
using namespace benchmark::cycleclock;

namespace nodejsRdtsc{
	void rdtsc(const FunctionCallbackInfo<Value>& args) {
		args.GetReturnValue().Set(BigInt::New(args.GetIsolate(), Now()));
	}

	const uint64_t maxNumber = 0xffffffffffffffff;

	// Each thread has its own copy of these variables (thread_local): worker threads load this same binding,
	// and their measurements must not overwrite each other
	thread_local uint64_t cycles0;
	thread_local std::vector<uint64_t> minCycles;
	thread_local int index;
	thread_local int count;
	// gcCycles: total cycles of all garbage collections in this thread. gcCycles0: its value at mark0, so that mark1
	// can subtract the collections that ran during the measured call
	thread_local uint64_t gcCycles;
	thread_local uint64_t gcCycles0;

	void addGcCallbacksOnce(Isolate* isolate);

	inline void init(const FunctionCallbackInfo<Value>& args) {
		Isolate* isolate = args.GetIsolate();

		// Check the number of arguments passed.
		if (args.Length() < 1) {
			// Throw an Error that is passed back to JavaScript
			isolate->ThrowException(Exception::TypeError(
				String::NewFromUtf8(isolate,
					"You must provide count arguments: init(int count)",
					NewStringType::kNormal).ToLocalChecked()));
			return;
		}

		count = args[0].As<Number>()->Value();
		index = 0;

		minCycles.assign(count, maxNumber);
		addGcCallbacksOnce(isolate);
	}

	inline void mark0(const FunctionCallbackInfo<Value>& args) {
		gcCycles0 = gcCycles;
		cycles0 = Now();
	}

	inline void mark1(const FunctionCallbackInfo<Value>& args) {
		// Subtracts the garbage collections that ran during the call, so that the result is the time of the call's own
		// code. calcPerformance measures the cost of garbage collection separately (timeGc)
		uint64_t cycles = Now() - cycles0 - (gcCycles - gcCycles0);
		if (cycles < minCycles[index]) {
			minCycles[index] = cycles;
		}
		index++;
		if (index >= count) {
			index = 0;
		}
	}

	void _minCycles(const FunctionCallbackInfo<Value>& args) {
		Isolate* isolate = args.GetIsolate();
		Local<Context> context = isolate->GetCurrentContext();

		Local<Array> result = Array::New(isolate, count);

		for (int i = 0; i < count; i++){
			result->Set(context, i, BigInt::New(isolate, minCycles[i]));
		}

		args.GetReturnValue().Set(result);
	}

	void setThreadPriority(const FunctionCallbackInfo<Value>& args) {
		Isolate* isolate = args.GetIsolate();

		// Check the number of arguments passed.
		if (args.Length() < 1) {
			// Throw an Error that is passed back to JavaScript
			isolate->ThrowException(Exception::TypeError(
				String::NewFromUtf8(isolate,
					"You must provide thread priority arguments: setThreadPriority(int)",
					NewStringType::kNormal).ToLocalChecked()));
			return;
		}

		#ifdef _WIN32
			int priority = args[0].As<Number>()->Value();
			int previousPriority = GetThreadPriority(GetCurrentThread());
			SetThreadPriority(GetCurrentThread(), priority);
			args.GetReturnValue().Set(Number::New(isolate, previousPriority));
		#endif
	}

	void getThreadPriority(const FunctionCallbackInfo<Value>& args) {
		Isolate* isolate = args.GetIsolate();

		#ifdef _WIN32
			int priority = GetThreadPriority(GetCurrentThread());
			args.GetReturnValue().Set(Number::New(isolate, priority));
		#endif
	}

	void setProcessPriority(const FunctionCallbackInfo<Value>& args) {
		Isolate* isolate = args.GetIsolate();

		// Check the number of arguments passed.
		if (args.Length() < 1) {
			// Throw an Error that is passed back to JavaScript
			isolate->ThrowException(Exception::TypeError(
				String::NewFromUtf8(isolate,
					"You must provide process priority arguments: setProcessPriority(int)",
					NewStringType::kNormal).ToLocalChecked()));
			return;
		}

		#ifdef _WIN32
			int priority = args[0].As<Number>()->Value();
			int previousPriority = GetPriorityClass(GetCurrentProcess());
			SetPriorityClass(GetCurrentProcess(), priority);
			args.GetReturnValue().Set(Number::New(isolate, previousPriority));
		#endif
	}

	void getProcessPriority(const FunctionCallbackInfo<Value>& args) {
		Isolate* isolate = args.GetIsolate();

		#ifdef _WIN32
			int priority = GetPriorityClass(GetCurrentProcess());
			args.GetReturnValue().Set(Number::New(isolate, priority));
		#endif
	}

	// Memory counters. New objects are created in the young generation, so its size grows with every allocation.
	// A garbage collection makes it smaller: it frees dead objects and moves some live ones to the old generation.
	// So the bytes allocated since some moment = the growth of the young generation + the bytes that collections
	// removed from it (youngTakenBytes). Like the variables above, these are per thread

	// The types of collections that the callbacks receive: all types except incremental marking and the processing
	// of weak callbacks, which are not collections by themselves. Written as "all except", because the name of
	// the minor mark-sweep type differs between V8 versions
	const GCType GC_TYPE_COLLECTIONS = static_cast<GCType>(
		kGCTypeAll & ~(kGCTypeIncrementalMarking | kGCTypeProcessWeakCallbacks));

	thread_local bool gcCallbacksAdded;
	// Indices of the two heap spaces of the young generation: new_space for new objects, and new_large_object_space
	// for new objects too large for a normal page; -1 until found. All other spaces belong to the old generation
	// or hold V8's own data, such as compiled code
	thread_local int newSpaceIndex = -1;
	thread_local int newLargeObjectSpaceIndex = -1;
	// Totals since the callbacks were added: the bytes that collections removed from the young generation, the bytes
	// that young collections moved from it to the old generation, the number of full collections, and the cycles
	// of the last collection
	thread_local double youngTakenBytes;
	thread_local double youngPromotedBytes;
	thread_local double fullGcCount;
	thread_local uint64_t gcLastCycles;
	// Set by completeSweeping, cleared by every full collection. False at the start, because a full collection can run
	// before the callbacks are added
	thread_local bool isSweepingCompleted;
	// Set by gcEpilogue after a young collection other than the scavenger; bytesMark throws then
	thread_local bool isYoungCollectorUnsupported;
	// Saved by gcPrologue before a collection, for gcEpilogue after it
	thread_local double youngUsedBytesBeforeGc;
	thread_local double heapUsedBytesBeforeGc;
	thread_local uint64_t gcStartCycles;
	// Saved by bytesMark; the ...SinceMark functions subtract them
	thread_local double allocatedBytesMarkValue;
	thread_local double promotedBytesMarkValue;
	thread_local double allocatedInOldGenerationBytesMarkValue;

	inline double getHeapUsedBytes(Isolate* isolate) {
		HeapStatistics statistics;
		isolate->GetHeapStatistics(&statistics);
		return static_cast<double>(statistics.used_heap_size());
	}

	inline double getSpaceUsedBytes(Isolate* isolate, int spaceIndex) {
		HeapSpaceStatistics statistics;
		isolate->GetHeapSpaceStatistics(&statistics, spaceIndex);
		return static_cast<double>(statistics.space_used_size());
	}

	inline double getYoungUsedBytes(Isolate* isolate) {
		return getSpaceUsedBytes(isolate, newSpaceIndex) + getSpaceUsedBytes(isolate, newLargeObjectSpaceIndex);
	}

	void gcPrologue(Isolate* isolate, GCType type, GCCallbackFlags flags, void* data) {
		// Read first: reading the heap statistics below also takes time, and mark1 must subtract that time
		// from the call too
		gcStartCycles = Now();
		youngUsedBytesBeforeGc = getYoungUsedBytes(isolate);
		heapUsedBytesBeforeGc = getHeapUsedBytes(isolate);
	}

	void gcEpilogue(Isolate* isolate, GCType type, GCCallbackFlags flags, void* data) {
		double youngUsedBytes = getYoungUsedBytes(isolate);
		youngTakenBytes += youngUsedBytesBeforeGc - youngUsedBytes;
		if (type == kGCTypeMarkSweepCompact) {
			fullGcCount++;
			isSweepingCompleted = false;
		}
		else {
			// The counters model the scavenger. Under the young mark-sweep of V8 (--minor-ms), by measurement, the
			// uncollected bytes read 0 for kept arrays, and new_space has no two halves for youngGenerationCapacity
			if (type != kGCTypeScavenge) {
				isYoungCollectorUnsupported = true;
			}
			// A young collection frees nothing in the old generation, so the growth of the old generation is the bytes
			// that this collection moved there. Until completeSweeping runs after a full collection, the growth also
			// holds corrections of V8's count of the old generation
			youngPromotedBytes += getHeapUsedBytes(isolate) - youngUsedBytes
				- (heapUsedBytesBeforeGc - youngUsedBytesBeforeGc);
		}
		gcLastCycles = Now() - gcStartCycles;
		gcCycles += gcLastCycles;
	}

	// An index stays -1 if V8 has no space with this name
	void findYoungGenerationSpaces(Isolate* isolate) {
		for (size_t i = 0; i < isolate->NumberOfHeapSpaces(); i++) {
			HeapSpaceStatistics statistics;
			isolate->GetHeapSpaceStatistics(&statistics, i);
			if (strcmp(statistics.space_name(), "new_space") == 0) {
				newSpaceIndex = static_cast<int>(i);
			}
			else if (strcmp(statistics.space_name(), "new_large_object_space") == 0) {
				newLargeObjectSpaceIndex = static_cast<int>(i);
			}
		}
	}

	// Adds the callbacks once per thread. init calls it, so that mark1 can subtract collections; addGcCallbacks
	// calls it, so that the memory counters work before the first init
	void addGcCallbacksOnce(Isolate* isolate) {
		if (gcCallbacksAdded) {
			return;
		}
		findYoungGenerationSpaces(isolate);
		isolate->AddGCPrologueCallback(gcPrologue, nullptr, GC_TYPE_COLLECTIONS);
		isolate->AddGCEpilogueCallback(gcEpilogue, nullptr, GC_TYPE_COLLECTIONS);
		gcCallbacksAdded = true;
	}

	void addGcCallbacks(const FunctionCallbackInfo<Value>& args) {
		Isolate* isolate = args.GetIsolate();
		addGcCallbacksOnce(isolate);
		// Without these spaces the byte counters would read 0
		if (newSpaceIndex < 0 || newLargeObjectSpaceIndex < 0) {
			isolate->ThrowException(Exception::Error(
				String::NewFromUtf8(isolate,
					"[addGcCallbacks] V8 has no new_space or new_large_object_space",
					NewStringType::kNormal).ToLocalChecked()));
		}
	}

	inline double getAllocatedBytes(Isolate* isolate) {
		return getYoungUsedBytes(isolate) + youngTakenBytes;
	}

	// Bytes allocated directly in the old generation. The old generation grows in two ways: young collections move
	// objects there (youngPromotedBytes), and V8 creates some new objects there directly. Subtracting the first
	// leaves the second
	inline double getAllocatedInOldGenerationBytes(Isolate* isolate) {
		return getHeapUsedBytes(isolate) - getYoungUsedBytes(isolate) - youngPromotedBytes;
	}

	// Completes the sweeping that a full collection started, so that V8 corrects its count of the old generation now,
	// not during a check. A full collection counts on each page of the old generation the bytes that marking found
	// alive, and sweeps the pages later. Objects that shrink after marking, such as trimmed arrays, keep their old size
	// in this count. V8 corrects the count of a swept page when it moves the page into a free list, and a young
	// collection does this when it needs memory for the objects that it moves to the old generation. Then
	// youngPromotedBytes grew by less than the collection moved, by up to 3.7 KB, by measurement
	// see: https://github.com/nodejs/node/blob/v22.22.2/deps/v8/src/heap/paged-spaces.cc#L601-L626
	// see: https://github.com/nodejs/node/blob/v22.22.2/deps/v8/src/heap/main-allocator.cc#L657-L676
	inline void completeSweeping(Isolate* isolate) {
		if (isSweepingCompleted) {
			return;
		}
		// V8 has no function that only completes the sweeping. This one completes it, because it makes the heap
		// iterable before it collects its statistics. It also walks the old generation, so it runs once per full
		// collection
		// see: https://github.com/nodejs/node/blob/v22.22.2/deps/v8/src/heap/heap.cc#L4347-L4359
		HeapCodeStatistics statistics;
		isolate->GetHeapCodeAndMetadataStatistics(&statistics);
		isSweepingCompleted = true;
	}

	inline void bytesMark(const FunctionCallbackInfo<Value>& args) {
		Isolate* isolate = args.GetIsolate();
		if (isYoungCollectorUnsupported) {
			isolate->ThrowException(Exception::Error(
				String::NewFromUtf8(isolate,
					"[bytesMark] V8 collected the young generation by its young mark-sweep, as with --minor-ms;"
					" the byte counters support exclusively the scavenger",
					NewStringType::kNormal).ToLocalChecked()));
			return;
		}
		completeSweeping(isolate);
		allocatedBytesMarkValue = getAllocatedBytes(isolate);
		promotedBytesMarkValue = youngPromotedBytes;
		allocatedInOldGenerationBytesMarkValue = getAllocatedInOldGenerationBytes(isolate);
	}

	// These return small integers (below 2^30). V8 passes such an integer to JavaScript without creating an object,
	// so reading a counter allocates nothing and does not change the counters
	inline void allocatedBytesSinceMark(const FunctionCallbackInfo<Value>& args) {
		args.GetReturnValue().Set(getAllocatedBytes(args.GetIsolate()) - allocatedBytesMarkValue);
	}

	inline void promotedBytesSinceMark(const FunctionCallbackInfo<Value>& args) {
		args.GetReturnValue().Set(youngPromotedBytes - promotedBytesMarkValue);
	}

	inline void allocatedInOldGenerationBytesSinceMark(const FunctionCallbackInfo<Value>& args) {
		args.GetReturnValue().Set(getAllocatedInOldGenerationBytes(args.GetIsolate()) - allocatedInOldGenerationBytesMarkValue);
	}

	void youngGenerationCapacity(const FunctionCallbackInfo<Value>& args) {
		HeapSpaceStatistics statistics;
		args.GetIsolate()->GetHeapSpaceStatistics(&statistics, newSpaceIndex);
		// new_space has two halves: new objects fill one half, and a young collection copies the live objects into
		// the other. So a young collection starts when half of new_space is full
		args.GetReturnValue().Set(static_cast<double>(statistics.space_size() / 2));
	}

	void _gcLastCycles(const FunctionCallbackInfo<Value>& args) {
		args.GetReturnValue().Set(static_cast<double>(gcLastCycles));
	}

	void _fullGcCount(const FunctionCallbackInfo<Value>& args) {
		args.GetReturnValue().Set(fullGcCount);
	}

	// Not using the full NODE_MODULE_INIT() macro here because we want to test the
	// addon loader's reaction to the FakeInit() entry point below.
	extern "C" NODE_MODULE_EXPORT void
	NODE_MODULE_INITIALIZER(
		Local<Object> exports,
		Local<Value> module,
		Local<Context> context
	) {
		NODE_SET_METHOD(exports, "rdtsc", rdtsc);
		NODE_SET_METHOD(exports, "init", init);
		NODE_SET_METHOD(exports, "mark0", mark0);
		NODE_SET_METHOD(exports, "mark1", mark1);
		NODE_SET_METHOD(exports, "minCycles", _minCycles);
		NODE_SET_METHOD(exports, "setThreadPriority", setThreadPriority);
		NODE_SET_METHOD(exports, "getThreadPriority", getThreadPriority);
		NODE_SET_METHOD(exports, "setProcessPriority", setProcessPriority);
		NODE_SET_METHOD(exports, "getProcessPriority", getProcessPriority);
		NODE_SET_METHOD(exports, "addGcCallbacks", addGcCallbacks);
		NODE_SET_METHOD(exports, "bytesMark", bytesMark);
		NODE_SET_METHOD(exports, "allocatedBytesSinceMark", allocatedBytesSinceMark);
		NODE_SET_METHOD(exports, "youngGenerationCapacity", youngGenerationCapacity);
		NODE_SET_METHOD(exports, "gcLastCycles", _gcLastCycles);
		NODE_SET_METHOD(exports, "promotedBytesSinceMark", promotedBytesSinceMark);
		NODE_SET_METHOD(exports, "allocatedInOldGenerationBytesSinceMark", allocatedInOldGenerationBytesSinceMark);
		NODE_SET_METHOD(exports, "fullGcCount", _fullGcCount);

		// V8 14 of Node 26 removed Object::GetIsolate and Context::GetIsolate; node.h takes the isolate this way too
		Isolate *isolate = Isolate::GetCurrent();

		#ifdef _WIN32
			bool isWin = true;
		#else
			bool isWin = false;
		#endif

		exports->Set(context, String::NewFromUtf8(isolate, "isWin", NewStringType::kNormal).ToLocalChecked(), Boolean::New(isolate, isWin));
	}

	static void FakeInit(
		Local<Object> exports,
		Local<Value> module,
		Local<Context> context
	) {
		auto isolate = Isolate::GetCurrent();
		auto exception = Exception::Error(String::NewFromUtf8(isolate,
			"FakeInit should never run!", NewStringType::kNormal)
				.ToLocalChecked());
		isolate->ThrowException(exception);
	}

	// Define a Node.js module, but with the wrong version. Node.js should still be
	// able to load this module, multiple times even, because it exposes the
	// specially named initializer above.
	#undef NODE_MODULE_VERSION
	#define NODE_MODULE_VERSION 3
	NODE_MODULE(NODE_GYP_MODULE_NAME, FakeInit)
}
