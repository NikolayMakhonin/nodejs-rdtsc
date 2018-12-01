#if V8_OS_POSIX
#include <unistd.h>
#endif

#if V8_OS_MACOSX
#include <pthread.h>
#endif

#ifdef _WIN32
#include <windows.h>
#endif

#include <chrono>
#include <node.h>
#include <v8.h>

// simulation of Windows GetTickCount()
unsigned long long getTickCount()
{
    using namespace std::chrono;
    return duration_cast<milliseconds>(steady_clock::now().time_since_epoch()).count();
}

using namespace v8;

void rdtsc(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  Handle<Function> func1 = Handle<Function>::Cast(args[2]);
  args.GetReturnValue().Set(BigInt::New(isolate, __rdtsc()));
}

void calcPerformance(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  // Check the number of arguments passed.
  if (args.Length() < 3) {
    // Throw an Error that is passed back to JavaScript
    isolate->ThrowException(Exception::TypeError(
        String::NewFromUtf8(isolate,
                            "You must provide arguments: calcPerformance(func0, func1, iterations)",
                            NewStringType::kNormal).ToLocalChecked()));
    return;
  }
  
  Local<Context> context = isolate->GetCurrentContext();
  Local<Function> func0 = Local<Function>::Cast(args[0]);
  Local<Function> func1 = Local<Function>::Cast(args[1]);
  int testTime = args[2].As<Number>()->Value();

  #ifdef _WIN32
  // Increase the thread priority to reduces the chances of having a context
  // switch during a reading of the TSC and the performance counter.
  int previous_priority = GetThreadPriority(GetCurrentThread());
  SetThreadPriority(GetCurrentThread(), THREAD_PRIORITY_HIGHEST);
  #endif
  
  unsigned __int64 minCycles0 = 0;
  unsigned __int64 minCycles1 = 0;
  unsigned long startTime = getTickCount();
  int i = 0;
  do {
	  if (i % 2) {
		  unsigned __int64 cycles0 = __rdtsc();
		  func0->Call(context, Null(isolate), 0, NULL).ToLocalChecked();
		  cycles0 = __rdtsc() - cycles0;

		  if (i <= 1 || cycles0 < minCycles0) {
			  minCycles0 = cycles0;
		  }
	  } else {
		  unsigned __int64 cycles1 = __rdtsc();
		  func1->Call(context, Null(isolate), 0, NULL).ToLocalChecked();
		  cycles1 = __rdtsc() - cycles1;

		  if (i <= 1 || cycles1 < minCycles1) {
			  minCycles1 = cycles1;
		  }
	  }
	  
	  i++;
  } while (getTickCount() - startTime < testTime);

  #ifdef _WIN32
  // Reset the thread priority.
  SetThreadPriority(GetCurrentThread(), previous_priority);
  #endif
  
  args.GetReturnValue().Set(BigInt::New(isolate, minCycles1 - minCycles0));
}

// Not using the full NODE_MODULE_INIT() macro here because we want to test the
// addon loader's reaction to the FakeInit() entry point below.
extern "C" NODE_MODULE_EXPORT void
NODE_MODULE_INITIALIZER(Local<Object> exports,
                        Local<Value> module,
                        Local<Context> context) {
  NODE_SET_METHOD(exports, "rdtsc", rdtsc);
  NODE_SET_METHOD(exports, "calcPerformance", calcPerformance);
}

static void FakeInit(Local<Object> exports,
                     Local<Value> module,
                     Local<Context> context) {
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
