#ifdef _WIN32
#include <windows.h>
#endif

#include <node.h>
#include <v8.h>
#include "cycleclock.h"

using namespace v8;
using namespace benchmark::cycleclock;

namespace nodejsRdtsc{
	void rdtsc(const FunctionCallbackInfo<Value>& args) {
		args.GetReturnValue().Set(BigInt::New(args.GetIsolate(), Now()));
	}

	const uint64_t maxNumber = 0xffffffffffffffff;

	uint64_t cycles0;
	uint64_t *minCycles;
	int index;
	int count;

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

		minCycles = new uint64_t[count];
		std::fill(minCycles, minCycles + count, maxNumber);
	}

	inline void mark0(const FunctionCallbackInfo<Value>& args) {
		cycles0 = Now();
	}

	inline void mark1(const FunctionCallbackInfo<Value>& args) {
		uint64_t cycles = Now() - cycles0;
		uint64_t min = *(minCycles + index);
		if (cycles < min) {
			*(minCycles + index) = cycles;
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
			result->Set(context, i, BigInt::New(isolate, *(minCycles + i)));
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

		Isolate *isolate = exports->GetIsolate();

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
		auto isolate = context->GetIsolate();
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
