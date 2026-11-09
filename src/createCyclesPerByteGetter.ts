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
      const cycles = measureYoungGcCycles()
      cyclesPerByte = cycles / capacity
      // A collection takes time and the young generation has room, so any other value means a broken measurement
      if (!(cyclesPerByte > 0 && Number.isFinite(cyclesPerByte))) {
        throw new Error(`[getCyclesPerByte] cycles of a young collection (${cycles})`
          + ` per bytes of the young generation (${capacity}) are not a positive finite number`)
      }
      measuredCapacity = capacity
    }
    return cyclesPerByte
  }
}
