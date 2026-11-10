import type { GcTools } from './types'

let gcToolsGetter: () => null | GcTools = () => null

/** Sets the function that gives calcPerformance the tools for measuring garbage collection */
export function setGcToolsDefault(getGcTools: () => null | GcTools): void {
  gcToolsGetter = getGcTools
}

/** Returns the tools for measuring garbage collection, or null if the runtime has none */
export function getGcToolsDefault(): null | GcTools {
  return gcToolsGetter()
}
