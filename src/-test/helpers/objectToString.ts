export function objectToString(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value + 'n'
    }
    // JSON writes NaN and infinities as null
    if (typeof value === 'number' && !Number.isFinite(value)) {
      return String(value)
    }
    return value
  })
}
