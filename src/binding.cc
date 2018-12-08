#ifdef _WIN32
#include <windows.h>
#endif

#include <node.h>
#include <v8.h>
#include "cycleclock.h"

using namespace v8;
using namespace benchmark::cycleclock;

void rdtsc(const FunctionCallbackInfo<Value>& args) {
	args.GetReturnValue().Set(BigInt::New(args.GetIsolate(), Now()));
}

uint64_t cycles_;
uint64_t minCycles0;
uint64_t minCycles1;
uint64_t maxNumber = 0xffffffffffffffff;

inline void init(const FunctionCallbackInfo<Value>& args) {
	minCycles0 = maxNumber;
	minCycles1 = maxNumber;
}

inline void mark0(const FunctionCallbackInfo<Value>& args) {
	cycles_ = Now();
}

inline void mark1(const FunctionCallbackInfo<Value>& args) {
	uint64_t cycles0 = Now() - cycles_;
	if (cycles0 < minCycles0) {
		minCycles0 = cycles0;
	}
	cycles_ = Now();
}

inline void mark2(const FunctionCallbackInfo<Value>& args) {
	uint64_t cycles1 = Now() - cycles_;
	if (cycles1 < minCycles1) {
		minCycles1 = cycles1;
	}
	cycles_ = Now();
}

void minCycles(const FunctionCallbackInfo<Value>& args) {
	int64_t cycles = minCycles1 == maxNumber ? minCycles0 : minCycles1 - minCycles0;
	args.GetReturnValue().Set(Number::New(args.GetIsolate(), cycles));
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
		
	Local<Context> context = isolate->GetCurrentContext();
	int priority = args[0].As<Number>()->Value();

	#ifdef _WIN32
		int previousPriority = GetThreadPriority(GetCurrentThread());
		SetThreadPriority(GetCurrentThread(), priority);
		args.GetReturnValue().Set(Number::New(isolate, previousPriority));
	#endif
}

void getThreadPriority(const FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = args.GetIsolate();

	Local<Context> context = isolate->GetCurrentContext();

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

	Local<Context> context = isolate->GetCurrentContext();
	int priority = args[0].As<Number>()->Value();

	#ifdef _WIN32
		int previousPriority = GetPriorityClass(GetCurrentProcess());
		SetPriorityClass(GetCurrentProcess(), priority);
		args.GetReturnValue().Set(Number::New(isolate, previousPriority));
	#endif
}

void getProcessPriority(const FunctionCallbackInfo<Value>& args) {
	Isolate* isolate = args.GetIsolate();

	Local<Context> context = isolate->GetCurrentContext();

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
	NODE_SET_METHOD(exports, "mark2", mark2);
	NODE_SET_METHOD(exports, "minCycles", minCycles);
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
	
	exports->Set(String::NewFromUtf8(isolate,"isWin"), Boolean::New(isolate,isWin));
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
