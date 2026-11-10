import assert from 'assert'
import {createCyclesPerByteGetter} from './createCyclesPerByteGetter'

describe('rdtsc > createCyclesPerByteGetter', function () {
  it('measures once and again when the capacity changes', function () {
    let capacity = 1000
    let measurementsCount = 0
    const getCyclesPerByte = createCyclesPerByteGetter(
      () => {
        measurementsCount++
        return 500
      },
      () => capacity,
    )

    assert.strictEqual(getCyclesPerByte(), 0.5)
    assert.strictEqual(getCyclesPerByte(), 0.5)
    assert.strictEqual(measurementsCount, 1)

    capacity = 2000
    assert.strictEqual(getCyclesPerByte(), 0.25)
    assert.strictEqual(measurementsCount, 2)
  })
})
