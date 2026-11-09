import {getGcToolsDefault} from './gcToolsDefault'

/**
 * Whether calcPerformance can measure memory (timeGc) in this runtime. In Node the first call runs
 * v8.setFlagsFromString('--expose-gc') for the whole process, which calcPerformance needs to force collections;
 * after that the global gc function exists in every new vm context
 */
export function isGcToolsSupported(): boolean {
  return getGcToolsDefault() != null
}
