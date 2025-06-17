import { setRdtscDefault } from '../rdtscDefault.mjs';
import { rdtscNative } from '../rdtscNative.mjs';
import '../binding/index.mjs';
import '../binding/binding.mjs';
import '../binding/import.cjs';
import '../runInRealtimePriority.mjs';

setRdtscDefault(rdtscNative);
