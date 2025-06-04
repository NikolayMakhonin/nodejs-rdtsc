export function objectToString(obj: any): string {
  return JSON.stringify(obj, (key, value) => {
    if (typeof value === 'bigint') {
      return value + 'n'
    }
    return value
  })
}
