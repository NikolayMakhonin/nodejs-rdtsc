import { setRdtscDefault } from '../rdtscDefault.mjs';
import { rdtscJs } from '../rdtscJs.mjs';
export { rdtscJs } from '../rdtscJs.mjs';
export { calcPerformance } from '../calcPerformance.mjs';
export { c as calcPerformanceAsync } from '../calcPerformanceAsync2.mjs';

setRdtscDefault(rdtscJs);
