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

using namespace v8;

void rdtsc(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  args.GetReturnValue().Set(BigInt::New(isolate, __rdtsc()));
}

static unsigned __int64 cycles0;

void rdtsc0(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();
  cycles0 = __rdtsc();
}

void rdtsc1(const FunctionCallbackInfo<Value>& args) {
  unsigned __int64 cycles = __rdtsc() - cycles0;
  Isolate* isolate = args.GetIsolate();
  args.GetReturnValue().Set(BigInt::New(isolate, cycles));
}

void isWin(const FunctionCallbackInfo<Value>& args) {
  Isolate* isolate = args.GetIsolate();

  bool isWin = false;
  
  #ifdef _WIN32
  isWin = true;
  #endif
  
  args.GetReturnValue().Set(Boolean::New(isolate, isWin));
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
NODE_MODULE_INITIALIZER(Local<Object> exports,
                        Local<Value> module,
                        Local<Context> context) {
  NODE_SET_METHOD(exports, "rdtsc", rdtsc);
  NODE_SET_METHOD(exports, "rdtsc0", rdtsc0);
  NODE_SET_METHOD(exports, "rdtsc1", rdtsc1);
  NODE_SET_METHOD(exports, "setThreadPriority", setThreadPriority);
  NODE_SET_METHOD(exports, "getThreadPriority", getThreadPriority);
  NODE_SET_METHOD(exports, "setProcessPriority", setProcessPriority);
  NODE_SET_METHOD(exports, "getProcessPriority", getProcessPriority);
  NODE_SET_METHOD(exports, "isWin", isWin);
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
