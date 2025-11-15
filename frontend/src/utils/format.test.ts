import { describe, it, expect } from 'vitest'
import { formatDuration, formatDurationPrecise } from './format'

describe('formatDuration', () => {
  it('formats milliseconds correctly', () => {
    expect(formatDuration(5)).toBe('5.00ms')
    expect(formatDuration(50)).toBe('50.00ms')
    expect(formatDuration(500)).toBe('500.00ms')
  })

  it('formats seconds correctly', () => {
    expect(formatDuration(1000)).toBe('1.00s')
    expect(formatDuration(1500)).toBe('1.50s')
    expect(formatDuration(5000)).toBe('5.00s')
  })

  it('formats large durations in seconds', () => {
    expect(formatDuration(60000)).toBe('60.00s')
    expect(formatDuration(90000)).toBe('90.00s')
    expect(formatDuration(300000)).toBe('300.00s')
  })

  it('handles zero duration', () => {
    expect(formatDuration(0)).toBe('0.00ms')
  })

  it('handles very large durations', () => {
    expect(formatDuration(3600000)).toBe('3600.00s')
  })
})

describe('formatDurationPrecise', () => {
  it('formats with 3 decimal precision for milliseconds', () => {
    expect(formatDurationPrecise(5.123)).toBe('5.123ms')
  })

  it('formats with 3 decimal precision for seconds', () => {
    expect(formatDurationPrecise(1234.567)).toBe('1.235s')
  })

  it('handles zero duration', () => {
    expect(formatDurationPrecise(0)).toBe('0.000ms')
  })
})

