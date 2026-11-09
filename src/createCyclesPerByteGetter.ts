/**
 * Returns a function that gives the cycles of young garbage collection per allocated byte. It measures only on its
 * first call, because a measurement forces many collections, and again when the size of the young generation
 * changes, because the cycles per byte depend on that size
 */
export function createCyclesPerByteGetter(
  measureYoungGcCycles: () => number,
  getYoungGenerationCapacity: () => number,
): () => number {
  let cyclesPerByte = 0
  let measuredCapacity: null | number = null
  return () => {
    const capacity = getYoungGenerationCapacity()
    if (capacity !== measuredCapacity) {
      cyclesPerByte = measureYoungGcCycles() / capacity
      measuredCapacity = capacity
    }
    return cyclesPerByte
  }
}
