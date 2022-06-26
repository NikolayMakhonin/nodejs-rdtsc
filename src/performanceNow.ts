export const performanceNow = typeof performance !== 'undefined'
  ? () => performance.now()
  : () => {
    const time = process.hrtime.bigint()
    const part1 = Number(time / BigInt(1000000))
    const part2 = Number(time - BigInt(part1) * BigInt(1000000)) / 1000000
    return part1 + part2
  }
